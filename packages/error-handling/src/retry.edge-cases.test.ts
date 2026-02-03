import { describe, it, expect, vi } from 'vitest';
import { retryWithBackoff } from './retry';
import { NetworkError, ScrapingError } from './errors';

describe('retryWithBackoff edge cases', () => {
  it('should calculate exponential backoff delays correctly', async () => {
    const startTime = Date.now();
    const delays = [];

    const fn = vi.fn()
      .mockRejectedValueOnce(new NetworkError('timeout'))
      .mockRejectedValueOnce(new NetworkError('timeout'))
      .mockResolvedValueOnce('success');

    // Mock delay to track calls
    const originalSetTimeout = global.setTimeout;
    global.setTimeout = vi.fn((cb, ms) => {
      delays.push(ms);
      return originalSetTimeout(cb, ms);
    });

    try {
      await retryWithBackoff(fn, { maxAttempts: 3, baseDelayMs: 50, maxDelayMs: 1000 });
    } finally {
      global.setTimeout = originalSetTimeout;
    }

    // Should be ~50ms + ~100ms = ~150ms total
    expect(delays).toEqual([50, 100]);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should NOT retry ScrapingError with NOT_FOUND reason', async () => {
    const fn = vi.fn().mockRejectedValue(
      new ScrapingError('url', 'NOT_FOUND')
    );

    await expect(retryWithBackoff(fn)).rejects.toThrow();
    expect(fn).toHaveBeenCalledTimes(1); // Only called once, no retries
  });

  it('should NOT retry non-SceError errors', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('Random error'));

    await expect(retryWithBackoff(fn)).rejects.toThrow();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should cap delay at maxDelayMs', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new NetworkError('timeout'))
      .mockRejectedValueOnce(new NetworkError('timeout'))
      .mockRejectedValueOnce(new NetworkError('timeout'))
      .mockResolvedValueOnce('success');

    const delays = [];
    const originalSetTimeout = global.setTimeout;
    global.setTimeout = vi.fn((cb, ms) => {
      delays.push(ms);
      return originalSetTimeout(cb, ms);
    });

    try {
      await retryWithBackoff(fn, { maxAttempts: 4, baseDelayMs: 100, maxDelayMs: 150 });
    } finally {
      global.setTimeout = originalSetTimeout;
    }

    // Should be 100, 150 (capped), 150 (capped) - not 200, 400
    expect(delays).toEqual([100, 150, 150]);
  });

  it('should return immediately on first success', async () => {
    const fn = vi.fn().mockResolvedValue('success');

    const result = await retryWithBackoff(fn);

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
