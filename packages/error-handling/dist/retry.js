"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.retryWithBackoff = retryWithBackoff;
const errors_1 = require("./errors");
const DEFAULT_OPTIONS = {
    maxAttempts: 3,
    baseDelayMs: 1000,
    maxDelayMs: 10000
};
function isRetryableError(error) {
    if (!(error instanceof errors_1.SceError))
        return false;
    return error instanceof errors_1.NetworkError ||
        (error instanceof errors_1.ScrapingError && error.context.reason !== 'NOT_FOUND');
}
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
async function retryWithBackoff(fn, options = {}) {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    let lastError;
    for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
        try {
            return await fn();
        }
        catch (error) {
            lastError = error;
            if (!isRetryableError(error) || attempt === opts.maxAttempts) {
                throw error;
            }
            const delayMs = Math.min(opts.baseDelayMs * Math.pow(2, attempt - 1), opts.maxDelayMs);
            await delay(delayMs);
        }
    }
    throw lastError;
}
