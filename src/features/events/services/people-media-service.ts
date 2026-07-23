import {
  mediaRepository,
  peopleRepository,
  sceneContentRepository,
  listPublicSpeakers,
} from '@/infrastructure';
import type { Locale } from '@/config/locales';
import type {
  MediaSummary,
  PersonSummary,
} from '../types/event-repository';
import { getEventExperience } from './event-experience-service';

export const listPeople = (): Promise<PersonSummary[]> =>
  peopleRepository.listPeople();

export const addPerson = (input: {
  name: string;
  role?: string;
}): Promise<PersonSummary> => peopleRepository.addPerson(input);

export const listMedia = (search?: string): Promise<MediaSummary[]> =>
  mediaRepository.listMedia(search);

export const addMedia = (input: {
  file: { name: string; type: string; data: Uint8Array };
  alt: string;
}): Promise<MediaSummary> => mediaRepository.addMedia(input);

export interface VenueDetailsInput {
  name?: string;
  address?: string;
  description?: string;
  mapUrl?: string;
  mapLabel?: string;
  access?: string;
  emergency?: string;
  parking?: string;
  transit?: string;
}

const VENUE_DETAIL_IDS = ['parking', 'transit', 'access', 'emergency'] as const;

/*
 * The venue chapter is the readiness-critical surface: this service
 * writes its content fields (including the emergency and accessibility
 * details the Readiness Engine watches) onto the event's venue scene.
 */
export const updateVenueChapter = async (
  slug: string,
  locale: Locale,
  input: VenueDetailsInput,
): Promise<boolean> => {
  const content = await getEventExperience(slug, locale, { draft: true });
  const venueScene = content?.scenes.find((scene) => scene.type === 'venue');
  if (!venueScene) {
    return false;
  }

  const current =
    typeof venueScene.content === 'object' && venueScene.content !== null
      ? (venueScene.content as {
          details?: { id: string; label: string; value: string }[];
        })
      : {};

  const existingDetails = current.details ?? [];
  const details = VENUE_DETAIL_IDS.map((id) => {
    const existing = existingDetails.find((detail) => detail.id === id);
    const value = input[id];
    return {
      id,
      label: existing?.label ?? id,
      value: value ?? existing?.value ?? '',
    };
  }).filter((detail) => detail.value !== '');

  const patch: Record<string, unknown> = { details };
  if (input.name !== undefined) patch.name = input.name;
  if (input.address !== undefined) patch.address = input.address;
  if (input.description !== undefined) patch.description = input.description;
  if (input.mapUrl !== undefined) patch.mapUrl = input.mapUrl;
  if (input.mapLabel !== undefined) patch.mapLabel = input.mapLabel;

  await sceneContentRepository.updateSceneContent(
    venueScene.id,
    locale,
    patch,
  );
  return true;
};

/*
 * The guest-facing speakers wall: public, no actor.
 */
export const listSpeakersPublic = (): Promise<PersonSummary[]> =>
  listPublicSpeakers();
