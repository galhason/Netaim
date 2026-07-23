import type { Locale } from '@/config/locales';
import { publicEventRepository } from '@/infrastructure';
import type {
  EventOpeningContent,
  PortalEvent,
} from '../types/event-repository';

export const listPortalEvents = (locale: Locale): Promise<PortalEvent[]> =>
  publicEventRepository.listLaunched(locale);

export const findPortalEvent = (
  slug: string,
  locale: Locale,
): Promise<PortalEvent | null> =>
  publicEventRepository.findLaunched(slug, locale);

export const findEventOpeningContent = (
  slug: string,
  locale: Locale,
): Promise<EventOpeningContent | null> =>
  publicEventRepository.findOpeningContent(slug, locale);
