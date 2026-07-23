import type { RegistrationStatus } from './registration-status';

/*
 * The single legal state machine (Registration-Architecture §2). Every
 * status change goes through applyTransition; the application layer emits
 * the matching domain event at this seam. No surface writes status.
 */
const ALLOWED: Record<RegistrationStatus, readonly RegistrationStatus[]> = {
  pending: ['confirmed', 'declined', 'waitlisted', 'cancelled'],
  confirmed: ['attended', 'cancelled', 'noShow'],
  waitlisted: ['confirmed', 'expired', 'cancelled'],
  attended: [],
  declined: [],
  cancelled: [],
  expired: [],
  noShow: [],
};

export type RegistrationTransitionResult =
  | { ok: true; status: RegistrationStatus }
  | { ok: false; from: RegistrationStatus; to: RegistrationStatus };

export const availableTransitions = (
  from: RegistrationStatus,
): readonly RegistrationStatus[] => ALLOWED[from];

export const canTransition = (
  from: RegistrationStatus,
  to: RegistrationStatus,
): boolean => ALLOWED[from].includes(to);

export const applyTransition = (
  from: RegistrationStatus,
  to: RegistrationStatus,
): RegistrationTransitionResult =>
  canTransition(from, to) ? { ok: true, status: to } : { ok: false, from, to };
