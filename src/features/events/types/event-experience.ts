import type { SceneData } from '@/experience-engine';
import type { Locale } from '@/config/locales';

export interface EventNavigationItem {
  label: string;
  href: string;
}

export interface EventExperienceContent {
  slug: string;
  title: string;
  brandName: string;
  navigation: EventNavigationItem[];
  scenes: SceneData[];
}

export interface EventContentQuery {
  slug: string;
  locale: Locale;
  draft: boolean;
}

export interface ContentSource {
  getEventExperience: (
    query: EventContentQuery,
  ) => Promise<EventExperienceContent | null>;
}
