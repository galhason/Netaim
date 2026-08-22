import { createHash } from 'crypto';
import { rateLimitRepository } from '@/infrastructure';
import { consume, type RateLimitedAction } from '@/permission-engine';
import { createLogger } from '@/shared';
import type { RateLimitOutcome } from '../types/rate-limit';

const log = createLogger('rate-limit');

/*
 * The subject — an email address, an IP, a token — is hashed before it
 * becomes a key. Abuse counters must not turn into a list of who tried
 * to sign in and from where.
 */
const bucketFor = (action: RateLimitedAction, subject: string): string => {
  const normalized = subject.trim().toLowerCase();
  const digest = createHash('sha256').update(normalized).digest('hex');
  return `${action}:${digest.slice(0, 32)}`;
};

const allowed: RateLimitOutcome = { allowed: true, retryAfterSeconds: 0 };

/*
 * Records an attempt and answers whether it may proceed.
 *
 * A storage failure lets the caller through. The alternative — refusing
 * everyone when the counter table is unreachable — turns a database
 * hiccup into a total outage of sign-in and registration. The failure is
 * logged so it cannot pass unnoticed.
 */
export const checkRateLimit = async (
  action: RateLimitedAction,
  subject: string,
): Promise<RateLimitOutcome> => {
  if (!subject.trim()) {
    return allowed;
  }
  const bucket = bucketFor(action, subject);
  try {
    const counter = await rateLimitRepository.read(bucket);
    const decision = consume(action, counter, Date.now());
    if (decision.next) {
      await rateLimitRepository.write(bucket, decision.next);
    }
    if (!decision.allowed) {
      log.warn('refused', { action, retryAfterMs: decision.retryAfterMs });
    }
    return {
      allowed: decision.allowed,
      retryAfterSeconds: Math.ceil(decision.retryAfterMs / 1000),
    };
  } catch (error) {
    log.error('counter unavailable, allowing attempt', {
      action,
      error: error instanceof Error ? error.message : String(error),
    });
    return allowed;
  }
};

/*
 * Clears the counter after a legitimate success, so an account that
 * mistyped its password four times starts clean once it gets in.
 */
export const clearRateLimit = async (
  action: RateLimitedAction,
  subject: string,
): Promise<void> => {
  if (!subject.trim()) {
    return;
  }
  await rateLimitRepository
    .clear(bucketFor(action, subject))
    .catch(() => undefined);
};
