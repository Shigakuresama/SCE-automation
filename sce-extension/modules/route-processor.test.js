/**
 * Route Processor Module Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';

// Mock chrome API for testing
global.chrome = {
  tabs: {
    create: () => {},
    sendMessage: () => {},
    remove: () => {},
    captureVisibleTab: () => {}
  },
  runtime: {
    lastError: null,
    sendMessage: () => {}
  },
  storage: {
    sync: {
      get: () => {},
      set: () => {}
    }
  }
};

// Import after mocking
import {
  processRouteAddress,
  processRouteBatch,
  getBatchStatus,
  cancelRouteBatch,
  validateRouteAddress,
  cleanupOldBatches,
  ROUTE_CONFIG
} from './route-processor.js';

describe('Route Processor Module', () => {
  describe('validateRouteAddress', () => {
    it('should validate a complete address', () => {
      const address = {
        number: '1909',
        street: 'W Martha Ln',
        city: 'Santa Ana',
        state: 'CA',
        zip: '92706',
        full: '1909 W Martha Ln, Santa Ana, CA 92706'
      };

      const result = validateRouteAddress(address);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject address missing street number', () => {
      const address = {
        street: 'W Martha Ln',
        zip: '92706',
        full: 'W Martha Ln, Santa Ana, CA 92706'
      };

      const result = validateRouteAddress(address);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing street number');
    });

    it('should reject address with invalid ZIP format', () => {
      const address = {
        number: '1909',
        street: 'W Martha Ln',
        zip: '9270', // Only 4 digits
        full: '1909 W Martha Ln, Santa Ana, CA 9270'
      };

      const result = validateRouteAddress(address);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid ZIP code format (must be 5 digits)');
    });

    it('should reject address missing full string', () => {
      const address = {
        number: '1909',
        street: 'W Martha Ln',
        zip: '92706'
      };

      const result = validateRouteAddress(address);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing full address string');
    });
  });

  describe('ROUTE_CONFIG', () => {
    it('should have default configuration values', () => {
      expect(ROUTE_CONFIG.captureDelay).toBe(5000);
      expect(ROUTE_CONFIG.tabOpenDelay).toBe(2000);
      expect(ROUTE_CONFIG.maxConcurrentTabs).toBe(3);
      expect(ROUTE_CONFIG.maxBatchSize).toBe(50);
      expect(ROUTE_CONFIG.retryAttempts).toBe(2);
    });
  });

  describe('getBatchStatus', () => {
    it('should return null for non-existent batch', () => {
      const status = getBatchStatus('non_existent_batch');
      expect(status).toBe(null);
    });
  });

  describe('cancelRouteBatch', () => {
    it('should return false for non-existent batch', () => {
      const cancelled = cancelRouteBatch('non_existent_batch');
      expect(cancelled).toBe(false);
    });
  });

  describe('cleanupOldBatches', () => {
    it('should return number of cleaned batches', () => {
      const cleaned = cleanupOldBatches();
      expect(typeof cleaned).toBe('number');
      expect(cleaned).toBeGreaterThanOrEqual(0);
    });
  });

  describe('processRouteBatch validation', () => {
    it('should throw error for empty addresses array', async () => {
      await expect(processRouteBatch([])).rejects.toThrow('non-empty array');
    });

    it('should throw error for non-array input', async () => {
      await expect(processRouteBatch('not an array')).rejects.toThrow('non-empty array');
    });

    it('should throw error for batch size exceeding maximum', async () => {
      const largeArray = Array(51).fill({
        number: '1',
        street: 'Test St',
        zip: '92706',
        full: '1 Test St, Santa Ana, CA 92706'
      });

      await expect(processRouteBatch(largeArray)).rejects.toThrow('exceeds maximum');
    });
  });
});
