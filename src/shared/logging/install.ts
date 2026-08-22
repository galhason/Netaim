import { fileTransport } from './file-transport';
import { consoleTransport, createLogger, setLogTransport } from './logger';
import { currentRequestId } from './request-context';

/*
 * Installed once at boot, from the Node runtime only. Everything this
 * module reaches — `async_hooks` for the ambient request id, `fs` for
 * the log file — is unavailable in the edge runtime and in the browser,
 * which is why `logger.ts` itself knows about none of it and why
 * `instrumentation.ts` imports this behind a runtime branch.
 */

/*
 * The correlation id is stamped here rather than inside `write`, so the
 * logger core stays importable from a client component.
 */
const withCorrelation =
  (next: (entry: Parameters<typeof consoleTransport>[0]) => void) =>
  (entry: Parameters<typeof consoleTransport>[0]): void => {
    const requestId = currentRequestId();
    next(requestId ? { ...entry, requestId } : entry);
  };

export const installFileLogging = (): void => {
  setLogTransport(withCorrelation(fileTransport(consoleTransport)));

  const log = createLogger('platform');

  /*
   * An unhandled rejection used to vanish: no transport, no trace, and
   * the process kept serving. At minimum it is now on disk with the
   * request that caused it.
   */
  process.on('unhandledRejection', (reason) => {
    log.error('unhandled rejection', {
      reason: reason instanceof Error ? reason.message : String(reason),
      ...(reason instanceof Error && reason.stack
        ? { stack: reason.stack }
        : {}),
    });
  });

  process.on('uncaughtException', (error) => {
    log.error('uncaught exception', {
      reason: error.message,
      ...(error.stack ? { stack: error.stack } : {}),
    });
  });

  log.info('logging installed', { directory: process.env.LOG_DIR ?? 'logs' });
};
