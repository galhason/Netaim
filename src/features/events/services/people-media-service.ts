import {
  mediaRepository,
  peopleRepository,
  listPublicSpeakers,
} from '@/infrastructure';
import type {
  MediaSummary,
  PersonSummary,
} from '../types/event-repository';

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

/*
 * The guest-facing speakers wall: public, no actor.
 */
export const listSpeakersPublic = (): Promise<PersonSummary[]> =>
  listPublicSpeakers();
