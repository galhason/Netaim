import type { EventCapability } from '../capabilities/capabilities';
import type { EventPhase } from './phases';
import { availableTransitions, canTransition } from './transitions';

export type TransitionResult =
  | { ok: true; phase: EventPhase }
  | { ok: false; from: EventPhase; to: EventPhase; allowed: EventPhase[] };

/*
 * The single owner of lifecycle transitions. Persistence adapters call
 * this service and store its result; nothing else moves an event
 * between phases.
 */
export const transitionEvent = (
  from: EventPhase,
  to: EventPhase,
  capabilities: readonly EventCapability[],
): TransitionResult => {
  if (canTransition(from, to, capabilities)) {
    return { ok: true, phase: to };
  }
  return {
    ok: false,
    from,
    to,
    allowed: availableTransitions(from, capabilities),
  };
};
