import type { Locale } from '@/config/locales';
import {
  activeConferenceSlug,
  setActiveConference as setActiveConferenceRepo,
} from '@/infrastructure';
import { cacheTags, cachedContent } from '@/shared/cache/content-cache';
import { publishedActiveConference } from '@/shared/cache/publish';
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
const resolveActiveConferenceSlug = async (
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

/*
 * Every request to the front door resolves this, and when the pointer is
 * unset it lists and sorts every published conference to do it. Cached
 * under its own tag: naming a different conference the live site clears
 * it, and so does publishing one, since publishing can change which
 * conference the fallback would pick.
 */
export const getActiveConferenceSlug = (
  locale: Locale,
): Promise<string | null> =>
  cachedContent(
    resolveActiveConferenceSlug,
    ['active-conference', locale],
    [cacheTags.activeConference],
  )(locale);

export const setActiveConference = async (
  slug: string | null,
): Promise<void> => {
  await setActiveConferenceRepo(slug);
  publishedActiveConference();
};
