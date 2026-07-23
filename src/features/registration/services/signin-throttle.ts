/*
 * Sign-in throttling (defence in depth): passwords invite guessing, so
 * repeated failures on an account close its door for a while. Pure
 * decisions over an injected clock — the state lives in process memory,
 * which fits the platform's single-server deployment; a shared store
 * can replace the Map behind the same functions later.
 */
const WINDOW_MS = 15 * 60 * 1000;
const LOCK_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;

interface ThrottleEntry {
  failures: number[];
  lockedUntil: number;
}

const entries = new Map<string, ThrottleEntry>();

export const throttleKey = (email: string): string =>
  email.trim().toLowerCase();

/* Milliseconds until the account may try again; 0 when open. */
export const lockedFor = (key: string, now: number): number => {
  const entry = entries.get(key);
  if (!entry) {
    return 0;
  }
  return entry.lockedUntil > now ? entry.lockedUntil - now : 0;
};

export const recordFailure = (key: string, now: number): void => {
  const entry = entries.get(key) ?? { failures: [], lockedUntil: 0 };
  entry.failures = entry.failures.filter((at) => now - at < WINDOW_MS);
  entry.failures.push(now);
  if (entry.failures.length >= MAX_FAILURES) {
    entry.lockedUntil = now + LOCK_MS;
    entry.failures = [];
  }
  entries.set(key, entry);
};

export const recordSuccess = (key: string): void => {
  entries.delete(key);
};

/* Test seam: a fresh room for every suite. */
export const resetThrottle = (): void => {
  entries.clear();
};
