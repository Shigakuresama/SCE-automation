/**
 * lib/cache.js
 * Local caching layer for Zillow data to avoid re-scraping
 *
 * Features:
 * - Address-based lookup
 * - TTL (time-to-live) expiration
 * - Partial address matching
 * - Statistics tracking
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';

const CACHE_DIR = './cache';
const CACHE_FILE = join(CACHE_DIR, 'zillow.json');
const DEFAULT_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
const STATS_FILE = join(CACHE_DIR, 'stats.json');

/**
 * Cache entry structure
 */
class CacheEntry {
    constructor(address, data) {
        this.address = address;
        this.normalizedAddress = this.normalizeAddress(address);
        this.data = data;
        this.cachedAt = Date.now();
        this.expiresAt = Date.now() + DEFAULT_TTL;
        this.hitCount = 0;
        this.lastHitAt = null;
    }

    normalizeAddress(addr) {
        return addr
            .toLowerCase()
            .replace(/,/g, '')
            .replace(/\s+/g, ' ')
            .replace(/(\d+)(st|nd|rd|th)/, '$1')
            .trim();
    }

    isExpired() {
        return Date.now() > this.expiresAt;
    }

    touch() {
        this.hitCount++;
        this.lastHitAt = Date.now();
    }

    getAge() {
        return Date.now() - this.cachedAt;
    }

    getTTL() {
        return Math.max(0, this.expiresAt - Date.now());
    }
}

/**
 * Cache manager
 */
class Cache {
    constructor() {
        this.entries = [];
        this.stats = {
            hits: 0,
            misses: 0,
            stale: 0,
            totalAddresses: 0
        };
    }

    async init() {
        // Create cache directory if needed
        if (!existsSync(CACHE_DIR)) {
            await mkdir(CACHE_DIR, { recursive: true });
        }

        // Load existing cache
        if (existsSync(CACHE_FILE)) {
            try {
                const data = JSON.parse(await readFile(CACHE_FILE, 'utf-8'));
                this.entries = data.entries || [];
                this.stats = { ...this.stats, ...(data.stats || {}) };
            } catch (e) {
                console.warn('Could not load cache file, starting fresh');
            }
        }

        // Load stats
        if (existsSync(STATS_FILE)) {
            try {
                const savedStats = JSON.parse(await readFile(STATS_FILE, 'utf-8'));
                this.stats = { ...this.stats, ...savedStats };
            } catch (e) {}
        }

        this.stats.totalAddresses = this.entries.length;
    }

    async save() {
        await mkdir(CACHE_DIR, { recursive: true });

        const data = {
            entries: this.entries,
            stats: this.stats,
            lastSaved: Date.now()
        };

        await writeFile(CACHE_FILE, JSON.stringify(data, null, 2));
        await writeFile(STATS_FILE, JSON.stringify(this.stats, null, 2));
    }

    /**
     * Generate cache key from address
     */
    hashAddress(address) {
        return createHash
            .createHash('sha256')
            .update(address.toLowerCase().replace(/\s+/g, ''))
            .digest('hex')
            .slice(0, 12);
    }

    /**
     * Find cache entry by address
     */
    find(address) {
        const normalized = new CacheEntry(address).normalizedAddress;

        // Try exact match first
        let entry = this.entries.find(e => e.normalizedAddress === normalized);
        if (entry) {
            return entry;
        }

        // Try fuzzy match - check if normalized address is a substring
        entry = this.entries.find(e =>
            e.normalizedAddress.includes(normalized) ||
            normalized.includes(e.normalizedAddress)
        );
        if (entry) {
            return entry;
        }

        return null;
    }

    /**
     * Get cached data for address
     */
    get(address) {
        const entry = this.find(address);

        if (!entry) {
            this.stats.misses++;
            return null;
        }

        if (entry.isExpired()) {
            this.stats.stale++;
            return null;
        }

        entry.touch();
        this.stats.hits++;
        return entry.data;
    }

    /**
     * Set cache data for address
     */
    set(address, data, ttl = DEFAULT_TTL) {
        const entry = new CacheEntry(address, data);
        entry.expiresAt = Date.now() + ttl;

        // Remove existing entry if present
        this.entries = this.entries.filter(e => e.normalizedAddress !== entry.normalizedAddress);

        this.entries.push(entry);
        this.stats.totalAddresses = this.entries.length;
    }

    /**
     * Remove entry from cache
     */
    delete(address) {
        const normalized = new CacheEntry(address).normalizedAddress;
        this.entries = this.entries.filter(e => e.normalizedAddress !== normalized);
        this.stats.totalAddresses = this.entries.length;
    }

    /**
     * Clear expired entries
     */
    cleanup() {
        const before = this.entries.length;
        this.entries = this.entries.filter(e => !e.isExpired());
        const removed = before - this.entries.length;
        this.stats.totalAddresses = this.entries.length;
        return removed;
    }

    /**
     * Clear all cache entries
     */
    clear() {
        this.entries = [];
        this.stats.totalAddresses = 0;
    }

    /**
     * Get cache statistics
     */
    getStats() {
        const hitRate = this.stats.hits + this.stats.misses > 0
            ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(1)
            : 0;

        return {
            ...this.stats,
            hitRate: `${hitRate}%`,
            size: this.entries.length,
            totalSize: JSON.stringify(this.entries).length
        };
    }

    /**
     * Print cache statistics
     */
    printStats() {
        const stats = this.getStats();

        console.log('\n📊 Cache Statistics');
        console.log('─'.repeat(40));
        console.log(`  Entries:       ${stats.size}`);
        console.log(`  Hits:          ${stats.hits}`);
        console.log(`  Misses:        ${stats.misses}`);
        console.log(`  Stale:         ${stats.stale}`);
        console.log(`  Hit Rate:      ${stats.hitRate}`);
        console.log(`  Cache Size:    ${(stats.totalSize / 1024).toFixed(1)} KB`);
        console.log('─'.repeat(40));

        // Show oldest and newest entries
        if (this.entries.length > 0) {
            const sorted = [...this.entries].sort((a, b) => a.cachedAt - b.cachedAt);
            const oldest = sorted[0];
            const newest = sorted[sorted.length - 1];

            console.log(`  Oldest Entry:  ${new Date(oldest.cachedAt).toLocaleString()}`);
            console.log(`  Newest Entry:  ${new Date(newest.cachedAt).toLocaleString()}`);
        }
    }

    /**
     * List all cached addresses
     */
    list() {
        console.log('\n📋 Cached Addresses');
        console.log('─'.repeat(60));

        const sorted = [...this.entries].sort((a, b) => b.cachedAt - a.cachedAt);

        for (const entry of sorted) {
            const age = this.formatAge(entry.getAge());
            const ttl = this.formatAge(entry.getTTL());
            const hits = entry.hitCount;

            console.log(`  ${entry.address.padEnd(40)} age: ${age.padStart(8)} ttl: ${ttl.padStart(8)} hits: ${hits}`);
        }

        console.log('─'.repeat(60));
        console.log(`  Total: ${sorted.length} entries`);
    }

    formatAge(ms) {
        const days = Math.floor(ms / (24 * 60 * 60 * 1000));
        const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));

        if (days > 0) return `${days}d ${hours}h`;
        if (hours > 0) return `${hours}h`;
        return '<1h';
    }

    /**
     * Search cache by partial address
     */
    search(query) {
        const lower = query.toLowerCase();
        return this.entries.filter(e =>
            e.address.toLowerCase().includes(lower) ||
            e.normalizedAddress.includes(lower)
        );
    }
}

// Singleton instance
let cacheInstance = null;

/**
 * Get cache instance (lazy initialization)
 */
export async function getCache() {
    if (!cacheInstance) {
        cacheInstance = new Cache();
        await cacheInstance.init();
    }
    return cacheInstance;
}

/**
 * Wrapper for cache operations with auto-save
 */
export class CachedScraper {
    constructor(scraperFn) {
        this.scraperFn = scraperFn;
    }

    async fetch(address, options = {}) {
        const { forceRefresh = false, ttl = DEFAULT_TTL } = options;
        const cache = await getCache();

        // Check cache unless forcing refresh
        if (!forceRefresh) {
            const cached = cache.get(address);
            if (cached) {
                console.log(`  💾 Cache HIT: ${address}`);
                return { ...cached, _cached: true, _cachedAt: cached.cachedAt };
            }
            console.log(`  💾 Cache MISS: ${address}`);
        }

        // Fetch fresh data
        const data = await this.scraperFn(address);
        cache.set(address, data, ttl);
        await cache.save();

        return { ...data, _cached: false };
    }
}

export default Cache;
