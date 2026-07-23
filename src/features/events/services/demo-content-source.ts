import type { ContentSource } from '../types/event-experience';
import {
  DEMO_BRAND_NAME,
  DEMO_EVENT_SLUG,
  DEMO_EVENT_TITLES,
  getDemoNavigation,
  getDemoScenes,
} from '../constants/demo-event';

export const demoContentSource: ContentSource = {
  getEventExperience: ({ slug, locale }) =>
    Promise.resolve(
      slug === DEMO_EVENT_SLUG
        ? {
            slug,
            title: DEMO_EVENT_TITLES[locale],
            brandName: DEMO_BRAND_NAME,
            navigation: getDemoNavigation(locale),
            scenes: getDemoScenes(locale),
          }
        : null,
    ),
};
