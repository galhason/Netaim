import { describe, expect, it } from 'vitest';
import {
  RATE_LIMITS,
  consume,
  emptyCounter,
  isExpired,
  type RateLimitCounter,
} from '@/permission-engine';

/*
 * The abuse policy, exercised as pure decisions. These replace the
 * sign-in throttle's tests: the same rules now cover every protected
 * action, and the counter is an argument rather than process memory.
 */
const spend = (
  action: Parameters<typeof consume>[0],
  times: number,
  start = 0,
): { counter: RateLimitCounter | null; lastAllowed: boolean } => {
  let counter: RateLimitCounter | null = null;
  let lastAllowed = true;
  for (let i = 0; i < times; i += 1) {
    const decision = consume(action, counter, start);
    counter = decision.next;
    lastAllowed = decision.allowed;
  }
  return { counter, lastAllowed };
};

describe('rate limit policy', () => {
  it('allows exactly the declared allowance, then refuses', () => {
    const { attempts } = RATE_LIMITS['sign-in'];

    const within = spend('sign-in', attempts);
    expect(within.lastAllowed).toBe(true);

    const beyond = consume('sign-in', within.counter, 0);
    expect(beyond.allowed).toBe(false);
    expect(beyond.retryAfterMs).toBe(RATE_LIMITS['sign-in'].blockMs);
  });

  it('keeps refusing while blocked, and reports the remaining wait', () => {
    const { attempts, blockMs } = RATE_LIMITS['sign-in'];
    const blocked = consume('sign-in', spend('sign-in', attempts).counter, 0);

    const midway = consume('sign-in', blocked.next, blockMs / 2);
    expect(midway.allowed).toBe(false);
    expect(midway.retryAfterMs).toBe(blockMs / 2);
  });

  it('does not extend a block when the closed door is hammered', () => {
    const { attempts, blockMs } = RATE_LIMITS['sign-in'];
    const blocked = consume('sign-in', spend('sign-in', attempts).counter, 0);

    let counter = blocked.next;
    for (let i = 0; i < 50; i += 1) {
      counter = consume('sign-in', counter, 1000).next;
    }
    /* The victim is free at the original deadline, not 50 attempts later. */
    expect(consume('sign-in', counter, blockMs + 1).allowed).toBe(true);
  });

  it('opens again once the block expires', () => {
    const { attempts, blockMs } = RATE_LIMITS['magic-link'];
    const blocked = consume(
      'magic-link',
      spend('magic-link', attempts).counter,
      0,
    );
    expect(consume('magic-link', blocked.next, blockMs + 1).allowed).toBe(true);
  });

  it('starts a fresh window once the old one ages out', () => {
    const { attempts, windowMs } = RATE_LIMITS['magic-link'];
    const spent = spend('magic-link', attempts).counter;

    const later = consume('magic-link', spent, windowMs + 1);
    expect(later.allowed).toBe(true);
    expect(later.next?.attempts).toBe(1);
  });

  it('counts attempts within the window rather than resetting on each call', () => {
    const first = consume('magic-link', null, 0);
    const second = consume('magic-link', first.next, 1000);
    expect(second.next?.attempts).toBe(2);
    expect(second.next?.windowStartedAt).toBe(0);
  });

  it('gives every action its own allowance', () => {
    /* A room full of people chats continuously; sign-in must stay tight. */
    expect(RATE_LIMITS['chat-message'].attempts).toBeGreaterThan(
      RATE_LIMITS['sign-in'].attempts,
    );
    for (const policy of Object.values(RATE_LIMITS)) {
      expect(policy.attempts).toBeGreaterThan(0);
      expect(policy.windowMs).toBeGreaterThan(0);
      expect(policy.blockMs).toBeGreaterThan(0);
    }
  });

  it('treats a counter as sweepable only once it can refuse nobody', () => {
    const { attempts, windowMs, blockMs } = RATE_LIMITS['sign-in'];

    expect(isExpired('sign-in', emptyCounter(0), 0)).toBe(false);
    expect(isExpired('sign-in', emptyCounter(0), windowMs + 1)).toBe(true);

    const blocked = consume('sign-in', spend('sign-in', attempts).counter, 0);
    const counter = blocked.next;
    expect(counter, 'a refusal must still return a counter to persist')
      .not.toBeNull();
    if (!counter) {
      return;
    }
    expect(isExpired('sign-in', counter, 1000)).toBe(false);
    expect(isExpired('sign-in', counter, blockMs + windowMs + 1)).toBe(true);
  });
});
