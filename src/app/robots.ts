import type { MetadataRoute } from 'next';

/*
 * What a crawler may look at.
 *
 * A conference's public face — its landing page, its registration form
 * and its participant information — is meant to be found. Everything
 * that answers for one person, or for the team, is not: the programme
 * and the cast (both behind a participant), the personal area, the
 * Studio, and the API surfaces. Those are already guarded in the
 * application and rendered per request; this file states the rule where
 * a crawler reads it first, before it ever asks for the page.
 *
 * robots.txt is a courtesy to a well-behaved crawler, never a control.
 * The guard that actually holds is `requireParticipant`, and it is
 * untouched by anything written here.
 *
 * The sitemap line is emitted only when the site's public address is
 * configured — pointing a crawler at a sitemap that does not exist is
 * worse than saying nothing.
 */
const configured = process.env.NEXT_PUBLIC_SERVER_URL?.replace(/\/$/, '');
const siteUrl =
  configured && !configured.includes('localhost') ? configured : undefined;

const robots = (): MetadataRoute.Robots => ({
  rules: [
    {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/he/me/',
        '/en/me/',
        '/studio',
        '/studio/',
        '/admin',
        '/admin/',
        '/api/',
        '/he/enter',
        '/en/enter',
        '/he/connect',
        '/en/connect',
        /*
         * A conference's own pages are public; the pages inside it that
         * answer for one participant are not. These sit behind
         * `requireParticipant` and meet a signed-out crawler with a
         * redirect to the sign-in screen, so indexing them earns a
         * redirect chain in Search Console and nothing else.
         *
         * `/events/{slug}` and `/events/{slug}/register` are deliberately
         * absent from this list: they are the public face, and the whole
         * point of the map. The conference's public information page
         * lives on the organisation's WordPress site now, not here.
         */
        '/he/events/*/agenda',
        '/en/events/*/agenda',
        '/he/events/*/speakers',
        '/en/events/*/speakers',
        '/he/events/*/workshops',
        '/en/events/*/workshops',
        '/he/events/*/my-activities',
        '/en/events/*/my-activities',
        '/he/events/*/me',
        '/en/events/*/me',
        '/he/events/*/networking',
        '/en/events/*/networking',
      ],
    },
  ],
  ...(siteUrl ? { sitemap: `${siteUrl}/sitemap.xml`, host: siteUrl } : {}),
});

export default robots;
