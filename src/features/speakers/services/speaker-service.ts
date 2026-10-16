import type { Locale } from '@/config/locales';
import { speakerRepository } from '@/infrastructure';
import type {
  ExternalSpeakerInput,
  ResolvedSpeaker,
  SpeakerActivity,
  SpeakerCandidate,
  SpeakerLookalikes,
  SpeakerOverrides,
  SpeakerPlacement,
} from '../types/speaker';
import { likelySameSpeaker } from '../utils/speaker-names';

/*
 * The speaker application surface. Every read returns already-resolved
 * speakers (account identity + overrides), so callers never see the raw
 * hybrid split. A speaker is one card in the organisation's library; a
 * conference's roster is read from its activities and its hand-made
 * listing. Writes never make a second card for one person: the same
 * account, or the same guest name, returns the card that exists.
 */
export const listConferenceSpeakers = (
  slug: string,
  locale: Locale,
  options?: { fallback?: boolean },
): Promise<ResolvedSpeaker[]> =>
  speakerRepository.listByEvent(slug, locale, options);

/* Every speaker card in the organisation, with the conferences each is on. */
export const listSpeakerLibrary = (
  locale: Locale,
  options?: { fallback?: boolean },
): Promise<ResolvedSpeaker[]> => speakerRepository.listLibrary(locale, options);

export const getSpeaker = (
  id: string,
  locale: Locale,
  options?: { fallback?: boolean },
): Promise<ResolvedSpeaker | null> => speakerRepository.getById(id, locale, options);

export const createExternalSpeaker = (
  input: ExternalSpeakerInput,
  locale: Locale,
  placement: SpeakerPlacement,
): Promise<ResolvedSpeaker> =>
  speakerRepository.createExternal(input, locale, placement);

export const createLinkedSpeaker = (
  accountId: string,
  overrides: SpeakerOverrides,
  locale: Locale,
  placement: SpeakerPlacement,
): Promise<ResolvedSpeaker> =>
  speakerRepository.createLinked(accountId, overrides, locale, placement);

/* Lists a speaker on a conference by hand, or takes that listing off. */
export const setSpeakerListed = (
  id: string,
  slug: string,
  listed: boolean,
): Promise<boolean> => speakerRepository.setListed(id, slug, listed);

export const mergeSpeakers = (
  keepId: string,
  foldId: string,
): Promise<ResolvedSpeaker | null> => speakerRepository.merge(keepId, foldId);

/*
 * Cards that look like one person: the same name once a title and
 * anything in brackets are set aside, in either language. Two linked to
 * different accounts are two people and never offered. The certain
 * duplicates were folded when the library was made; these are the ones
 * for a person to decide.
 */
export const findSpeakerLookalikes = (
  library: ResolvedSpeaker[],
  englishById: Map<string, ResolvedSpeaker> = new Map(),
): SpeakerLookalikes[] => {
  const keysOf = (speaker: ResolvedSpeaker): string[] =>
    [speaker.name, englishById.get(speaker.id)?.own.name]
      .map((name) => likelySameSpeaker(name ?? ''))
      .filter((key) => key.split(' ').length >= 2);
  const parent = new Map<string, string>(library.map((speaker) => [speaker.id, speaker.id]));
  const root = (id: string): string => {
    let at = id;
    while (parent.get(at) !== at) at = parent.get(at)!;
    return at;
  };
  const firstByKey = new Map<string, string>();
  for (const speaker of library) {
    for (const key of keysOf(speaker)) {
      const seen = firstByKey.get(key);
      if (seen === undefined) {
        firstByKey.set(key, speaker.id);
      } else {
        parent.set(root(speaker.id), root(seen));
      }
    }
  }
  const groups = new Map<string, ResolvedSpeaker[]>();
  for (const speaker of library) {
    groups.set(root(speaker.id), [...(groups.get(root(speaker.id)) ?? []), speaker]);
  }
  return [...groups.values()]
    .filter((group) => group.length > 1)
    .filter((group) => new Set(group.map((speaker) => speaker.accountId).filter(Boolean)).size <= 1)
    .map((group) => ({ key: group.map((speaker) => speaker.id).sort().join('+'), speakers: group }));
};

export const updateSpeaker = (
  id: string,
  input: SpeakerOverrides,
  locale: Locale,
): Promise<ResolvedSpeaker | null> =>
  speakerRepository.update(id, input, locale);

export const removeSpeaker = (id: string): Promise<boolean> =>
  speakerRepository.remove(id);

export const listSpeakerCandidates = (
  locale: Locale,
): Promise<SpeakerCandidate[]> => speakerRepository.listCandidates(locale);

/*
 * Every activity a speaker leads — the reverse of the session↔speaker
 * relationship — in one conference when `slug` is given: a speaker is
 * one card across conferences, and a conference's page shows its own.
 */
export const activitiesForSpeaker = (
  speakerId: string,
  locale: Locale,
  slug?: string,
): Promise<SpeakerActivity[]> =>
  speakerRepository.activitiesForSpeaker(speakerId, locale, slug);
