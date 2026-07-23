import type { CollectionConfig } from 'payload';
import { publicContentAccess } from '../access-presets';

/*
 * A room within an event's venue (Domain Blueprint: Room belongs to
 * Venue). Sessions are hosted in rooms; the interactive venue map reads
 * them. Published agenda is public, so rooms read publicly.
 */
export const Rooms: CollectionConfig = {
  slug: 'rooms',
  access: publicContentAccess,
  admin: {
    group: 'Program',
    useAsTitle: 'name',
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
      localized: true,
    },
    {
      name: 'capacity',
      type: 'number',
    },
    {
      name: 'location',
      type: 'text',
      localized: true,
    },
  ],
};
