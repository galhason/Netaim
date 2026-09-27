import type { EventCapability } from '../capabilities/capabilities';
import { hasCapability } from '../capabilities/capabilities';
import type { EventPhase } from './phases';

/*
 * The lifecycle is a declarative transition map: every legal move is
 * listed, everything else is impossible. Extending the lifecycle means
 * extending this map, never adding conditional logic elsewhere.
 *
 * Retiring a conference is listed on every phase, and that is the one
 * entry here that is not a step forward. Archiving is not part of a
 * conference's progression -- it is something you may do to a conference
 * wherever it happens to stand, including a half-built draft you decided
 * not to run. It stays in the map rather than becoming a special case in
 * the service, because the law above is what makes the lifecycle
 * readable.
 *
 * Until it was listed this way, `archived` was reachable from `completed`
 * alone -- and nothing in the platform has ever moved a conference out of
 * `draft`: `phase` is written on create, on duplicate, and by this
 * engine, and launching writes `_status` only. So the Studio's archive
 * button could not work for any conference that has ever existed, and it
 * failed by doing nothing at all.
 */
const TRANSITIONS: Record<EventPhase, readonly EventPhase[]> = {
  draft: ['planning', 'archived'],
  planning: ['registrationOpen', 'preparation', 'archived'],
  registrationOpen: ['registrationClosed', 'archived'],
  registrationClosed: ['registrationOpen', 'preparation', 'archived'],
  preparation: ['live', 'archived'],
  live: ['completed', 'archived'],
  completed: ['archived'],
  /*
   * And back out again. `completed` alone was the only way out while
   * `completed` was also the only way in -- now that a conference can be
   * retired from anywhere, restoring every one of them to `completed`
   * would claim a draft that was abandoned had run and finished. Both
   * destinations are legal and the caller says which; the map does not
   * guess on its behalf.
   */
  archived: ['draft', 'completed'],
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
