import type { Locale } from '@/config/locales';
import { computeEventHealth } from '@/event-engine';
import { inspectExperience } from '@/experience-engine';
import {
  DEMO_EVENT_SLUG,
  getEventExperience,
  isDemoContentEnabled,
  listEvents,
  reviewLaunch,
  toEventHealthInput,
} from '@/features/events';
import {
  buildHomeDigest,
  daysUntil,
  type StudioHomeDigest,
} from '../utils/home-digest';

const DEMO_EVENT_START = '2026-09-01T06:00:00Z';

const demoDigest = async (locale: Locale): Promise<StudioHomeDigest | null> => {
  if (!isDemoContentEnabled()) {
    return null;
  }
  const content = await getEventExperience(DEMO_EVENT_SLUG, locale, {
    draft: true,
  });
  if (!content) {
    return null;
  }
  const health = computeEventHealth(
    toEventHealthInput(content, {
      phase: 'planning',
      publishStatus: 'published',
      capabilities: ['registration', 'notifications'],
      eventStartsAt: DEMO_EVENT_START,
      missingTranslations: 0,
      translationCompleteness: 100,
      mediaCompleteness: 80,
      experienceFindings: inspectExperience(content.scenes),
    }),
  );
  return {
    continue: {
      eventTitle: content.title,
      eventSlug: DEMO_EVENT_SLUG,
      daysToEvent: daysUntil(DEMO_EVENT_START, Date.now()),
      focusPhase: health.phase,
      readinessScore: health.readinessScore,
      blockers: health.blockers,
    },
    needsAttention: health.requiredActions,
    upcoming: [],
  };
};

/*
 * Real events lead when the data connection is available; the demo event
 * carries development without one. One readiness review plus one event
 * list — Home never computes health for every event.
 */
export const getStudioHome = async (
  locale: Locale,
): Promise<StudioHomeDigest | null> => {
  try {
    const events = await listEvents();
    const active =
      events.find((event) => event.phase !== 'archived') ?? events[0];
    const activeReview = active ? await reviewLaunch(active.slug, locale) : null;
    if (events.length > 0 || activeReview) {
      return buildHomeDigest({ events, activeReview }, Date.now());
    }
  } catch {
    // The demo path carries development without a data connection.
  }

  return demoDigest(locale);
};
