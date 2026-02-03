"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigurationError = exports.ValidationError = exports.NetworkError = exports.ScrapingError = exports.SceError = void 0;
class SceError extends Error {
    constructor(code, message, context = {}) {
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
exports.SceError = SceError;
class ScrapingError extends SceError {
    constructor(url, reason, context = {}) {
        super('SCRAPING_ERROR', `Scraping failed for ${url}: ${reason}`, {
            url,
            reason,
            ...context
        });
    }
}
exports.ScrapingError = ScrapingError;
class NetworkError extends SceError {
    constructor(message, context = {}) {
        super('NETWORK_ERROR', message, context);
    }
}
exports.NetworkError = NetworkError;
class ValidationError extends SceError {
    constructor(field, message) {
        super('VALIDATION_ERROR', `Validation failed for ${field}: ${message}`, { field });
    }
}
exports.ValidationError = ValidationError;
class ConfigurationError extends SceError {
    constructor(key, message) {
        super('CONFIG_ERROR', `Configuration error for ${key}: ${message}`, { key });
    }
}
exports.ConfigurationError = ConfigurationError;
