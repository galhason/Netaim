import type { MetadataRoute } from 'next';

/*
 * What a crawler may look at.
 *
 * The conference's public face — the landing, the program, the
 * speakers, the information and accessibility pages — is meant to be
 * found. Everything that answers for one person, or for the team, is
 * not: the personal area (profile, networking, chat, meetings), the
 * Studio, and the API surfaces. Those are already behind a session and
 * rendered per request; this file states the rule where a crawler
 * reads it first, before it ever asks for the page.
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
        '/api/',
        '/he/enter',
        '/en/enter',
        '/he/connect',
        '/en/connect',
      ],
    },
  ],
  ...(siteUrl ? { sitemap: `${siteUrl}/sitemap.xml`, host: siteUrl } : {}),
});

export default robots;
