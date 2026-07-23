import type { RegistrationStatus } from '@/registration-engine';
import type {
  ContactPreferences,
  ContactProfile,
  ParticipantDetailsInput,
  ParticipantDetailsView,
} from '../types/identity';
import {
  participantSessionRepository,
  registrationRepository,
} from '@/infrastructure';
import { currentParticipant, entranceToken } from './participant-identity-service';

export interface ParticipantRegistration {
  participantName: string;
  registrationId: string;
  status: RegistrationStatus;
  entranceToken: string;
}

/*
 * The signed-in participant's own registration for an event — the real
 * source behind /me (Registration-Architecture §15). Reads only the
 * participant's own row; no CMS user is involved.
 */
export const getParticipantRegistration = async (
  slug: string,
): Promise<ParticipantRegistration | null> => {
  const participant = await currentParticipant();
  if (!participant) {
    return null;
  }
  const found = await registrationRepository.statusForParticipant(
    slug,
    participant.id,
  );
  if (!found) {
    return null;
  }
  return {
    participantName: participant.name,
    registrationId: found.registrationId,
    status: found.status,
    entranceToken: entranceToken(found.registrationId),
  };
};

export const updateMyDetails = async (
  input: ParticipantDetailsInput,
): Promise<boolean> => {
  const participant = await currentParticipant();
  if (!participant) {
    return false;
  }
  await participantSessionRepository.updateParticipantDetails(
    participant.id,
    input,
  );
  return true;
};

export const getMyDetails = async (): Promise<ParticipantDetailsView | null> => {
  const participant = await currentParticipant();
  if (!participant) {
    return null;
  }
  return participantSessionRepository.participantDetails(participant.id);
};

/*
 * Contact governance (Connection Framework v1.0): the participant reads
 * and changes their own channel preferences; changes apply immediately
 * to every accepted connection.
 */
export const myContactPreferences =
  async (): Promise<ContactProfile | null> => {
    const participant = await currentParticipant();
    if (!participant) {
      return null;
    }
    return participantSessionRepository.contactProfileById(participant.id);
  };

export const saveMyContactPreferences = async (
  prefs: ContactPreferences,
): Promise<boolean> => {
  const participant = await currentParticipant();
  if (!participant) {
    return false;
  }
  await participantSessionRepository.setContactPreferences(
    participant.id,
    prefs,
  );
  return true;
};

export const myRegisteredEventSlugs = async (): Promise<string[]> => {
  const participant = await currentParticipant();
  if (!participant) {
    return [];
  }
  return registrationRepository.eventSlugsForParticipant(participant.id);
};

/*
 * The profile card's portrait: an image the guest uploads becomes their
 * face across the platform. Size and type are enforced at the seam.
 */
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

export const updateMyPhoto = async (file: {
  name: string;
  type: string;
  data: Uint8Array;
}): Promise<boolean> => {
  if (!file.type.startsWith('image/') || file.data.byteLength === 0) {
    return false;
  }
  if (file.data.byteLength > MAX_PHOTO_BYTES) {
    return false;
  }
  const participant = await currentParticipant();
  if (!participant) {
    return false;
  }
  return participantSessionRepository.setParticipantPhoto(
    participant.id,
    file,
  );
};
