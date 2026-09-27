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

/* Per-conference overrides for a linked account (all optional). */
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
 * Speakers live behind this contract. Resolution (account defaults +
 * overrides) happens inside the repository, mirroring toOpeningSpeakers.
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
  getById: (id: string, locale: Locale) => Promise<ResolvedSpeaker | null>;
  createExternal: (
    slug: string,
    input: ExternalSpeakerInput,
    locale: Locale,
  ) => Promise<ResolvedSpeaker>;
  createLinked: (
    slug: string,
    accountId: string,
    overrides: SpeakerOverrides,
    locale: Locale,
  ) => Promise<ResolvedSpeaker>;
  update: (
    id: string,
    input: SpeakerOverrides,
    locale: Locale,
  ) => Promise<ResolvedSpeaker | null>;
  /* Takes one voice off the roster; the account behind it is untouched. */
  remove: (id: string) => Promise<boolean>;
  listCandidates: (locale: Locale) => Promise<SpeakerCandidate[]>;
  activitiesForSpeaker: (
    speakerId: string,
    locale: Locale,
  ) => Promise<SpeakerActivity[]>;
}
