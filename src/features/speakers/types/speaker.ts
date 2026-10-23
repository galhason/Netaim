import type { Locale } from '@/config/locales';

export interface SpeakerSocialLink {
  label?: string;
  url: string;
}

/*
 * A speaker as shown anywhere on the platform, already resolved: a linked
 * account lends its identity, per-conference overrides win when set. This
 * is always the read shape — the raw account/override split never leaves
 * the repository, so a profile edit reflects the moment it is read.
 */
export interface ResolvedSpeaker {
  id: string;
  name: string;
  jobTitle?: string;
  company?: string;
  bio?: string;
  photoUrl?: string;
  socialLinks: SpeakerSocialLink[];
  isRegistered: boolean;
  accountId?: string;
  /*
   * What is written on the roster entry itself, before the account
   * lends anything — what an editor is actually editing. A linked
   * speaker with no override shows the account's words on the site and
   * an empty field here, so saving the form never freezes the account's
   * current name into an override by accident.
   */
  own: { name?: string; jobTitle?: string; company?: string; bio?: string; photoId?: string };
  /*
   * Read on a conference's roster: listed on it by hand, and how many of
   * its standing activities name the speaker. A speaker is on the roster
   * when either is true. `front` is the speaker's place at the top of the
   * conference's speakers page (1 is first), when the organisers put them
   * there; the roster is read in that order, front row first.
   */
  presence?: { listed: boolean; activities: number; front?: number };
  /* Read in the library: the conferences the speaker is on, either way. */
  conferences?: { slug: string; title: string }[];
}

/* A pair, or more, that look like one person — for a person to decide. */
export interface SpeakerLookalikes {
  key: string;
  speakers: ResolvedSpeaker[];
}

/* An existing platform account offered under "Choose Existing User". */
export interface SpeakerCandidate {
  accountId: string;
  name: string;
  company?: string;
  jobTitle?: string;
  photoUrl?: string;
  email?: string;
}

export interface ExternalSpeakerInput {
  name: string;
  jobTitle?: string;
  company?: string;
  bio?: string;
  photoId?: string;
  socialLinks?: SpeakerSocialLink[];
}

/* Overrides for a linked account (all optional). */
export interface SpeakerOverrides {
  name?: string;
  jobTitle?: string;
  company?: string;
  bio?: string;
  photoId?: string;
  socialLinks?: SpeakerSocialLink[];
}

/* A light view of one activity, for a speaker's reverse list. */
export interface SpeakerActivity {
  id: string;
  title: string;
  sessionType: string;
  startsAt?: string;
}

/*
 * Where a new card is made: in the organisation that runs `slug`, and —
 * when `listOn` — listed on that conference by hand as well (the roster
 * page adds that way; an activity does not need to, it names the speaker).
 * `force` makes a second card even when one by the same name exists; by
 * default the existing card is returned instead.
 */
export interface SpeakerPlacement {
  slug: string;
  listOn?: boolean;
  force?: boolean;
}

/*
 * Speakers live behind this contract. Resolution (account defaults +
 * overrides) happens inside the repository, mirroring toOpeningSpeakers.
 *
 * A speaker is one card in the organisation's library. A conference's
 * roster is read, not stored: the speakers its standing activities name,
 * and those listed on it by hand.
 */
export interface SpeakerRepository {
  /*
   * `fallback: false` reads the language as written, without Payload
   * filling an empty English field from the Hebrew — what an editor
   * needs in order to see which words are actually translated.
   */
  listByEvent: (
    slug: string,
    locale: Locale,
    options?: { fallback?: boolean },
  ) => Promise<ResolvedSpeaker[]>;
  /* Every card in the acting organisation, with the conferences each is on. */
  listLibrary: (
    locale: Locale,
    options?: { fallback?: boolean },
  ) => Promise<ResolvedSpeaker[]>;
  getById: (
    id: string,
    locale: Locale,
    options?: { fallback?: boolean },
  ) => Promise<ResolvedSpeaker | null>;
  createExternal: (
    input: ExternalSpeakerInput,
    locale: Locale,
    placement: SpeakerPlacement,
  ) => Promise<ResolvedSpeaker>;
  createLinked: (
    accountId: string,
    overrides: SpeakerOverrides,
    locale: Locale,
    placement: SpeakerPlacement,
  ) => Promise<ResolvedSpeaker>;
  update: (
    id: string,
    input: SpeakerOverrides,
    locale: Locale,
  ) => Promise<ResolvedSpeaker | null>;
  /* Lists a speaker on a conference by hand, or takes that listing off. */
  setListed: (id: string, slug: string, listed: boolean) => Promise<boolean>;
  /*
   * The front row of a conference's speakers page, as speaker ids in
   * order: each takes its place, and anyone who was at the front of this
   * conference and is not in the list leaves it. Other conferences are
   * untouched.
   */
  setFront: (slug: string, ids: string[]) => Promise<boolean>;
  /*
   * Two cards that are one person, made one: `keep` takes the other's
   * activities, conferences, and any words, picture or link it lacked,
   * and the other card is deleted. Refused (null) for two different
   * accounts.
   */
  merge: (keepId: string, foldId: string) => Promise<ResolvedSpeaker | null>;
  /* Deletes the card itself; the account behind it is untouched. */
  remove: (id: string) => Promise<boolean>;
  listCandidates: (locale: Locale) => Promise<SpeakerCandidate[]>;
  /* The activities a speaker leads — in one conference, when `slug` is given. */
  activitiesForSpeaker: (
    speakerId: string,
    locale: Locale,
    slug?: string,
  ) => Promise<SpeakerActivity[]>;
}
