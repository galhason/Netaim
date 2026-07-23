import type { Locale } from '@/config/locales';
import {
  homepageContent,
  saveHomepageComposition,
  saveHomepageContent,
} from '@/infrastructure';
import type {
  HomepageComposition,
  HomepageContent,
  HomepageContentInput,
} from '../types/homepage-content';

export const getHomepageDraft = (
  locale: Locale,
): Promise<HomepageContent | null> => homepageContent(locale);

export const saveHomepage = (
  locale: Locale,
  input: HomepageContentInput,
): Promise<void> => saveHomepageContent(locale, input);

export const saveHomepageCompositionEntries = (
  entries: HomepageComposition[],
): Promise<void> => saveHomepageComposition(entries);
