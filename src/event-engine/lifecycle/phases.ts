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
