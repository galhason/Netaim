import type { LifecycleStage } from '../types/experience';

/*
 * The life of an experience, not its publishing (Constitution v2 §8).
 * Transitions are the only legal moves; the Runtime and the Studio both
 * consult this single map.
 */
const TRANSITIONS: Record<LifecycleStage, LifecycleStage[]> = {
  draft: ['planning', 'archive'],
  planning: ['building', 'archive'],
  building: ['review', 'archive'],
  review: ['building', 'scheduled', 'archive'],
  scheduled: ['live', 'review', 'archive'],
  live: ['inProgress', 'completed'],
  inProgress: ['completed'],
  completed: ['archive'],
  archive: [],
};

export const canTransition = (
  from: LifecycleStage,
  to: LifecycleStage,
): boolean => TRANSITIONS[from].includes(to);

export const nextStages = (from: LifecycleStage): LifecycleStage[] =>
  TRANSITIONS[from];
