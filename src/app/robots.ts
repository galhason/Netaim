import type { MetadataRoute } from 'next';

/*
 * What a crawler may look at.
 *
 * A conference's registration form is meant to be found. Everything
 * else on the platform answers for a registered participant, or for the
 * team, and is not: the conference's own pages (all behind a
 * participant), the personal area, the Studio, and the API surfaces.
 * The conference's public face is the organisation's WordPress site.
 * Those pages are already guarded in the application and rendered per
 * request; this file states the rule where a crawler reads it first,
 * before it ever asks for the page.
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
      allow: ['/', '/he/events/*/register', '/en/events/*/register'],
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
         * A conference is read by people who registered: every page of
         * it meets a signed-out crawler with a redirect to the sign-in
         * screen, so indexing them earns a redirect chain in Search
         * Console and nothing else. The registration form is the one
         * page there that is open, and it is allowed back above — the
         * longer, more specific rule wins.
         */
        '/he/events/',
        '/en/events/',
        '/he/experiences/',
        '/en/experiences/',
      ],
    },
  ],
  ...(siteUrl ? { sitemap: `${siteUrl}/sitemap.xml`, host: siteUrl } : {}),
});

export default robots;
