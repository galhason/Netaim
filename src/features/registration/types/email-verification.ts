import type { RegisterFormValues } from '../schemas/register-form';

/*
 * A registration held between the form and the account.
 *
 * Everything the person filled in, plus the password they chose — hashed
 * before it ever reaches this shape, so the plain one exists only for
 * the length of the request that received it.
 */
export interface PendingRegistration {
  slug: string;
  locale: string;
  passwordHash: string;
  details: RegisterFormValues;
}

export interface PendingVerification {
  emailHash: string;
  codeHash: string;
  pending: PendingRegistration;
  expiresAt: string;
  attempts: number;
}

export interface EmailVerificationRepository {
  /*
   * One live verification per address: asking again replaces the code,
   * the deadline and the count of wrong guesses. Otherwise a second
   * request would leave the first code working.
   */
  put(entry: Omit<PendingVerification, 'attempts'>): Promise<void>;
  find(emailHash: string): Promise<PendingVerification | null>;
  /* A wrong guess. Returns the number of guesses so far, including this one. */
  countAttempt(emailHash: string): Promise<number>;
  discard(emailHash: string): Promise<void>;
  /* Removes everything past its deadline. Called as the store is used. */
  sweep(nowIso: string): Promise<number>;
}
