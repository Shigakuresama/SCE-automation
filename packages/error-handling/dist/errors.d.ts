export declare class SceError extends Error {
    readonly code: string;
    readonly context: Record<string, unknown>;
    readonly timestamp: Date;
    constructor(code: string, message: string, context?: Record<string, unknown>);
    toJSON(): {
        code: string;
        message: string;
        context: Record<string, unknown>;
        timestamp: string;
        stack: string | undefined;
    };
}
export declare class ScrapingError extends SceError {
    constructor(url: string, reason: string, context?: Record<string, unknown>);
}
export declare class NetworkError extends SceError {
    constructor(message: string, context?: Record<string, unknown>);
}
export declare class ValidationError extends SceError {
    constructor(field: string, message: string);
}
export declare class ConfigurationError extends SceError {
    constructor(key: string, message: string);
}
