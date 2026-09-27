export const EVENT_PHASES = [
  'draft',
  'planning',
  'registrationOpen',
  'registrationClosed',
  'preparation',
  'live',
  'completed',
  'archived',
] as const;

export type EventPhase = (typeof EVENT_PHASES)[number];

export const isEventPhase = (value: string): value is EventPhase =>
  (EVENT_PHASES as readonly string[]).includes(value);

/*
 * A retired conference is not on the air.
 *
 * Archiving means "put this away, read-only", and something put away
 * cannot be the site the public sees. The rule belongs to the phase, not
 * to the button that happens to trigger it, so it is stated here and
 * enforced at the single place that writes a phase.
 */
export const phaseIsOffAir = (phase: EventPhase): boolean =>
  phase === 'archived';
