import type { CollectionConfig } from 'payload';
import { registrationAccess } from '../access-presets';

/*
 * A live sign-in. One row per device that is currently signed in.
 *
 * Deliberately NOT `participant-sessions`. That collection holds
 * single-use magic-link tokens: short-lived, consumed once, closed by
 * `usedAt`. These are the opposite — long-lived and reusable. Putting
 * both in one table behind a `purpose` discriminator would mean every
 * magic-link query has to remember to filter on it, and the one that
 * forgot would let a session token be consumed as a sign-in link. That
 * is the same class of confusion the token purposes were introduced to
 * end, so the tables stay apart.
 *
 * Only the hash of the session id is stored. A reader of this table
 * cannot mint a cookie from it — and would still need the signing
 * secret even if they could.
 */
export const AccountSessions: CollectionConfig = {
  slug: 'account-sessions',
  access: registrationAccess,
  admin: {
    group: 'Registration',
    useAsTitle: 'tokenHash',
    defaultColumns: ['participant', 'expiresAt', 'revokedAt'],
  },
  fields: [
    {
      name: 'organization',
      type: 'relationship',
      relationTo: 'organizations',
      required: true,
      index: true,
    },
    {
      name: 'participant',
      type: 'relationship',
      relationTo: 'participants',
      required: true,
      index: true,
    },
    {
      name: 'tokenHash',
      type: 'text',
      required: true,
      index: true,
      unique: true,
    },
    {
      name: 'expiresAt',
      type: 'date',
      required: true,
    },
    {
      /*
       * Set rather than deleted, so that signing out leaves a trace. A
       * row that vanishes cannot answer "was this session ended, or did
       * it never exist" — and that is the question asked after an
       * account is misused.
       */
      name: 'revokedAt',
      type: 'date',
    },
  ],
};
