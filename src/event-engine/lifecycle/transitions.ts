import type { EventCapability } from '../capabilities/capabilities';
import { hasCapability } from '../capabilities/capabilities';
import type { EventPhase } from './phases';

/*
 * The lifecycle is a declarative transition map: every legal move is
 * listed, everything else is impossible. Extending the lifecycle means
 * extending this map, never adding conditional logic elsewhere.
 */
const TRANSITIONS: Record<EventPhase, readonly EventPhase[]> = {
  draft: ['planning'],
  planning: ['registrationOpen', 'preparation'],
  registrationOpen: ['registrationClosed'],
  registrationClosed: ['registrationOpen', 'preparation'],
  preparation: ['live'],
  live: ['completed'],
  completed: ['archived'],
  archived: ['completed'],
};

const REQUIRES_REGISTRATION: readonly EventPhase[] = [
  'registrationOpen',
  'registrationClosed',
];

export const availableTransitions = (
  phase: EventPhase,
  capabilities: readonly EventCapability[],
): EventPhase[] =>
  TRANSITIONS[phase].filter(
    (target) =>
      !REQUIRES_REGISTRATION.includes(target) ||
      hasCapability(capabilities, 'registration'),
  );

export const canTransition = (
  from: EventPhase,
  to: EventPhase,
  capabilities: readonly EventCapability[],
): boolean => availableTransitions(from, capabilities).includes(to);
