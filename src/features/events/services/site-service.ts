import type { Locale } from '@/config/locales';
import {
  activeConferenceSlug,
  setActiveConference as setActiveConferenceRepo,
} from '@/infrastructure';
import { listPortalEvents } from './portal-service';
import type { PortalEvent } from '../types/event-repository';

const startValue = (event: PortalEvent): number => {
  const parsed = Date.parse(event.startsAt ?? '');
  return Number.isNaN(parsed) ? Number.MAX_SAFE_INTEGER : parsed;
};

/*
 * Which conference IS the site. The explicit Studio choice wins; if it
 * is unset (or points at a conference no longer published) the site
 * falls back to the most prominent launched conference — featured
 * first, then the nearest upcoming — so the public entrance is never
 * blank while conferences exist.
 */
export const getActiveConferenceSlug = async (
  locale: Locale,
): Promise<string | null> => {
  const chosen = await activeConferenceSlug().catch(() => null);
  if (chosen) {
    return chosen;
  }
  const events = await listPortalEvents(locale).catch(() => [] as PortalEvent[]);
  if (events.length === 0) {
    return null;
  }
  const sorted = [...events].sort(
    (a, b) =>
      Number(b.featured) - Number(a.featured) || startValue(a) - startValue(b),
  );
  return sorted[0]?.slug ?? null;
};

export const setActiveConference = (slug: string | null): Promise<void> =>
  setActiveConferenceRepo(slug);
