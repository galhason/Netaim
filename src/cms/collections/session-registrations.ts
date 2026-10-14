import type { CollectionConfig } from 'payload';
import { REGISTRATION_STATUSES } from '@/registration-engine';
import { ACTIVITY_LANGUAGES, ACTIVITY_LANGUAGE_LABELS } from '@/shared/constants/activity-facets';
import { registrationAccess } from '../access-presets';

/*
 * A participant's place in a workshop-type Session (the two-step
 * registration's second step). Status is governed by the same
 * Registration Engine state machine as event registration; capacity and
 * waitlist apply per session.
 */
export const SessionRegistrations: CollectionConfig = {
  slug: 'session-registrations',
  access: registrationAccess,
  admin: {
    group: 'Registration',
    defaultColumns: ['participant', 'session', 'status'],
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
      name: 'session',
      type: 'relationship',
      relationTo: 'sessions',
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
      defaultValue: 'confirmed',
      index: true,
      options: REGISTRATION_STATUSES.map((status) => ({
        label: status,
        value: status,
      })),
    },
    {
      name: 'waitlistPosition',
      type: 'number',
    },
    /* The language this registrant asked for, where the activity holds a vote. */
    {
      name: 'language',
      type: 'select',
      options: ACTIVITY_LANGUAGES.map((value) => ({
        label: ACTIVITY_LANGUAGE_LABELS[value].en,
        value,
      })),
    },
    {
      name: 'submittedAt',
      type: 'date',
    },
  ],
};
