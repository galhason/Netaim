import type { Locale } from '@/config/locales';

/*
 * The editable homepage content as it travels between the CMS and the
 * Studio: every field optional, merged over the cinematic fallback by
 * the opening service. Image ids exist so the Studio can pre-select the
 * current artwork; urls feed the public page.
 */
export interface HomepageComposition {
  scene: string;
  hidden: boolean;
}

export interface HomepageContent {
  composition: HomepageComposition[];
  hero: {
    titleMain?: string;
    titleAccent?: string;
    subtitle?: string;
    imageUrl?: string;
    imageId?: string;
  };
  events: { title?: string; subtitle?: string };
  story: {
    eyebrow?: string;
    title?: string;
    paragraph?: string;
    imageUrl?: string;
    imageId?: string;
  };
  moments: { title?: string; imageUrls: string[]; imageIds: string[] };
  closing: { title?: string; subtitle?: string; cta?: string };
}

export interface HomepageContentInput {
  momentsImageIds?: string[];
  heroTitleMain?: string;
  heroTitleAccent?: string;
  heroSubtitle?: string;
  heroImageId?: string | null;
  eventsTitle?: string;
  eventsSubtitle?: string;
  storyEyebrow?: string;
  storyTitle?: string;
  storyParagraph?: string;
  storyImageId?: string | null;
  momentsTitle?: string;
  closingTitle?: string;
  closingSubtitle?: string;
  closingCta?: string;
}

export type HomepageContentSource = (
  locale: Locale,
) => Promise<HomepageContent | null>;

export type HomepageContentWriter = (
  locale: Locale,
  input: HomepageContentInput,
) => Promise<void>;

export type HomepageCompositionWriter = (
  entries: HomepageComposition[],
) => Promise<void>;
