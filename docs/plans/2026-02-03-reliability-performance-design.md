# SCE Project Reliability & Performance Improvements

## Overview

This design addresses two key improvement areas for the SCE Rebate Center automation system:
1. **Reliability & Error Handling** - Structured error handling with retry logic
2. **Performance Optimization** - Faster scraping, lazy-loaded extension, DOM caching

## Architecture

### Two Independent Workstreams

**Workstream 1: Shared Error Handling Layer** (`packages/error-handling/`)
A common library used by extension, proxy server, and MCP server.

**Workstream 2: Performance Optimizations**
- Free-only HTML scraping (Zillow → Redfin → DuckDuckGo fallback)
- Lazy-loaded extension modules
- DOM query caching

Both workstreams are backward-compatible.

## Error Handling Layer

### Components

**Error Classes**
- Base `SceError` with `code`, `context`, `timestamp`
- `ScrapingError` - web scraping failures
- `NetworkError` - connection/timeout issues
- `ValidationError` - invalid inputs
- `ConfigurationError` - missing/invalid config

**Retry Utility**
```javascript
retryWithBackoff(fn, {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000
})
```
- Exponential backoff with jitter
- Only retries on retryable errors

**Structured Logger**
- JSON output with `level`, `timestamp`, `component`, `message`, `context`
- Console logging in extension
- File rotation in proxy/MCP server
- `LOG_LEVEL` env variable control

## Performance Optimization

### 1. Free-Only Scraping Strategy

**Hierarchy (fastest to slowest):**
1. **Zillow Direct HTML** (~500ms) - HTTP GET + Cheerio parsing
2. **Redfin Direct** (~500ms) - Fallback when Zillow blocks
3. **DuckDuckGo** (~3-5s) - Current method with 24h cache
4. **Manual Entry** - User input prompt if all fail

### 2. Lazy-Loaded Extension Modules

Split 2,449-line `content.js` into 18 section files:
```
sce-extension/sections/
├── customer-info.js
├── enrollment.js
├── project.js
└── ... (15 more)
```

Main `content.js` becomes 150-line bootstrapper:
```javascript
const section = await import(
  chrome.runtime.getURL(`sections/${sectionName}.js`)
);
```

### 3. DOM Query Caching

`DomCache` class memoizes `querySelector` results:
- Keyed by section + field name
- Invalidated on section change
- Batched updates via `requestAnimationFrame`

## Data Flow

### Happy Path
1. Extension detects Project section, needs property data
2. Calls `fetchFromProxy('/scrape?address=...')` with retry wrapper
3. Proxy attempts Zillow HTML scraping first
4. Falls back to Redfin if blocked
5. Results cached and returned
6. Extension fills form with cached DOM queries

### Error Paths

| Scenario | Handling |
|----------|----------|
| Network timeout | Retry 3x (1s, 2s, 4s), then `NetworkError` with diagnostic message |
| Zillow blocking | Auto-switch to Redfin, then DuckDuckGo |
| Invalid address | `ValidationError` immediately, no retries |
| DOM failure | Log to console, show banner with section context |

### Fallback Chain
Zillow HTML → Redfin HTML → DuckDuckGo → Cached data → Manual entry

## Testing

**Unit Tests**
- Error classes serialization
- Retry utility with fake timers
- DOM cache memoization
- Section modules in isolation

**Integration Tests**
- Proxy full flow with mocked scrapers
- Extension + proxy interaction
- Error scenario simulation

**E2E Tests**
- Full workflow on SCE site
- Performance benchmarks (target <1s for 80% of requests)
- Error recovery validation

## Implementation Phases

### Phase 1: Foundation (Week 1)
- Create `packages/error-handling/`
- Add to proxy server
- Verify standalone

### Phase 2: Proxy Optimization (Week 1-2)
- Implement Zillow/Redfin HTML scrapers
- Add response caching (1-hour TTL)
- Benchmark: <1s for 80% of requests

### Phase 3: Extension Modularization (Week 2-3)
- Split `content.js` into sections
- Implement lazy loading
- Add DOM cache
- Verify all 18 sections

### Phase 4: Integration & Testing (Week 3-4)
- Wire extension to error library
- Add retry logic
- Write unit/integration tests

### Phase 5: Validation (Week 4)
- E2E tests on real SCE site
- Performance benchmarks
- Documentation updates

Each phase is self-contained with independent rollback capability.

## Success Criteria

- Scraping time: <1s for 80% of requests (vs current 3-5s)
- Extension load: <5ms parse time (vs current ~50ms)
- Error visibility: Actionable messages for all failure modes
- Test coverage: >80% for new code

## Rollback Plan

- Keep `content.js.backup` during Phase 3
- Feature flags for new scrapers
- Versioned proxy API endpoints
