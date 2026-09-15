import type { MetadataRoute } from 'next';
import { SUPPORTED_LOCALES } from '@/config/locales';

/*
 * The public map of the site — and only the public part of it.
 *
 * Every entry here is a page any visitor may open without signing in:
 * the landing, the program, the speakers, the information, contact and
 * the accessibility statement, in both languages. The personal area
 * and the Studio are deliberately absent; they answer for one person
 * and robots.txt already forbids them.
 *
 * Nothing is listed unless the site's public address is configured,
 * because a sitemap of localhost URLs is worse than no sitemap at all.
 */
const PUBLIC_PATHS = [
  '',
  '/program',
  '/speakers',
  '/info',
  '/contact',
  '/accessibility',
  '/privacy',
  '/terms',
] as const;

const sitemap = (): MetadataRoute.Sitemap => {
  const base = process.env.NEXT_PUBLIC_SERVER_URL?.replace(/\/$/, '');
  if (!base || base.includes('localhost')) {
    return [];
  }
  const now = new Date();
  return SUPPORTED_LOCALES.flatMap((locale) =>
    PUBLIC_PATHS.map((path) => ({
      url: `${base}/${locale}${path}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: path === '' ? 1 : 0.6,
    })),
  );
};

export default sitemap;
