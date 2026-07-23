import type { Locale } from '@/config/locales';
import { speakerRepository } from '@/infrastructure';
import type {
  ExternalSpeakerInput,
  ResolvedSpeaker,
  SpeakerActivity,
  SpeakerCandidate,
  SpeakerOverrides,
} from '../types/speaker';

/*
 * The speaker application surface. Every read returns already-resolved
 * speakers (account identity + per-conference overrides), so callers never
 * see the raw hybrid split. Writes create or update roster entries; the
 * repository keeps one entry per (event, account) so a linked user is
 * never duplicated.
 */
export const listConferenceSpeakers = (
  slug: string,
  locale: Locale,
): Promise<ResolvedSpeaker[]> => speakerRepository.listByEvent(slug, locale);

export const getSpeaker = (
  id: string,
  locale: Locale,
): Promise<ResolvedSpeaker | null> => speakerRepository.getById(id, locale);

export const createExternalSpeaker = (
  slug: string,
  input: ExternalSpeakerInput,
  locale: Locale,
): Promise<ResolvedSpeaker> =>
  speakerRepository.createExternal(slug, input, locale);

export const createLinkedSpeaker = (
  slug: string,
  accountId: string,
  overrides: SpeakerOverrides,
  locale: Locale,
): Promise<ResolvedSpeaker> =>
  speakerRepository.createLinked(slug, accountId, overrides, locale);

export const updateSpeaker = (
  id: string,
  input: SpeakerOverrides,
  locale: Locale,
): Promise<ResolvedSpeaker | null> =>
  speakerRepository.update(id, input, locale);

export const listSpeakerCandidates = (
  locale: Locale,
): Promise<SpeakerCandidate[]> => speakerRepository.listCandidates(locale);

/*
 * Every activity a speaker leads — the reverse of the session↔speaker
 * relationship. The substrate for future Speaker Pages: no manual linking.
 */
export const activitiesForSpeaker = (
  speakerId: string,
  locale: Locale,
): Promise<SpeakerActivity[]> =>
  speakerRepository.activitiesForSpeaker(speakerId, locale);
