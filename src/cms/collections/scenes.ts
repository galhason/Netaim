import type { CollectionConfig } from 'payload';
import { publicContentAccess } from '../access-presets';

/*
 * Scene type is a free identifier resolved against the frontend scene
 * registry at render time. Scene content schemas will be modeled per
 * scene type in the Studio sprint (S2).
 */
export const Scenes: CollectionConfig = {
  slug: 'scenes',
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
      name: 'type',
      type: 'text',
      required: true,
      index: true,
    },
    {
      name: 'content',
      type: 'json',
      localized: true,
    },
    {
      name: 'enabled',
      type: 'checkbox',
      defaultValue: true,
    },
  ],
};
