import type { CapacityView } from '../capacity/capacity';

export const PUBLIC_REGISTRATION_STATES = [
  'draft',
  'open',
  'limited',
  'waitlist',
  'closed',
  'cancelled',
  'completed',
] as const;

export type PublicRegistrationState =
  (typeof PUBLIC_REGISTRATION_STATES)[number];

export interface RegistrationStateInput {
  published: boolean;
  cancelled?: boolean;
  opensAt?: string;
  closesAt?: string;
  eventEndedAt?: string;
  waitlistEnabled: boolean;
  capacity: CapacityView;
  now: number;
}

const before = (iso: string | undefined, now: number): boolean =>
  iso !== undefined && !Number.isNaN(Date.parse(iso)) && now < Date.parse(iso);

const after = (iso: string | undefined, now: number): boolean =>
  iso !== undefined && !Number.isNaN(Date.parse(iso)) && now > Date.parse(iso);

/*
 * One derivation of the public registration state consumed by the Studio
 * badge, the Join scene and the participant /me — never stored, never
 * duplicated (Registration-Architecture §5).
 */
export const deriveRegistrationState = (
  input: RegistrationStateInput,
): PublicRegistrationState => {
  if (!input.published) {
    return 'draft';
  }
  if (input.cancelled) {
    return 'cancelled';
  }
  if (after(input.eventEndedAt, input.now)) {
    return 'completed';
  }
  if (before(input.opensAt, input.now) || after(input.closesAt, input.now)) {
    return 'closed';
  }
  if (input.capacity.state === 'full') {
    return input.waitlistEnabled ? 'waitlist' : 'closed';
  }
  if (input.capacity.state === 'limited') {
    return 'limited';
  }
  return 'open';
};
