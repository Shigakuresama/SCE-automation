# Reliability & Performance Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add structured error handling with retry logic and improve performance through free HTML scraping, lazy-loaded extension modules, and DOM caching.

**Architecture:** Create a shared error-handling package used by all components. Replace DuckDuckGo→Playwright scraping with direct Zillow/Redfin HTTP scraping. Split the 2,449-line content.js into lazy-loaded section modules.

**Tech Stack:** Node.js, TypeScript, Cheerio (HTML parsing), Chrome Extension MV3

---

## Phase 1: Error Handling Foundation

### Task 1: Create Error Handling Package Structure

**Files:**
- Create: `packages/error-handling/package.json`
- Create: `packages/error-handling/src/index.ts`
- Create: `packages/error-handling/tsconfig.json`

**Step 1: Create package.json**

```json
{
  "name": "@sce/error-handling",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "test": "vitest"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "vitest": "^1.0.0"
  }
}
```

**Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "declaration": true
  }
}
```

**Step 3: Commit**

```bash
git add packages/error-handling/
git commit -m "feat: create error-handling package structure"
```

---

### Task 2: Implement Error Classes

**Files:**
- Create: `packages/error-handling/src/errors.ts`
- Test: `packages/error-handling/src/errors.test.ts`

**Step 1: Write failing test**

```typescript
import { describe, it, expect } from 'vitest';
import { SceError, ScrapingError, NetworkError, ValidationError } from './errors';

describe('SceError', () => {
  it('should create error with code and context', () => {
    const error = new SceError('TEST_ERROR', 'Test message', { foo: 'bar' });
    expect(error.code).toBe('TEST_ERROR');
    expect(error.message).toBe('Test message');
    expect(error.context).toEqual({ foo: 'bar' });
    expect(error.timestamp).toBeInstanceOf(Date);
  });

  it('should serialize to JSON', () => {
    const error = new SceError('TEST', 'Message', { key: 'value' });
    const json = error.toJSON();
    expect(json.code).toBe('TEST');
    expect(json.message).toBe('Message');
    expect(json.context).toEqual({ key: 'value' });
  });
});

describe('ScrapingError', () => {
  it('should create scraping error with URL', () => {
    const error = new ScrapingError('https://example.com', 'Blocked');
    expect(error.code).toBe('SCRAPING_ERROR');
    expect(error.context.url).toBe('https://example.com');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd packages/error-handling
npm install
npx vitest run src/errors.test.ts
```

Expected: FAIL - modules not found

**Step 3: Implement error classes**

```typescript
export class SceError extends Error {
  public readonly code: string;
  public readonly context: Record<string, unknown>;
  public readonly timestamp: Date;

  constructor(code: string, message: string, context: Record<string, unknown> = {}) {
    super(message);
    this.code = code;
    this.context = context;
    this.timestamp = new Date();
    this.name = this.constructor.name;
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      context: this.context,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack
    };
  }
}

export class ScrapingError extends SceError {
  constructor(url: string, reason: string, context: Record<string, unknown> = {}) {
    super('SCRAPING_ERROR', `Scraping failed for ${url}: ${reason}`, {
      url,
      reason,
      ...context
    });
  }
}

export class NetworkError extends SceError {
  constructor(message: string, context: Record<string, unknown> = {}) {
    super('NETWORK_ERROR', message, context);
  }
}

export class ValidationError extends SceError {
  constructor(field: string, message: string) {
    super('VALIDATION_ERROR', `Validation failed for ${field}: ${message}`, { field });
  }
}

export class ConfigurationError extends SceError {
  constructor(key: string, message: string) {
    super('CONFIG_ERROR', `Configuration error for ${key}: ${message}`, { key });
  }
}
```

**Step 4: Run test to verify it passes**

```bash
npx vitest run src/errors.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add packages/error-handling/src/errors.ts packages/error-handling/src/errors.test.ts
git commit -m "feat: implement error classes with serialization"
```

---

### Task 3: Implement Retry Utility

**Files:**
- Create: `packages/error-handling/src/retry.ts`
- Test: `packages/error-handling/src/retry.test.ts`

**Step 1: Write failing test**

```typescript
import { describe, it, expect, vi } from 'vitest';
import { retryWithBackoff, NetworkError } from './retry';

describe('retryWithBackoff', () => {
  it('should return result on first success', async () => {
    const fn = vi.fn().mockResolvedValue('success');
    const result = await retryWithBackoff(fn);
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry on NetworkError and eventually succeed', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new NetworkError('timeout'))
      .mockRejectedValueOnce(new NetworkError('timeout'))
      .mockResolvedValue('success');

    const result = await retryWithBackoff(fn, { maxAttempts: 3, baseDelayMs: 10 });
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should throw after max attempts exceeded', async () => {
    const fn = vi.fn().mockRejectedValue(new NetworkError('timeout'));

    await expect(
      retryWithBackoff(fn, { maxAttempts: 2, baseDelayMs: 10 })
    ).rejects.toThrow('timeout');

    expect(fn).toHaveBeenCalledTimes(2);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run src/retry.test.ts
```

Expected: FAIL - module not found

**Step 3: Implement retry utility**

```typescript
import { SceError, NetworkError, ScrapingError } from './errors';

export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000
};

function isRetryableError(error: unknown): boolean {
  if (!(error instanceof SceError)) return false;
  return error instanceof NetworkError ||
         (error instanceof ScrapingError && error.context.reason !== 'NOT_FOUND');
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: unknown;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (!isRetryableError(error) || attempt === opts.maxAttempts) {
        throw error;
      }

      const delayMs = Math.min(
        opts.baseDelayMs * Math.pow(2, attempt - 1),
        opts.maxDelayMs
      );

      await delay(delayMs);
    }
  }

  throw lastError;
}
```

**Step 4: Run test to verify it passes**

```bash
npx vitest run src/retry.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add packages/error-handling/src/retry.ts packages/error-handling/src/retry.test.ts
git commit -m "feat: implement retry utility with exponential backoff"
```

---

### Task 4: Implement Logger

**Files:**
- Create: `packages/error-handling/src/logger.ts`
- Test: `packages/error-handling/src/logger.test.ts`

**Step 1: Write failing test**

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Logger } from './logger';

describe('Logger', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('should log info message with context', () => {
    const logger = new Logger('test');
    logger.info('Test message', { key: 'value' });

    expect(consoleSpy).toHaveBeenCalled();
    const logEntry = JSON.parse(consoleSpy.mock.calls[0][0]);
    expect(logEntry.level).toBe('info');
    expect(logEntry.component).toBe('test');
    expect(logEntry.message).toBe('Test message');
    expect(logEntry.context).toEqual({ key: 'value' });
  });

  it('should respect log level', () => {
    const logger = new Logger('test', 'warn');
    logger.info('Should not log');
    logger.warn('Should log');

    expect(consoleSpy).toHaveBeenCalledTimes(1);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run src/logger.test.ts
```

Expected: FAIL - module not found

**Step 3: Implement logger**

```typescript
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

export interface LogEntry {
  level: LogLevel;
  timestamp: string;
  component: string;
  message: string;
  context?: Record<string, unknown>;
}

export class Logger {
  private level: LogLevel;

  constructor(
    private component: string,
    level?: LogLevel
  ) {
    this.level = level || (process.env.LOG_LEVEL as LogLevel) || 'info';
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.level];
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>) {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      level,
      timestamp: new Date().toISOString(),
      component: this.component,
      message,
      context
    };

    console.log(JSON.stringify(entry));
  }

  debug(message: string, context?: Record<string, unknown>) {
    this.log('debug', message, context);
  }

  info(message: string, context?: Record<string, unknown>) {
    this.log('info', message, context);
  }

  warn(message: string, context?: Record<string, unknown>) {
    this.log('warn', message, context);
  }

  error(message: string, context?: Record<string, unknown>) {
    this.log('error', message, context);
  }
}
```

**Step 4: Run test to verify it passes**

```bash
npx vitest run src/logger.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add packages/error-handling/src/logger.ts packages/error-handling/src/logger.test.ts
git commit -m "feat: implement structured logger with log levels"
```

---

### Task 5: Export Package Index

**Files:**
- Modify: `packages/error-handling/src/index.ts`

**Step 1: Create index.ts**

```typescript
export { SceError, ScrapingError, NetworkError, ValidationError, ConfigurationError } from './errors';
export { retryWithBackoff, RetryOptions } from './retry';
export { Logger, LogLevel, LogEntry } from './logger';
```

**Step 2: Build and verify**

```bash
npm run build
```

Expected: Compiles without errors, creates `dist/` folder

**Step 3: Run all tests**

```bash
npm test
```

Expected: All tests pass

**Step 4: Commit**

```bash
git add packages/error-handling/src/index.ts packages/error-handling/dist/
git commit -m "feat: export error-handling package index"
```

---

## Phase 2: Proxy Server Optimization

### Task 6: Add Cheerio for HTML Scraping

**Files:**
- Modify: `sce-proxy-server/package.json`

**Step 1: Install dependencies**

```bash
cd sce-proxy-server
npm install cheerio
npm install --save-dev @types/cheerio
```

**Step 2: Commit**

```bash
git add sce-proxy-server/package.json sce-proxy-server/package-lock.json
git commit -m "deps: add cheerio for HTML scraping"
```

---

### Task 7: Create Zillow HTML Scraper

**Files:**
- Create: `sce-proxy-server/scrapers/zillow.js`
- Test: `sce-proxy-server/scrapers/zillow.test.js`

**Step 1: Write failing test**

```javascript
const { describe, it, expect, vi, beforeEach } = require('vitest');
const { scrapeZillow } = require('./zillow');

describe('scrapeZillow', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it('should return property data from HTML', async () => {
    const mockHtml = `
      <html>
        <script id="__NEXT_DATA__" type="application/json">
          {"props":{"pageProps":{"componentProps":{"gdpClientCache":{"Property":{
            "123": {"squareFootage": 1500, "yearBuilt": 2005}
          }}}}}}}
        </script>
      </html>
    `;

    global.fetch.mockResolvedValue({
      text: () => Promise.resolve(mockHtml)
    });

    const result = await scrapeZillow('123 Main St', '12345');
    expect(result.squareFootage).toBe(1500);
    expect(result.yearBuilt).toBe(2005);
  });

  it('should throw ScrapingError when data not found', async () => {
    global.fetch.mockResolvedValue({
      text: () => Promise.resolve('<html>No data here</html>')
    });

    await expect(scrapeZillow('123 Main St', '12345')).rejects.toThrow();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd sce-proxy-server
npx vitest run scrapers/zillow.test.js
```

Expected: FAIL - module not found

**Step 3: Implement Zillow scraper**

```javascript
const cheerio = require('cheerio');
const { ScrapingError } = require('../../packages/error-handling');

async function scrapeZillow(address, zipCode) {
  const searchUrl = `https://www.zillow.com/homes/${encodeURIComponent(address)}-${zipCode}_rb/`;

  try {
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      throw new ScrapingError(searchUrl, `HTTP ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Try to extract from __NEXT_DATA__ script
    const nextData = $('#__NEXT_DATA__').html();
    if (nextData) {
      const data = JSON.parse(nextData);
      const property = extractPropertyFromNextData(data);
      if (property) return property;
    }

    // Fallback: parse from HTML
    const squareFootage = parseInt($('[data-testid="bed-bath-sqft-facts"] li:contains("sqft")').text());
    const yearBuilt = parseInt($('span:contains("Built in")').text().replace(/\D/g, ''));

    if (!squareFootage && !yearBuilt) {
      throw new ScrapingError(searchUrl, 'Property data not found in page');
    }

    return { squareFootage, yearBuilt };
  } catch (error) {
    if (error instanceof ScrapingError) throw error;
    throw new ScrapingError(searchUrl, error.message);
  }
}

function extractPropertyFromNextData(data) {
  try {
    const cache = data?.props?.pageProps?.componentProps?.gdpClientCache;
    if (!cache) return null;

    const propertyKey = Object.keys(cache).find(k => k.startsWith('Property'));
    if (!propertyKey) return null;

    const property = cache[propertyKey];
    return {
      squareFootage: property.squareFootage || property.livingArea,
      yearBuilt: property.yearBuilt
    };
  } catch {
    return null;
  }
}

module.exports = { scrapeZillow };
```

**Step 4: Run test to verify it passes**

```bash
npx vitest run scrapers/zillow.test.js
```

Expected: PASS

**Step 5: Commit**

```bash
git add sce-proxy-server/scrapers/zillow.js sce-proxy-server/scrapers/zillow.test.js
git commit -m "feat: implement Zillow HTML scraper with cheerio"
```

---

### Task 8: Create Redfin Fallback Scraper

**Files:**
- Create: `sce-proxy-server/scrapers/redfin.js`
- Test: `sce-proxy-server/scrapers/redfin.test.js`

**Step 1: Write failing test**

```javascript
const { describe, it, expect, vi, beforeEach } = require('vitest');
const { scrapeRedfin } = require('./redfin');

describe('scrapeRedfin', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it('should return property data from Redfin HTML', async () => {
    const mockHtml = `
      <html>
        <div class="home-main-stats-variant">
          <div class="stats-value">1,500</div>
          <span>Square Feet</span>
        </div>
        <div class="key-value-list">
          <span>Year Built</span>
          <span>2005</span>
        </div>
      </html>
    `;

    global.fetch.mockResolvedValue({
      text: () => Promise.resolve(mockHtml)
    });

    const result = await scrapeRedfin('123 Main St', '12345');
    expect(result.squareFootage).toBe(1500);
    expect(result.yearBuilt).toBe(2005);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run scrapers/redfin.test.js
```

Expected: FAIL - module not found

**Step 3: Implement Redfin scraper**

```javascript
const cheerio = require('cheerio');
const { ScrapingError } = require('../../packages/error-handling');

async function scrapeRedfin(address, zipCode) {
  const searchUrl = `https://www.redfin.com/${zipCode}/apartments`;

  try {
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      throw new ScrapingError(searchUrl, `HTTP ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Parse from Redfin's HTML structure
    const sqftText = $('.home-main-stats-variant .stats-value').first().text();
    const squareFootage = parseInt(sqftText.replace(/,/g, ''));

    const yearText = $('.key-value-list span:contains("Year Built")').next().text();
    const yearBuilt = parseInt(yearText);

    if (!squareFootage && !yearBuilt) {
      throw new ScrapingError(searchUrl, 'Property data not found in page');
    }

    return { squareFootage, yearBuilt };
  } catch (error) {
    if (error instanceof ScrapingError) throw error;
    throw new ScrapingError(searchUrl, error.message);
  }
}

module.exports = { scrapeRedfin };
```

**Step 4: Run test to verify it passes**

```bash
npx vitest run scrapers/redfin.test.js
```

Expected: PASS

**Step 5: Commit**

```bash
git add sce-proxy-server/scrapers/redfin.js sce-proxy-server/scrapers/redfin.test.js
git commit -m "feat: implement Redfin fallback scraper"
```

---

### Task 9: Create Unified Scraper with Fallback Chain

**Files:**
- Create: `sce-proxy-server/scrapers/index.js`
- Modify: `sce-proxy-server/server.js` (integrate new scraper)

**Step 1: Create unified scraper index**

```javascript
const { scrapeZillow } = require('./zillow');
const { scrapeRedfin } = require('./redfin');
const { retryWithBackoff, ScrapingError, Logger } = require('../../packages/error-handling');

const logger = new Logger('scraper');

async function scrapeProperty(address, zipCode) {
  logger.info('Starting property scrape', { address, zipCode });

  // Try Zillow first
  try {
    const result = await retryWithBackoff(
      () => scrapeZillow(address, zipCode),
      { maxAttempts: 2, baseDelayMs: 500 }
    );
    logger.info('Zillow scrape successful', { address, result });
    return result;
  } catch (zillowError) {
    logger.warn('Zillow scrape failed, trying Redfin', { address, error: zillowError.message });
  }

  // Fallback to Redfin
  try {
    const result = await retryWithBackoff(
      () => scrapeRedfin(address, zipCode),
      { maxAttempts: 2, baseDelayMs: 500 }
    );
    logger.info('Redfin scrape successful', { address, result });
    return result;
  } catch (redfinError) {
    logger.error('Both scrapers failed', { address, zillowError, redfinError });
    throw new ScrapingError(address, 'All scrapers failed', {
      zillowError: zillowError.message,
      redfinError: redfinError.message
    });
  }
}

module.exports = { scrapeProperty };
```

**Step 2: Modify server.js to use new scraper**

Find the scraping endpoint in `sce-proxy-server/server.js` and replace:

```javascript
// Old scraping code
const { scrapeProperty } = require('./scrapers');
const { retryWithBackoff, NetworkError } = require('../packages/error-handling');

app.get('/proxy/scrape', async (req, res) => {
  const { address, zipCode } = req.query;

  if (!address || !zipCode) {
    return res.status(400).json({ error: 'Address and zipCode required' });
  }

  try {
    const result = await retryWithBackoff(
      () => scrapeProperty(address, zipCode),
      { maxAttempts: 3, baseDelayMs: 1000 }
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message,
      code: error.code || 'UNKNOWN_ERROR'
    });
  }
});
```

**Step 3: Test the server**

```bash
npm start
# In another terminal:
curl "http://localhost:3000/proxy/scrape?address=1909+W+Martha+Ln&zipCode=92706"
```

Expected: Returns JSON with squareFootage and yearBuilt

**Step 4: Commit**

```bash
git add sce-proxy-server/scrapers/index.js sce-proxy-server/server.js
git commit -m "feat: integrate unified scraper with fallback chain"
```

---

## Phase 3: Extension Modularization

### Task 10: Create Section Module Loader

**Files:**
- Create: `sce-extension/modules/loader.js`

**Step 1: Create module loader**

```javascript
// Module loader for lazy-loaded section handlers
const SectionLoader = {
  loadedModules: new Map(),

  async load(sectionName) {
    if (this.loadedModules.has(sectionName)) {
      return this.loadedModules.get(sectionName);
    }

    try {
      const moduleUrl = chrome.runtime.getURL(`sections/${sectionName}.js`);
      const module = await import(moduleUrl);
      this.loadedModules.set(sectionName, module);
      return module;
    } catch (error) {
      console.error(`Failed to load section ${sectionName}:`, error);
      return null;
    }
  },

  async fillSection(sectionName, config) {
    const module = await this.load(sectionName);
    if (module && module.fill) {
      return module.fill(config);
    }
    console.warn(`No fill handler for section: ${sectionName}`);
    return false;
  }
};

// Export for content.js
if (typeof module !== 'undefined') {
  module.exports = { SectionLoader };
}
```

**Step 2: Commit**

```bash
git add sce-extension/modules/loader.js
git commit -m "feat: create section module loader"
```

---

### Task 11: Extract Project Section Module

**Files:**
- Create: `sce-extension/sections/project.js`
- Extract from: `sce-extension/content.js:330-450` (approximate)

**Step 1: Create project section module**

```javascript
// Project section form filling
import { DomCache } from '../modules/dom-cache.js';

const domCache = new DomCache('project');

export async function fill(config) {
  console.log('Filling Project section with config:', config);

  try {
    // Fill property address
    const addressInput = domCache.querySelector('input[formcontrolname="propertyAddress"]');
    if (addressInput) {
      await fillInput(addressInput, config.propertyAddress);
    }

    // Fill square footage
    const sqftInput = domCache.querySelector('input[formcontrolname="squareFootage"]');
    if (sqftInput && config.squareFootage) {
      await fillInput(sqftInput, config.squareFootage.toString());
    }

    // Fill year built
    const yearInput = domCache.querySelector('input[formcontrolname="yearBuilt"]');
    if (yearInput && config.yearBuilt) {
      await fillInput(yearInput, config.yearBuilt.toString());
    }

    return true;
  } catch (error) {
    console.error('Error filling Project section:', error);
    return false;
  }
}

async function fillInput(element, value) {
  element.focus();
  element.value = value;
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
  element.blur();

  // Wait for Angular to process
  await new Promise(resolve => setTimeout(resolve, 50));
}
```

**Step 2: Create DOM Cache utility**

```javascript
// DOM query caching utility
export class DomCache {
  constructor(sectionName) {
    this.section = sectionName;
    this.cache = new Map();
  }

  querySelector(selector) {
    const key = `${this.section}:${selector}`;

    if (!this.cache.has(key)) {
      const element = document.querySelector(selector);
      this.cache.set(key, element);
    }

    return this.cache.get(key);
  }

  invalidate() {
    this.cache.clear();
  }
}
```

**Step 3: Commit**

```bash
git add sce-extension/sections/project.js sce-extension/modules/dom-cache.js
git commit -m "feat: extract Project section to lazy-loaded module"
```

---

### Task 12: Update Content.js to Use Lazy Loading

**Files:**
- Modify: `sce-extension/content.js`

**Step 1: Add module loader import at top**

```javascript
// At top of content.js
import { SectionLoader } from './modules/loader.js';
```

**Step 2: Replace fillProjectSection call**

Find the section filling logic and replace with:

```javascript
// Old: fillProjectSection(config);
// New:
await SectionLoader.fillSection('project', config);
```

**Step 3: Update manifest.json for module support**

```json
{
  "web_accessible_resources": [{
    "resources": ["sections/*.js", "modules/*.js"],
    "matches": ["https://sce.dsmcentral.com/*"]
  }]
}
```

**Step 4: Test extension**

Load extension in Chrome, navigate to Project section, verify it fills correctly.

**Step 5: Commit**

```bash
git add sce-extension/content.js sce-extension/manifest.json
git commit -m "feat: integrate lazy-loaded sections into content.js"
```

---

## Phase 4: Integration & Testing

### Task 13: Add Health Check Endpoint

**Files:**
- Modify: `sce-proxy-server/server.js`

**Step 1: Add health endpoint**

```javascript
app.get('/proxy/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: require('./package.json').version
  });
});
```

**Step 2: Test**

```bash
curl http://localhost:3000/proxy/health
```

Expected: `{"status":"ok","timestamp":"...","version":"..."}`

**Step 3: Commit**

```bash
git add sce-proxy-server/server.js
git commit -m "feat: add health check endpoint"
```

---

### Task 14: Add Extension Error Banner

**Files:**
- Create: `sce-extension/modules/error-banner.js`
- Modify: `sce-extension/content.js`

**Step 1: Create error banner module**

```javascript
export function showError(message, details = '') {
  // Remove existing banner
  const existing = document.getElementById('sce-error-banner');
  if (existing) existing.remove();

  const banner = document.createElement('div');
  banner.id = 'sce-error-banner';
  banner.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background: #dc3545;
    color: white;
    padding: 12px 20px;
    z-index: 10000;
    font-family: sans-serif;
    display: flex;
    justify-content: space-between;
    align-items: center;
  `;

  banner.innerHTML = `
    <div>
      <strong>SCE Auto-Fill Error:</strong> ${message}
      ${details ? `<br><small>${details}</small>` : ''}
    </div>
    <button onclick="this.parentElement.remove()" style="background:white;color:#dc3545;border:none;padding:4px 12px;cursor:pointer;">Dismiss</button>
  `;

  document.body.appendChild(banner);
}

export function showWarning(message) {
  // Similar but with yellow background
}
```

**Step 2: Integrate into content.js error handling**

```javascript
import { showError } from './modules/error-banner.js';

// In error handlers:
try {
  await fillForm(config);
} catch (error) {
  showError(error.message, error.code);
}
```

**Step 3: Commit**

```bash
git add sce-extension/modules/error-banner.js sce-extension/content.js
git commit -m "feat: add error banner for user-visible error messages"
```

---

### Task 15: Run Full Test Suite

**Files:**
- All test files

**Step 1: Run error-handling tests**

```bash
cd packages/error-handling
npm test
```

Expected: All tests pass

**Step 2: Run proxy server tests**

```bash
cd sce-proxy-server
npm test
```

Expected: All tests pass

**Step 3: Run extension utils test**

```bash
node sce-extension/utils.test.js
```

Expected: PASS

**Step 4: Commit**

```bash
git commit -m "test: verify all tests pass"
```

---

## Summary

This implementation plan covers:

1. **Error Handling Package** - Reusable error classes, retry utility, structured logger
2. **Proxy Optimization** - Zillow/Redfin HTML scrapers with fallback chain
3. **Extension Modularization** - Lazy-loaded sections, DOM caching
4. **Integration** - Health checks, error banners, unified error handling

Each task is bite-sized (2-5 minutes), includes exact file paths, complete code, test commands, and commit steps.
