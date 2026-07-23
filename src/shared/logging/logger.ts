export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogContext = Record<
  string,
  string | number | boolean | readonly string[]
>;

export interface LogEntry {
  level: LogLevel;
  scope: string;
  message: string;
  timestamp: string;
  context?: LogContext;
}

export type LogTransport = (entry: LogEntry) => void;

/*
 * The single sanctioned console usage on the platform. All runtime
 * logging flows through the active transport so it can be redirected
 * to a monitoring service without touching call sites.
 */
/* eslint-disable no-console */
const consoleWriters: Record<LogLevel, (message: string) => void> = {
  debug: console.info,
  info: console.info,
  warn: console.warn,
  error: console.error,
};
/* eslint-enable no-console */

const consoleTransport: LogTransport = (entry) => {
  consoleWriters[entry.level](JSON.stringify(entry));
};

let activeTransport: LogTransport = consoleTransport;

export const setLogTransport = (transport: LogTransport): void => {
  activeTransport = transport;
};

export interface Logger {
  debug: (message: string, context?: LogContext) => void;
  info: (message: string, context?: LogContext) => void;
  warn: (message: string, context?: LogContext) => void;
  error: (message: string, context?: LogContext) => void;
}

const write = (
  level: LogLevel,
  scope: string,
  message: string,
  context?: LogContext,
): void => {
  activeTransport({
    level,
    scope,
    message,
    timestamp: new Date().toISOString(),
    ...(context ? { context } : {}),
  });
};

export const createLogger = (scope: string): Logger => ({
  debug: (message, context) => write('debug', scope, message, context),
  info: (message, context) => write('info', scope, message, context),
  warn: (message, context) => write('warn', scope, message, context),
  error: (message, context) => write('error', scope, message, context),
});
