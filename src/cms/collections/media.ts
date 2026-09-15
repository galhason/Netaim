import type { CollectionConfig } from 'payload';
import { orgContentAccess } from '../access-presets';

/*
 * What the library accepts.
 *
 * Stated rather than left open: an upload field with no list takes
 * anything at all, including a PDF or a zip that some scene would then
 * try to render as a photograph. These are the formats the site can
 * actually display — every browser in use plays H.264 in MP4, and WebM
 * is the smaller companion for those that prefer it.
 */
const ACCEPTED = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/svg+xml',
  'video/mp4',
  'video/webm',
] as const;

export const Media: CollectionConfig = {
  slug: 'media',
  admin: {
    group: 'Content',
  },
  upload: {
    mimeTypes: [...ACCEPTED],
  },
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
    {
      /*
       * The still a background video shows before it plays, and instead
       * of it for a visitor who asked for less motion. Without one the
       * hero is a black rectangle for as long as the first frame takes
       * to arrive, which on a phone on mobile data is long enough to
       * read as broken.
       */
      name: 'poster',
      type: 'relationship',
      relationTo: 'media',
      admin: {
        condition: (data) => Boolean(data?.mimeType?.startsWith('video/')),
        description: 'Video only: the still shown before playback.',
      },
    },
  ],
};
