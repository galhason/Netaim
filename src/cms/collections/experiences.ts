import type { CollectionConfig } from 'payload';
import { publicContentAccess } from '../access-presets';

/*
 * An Experience is an ordered composition of Scenes. Order lives here,
 * not on the Scene, so a Scene can be reused across Experiences.
 */
export const Experiences: CollectionConfig = {
  slug: 'experiences',
  admin: {
    group: 'Content',
    useAsTitle: 'title',
  },
  versions: {
    drafts: true,
  },
  access: publicContentAccess,
  fields: [
    {
      name: 'organization',
      type: 'relationship',
      relationTo: 'organizations',
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
      name: 'scenes',
      type: 'relationship',
      relationTo: 'scenes',
      hasMany: true,
    },
  ],
};
