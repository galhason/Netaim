/*
 * Who a speaker is, decided once.
 *
 * A roster entry is hybrid: it may hold its own details for a guest with
 * no account, or link a participant account and lend that account's
 * identity, with any field the producer typed acting as a per-conference
 * override. That rule used to live only inside the Payload speaker
 * repository, and the marketing API — which reads the same rows — did not
 * apply it, so a linked speaker who had never been given an override
 * reached the public site with no name and no face.
 *
 * This module is the rule. It is pure: it knows nothing about Payload,
 * requests or media URLs, and the two repositories that consume it
 * format the winning photo their own way. Nothing here decides *whether*
 * a speaker is shown; it decides only what a shown speaker is called and
 * what they look like.
 */

/* The shape both repositories can hand over without conversion. */
export interface SpeakerIdentitySource {
  name?: string | null;
  jobTitle?: string | null;
  /* Legacy field, still on older rows; stands in for an empty jobTitle. */
  role?: string | null;
  company?: string | null;
  bio?: string | null;
  photo?: unknown;
  account?: unknown;
}

interface AccountLike {
  name?: string | null;
  roleTitle?: string | null;
  orgName?: string | null;
  photo?: unknown;
  anonymizedAt?: string | null;
}

export interface SpeakerIdentity {
  name: string;
  jobTitle?: string;
  company?: string;
  bio?: string;
  /*
   * The media document that won -- the row's own, else the account's --
   * still unformatted, or undefined. "Populated" means an object with a
   * `url`: a bare id, which a shallow query leaves behind, counts as
   * absent so the account's photo can still win.
   */
  photo?: unknown;
}

const clean = (value?: string | null): string | undefined => {
  const trimmed = (value ?? '').trim();
  return trimmed === '' ? undefined : trimmed;
};

const populatedMedia = (value: unknown): boolean =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as { url?: unknown }).url === 'string' &&
  (value as { url: string }).url !== '';

/*
 * The account that may lend its identity: a populated document that has
 * not been anonymized. An anonymized account is one whose person asked
 * to be forgotten; the platform already keeps such accounts out of the
 * speaker picker, and lending their name to a page — public or not —
 * would undo that request through a side door.
 */
const lendingAccount = (value: unknown): AccountLike | undefined => {
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  const account = value as AccountLike;
  return account.anonymizedAt ? undefined : account;
};

export const resolveSpeakerIdentity = (
  row: SpeakerIdentitySource,
): SpeakerIdentity => {
  const account = lendingAccount(row.account);

  const photo = populatedMedia(row.photo)
    ? row.photo
    : populatedMedia(account?.photo)
      ? account?.photo
      : undefined;

  return {
    name: clean(row.name) ?? clean(account?.name) ?? '',
    jobTitle:
      clean(row.jobTitle) ?? clean(row.role) ?? clean(account?.roleTitle),
    company: clean(row.company) ?? clean(account?.orgName),
    bio: clean(row.bio),
    ...(photo !== undefined ? { photo } : {}),
  };
};
