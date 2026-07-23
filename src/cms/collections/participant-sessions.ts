import type { CollectionConfig } from 'payload';
import { registrationAccess } from '../access-presets';

/*
 * A passwordless sign-in session for a participant (D6, magic link). The
 * collection stores only a hash of the token, its purpose and expiry;
 * the token itself lives only in the emailed link. Single-use: `usedAt`
 * closes it.
 */
export const ParticipantSessions: CollectionConfig = {
  slug: 'participant-sessions',
  access: registrationAccess,
  admin: {
    group: 'Registration',
    useAsTitle: 'tokenHash',
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
    },
    {
      name: 'purpose',
      type: 'select',
      required: true,
      defaultValue: 'sign-in',
      options: [{ label: 'Sign in', value: 'sign-in' }],
    },
    {
      name: 'expiresAt',
      type: 'date',
      required: true,
    },
    {
      name: 'usedAt',
      type: 'date',
    },
  ],
};
