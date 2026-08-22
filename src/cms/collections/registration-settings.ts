import type { CollectionConfig } from 'payload';
import { REGISTRATION_MODES } from '@/registration-engine';
import { registrationAccess } from '../access-presets';

/*
 * The registration design of one event, edited only through the Studio
 * Registration workspace — never raw JSON. One document per event.
 * Modes and capacity are configuration; the rules live in the engine.
 */
export const RegistrationSettings: CollectionConfig = {
  slug: 'registration-settings',
  access: registrationAccess,
  admin: {
    group: 'Registration',
    useAsTitle: 'event',
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
      name: 'event',
      type: 'relationship',
      relationTo: 'events',
      required: true,
      unique: true,
      index: true,
    },
    {
      name: 'mode',
      type: 'select',
      required: true,
      defaultValue: 'open',
      options: REGISTRATION_MODES.map((mode) => ({ label: mode, value: mode })),
    },
    {
      name: 'capacity',
      type: 'number',
    },
    {
      name: 'opensAt',
      type: 'date',
    },
    {
      name: 'closesAt',
      type: 'date',
    },
    {
      name: 'waitlistEnabled',
      type: 'checkbox',
      defaultValue: false,
    },
    {
      name: 'confirmationMessage',
      type: 'textarea',
      localized: true,
    },
    {
      name: 'collectPhone',
      type: 'checkbox',
      defaultValue: false,
    },
    {
      name: 'collectAccessibility',
      type: 'checkbox',
      defaultValue: false,
    },
    {
      name: 'collectDietary',
      type: 'checkbox',
      defaultValue: false,
    },
    {
      /*
       * What this conference says in its registration emails, when it
       * wants to say something other than the platform's wording.
       *
       * Every field is optional and every field falls back on its own:
       * leaving the confirmation subject empty keeps the platform's
       * subject, and a message the organizer never opened keeps its own
       * words entirely. A blank field has never meant "send nothing".
       *
       * Localized, so an organizer writes Hebrew and English separately
       * and a guest is written to in the language they chose.
       */
      name: 'emailTemplates',
      type: 'group',
      fields: [
        'confirmed',
        'pending',
        'waitlisted',
        'approved',
        'declined',
        'promoted',
        'cancelled',
      ].map((moment) => ({
        name: moment,
        type: 'group' as const,
        fields: [
          { name: 'subject', type: 'text' as const, localized: true },
          { name: 'body', type: 'textarea' as const, localized: true },
        ],
      })),
    },
  ],
};
