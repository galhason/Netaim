import type { CollectionConfig } from 'payload';
import { platformOnlyAccess } from '../access-presets';

/*
 * A registration waiting for its address to prove it exists.
 *
 * Nobody becomes a participant by typing an address. They become one by
 * receiving a code at it and typing the code back — so between the form
 * and the account there is a row here, and only here: the details the
 * person filled in, the password they chose (already hashed), and the
 * hash of a six-digit code.
 *
 * Everything about the row is short-lived and unreadable. The address is
 * stored as a hash, so this table holds no list of people who started
 * and never finished. The code is stored as a hash, so a copy of the
 * database does not hand anyone a working code. And the row expires
 * fifteen minutes after it is written, swept on the next attempt — an
 * abandoned registration leaves nothing behind by the time anyone could
 * look for it.
 *
 * Nobody reads this collection through the CMS. It is written and read
 * by the verification service alone.
 */
export const EmailVerifications: CollectionConfig = {
  slug: 'email-verifications',
  access: platformOnlyAccess,
  admin: {
    group: 'Platform',
    useAsTitle: 'emailHash',
    defaultColumns: ['emailHash', 'expiresAt', 'attempts'],
    hidden: true,
  },
  fields: [
    {
      /* sha256(address + secret) — one live verification per address. */
      name: 'emailHash',
      type: 'text',
      required: true,
      index: true,
      unique: true,
    },
    {
      /*
       * sha256(code + address + secret). Bound to the address as well as
       * the secret, so a code issued for one person cannot be replayed
       * against another.
       */
      name: 'codeHash',
      type: 'text',
      required: true,
    },
    {
      /*
       * The registration itself, held until the address answers. The
       * password inside is already hashed — the plain one exists only
       * for the length of the request that received it.
       */
      name: 'pending',
      type: 'json',
      required: true,
    },
    {
      name: 'expiresAt',
      type: 'date',
      required: true,
      index: true,
    },
    {
      /* Wrong guesses. A handful and the row is destroyed. */
      name: 'attempts',
      type: 'number',
      required: true,
      defaultValue: 0,
    },
  ],
};
