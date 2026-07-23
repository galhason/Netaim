import { networkingProfileRepository } from '@/infrastructure';
import { currentParticipant } from '@/features/registration';
import type {
  NetworkingProfileSummary,
  SaveProfileInput,
} from '../types/networking';

export const listDirectory = (
  slug: string,
): Promise<NetworkingProfileSummary[]> =>
  networkingProfileRepository.listVisible(slug);

export const myProfile = async (
  slug: string,
): Promise<NetworkingProfileSummary | null> => {
  const participant = await currentParticipant();
  if (!participant) {
    return null;
  }
  return networkingProfileRepository.getForParticipant(slug, participant.id);
};

export const saveMyProfile = async (
  slug: string,
  input: SaveProfileInput,
): Promise<NetworkingProfileSummary | null> => {
  const participant = await currentParticipant();
  if (!participant) {
    return null;
  }
  return networkingProfileRepository.upsert(slug, participant.id, input);
};
