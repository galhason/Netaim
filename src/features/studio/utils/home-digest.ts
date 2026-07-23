import type { EventPhase, Finding } from '@/event-engine';
import type { EventSummary, LaunchReview } from '@/features/events';

/*
 * The pure shape of Home's four questions (Studio-Workspace-Architecture
 * §4). Type-only imports keep this testable with zero infrastructure, as
 * the readiness and slug utilities are. "Recently" has no source until
 * the Audit engine and is deliberately not modelled here.
 */

const DAY_MS = 86400000;
const UPCOMING_LIMIT = 4;

export interface HomeContinue {
  eventTitle: string;
  eventSlug: string;
  daysToEvent: number | null;
  focusPhase: EventPhase;
  readinessScore: number;
  blockers: number;
}

export interface HomeUpcoming {
  slug: string;
  title: string;
  phase: EventPhase;
  daysToEvent: number | null;
}

export interface StudioHomeDigest {
  continue: HomeContinue | null;
  needsAttention: Finding[];
  upcoming: HomeUpcoming[];
}

export interface HomeDigestSources {
  events: EventSummary[];
  activeReview: LaunchReview | null;
}

export const daysUntil = (
  iso: string | undefined,
  now: number,
): number | null => {
  if (!iso) {
    return null;
  }
  const remaining = Date.parse(iso) - now;
  return Number.isNaN(remaining)
    ? null
    : Math.max(0, Math.ceil(remaining / DAY_MS));
};

const isUpcoming = (iso: string | undefined, now: number): boolean =>
  iso !== undefined && !Number.isNaN(Date.parse(iso)) && Date.parse(iso) >= now;

export const buildHomeDigest = (
  { events, activeReview }: HomeDigestSources,
  now: number,
): StudioHomeDigest => {
  const activeSlug = activeReview?.event.slug;

  const upcoming = events
    .filter(
      (event) =>
        event.slug !== activeSlug &&
        event.phase !== 'archived' &&
        isUpcoming(event.startsAt, now),
    )
    .sort((a, b) => Date.parse(a.startsAt ?? '') - Date.parse(b.startsAt ?? ''))
    .slice(0, UPCOMING_LIMIT)
    .map((event) => ({
      slug: event.slug,
      title: event.title,
      phase: event.phase,
      daysToEvent: daysUntil(event.startsAt, now),
    }));

  if (!activeReview) {
    return { continue: null, needsAttention: [], upcoming };
  }

  return {
    continue: {
      eventTitle: activeReview.event.title,
      eventSlug: activeReview.event.slug,
      daysToEvent: daysUntil(activeReview.event.startsAt, now),
      focusPhase: activeReview.health.phase,
      readinessScore: activeReview.health.readinessScore,
      blockers: activeReview.health.blockers,
    },
    needsAttention: activeReview.health.requiredActions,
    upcoming,
  };
};
