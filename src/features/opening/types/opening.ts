import type { GuidingTone } from '@/shared';

export interface OpeningHero {
  titleMain: string;
  titleAccent: string;
  subtitle: string;
  image: string;
  /*
   * A looping background film, when the organisers uploaded one. The
   * still is never optional: it is the poster, the reduced-motion
   * fallback, and what stands in if the video cannot play.
   */
  video?: string;
}

export interface FeaturedHero {
  title: string;
  teaser: string;
  dateLabel: string;
  location: string;
  image: string;
  href: string;
  tone: GuidingTone;
}

export interface PortalPoster {
  slug: string | null;
  href: string | null;
  /* a world not yet open: the localized "coming soon" ribbon */
  comingSoon?: string;
  title: string;
  location: string;
  dateLabel: string;
  teaser: string;
  image: string;
  featured: boolean;
  tone: GuidingTone;
}

export interface OpeningEventsSection {
  title: string;
  subtitle: string;
}

export interface OpeningWhy {
  eyebrow: string;
  title: string;
  paragraph: string;
  image: string;
  /* The same field, holding a film: `image` is then its poster. */
  video?: string;
}

export interface OpeningMoments {
  title: string;
  images: string[];
  /* One entry per image, aligned by position; undefined means a still. */
  videos?: (string | undefined)[];
}

export interface OpeningClosing {
  title: string;
  subtitle: string;
  cta: string;
  href: string | null;
}

export interface OpeningContent {
  composition?: { scene: string; hidden: boolean }[];
  meHref: string;
  featured: FeaturedHero | null;
  hero: OpeningHero;
  events: OpeningEventsSection;
  posters: PortalPoster[];
  why: OpeningWhy;
  moments: OpeningMoments;
  closing: OpeningClosing;
}
