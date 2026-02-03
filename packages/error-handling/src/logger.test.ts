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
