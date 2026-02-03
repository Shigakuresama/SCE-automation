export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export interface LogEntry {
    level: LogLevel;
    timestamp: string;
    component: string;
    message: string;
    context?: Record<string, unknown>;
}
export declare class Logger {
    private component;
    private level;
    constructor(component: string, level?: LogLevel);
    private shouldLog;
    private log;
    debug(message: string, context?: Record<string, unknown>): void;
    info(message: string, context?: Record<string, unknown>): void;
    warn(message: string, context?: Record<string, unknown>): void;
    error(message: string, context?: Record<string, unknown>): void;
}
