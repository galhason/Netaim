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
  ],
};
