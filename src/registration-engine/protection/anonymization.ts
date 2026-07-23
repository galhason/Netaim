/*
 * Participant data protection (Domain-Blueprint risk 4, build gate).
 * Deletion is anonymization: identity is replaced by a tombstone while
 * attendance statistics — carried by the registration status — survive
 * without a person. Pure; the scheduled purge is a sequenced sweep.
 */

export const TOMBSTONE_NAME = 'Removed participant';
export const TOMBSTONE_EMAIL = 'anonymized@removed.invalid';

export interface ParticipantIdentity {
  name: string;
  email: string;
  phone?: string;
}

export interface AnonymizedParticipant {
  name: string;
  email: string;
  phone?: undefined;
  anonymizedAt: string;
}

export const anonymizeParticipant = (at: string): AnonymizedParticipant => ({
  name: TOMBSTONE_NAME,
  email: TOMBSTONE_EMAIL,
  phone: undefined,
  anonymizedAt: at,
});

export interface RetentionPolicy {
  days: number | null;
}

const DAY_MS = 86400000;

export const retentionExpired = (
  registeredAt: string,
  policy: RetentionPolicy,
  now: number,
): boolean => {
  if (policy.days === null) {
    return false;
  }
  const registered = Date.parse(registeredAt);
  if (Number.isNaN(registered)) {
    return false;
  }
  return now - registered >= policy.days * DAY_MS;
};
