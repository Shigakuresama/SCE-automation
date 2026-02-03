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
