import type { CollectionConfig } from 'payload';
import { publicContentAccess } from '../access-presets';

/*
 * A Sponsor is a supporting organization shown on an event (Domain
 * Blueprint §11). Tier drives prominence in the public wall; order breaks
 * ties within a tier. The logo references organization media. Published
 * sponsors read publicly.
 */
export const Sponsors: CollectionConfig = {
  slug: 'sponsors',
  access: publicContentAccess,
  admin: {
    group: 'Content',
    useAsTitle: 'name',
    defaultColumns: ['name', 'tier', 'order'],
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
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'tier',
      type: 'select',
      required: true,
      defaultValue: 'partner',
      options: [
        { label: 'Platinum', value: 'platinum' },
        { label: 'Gold', value: 'gold' },
        { label: 'Silver', value: 'silver' },
        { label: 'Partner', value: 'partner' },
      ],
    },
    {
      name: 'logo',
      type: 'relationship',
      relationTo: 'media',
    },
    {
      name: 'website',
      type: 'text',
    },
    {
      name: 'description',
      type: 'textarea',
      localized: true,
    },
    {
      name: 'order',
      type: 'number',
      defaultValue: 0,
    },
  ],
};
