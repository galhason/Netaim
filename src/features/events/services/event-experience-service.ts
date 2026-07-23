import type { Locale } from '@/config/locales';
import { resolveContentSource } from '@/infrastructure';
import type { EventExperienceContent } from '../types/event-experience';

interface GetEventExperienceOptions {
  draft: boolean;
}

/*
 * Application service: the only entry point surfaces may use. Content
 * always flows through the ContentSource contract; the implementation
 * is wired at the composition root, never here.
 */
export const getEventExperience = (
  slug: string,
  locale: Locale,
  { draft }: GetEventExperienceOptions,
): Promise<EventExperienceContent | null> =>
  resolveContentSource().getEventExperience({ slug, locale, draft });
