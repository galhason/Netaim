/*
 * Retry policy for failed delivery, as a pure decision.
 *
 * A mail relay refusing for a minute must not cost a guest their
 * confirmation. Equally, an address that will never accept mail must
 * not be tried forever — a permanently failing message retried on every
 * sweep becomes a slow, self-inflicted denial of service against the
 * relay, and gets the platform's sending reputation ruined.
 */
export const MAX_ATTEMPTS = 5;

/* Doubling, from a minute: 1, 2, 4, 8, 16. Roughly half an hour in all. */
const BASE_DELAY_MS = 60 * 1000;

export const backoffMs = (attempts: number): number =>
  BASE_DELAY_MS * 2 ** Math.max(0, attempts - 1);

export interface RetryCandidate {
  attempts: number;
  /* When the last attempt was made, as epoch milliseconds. */
  lastAttemptAt: number;
}

/*
 * Whether this message is due for another attempt. Exhausted messages
 * are left alone rather than deleted: an operator reading the outbox
 * should still be able to see that the platform tried and gave up.
 */
export const isDue = (candidate: RetryCandidate, now: number): boolean => {
  if (candidate.attempts >= MAX_ATTEMPTS) {
    return false;
  }
  return now - candidate.lastAttemptAt >= backoffMs(candidate.attempts);
};

export const isExhausted = (candidate: RetryCandidate): boolean =>
  candidate.attempts >= MAX_ATTEMPTS;
