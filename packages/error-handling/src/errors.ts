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
