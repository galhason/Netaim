import type { CollectionConfig } from 'payload';
import { REGISTRATION_STATUSES } from '@/registration-engine';
import { registrationAccess } from '../access-presets';

/*
 * Registration is a Participant's place at an Event (Domain Blueprint:
 * Registration context). Status is governed by the Registration Engine's
 * state machine; no surface writes it directly. Capacity, waitlist order
 * and the submitted answers live here as facts, not rules.
 */
export const Registrations: CollectionConfig = {
  slug: 'registrations',
  access: registrationAccess,
  admin: {
    group: 'Registration',
    defaultColumns: ['participant', 'event', 'status'],
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
      name: 'event',
      type: 'relationship',
      relationTo: 'events',
      required: true,
      index: true,
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      index: true,
      options: REGISTRATION_STATUSES.map((status) => ({
        label: status,
        value: status,
      })),
    },
    {
      name: 'answers',
      type: 'json',
    },
    {
      name: 'waitlistPosition',
      type: 'number',
    },
    {
      name: 'offerExpiresAt',
      type: 'date',
    },
    {
      name: 'cancelledReason',
      type: 'text',
    },
    {
      name: 'submittedAt',
      type: 'date',
    },
    /*
     * When the participant consented, on the registration form, to being
     * photographed and to the use of photographs and video in which they
     * appear. Empty means no consent was given with this registration.
     * Written only from the person's own tick at registration — nobody
     * sets or changes it from the admin or the API.
     */
    {
      name: 'mediaConsentAt',
      type: 'date',
      access: {
        create: () => false,
        update: () => false,
      },
      admin: {
        readOnly: true,
        description: 'When the participant consented to photography and media use on the registration form. Empty: no consent given.',
        date: { pickerAppearance: 'dayAndTime' },
      },
    },
  ],
};
