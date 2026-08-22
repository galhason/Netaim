import { appendFile, mkdir, readdir, rename, stat, unlink } from 'fs/promises';
import path from 'path';
import type { LogEntry, LogTransport } from './logger';

/*
 * Logs on disk, and nowhere else. The platform serves a public body, so
 * no log line leaves the server: no Sentry, no APM, no third party. The
 * transport contract stays swappable if that decision ever changes.
 *
 * One file, rotated by size, with a bounded number of generations — an
 * unbounded log on a single box eventually fills the disk and takes the
 * database down with it.
 *
 * This module is Node-only. It is reached solely from `install.ts`,
 * which `instrumentation.ts` imports inside a `NEXT_RUNTIME === 'nodejs'`
 * branch, so the edge bundle never resolves these built-ins. The
 * specifiers are bare rather than `node:`-prefixed: webpack's edge
 * target rejects the `node:` scheme outright, and a bare specifier
 * fails more gracefully if this module is ever pulled somewhere it
 * should not be.
 */
const MAX_BYTES = 16 * 1024 * 1024;
const MAX_FILES = 7;

const directory = (): string =>
  process.env.LOG_DIR ?? path.join(process.cwd(), 'logs');

const activeFile = (): string => path.join(directory(), 'hason.log');

/*
 * Writes are appended in order through a single promise chain. Without
 * it, concurrent requests interleave partial lines and the file stops
 * being parseable.
 */
let queue: Promise<void> = Promise.resolve();

const rotate = async (): Promise<void> => {
  const dir = directory();
  const current = activeFile();
  const size = await stat(current)
    .then((info) => info.size)
    .catch(() => 0);
  if (size < MAX_BYTES) {
    return;
  }
  await rename(current, path.join(dir, `hason-${Date.now()}.log`)).catch(
    () => undefined,
  );
  const files = await readdir(dir).catch(() => [] as string[]);
  const archived = files
    .filter((name) => /^hason-\d+\.log$/.test(name))
    .sort()
    .reverse();
  await Promise.all(
    archived
      .slice(MAX_FILES)
      .map((name) => unlink(path.join(dir, name)).catch(() => undefined)),
  );
};

const write = async (entry: LogEntry): Promise<void> => {
  await mkdir(directory(), { recursive: true }).catch(() => undefined);
  await rotate();
  await appendFile(activeFile(), `${JSON.stringify(entry)}\n`, 'utf8').catch(
    () => undefined,
  );
};

/*
 * Also mirrors to the console so `pm2 logs` still shows what is
 * happening; the file is what survives a restart.
 */
export const fileTransport =
  (fallback: LogTransport): LogTransport =>
  (entry) => {
    fallback(entry);
    queue = queue.then(() => write(entry)).catch(() => undefined);
  };
