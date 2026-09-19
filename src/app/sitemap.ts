import type { MetadataRoute } from 'next';
import { SUPPORTED_LOCALES, type Locale } from '@/config/locales';
import { listPortalEvents } from '@/features/events';

/*
 * The public map of the site — and only the public part of it.
 *
 * This used to list the site's own pages: the landing, the programme,
 * the speakers, the information, and the legal pages, in both languages,
 * under a comment claiming every one of them could be opened without
 * signing in. Two things were wrong with that. Three of those pages sit
 * behind `requireParticipant` and answer a signed-out crawler with a
 * redirect to the sign-in screen, so the map was pointing robots at
 * doors that do not open. And the legal pages are moving to the
 * organisation's own site, where they will be listed by its sitemap;
 * carrying them here as well would be the same text at two addresses on
 * one domain, which is the definition of duplicate content.
 *
 * What is left is what is actually public: each published conference's
 * landing page, its registration form, and its participant information.
 * The list of conferences is read from the CMS on every request, so a
 * conference published tomorrow is in the map tomorrow, without a
 * deployment and without anyone maintaining a list.
 *
 * Nothing is listed unless the site's public address is configured,
 * because a sitemap of localhost URLs is worse than no sitemap at all.
 */

/* Public, per conference. Everything else there needs a participant. */
const PUBLIC_CONFERENCE_PATHS = ['', '/register', '/info'] as const;

const sitemap = async (): Promise<MetadataRoute.Sitemap> => {
  const base = process.env.NEXT_PUBLIC_SERVER_URL?.replace(/\/$/, '');
  if (!base || base.includes('localhost')) {
    return [];
  }
  const now = new Date();

  const perLocale = await Promise.all(
    SUPPORTED_LOCALES.map(async (locale: Locale) => {
      const events = await listPortalEvents(locale).catch(() => []);
      return events.flatMap((event) =>
        PUBLIC_CONFERENCE_PATHS.map((path) => ({
          url: `${base}/${locale}/events/${event.slug}${path}`,
          lastModified: now,
          changeFrequency: 'weekly' as const,
          /* The conference itself leads; its inner pages follow. */
          priority: path === '' ? 1 : 0.6,
        })),
      );
    }),
  );

  return perLocale.flat();
};

export default sitemap;
