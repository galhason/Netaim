import type { CapacityView } from '../capacity/capacity';

export const REGISTRATION_MODES = ['open', 'approval', 'invitation'] as const;

export type RegistrationMode = (typeof REGISTRATION_MODES)[number];

export const isRegistrationMode = (value: string): value is RegistrationMode =>
  (REGISTRATION_MODES as readonly string[]).includes(value);

export type RegistrationOutcome = 'confirmed' | 'pending' | 'waitlisted';

/*
 * The mode decides the immediate outcome of a submission
 * (Registration-Architecture §3). Capacity only gates the open mode;
 * approval always queues; invitation holds a place and confirms.
 */
export const decideOutcome = (
  mode: RegistrationMode,
  capacity: CapacityView,
): RegistrationOutcome => {
  if (mode === 'approval') {
    return 'pending';
  }
  if (mode === 'invitation') {
    return 'confirmed';
  }
  return capacity.state === 'full' ? 'waitlisted' : 'confirmed';
};
