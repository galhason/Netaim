import type { GuidingTone } from '@/shared';

export interface OpeningHero {
  titleMain: string;
  titleAccent: string;
  subtitle: string;
  image: string;
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
}

export interface OpeningMoments {
  title: string;
  images: string[];
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
