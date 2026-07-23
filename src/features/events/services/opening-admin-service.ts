import type { Locale } from '@/config/locales';
import { eventRepository } from '@/infrastructure';
import type {
  EventOpeningDraft,
  EventOpeningInput,
  SceneCompositionEntry,
} from '../types/event-repository';

export const getEventOpeningDraft = (
  slug: string,
  locale: Locale,
): Promise<EventOpeningDraft | null> =>
  eventRepository.getOpeningDraft(slug, locale);

export const saveEventOpening = (
  slug: string,
  locale: Locale,
  input: EventOpeningInput,
): Promise<void> => eventRepository.updateOpening(slug, locale, input);

export const saveEventComposition = (
  slug: string,
  entries: SceneCompositionEntry[],
): Promise<void> => eventRepository.updateComposition(slug, entries);

export const findEventOpeningPreview = (
  slug: string,
  locale: Locale,
): ReturnType<typeof eventRepository.findOpeningPreview> =>
  eventRepository.findOpeningPreview(slug, locale);
