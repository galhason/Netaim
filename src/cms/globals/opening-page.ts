import type { GlobalConfig } from 'payload';
import { anyGrantWith, isPublic } from '../access';

/*
 * The homepage (Opening Experience) content: every scene the visitor
 * walks through is edited here — nothing on the public entrance is
 * hardcoded. Text falls back to the cinematic copy in code only while a
 * field is empty; images fall back to placeholders until artwork is
 * uploaded.
 */
export const OpeningPage: GlobalConfig = {
  slug: 'opening-page',
  label: 'Homepage',
  admin: {
    group: 'Content',
  },
  access: {
    read: isPublic,
    update: anyGrantWith('content:write'),
  },
  fields: [
    {
      name: 'composition',
      type: 'array',
      admin: {
        description: 'Scene order and visibility — directed from the Studio',
      },
      fields: [
        { name: 'scene', type: 'text', required: true },
        { name: 'hidden', type: 'checkbox', defaultValue: false },
      ],
    },
    {
      name: 'hero',
      type: 'group',
      fields: [
        { name: 'titleMain', type: 'text', localized: true },
        { name: 'titleAccent', type: 'text', localized: true },
        { name: 'subtitle', type: 'text', localized: true },
        { name: 'image', type: 'relationship', relationTo: 'media' },
      ],
    },
    {
      name: 'events',
      type: 'group',
      fields: [
        { name: 'title', type: 'text', localized: true },
        { name: 'subtitle', type: 'text', localized: true },
      ],
    },
    {
      name: 'story',
      type: 'group',
      fields: [
        { name: 'eyebrow', type: 'text', localized: true },
        { name: 'title', type: 'text', localized: true },
        { name: 'paragraph', type: 'textarea', localized: true },
        { name: 'image', type: 'relationship', relationTo: 'media' },
      ],
    },
    {
      name: 'moments',
      type: 'group',
      fields: [
        { name: 'title', type: 'text', localized: true },
        {
          name: 'items',
          type: 'array',
          fields: [
            { name: 'image', type: 'relationship', relationTo: 'media' },
          ],
        },
      ],
    },
    {
      name: 'closing',
      type: 'group',
      fields: [
        { name: 'title', type: 'text', localized: true },
        { name: 'subtitle', type: 'text', localized: true },
        { name: 'cta', type: 'text', localized: true },
      ],
    },
  ],
};
