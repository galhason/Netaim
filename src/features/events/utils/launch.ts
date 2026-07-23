import type { EventHealth } from '@/event-engine';

/*
 * The launch gate is pure domain logic: an experience may go live only
 * when EventHealth reports zero blockers. Kept as a standalone utility
 * so the rule is testable without touching infrastructure.
 */
export const isLaunchable = (health: EventHealth): boolean =>
  health.blockers === 0;
