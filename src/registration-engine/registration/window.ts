/*
 * When an activity takes registrations, and when a place may be given
 * back.
 *
 * The Studio writes four optional fields on an activity: a moment
 * registration opens, a moment it closes, whether a registrant may
 * cancel at all, and a last moment for doing so. Each is a rule only
 * when it is written: an activity with no window is open from the day
 * it is published until the day it is held, and an activity that says
 * nothing about cancelling allows it. A date that cannot be read is no
 * date, never a locked door.
 */
export interface RegistrationWindowInput {
  registrationOpensAt?: string;
  registrationClosesAt?: string;
}

export interface CancellationRuleInput {
  allowCancellation?: boolean;
  cancellationDeadline?: string;
}

export type RegistrationWindowState = 'open' | 'notYet' | 'closed';

const instant = (value: string | undefined): number | null => {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
};

export const registrationWindow = (
  input: RegistrationWindowInput,
  now: number,
): RegistrationWindowState => {
  const opens = instant(input.registrationOpensAt);
  const closes = instant(input.registrationClosesAt);
  if (opens !== null && now < opens) return 'notYet';
  if (closes !== null && now >= closes) return 'closed';
  return 'open';
};

/*
 * Whether a held place may be given back now. Leaving a waiting list is
 * always allowed — nothing was promised, so nothing is withheld; this
 * rule is for a confirmed seat, and the caller says which it is.
 */
export const cancellationAllowed = (
  input: CancellationRuleInput,
  now: number,
): boolean => {
  if (input.allowCancellation === false) return false;
  const deadline = instant(input.cancellationDeadline);
  return deadline === null || now < deadline;
};

/*
 * The organiser's two switches, as the change each one writes.
 *
 * Closing stops new registrations from this moment: the closing time
 * becomes now, and an opening still in the future is dropped so the
 * activity reads "closed" rather than "opens later". Reopening removes
 * the closing time, so registration runs until the activity is held.
 * Neither touches a registration: a place already held is a record of
 * its own, and the window only decides who may take a new one. A
 * switch that would change nothing answers null, and nothing is written.
 */
export type RegistrationWindowPatch = Partial<Record<keyof RegistrationWindowInput, string>>;

export const closingPatch = (
  input: RegistrationWindowInput,
  now: number,
): RegistrationWindowPatch | null => {
  const state = registrationWindow(input, now);
  if (state === 'closed') return null;
  return {
    registrationClosesAt: new Date(now).toISOString(),
    ...(state === 'notYet' ? { registrationOpensAt: '' } : {}),
  };
};

export const reopeningPatch = (
  input: RegistrationWindowInput,
  now: number,
): RegistrationWindowPatch | null =>
  registrationWindow(input, now) === 'closed' ? { registrationClosesAt: '' } : null;
