import type { Access, CollectionConfig } from 'payload';
import { withBasePath } from '@/config/site';
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

/*
 * Who may see a file in the library.
 *
 * Everything stays public as before, with one exception: a photograph a
 * visitor sent to the gallery is held until the team reviews it, and a
 * held file is left out of every listing and lookup an anonymous caller
 * can make. Its bytes are still served to whoever holds its address
 * (`isReadingStaticFile`) — the Studio shows it to the reviewer that way,
 * and the address is a random name no listing ever reveals.
 */
const NOT_HELD = {
  or: [{ reviewHold: { equals: false } }, { reviewHold: { exists: false } }],
};

export const mediaReadAccess: Access = ({ req, isReadingStaticFile }) =>
  isReadingStaticFile || req.user ? true : NOT_HELD;

export const Media: CollectionConfig = {
  slug: 'media',
  admin: {
    group: 'Content',
  },
  upload: {
    mimeTypes: [...ACCEPTED],
  },
  access: { ...orgContentAccess, read: mediaReadAccess },
  hooks: {
    /*
     * Payload writes `url` as `/api/media/file/<name>` — the path on
     * this server. Under the local shared-domain rehearsal the browser
     * reaches this server at /netaim, so the path the browser must ask
     * for carries that prefix. Applied here, once, on the way out, so
     * every reader — the site's <img> and next/image, the marketing
     * API, the admin thumbnails — sees the address a browser can use.
     * With no base path configured (production) nothing changes.
     */
    afterRead: [
      ({ doc }) => {
        if (!doc || typeof doc !== 'object') {
          return doc;
        }
        const prefixed = (value: unknown) =>
          typeof value === 'string' ? withBasePath(value) : value;
        doc.url = prefixed(doc.url);
        doc.thumbnailURL = prefixed(doc.thumbnailURL);
        if (doc.sizes && typeof doc.sizes === 'object') {
          for (const size of Object.values(doc.sizes as Record<string, { url?: unknown }>)) {
            if (size && typeof size === 'object') {
              size.url = prefixed(size.url);
            }
          }
        }
        return doc;
      },
    ],
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
    {
      /* A visitor's gallery photo awaiting review: not listed until approved. */
      name: 'reviewHold',
      type: 'checkbox',
      defaultValue: false,
      index: true,
      admin: { readOnly: true },
    },
  ],
};
