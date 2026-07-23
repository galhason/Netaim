import type { CollectionConfig } from 'payload';
import { orgContentAccess } from '../access-presets';

export const Media: CollectionConfig = {
  slug: 'media',
  admin: {
    group: 'Content',
  },
  upload: true,
  access: orgContentAccess,
  fields: [
    {
      name: 'organization',
      type: 'relationship',
      relationTo: 'organizations',
      required: true,
      index: true,
    },
    {
      name: 'alt',
      type: 'text',
      required: true,
      localized: true,
    },
  ],
};
