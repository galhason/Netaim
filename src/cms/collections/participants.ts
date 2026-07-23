import type { CollectionConfig } from 'payload';
import { registrationAccess } from '../access-presets';

/*
 * Participants are attendees, deliberately separate from CMS Users
 * (Domain Blueprint §2): different lifecycle, different data-protection
 * profile, passwordless (magic-link) identity. `anonymizedAt` records a
 * data-protection deletion — identity becomes a tombstone while the
 * registration's attendance statistics survive.
 */
export const Participants: CollectionConfig = {
  slug: 'participants',
  admin: {
    group: 'Registration',
    useAsTitle: 'email',
  },
  access: registrationAccess,
  fields: [
    {
      name: 'organization',
      type: 'relationship',
      relationTo: 'organizations',
      required: true,
      index: true,
    },
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'email',
      type: 'email',
      required: true,
      index: true,
    },
    {
      name: 'passwordHash',
      type: 'text',
      admin: {
        hidden: true,
        description: 'Derived credential material. Never displayed or edited.',
      },
    },
    {
      /* 2FA (TOTP): the shared secret; enabled only once confirmed. */
      name: 'totpSecret',
      type: 'text',
      admin: {
        hidden: true,
        description: 'Second-factor secret. Never displayed or edited.',
      },
    },
    {
      name: 'totpEnabledAt',
      type: 'date',
      admin: { hidden: true },
    },
    {
      name: 'phone',
      type: 'text',
    },
    {
      /*
       * Connection Framework v1.0: the participant owns every channel.
       * These open only to connections they approved — HASON Messages
       * is always on and never stored; phone and email default OFF.
       */
      name: 'contactPrefs',
      type: 'group',
      admin: {
        description:
          'Which channels open to approved connections. Private by default.',
      },
      fields: [
        { name: 'whatsapp', type: 'checkbox', defaultValue: true },
        { name: 'phone', type: 'checkbox', defaultValue: false },
        { name: 'email', type: 'checkbox', defaultValue: false },
        { name: 'meetings', type: 'checkbox', defaultValue: true },
      ],
    },
    {
      name: 'accessibilityNeeds',
      type: 'textarea',
    },
    {
      name: 'dietary',
      type: 'text',
    },
    {
      name: 'orgName',
      type: 'text',
    },
    {
      name: 'roleTitle',
      type: 'text',
    },
    {
      name: 'interests',
      type: 'text',
      admin: {
        description: 'Comma-separated interests shown on the profile card',
      },
    },
    {
      name: 'photo',
      type: 'relationship',
      relationTo: 'media',
    },
    {
      name: 'blocked',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'A blocked participant cannot enter the personal lounge',
      },
    },
    {
      name: 'anonymizedAt',
      type: 'date',
    },
  ],
};
