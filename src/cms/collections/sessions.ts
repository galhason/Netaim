import type { CollectionConfig } from 'payload';
import { publicContentAccess } from '../access-presets';

/*
 * A Session is a moment in the program (Domain Blueprint §7: workshop is
 * a session variant, not a separate entity). Capacity and registration
 * apply to registrable types (workshop). Placement in a Room and time on
 * a day compose the agenda projection. Published agenda reads publicly.
 */
export const Sessions: CollectionConfig = {
  slug: 'sessions',
  access: publicContentAccess,
  admin: {
    group: 'Program',
    useAsTitle: 'title',
    defaultColumns: ['title', 'sessionType', 'startsAt'],
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
      name: 'title',
      type: 'text',
      required: true,
      localized: true,
    },
    {
      name: 'description',
      type: 'textarea',
      localized: true,
    },
    {
      name: 'sessionType',
      type: 'select',
      required: true,
      defaultValue: 'talk',
      options: [
        { label: 'Talk', value: 'talk' },
        { label: 'Workshop', value: 'workshop' },
        { label: 'Keynote', value: 'keynote' },
        { label: 'Break', value: 'break' },
        { label: 'Tour', value: 'tour' },
      ],
    },
    {
      name: 'speakers',
      type: 'relationship',
      relationTo: 'speakers',
      hasMany: true,
      admin: {
        description: 'One or more speakers leading this activity',
      },
    },
    {
      name: 'room',
      type: 'relationship',
      relationTo: 'rooms',
    },
    {
      name: 'track',
      type: 'text',
      localized: true,
    },
    {
      name: 'startsAt',
      type: 'date',
    },
    {
      name: 'endsAt',
      type: 'date',
    },
    {
      name: 'capacity',
      type: 'number',
    },
    {
      name: 'waitlistEnabled',
      type: 'checkbox',
      defaultValue: false,
    },
    {
      name: 'featured',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Show this session in the Featured Sessions on the landing',
      },
    },
    {
      name: 'image',
      type: 'relationship',
      relationTo: 'media',
      admin: {
        description: 'Thumbnail shown on the Featured Sessions cards',
      },
    },
    {
      name: 'language',
      type: 'text',
    },
    {
      name: 'equipment',
      type: 'text',
      localized: true,
    },
    { name: 'subtitle', type: 'text', localized: true },
    { name: 'floor', type: 'text' },
    { name: 'registrationOpensAt', type: 'date' },
    { name: 'registrationClosesAt', type: 'date' },
    { name: 'allowCancellation', type: 'checkbox', defaultValue: true },
    { name: 'cancellationDeadline', type: 'date' },
  ],
};
