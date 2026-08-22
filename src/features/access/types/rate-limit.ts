import type { RateLimitCounter, RateLimitedAction } from '@/permission-engine';

/*
 * Where abuse counters live. The engine decides; this contract only
 * remembers. Declared by the application layer and implemented at the
 * infrastructure seam, so the policy never learns what a table is.
 */
export interface RateLimitRepository {
  read: (bucket: string) => Promise<RateLimitCounter | null>;
  write: (bucket: string, counter: RateLimitCounter) => Promise<void>;
  clear: (bucket: string) => Promise<void>;
}

export interface RateLimitOutcome {
  allowed: boolean;
  retryAfterSeconds: number;
}

export type RateLimitCheck = (
  action: RateLimitedAction,
  subject: string,
) => Promise<RateLimitOutcome>;
