/*
 * Abuse limits, as policy rather than as code sprinkled through the
 * surfaces. Each protected action declares how many attempts it allows
 * inside a window and how long the door stays shut once that allowance
 * is spent. The decision is pure: state arrives as an argument and
 * leaves as a result, so the same rules hold over process memory, over
 * Postgres, or over anything that replaces it.
 */
export type RateLimitedAction =
  | 'magic-link'
  | 'registration'
  | 'sign-in'
  | 'check-in';

export interface RateLimitPolicy {
  /* Attempts permitted inside one window. */
  attempts: number;
  windowMs: number;
  /* How long the door stays shut after the allowance is spent. */
  blockMs: number;
}

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

/*
 * The numbers are deliberately generous for humans and hostile to
 * scripts. Sign-in is the tightest because a password is being guessed;
 * check-in is the loosest because a door operator scans continuously.
 */
export const RATE_LIMITS: Record<RateLimitedAction, RateLimitPolicy> = {
  'magic-link': { attempts: 5, windowMs: HOUR, blockMs: HOUR },
  registration: { attempts: 10, windowMs: HOUR, blockMs: 30 * MINUTE },
  'sign-in': { attempts: 5, windowMs: 15 * MINUTE, blockMs: 15 * MINUTE },
  'check-in': { attempts: 300, windowMs: MINUTE, blockMs: MINUTE },
};

/* The counter as stored. `blockedUntil` is null while the door is open. */
export interface RateLimitCounter {
  attempts: number;
  windowStartedAt: number;
  blockedUntil: number | null;
}

export interface RateLimitDecision {
  allowed: boolean;
  /* Milliseconds until the caller may try again; 0 when allowed. */
  retryAfterMs: number;
  /* The counter to persist, or null when the row can be dropped. */
  next: RateLimitCounter | null;
}

export const emptyCounter = (now: number): RateLimitCounter => ({
  attempts: 0,
  windowStartedAt: now,
  blockedUntil: null,
});

/*
 * Records one attempt and answers whether it may proceed. A blocked
 * caller is refused without extending its own block — hammering a
 * closed door must not make the wait longer, or an attacker could lock
 * a victim out indefinitely by attacking them.
 */
export const consume = (
  action: RateLimitedAction,
  counter: RateLimitCounter | null,
  now: number,
): RateLimitDecision => {
  const policy = RATE_LIMITS[action];
  const current = counter ?? emptyCounter(now);

  if (current.blockedUntil !== null && current.blockedUntil > now) {
    return {
      allowed: false,
      retryAfterMs: current.blockedUntil - now,
      next: current,
    };
  }

  /* A fresh window: either the first attempt, or the old one aged out. */
  const windowExpired = now - current.windowStartedAt >= policy.windowMs;
  const attempts = windowExpired ? 1 : current.attempts + 1;
  const windowStartedAt = windowExpired ? now : current.windowStartedAt;

  if (attempts > policy.attempts) {
    return {
      allowed: false,
      retryAfterMs: policy.blockMs,
      next: {
        attempts: 0,
        windowStartedAt: now,
        blockedUntil: now + policy.blockMs,
      },
    };
  }

  return {
    allowed: true,
    retryAfterMs: 0,
    next: { attempts, windowStartedAt, blockedUntil: null },
  };
};

/*
 * A counter is worth keeping only while it could still refuse someone.
 * Everything older is sweepable — this keeps the table from growing by
 * one row per address forever.
 */
export const isExpired = (
  action: RateLimitedAction,
  counter: RateLimitCounter,
  now: number,
): boolean => {
  const policy = RATE_LIMITS[action];
  if (counter.blockedUntil !== null && counter.blockedUntil > now) {
    return false;
  }
  return now - counter.windowStartedAt >= policy.windowMs;
};
