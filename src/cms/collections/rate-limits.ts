import type { CollectionConfig } from 'payload';
import { platformOnlyAccess } from '../access-presets';

/*
 * One counter per (action, subject) pair — "magic-link for this email",
 * "registration from this address". Abuse counters must survive a deploy
 * and be shared by every process, so they live in the database rather
 * than in process memory, where a restart used to clear them.
 *
 * Nobody reads this collection through the CMS: it is written and read
 * by the rate limiter alone, and swept of expired rows as it goes.
 */
export const RateLimits: CollectionConfig = {
  slug: 'rate-limits',
  access: platformOnlyAccess,
  admin: {
    group: 'Platform',
    useAsTitle: 'bucket',
    defaultColumns: ['bucket', 'attempts', 'windowStartedAt', 'blockedUntil'],
    hidden: true,
  },
  fields: [
    {
      /* `${action}:${subject}` — hashed, so no address is stored in clear. */
      name: 'bucket',
      type: 'text',
      required: true,
      index: true,
      unique: true,
    },
    {
      name: 'attempts',
      type: 'number',
      required: true,
      defaultValue: 0,
    },
    {
      name: 'windowStartedAt',
      type: 'date',
      required: true,
    },
    {
      /* Set once the allowance is spent; null while the door is open. */
      name: 'blockedUntil',
      type: 'date',
      index: true,
    },
  ],
};
