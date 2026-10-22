/*
 * How much one field of a person's profile may hold.
 *
 * The profile had no limits at all: a name could be a megabyte, and it
 * is shown on every directory tile, every roster, every export. Each
 * field now has a size a real answer never reaches, and the one-line
 * fields — a name, an organisation, a role, a headline — hold one line.
 * What is too long is cut, never refused: a person who pasted a long
 * biography keeps the first two thousand characters rather than losing
 * the whole form. The form fields carry the same numbers.
 */
export const PROFILE_LIMITS = {
  name: 120,
  email: 254,
  phone: 40,
  organization: 160,
  role: 120,
  headline: 160,
  dietary: 500,
  accessibility: 500,
  interests: 500,
  bio: 2000,
  linkLabel: 60,
  linkUrl: 500,
} as const;

export const MAX_PROFILE_LINKS = 2;
