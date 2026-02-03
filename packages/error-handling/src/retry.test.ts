import { describe, it, expect, vi } from 'vitest';
import { retryWithBackoff } from './retry';
import { NetworkError } from './errors';

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
