import type { Locale } from '@/config/locales';
import {
  homepageDraftContent,
  saveHomepageComposition,
  saveHomepageContent,
} from '@/infrastructure';
import type {
  HomepageComposition,
  HomepageContent,
  HomepageContentInput,
} from '../types/homepage-content';

/*
 * What the editor sees: this language as it is stored, with nothing
 * inherited from the other one. The visitor's reading still falls back
 * — see readHomepage in the adapter for why the two must differ.
 */
export const getHomepageDraft = (
  locale: Locale,
): Promise<HomepageContent | null> => homepageDraftContent(locale);

export const saveHomepage = (
  locale: Locale,
  input: HomepageContentInput,
): Promise<void> => saveHomepageContent(locale, input);

export const saveHomepageCompositionEntries = (
  entries: HomepageComposition[],
): Promise<void> => saveHomepageComposition(entries);
