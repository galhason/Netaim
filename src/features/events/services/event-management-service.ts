import type { Locale } from '@/config/locales';
import {
  transitionEvent,
  type EventPhase,
  type TransitionResult,
} from '@/event-engine';
import { eventRepository } from '@/infrastructure';
import type { EventSummary } from '../types/event-repository';
import { duplicateSlug, toEventSlug } from '../utils/slug';

export const listEvents = (): Promise<EventSummary[]> =>
  eventRepository.listEvents();

export const findEvent = (slug: string): Promise<EventSummary | null> =>
  eventRepository.findEvent(slug);

/*
 * Slugs are unique per platform; a title that is already taken quietly
 * receives a numbered address instead of failing the creation.
 */
const MAX_SLUG_ATTEMPTS = 30;

const availableSlug = async (title: string): Promise<string> => {
  const base = toEventSlug(title);
  let candidate = base;
  for (let attempt = 2; attempt <= MAX_SLUG_ATTEMPTS; attempt += 1) {
    const taken = await eventRepository
      .findEvent(candidate)
      .catch(() => null);
    if (!taken) {
      return candidate;
    }
    candidate = `${base}-${attempt}`;
  }
  return duplicateSlug(base);
};

export const createEvent = async (
  title: string,
  startsAt?: string,
): Promise<EventSummary> =>
  eventRepository.createEvent({
    title,
    slug: await availableSlug(title),
    startsAt,
  });

export const duplicateEvent = async (slug: string): Promise<EventSummary> => {
  const source = await eventRepository.findEvent(slug);
  if (!source) {
    throw new Error('Event not found');
  }
  return eventRepository.duplicateEvent(
    slug,
    source.title,
    duplicateSlug(source.slug),
  );
};

/*
 * The single legal mover between phases: the lifecycle engine validates
 * every transition before the repository persists it.
 */
export const moveEventPhase = async (
  slug: string,
  to: EventPhase,
): Promise<TransitionResult> => {
  const event = await eventRepository.findEvent(slug);
  if (!event) {
    throw new Error('Event not found');
  }
  const result = transitionEvent(event.phase, to, event.capabilities);
  if (result.ok) {
    await eventRepository.setEventPhase(slug, result.phase);
  }
  return result;
};

export const archiveEvent = (slug: string): Promise<TransitionResult> =>
  moveEventPhase(slug, 'archived');

/*
 * Permanent deletion (approved decision: keep no data for nothing):
 * the conference and everything born inside it, in one act.
 */
export const deleteEvent = (slug: string): Promise<boolean> =>
  eventRepository.deleteEvent(slug);

/*
 * Conference settings live inside the workspace (approved flow): the
 * name and dates change in place, never on a separate screen.
 */
export const updateEventDetails = (
  slug: string,
  input: { title?: string; startsAt?: string; endsAt?: string },
  locale: Locale,
): Promise<EventSummary | null> =>
  eventRepository.updateEventDetails(slug, input, locale);
