import type { RegistrationOutcome } from '../registration/mode';
import type { RegistrationStatus } from '../registration/registration-status';

/*
 * The engine emits; it never sends. Notification and Audit subscribe
 * (Platform-Engines §2.10–2.11). Emitters never know their subscribers.
 */
export const REGISTRATION_EVENT_TYPES = [
  'registration.confirmed',
  'registration.pending',
  'registration.waitlisted',
  'registration.approved',
  'registration.declined',
  'registration.promoted',
  'registration.cancelled',
] as const;

export type RegistrationEventType = (typeof REGISTRATION_EVENT_TYPES)[number];

export interface RegistrationDomainEvent {
  type: RegistrationEventType;
  registrationId: string;
  participantId: string;
  eventSlug: string;
  occurredAt: string;
}

const OUTCOME_EVENT: Record<RegistrationOutcome, RegistrationEventType> = {
  confirmed: 'registration.confirmed',
  pending: 'registration.pending',
  waitlisted: 'registration.waitlisted',
};

export const eventForOutcome = (
  outcome: RegistrationOutcome,
): RegistrationEventType => OUTCOME_EVENT[outcome];

/*
 * Manager and lifecycle transitions map to their meaningful event; a
 * transition with no participant-facing consequence returns null.
 */
export const eventForTransition = (
  from: RegistrationStatus,
  to: RegistrationStatus,
): RegistrationEventType | null => {
  if (to === 'confirmed') {
    return from === 'waitlisted'
      ? 'registration.promoted'
      : 'registration.approved';
  }
  if (to === 'declined') {
    return 'registration.declined';
  }
  if (to === 'cancelled') {
    return 'registration.cancelled';
  }
  return null;
};
