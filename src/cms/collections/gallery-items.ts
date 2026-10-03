import type { Access, CollectionConfig, Where } from 'payload';
import type { Grant } from '@/auth';
import { organizationsWithPermission } from '@/auth';
import { GALLERY_PLACEMENTS, GALLERY_STATUSES } from '@/features/gallery/types/gallery';
import { scopedByOrganization, scopedCreate } from '../access';

/*
 * One picture or film in a conference's gallery.
 *
 * The file itself stays where every file lives — the media library —
 * and a gallery item only points at it, with the words the gallery
 * says about it. So a photograph used on the landing page and in the
 * gallery is one file, not two; the same file serves Hebrew and
 * English, and only the words beside it are localized. Taking an item
 * out of the gallery removes this row and nothing else.
 *
 * Reading is the one place this collection differs from its
 * neighbours. Partners are public the moment they exist; a gallery is
 * prepared before it is shown, so a visitor (and Payload's own REST
 * API, which answers anyone) sees only what the Studio published. The
 * team reads everything in its own organization, as it reads drafts.
 */
const grantsOf = (user: unknown): Grant[] =>
  ((user as { grants?: Grant[] | null } | null)?.grants ?? []) as Grant[];

const PUBLISHED: Where = { published: { equals: true } };

export const galleryReadAccess: Access = ({ req }) => {
  if (!req.user) {
    return PUBLISHED;
  }
  const scope = organizationsWithPermission(grantsOf(req.user), 'content:read');
  if (scope.all) {
    return true;
  }
  if (scope.organizations.length === 0) {
    return PUBLISHED;
  }
  return { or: [PUBLISHED, { organization: { in: scope.organizations } }] };
};


export const GalleryItems: CollectionConfig = {
  slug: 'gallery-items',
  access: {
    read: galleryReadAccess,
    create: scopedCreate('content:write'),
    update: scopedByOrganization('content:write'),
    delete: scopedByOrganization('content:write'),
  },
  admin: {
    group: 'Content',
    useAsTitle: 'title',
    defaultColumns: ['title', 'media', 'placement', 'published', 'order'],
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
      /*
       * Required on every save, but nullable underneath: if the file is
       * deleted from the library the item loses its picture rather than
       * blocking the deletion, and the gallery simply stops showing it.
       */
      name: 'media',
      type: 'relationship',
      relationTo: 'media',
      index: true,
      validate: (value: unknown) =>
        value === null || value === undefined || value === ''
          ? 'Choose a photo or a video from the media library.'
          : true,
    },
    {
      /* The still a film shows before it plays; the file's own poster otherwise. */
      name: 'poster',
      type: 'relationship',
      relationTo: 'media',
    },
    { name: 'title', type: 'text', localized: true },
    { name: 'caption', type: 'textarea', localized: true },
    {
      /* What a screen reader hears; the file's own alt text when empty. */
      name: 'alt',
      type: 'text',
      localized: true,
    },
    { name: 'credit', type: 'text' },
    {
      /* A film's running time, in seconds, for the badge on its poster. */
      name: 'durationSeconds',
      type: 'number',
      min: 0,
    },
    {
      /*
       * Where it sits on the page — the opening photograph, the main grid,
       * the film band or further down — as the Studio placed it. Only one
       * item holds `hero` and one `film`; the Studio's action keeps it so.
       */
      name: 'placement',
      type: 'select',
      defaultValue: 'story',
      index: true,
      options: GALLERY_PLACEMENTS.map((value) => ({ label: value, value })),
    },
    {
      /* Nothing is shown until the Studio says so. */
      name: 'published',
      type: 'checkbox',
      defaultValue: false,
      index: true,
    },
    { name: 'order', type: 'number', defaultValue: 0 },
    {
      /*
       * `pending` is a photograph a participant sent from the gallery
       * page, waiting for the team; it is never published while pending.
       * Everything the Studio adds itself is `approved` from the start.
       */
      name: 'status',
      type: 'select',
      defaultValue: 'approved',
      index: true,
      options: GALLERY_STATUSES.map((value) => ({ label: value, value })),
    },
    {
      /* The participant who sent it, when a participant did. */
      name: 'submittedBy',
      type: 'relationship',
      relationTo: 'participants',
    },
  ],
};
