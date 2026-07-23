import type { Locale } from '@/config/locales';
import { listPortalEvents } from '@/features/events';
import type { PortalEvent } from '@/features/events';
import { homepageContent } from '@/infrastructure';
import { formatLongDate } from '@/shared';
import {
  FEATURED_CLOSING_CTA,
  GENERIC_TEASERS,
  fallbackOpeningContent,
} from '../constants/opening-content';
import type {
  FeaturedHero,
  OpeningContent,
  PortalPoster,
} from '../types/opening';

const startValue = (event: PortalEvent): number => {
  const parsed = Date.parse(event.startsAt ?? '');
  return Number.isNaN(parsed) ? Number.MAX_SAFE_INTEGER : parsed;
};

const posterImage = (event: PortalEvent): string =>
  event.posterUrl ??
  `https://picsum.photos/seed/hason-portal-${event.slug}/900/1350`;

const heroImage = (event: PortalEvent): string =>
  event.heroUrl ??
  event.posterUrl ??
  `https://picsum.photos/seed/hason-hero-${event.slug}/2400/1400`;

/*
 * Assembles the opening experience around one dynamic featured
 * conference: the first launched event marked featured (or the nearest
 * upcoming one) owns the hero, the atmosphere tone and the closing
 * invitation; every launched event becomes a world on the portal wall.
 * Never throws — with no launched events the platform voice and the
 * demo portals keep the entrance alive.
 */
export const getOpening = async (locale: Locale): Promise<OpeningContent> => {
  const fallback = fallbackOpeningContent(locale);
  const page = await homepageContent(locale).catch(() => null);
  const content: OpeningContent = page
    ? {
        ...fallback,
        composition: page.composition,
        hero: {
          titleMain: page.hero.titleMain ?? fallback.hero.titleMain,
          titleAccent: page.hero.titleAccent ?? fallback.hero.titleAccent,
          subtitle: page.hero.subtitle ?? fallback.hero.subtitle,
          image: page.hero.imageUrl ?? fallback.hero.image,
        },
        events: {
          title: page.events.title ?? fallback.events.title,
          subtitle: page.events.subtitle ?? fallback.events.subtitle,
        },
        why: {
          ...fallback.why,
          eyebrow: page.story.eyebrow ?? fallback.why.eyebrow,
          title: page.story.title ?? fallback.why.title,
          paragraph: page.story.paragraph ?? fallback.why.paragraph,
          image: page.story.imageUrl ?? fallback.why.image,
        },
        moments: {
          title: page.moments.title ?? fallback.moments.title,
          images:
            page.moments.imageUrls.length > 0
              ? page.moments.imageUrls
              : fallback.moments.images,
        },
        closing: {
          ...fallback.closing,
          title: page.closing.title ?? fallback.closing.title,
          subtitle: page.closing.subtitle ?? fallback.closing.subtitle,
          cta: page.closing.cta ?? fallback.closing.cta,
        },
      }
    : fallback;
  const events = await listPortalEvents(locale).catch(() => []);
  if (events.length === 0) {
    return content;
  }

  const teasers = GENERIC_TEASERS[locale];
  const sorted = [...events].sort(
    (a, b) =>
      Number(b.featured) - Number(a.featured) || startValue(a) - startValue(b),
  );

  const posters: PortalPoster[] = sorted.map((event, index) => ({
    slug: event.slug,
    href: `/${locale}/events/${event.slug}`,
    title: event.title,
    location: event.location ?? '',
    dateLabel: formatLongDate(event.startsAt, locale),
    teaser: event.teaser ?? teasers[index % teasers.length] ?? '',
    image: posterImage(event),
    featured: event.featured,
    tone: event.atmosphere,
  }));

  const lead = sorted[0];
  const featured: FeaturedHero | null = lead
    ? {
        title: lead.title,
        teaser: lead.teaser ?? teasers[0] ?? '',
        dateLabel: formatLongDate(lead.startsAt, locale),
        location: lead.location ?? '',
        image: heroImage(lead),
        href: `/${locale}/events/${lead.slug}`,
        tone: lead.atmosphere,
      }
    : null;

  return {
    ...content,
    featured,
    posters,
    closing: {
      ...content.closing,
      cta: featured ? FEATURED_CLOSING_CTA[locale] : content.closing.cta,
      href: featured ? featured.href : null,
    },
  };
};
