import { beforeEach, describe, expect, it } from 'vitest';
import {
  lockedFor,
  recordFailure,
  recordSuccess,
  resetThrottle,
  throttleKey,
} from '@/features/registration/services/signin-throttle';

/*
 * The door's patience: five failures in a window close the account for
 * a while; success clears the slate; time reopens the door.
 */
describe('sign-in throttle', () => {
  beforeEach(() => resetThrottle());

  const key = throttleKey('  Person@Example.com ');

  it('normalizes the key', () => {
    expect(key).toBe('person@example.com');
  });

  it('locks after five failures and reopens after the lock passes', () => {
    const start = 1_000_000;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      recordFailure(key, start + attempt);
      expect(lockedFor(key, start + attempt)).toBe(0);
    }
    recordFailure(key, start + 4);
    expect(lockedFor(key, start + 5)).toBeGreaterThan(0);
    expect(lockedFor(key, start + 4 + 15 * 60 * 1000 + 1)).toBe(0);
  });

  it('forgets old failures outside the window', () => {
    const start = 1_000_000;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      recordFailure(key, start + attempt);
    }
    /* the fifth failure lands after the window — no lock */
    recordFailure(key, start + 16 * 60 * 1000);
    expect(lockedFor(key, start + 16 * 60 * 1000)).toBe(0);
  });

  it('clears on success', () => {
    const start = 1_000_000;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      recordFailure(key, start + attempt);
    }
    recordSuccess(key);
    recordFailure(key, start + 10);
    expect(lockedFor(key, start + 11)).toBe(0);
  });
});
