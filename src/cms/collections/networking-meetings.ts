import type { CollectionConfig } from 'payload';
import { registrationAccess } from '../access-presets';

/*
 * A NetworkingMeeting is a 1:1 meeting between two participants at an event
 * (Networking-Architecture Layer 3). The host proposes; the guest confirms.
 * Overlap of confirmed meetings is prevented by the pure engine at the
 * application seam, never here.
 */
export const NetworkingMeetings: CollectionConfig = {
  slug: 'networking-meetings',
  access: registrationAccess,
  admin: {
    group: 'Networking',
    useAsTitle: 'id',
    defaultColumns: ['host', 'guest', 'startsAt', 'status'],
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
      index: true,
    },
    {
      name: 'host',
      type: 'relationship',
      relationTo: 'participants',
      required: true,
      index: true,
    },
    {
      name: 'guest',
      type: 'relationship',
      relationTo: 'participants',
      required: true,
      index: true,
    },
    {
      name: 'startsAt',
      type: 'date',
      required: true,
    },
    {
      name: 'endsAt',
      type: 'date',
      required: true,
    },
    {
      name: 'location',
      type: 'text',
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'proposed',
      options: [
        { label: 'Proposed', value: 'proposed' },
        { label: 'Confirmed', value: 'confirmed' },
        { label: 'Cancelled', value: 'cancelled' },
      ],
    },
  ],
};
