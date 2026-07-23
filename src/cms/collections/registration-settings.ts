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
  ],
};
