import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { relationshipId } from '@/auth';
import { SUPPORTED_LOCALES, type Locale } from '@/config/locales';
import {
  isGalleryPlacement,
  type GalleryEntry,
  type GalleryFile,
  type GalleryItemInput,
  type GalleryItemSummary,
  type GalleryRepository,
  type GallerySubmission,
  type GalleryWords,
} from '@/features/gallery/types/gallery';
import { actorContext, getSystemPayload } from './payload-context';

/*
 * The gallery, as rows in `gallery-items` pointing at `media`.
 *
 * Public reads go through the system instance with the published filter
 * written into the query itself — the same rule the collection's access
 * function applies to an anonymous REST caller, stated here too because
 * overrideAccess skips that function. Writes go through the acting
 * member with access enforced, so the organization scope and the
 * content:write permission decide, not this file.
 */

type Localized<T> = T | Partial<Record<Locale, T | null>> | null | undefined;

interface MediaRow {
  id: number | string;
  url?: string | null;
  alt?: Localized<string>;
  mimeType?: string | null;
  width?: number | null;
  height?: number | null;
  poster?: unknown;
}

interface GalleryRow {
  id: number | string;
  media?: unknown;
  poster?: unknown;
  title?: Localized<string>;
  caption?: Localized<string>;
  alt?: Localized<string>;
  credit?: string | null;
  placement?: string | null;
  durationSeconds?: number | null;
  published?: boolean | null;
  order?: number | null;
  status?: string | null;
  submittedBy?: unknown;
  createdAt?: string;
}

/* Not a participant's photograph still waiting for the team. */
const CURATED = {
  or: [{ status: { equals: 'approved' } }, { status: { exists: false } }],
};

const LOCALIZED_WORDS = ['title', 'caption', 'alt'] as const;

/* A stored placement, or the main grid for a row written before there was one. */
const placementOf = (value: string | null | undefined) =>
  value && isGalleryPlacement(value) ? value : 'story';

/* A populated relationship, or nothing — an id alone is not a file. */
const mediaOf = (value: unknown): MediaRow | undefined =>
  value && typeof value === 'object' && 'id' in value ? (value as MediaRow) : undefined;

const idOf = (value: unknown): string | undefined => {
  const id = relationshipId(value as Parameters<typeof relationshipId>[0]);
  return id === null || id === undefined ? undefined : String(id);
};

/* One language's word from a field read in one locale or in all of them. */
const wordIn = (value: Localized<string>, locale: Locale): string => {
  if (typeof value === 'string') {
    return value.trim();
  }
  if (value && typeof value === 'object') {
    const word = value[locale];
    return typeof word === 'string' ? word.trim() : '';
  }
  return '';
};

const fileOf = (media: MediaRow | undefined): GalleryFile | undefined => {
  if (!media?.url) {
    return undefined;
  }
  return {
    url: media.url,
    ...(typeof media.width === 'number' ? { width: media.width } : {}),
    ...(typeof media.height === 'number' ? { height: media.height } : {}),
    ...(media.mimeType ? { mimeType: media.mimeType } : {}),
  };
};

const isVideoFile = (media: MediaRow | undefined): boolean =>
  Boolean(media?.mimeType?.startsWith('video/'));

const FALLBACK_ALT: Record<Locale, { image: string; video: string }> = {
  he: { image: 'תמונה מהכנס', video: 'סרטון מהכנס' },
  en: { image: 'A photo from the conference', video: 'A film from the conference' },
};

/*
 * A row as a visitor meets it, or null when there is nothing to show —
 * its file was deleted from the library. A film without a still is
 * still shown: the browser draws its first frame instead.
 */
export const toGalleryEntry = (row: GalleryRow, locale: Locale): GalleryEntry | null => {
  const media = mediaOf(row.media);
  const file = fileOf(media);
  if (!file) {
    return null;
  }
  const kind = isVideoFile(media) ? 'video' : 'image';
  const poster =
    kind === 'video'
      ? (fileOf(mediaOf(row.poster)) ?? fileOf(mediaOf(media?.poster)))
      : undefined;
  const title = wordIn(row.title, locale);
  const caption = wordIn(row.caption, locale);
  const alt =
    wordIn(row.alt, locale) || wordIn(media?.alt, locale) || title || FALLBACK_ALT[locale][kind];
  const credit = row.credit?.trim() ?? '';
  return {
    id: String(row.id),
    kind,
    file,
    ...(poster ? { poster } : {}),
    alt,
    ...(title ? { title } : {}),
    ...(caption ? { caption } : {}),
    ...(credit ? { credit } : {}),
    ...(typeof row.durationSeconds === 'number' && row.durationSeconds > 0
      ? { durationSeconds: Math.round(row.durationSeconds) }
      : {}),
    placement: placementOf(row.placement),
    order: typeof row.order === 'number' ? row.order : 0,
  };
};

const toSummary = (row: GalleryRow): GalleryItemSummary => {
  const media = mediaOf(row.media);
  /* What the Studio shows as the film's still: its own, else the file's. */
  const poster = mediaOf(row.poster) ?? mediaOf(media?.poster);
  const words = Object.fromEntries(
    SUPPORTED_LOCALES.map((locale) => [
      locale,
      {
        title: wordIn(row.title, locale),
        caption: wordIn(row.caption, locale),
        alt: wordIn(row.alt, locale),
      } satisfies GalleryWords,
    ]),
  ) as Record<Locale, GalleryWords>;
  return {
    id: String(row.id),
    ...(idOf(row.media) ? { mediaId: idOf(row.media) } : {}),
    ...(media?.url ? { mediaUrl: media.url } : {}),
    ...(media?.mimeType ? { mediaMimeType: media.mimeType } : {}),
    ...(idOf(row.poster) ? { posterId: idOf(row.poster) } : {}),
    ...(poster?.url ? { posterUrl: poster.url } : {}),
    ...(media ? { kind: isVideoFile(media) ? ('video' as const) : ('image' as const) } : {}),
    words,
    credit: row.credit?.trim() ?? '',
    ...(typeof row.durationSeconds === 'number' ? { durationSeconds: row.durationSeconds } : {}),
    placement: placementOf(row.placement),
    published: row.published === true,
    order: typeof row.order === 'number' ? row.order : 0,
  };
};

const byOrder = <T extends { order: number; id: string }>(a: T, b: T): number =>
  a.order - b.order || Number(a.id) - Number(b.id);

/*
 * Published items of one conference, by its id, in one language. The
 * marketing API calls this with an id it has already verified as
 * published; the public page calls it through the slug below.
 */
export const payloadGalleryEntriesOfEvent = async (
  eventId: string | number,
  locale: Locale,
): Promise<GalleryEntry[]> => {
  const payload = await getSystemPayload();
  const result = await payload.find({
    collection: 'gallery-items',
    locale,
    /*
     * No borrowing from the other language: a caption in Hebrew on the
     * English page is worse than no caption. Alt text falls back in
     * code, to the file's own and then to a plain description.
     */
    fallbackLocale: false,
    where: {
      and: [{ event: { equals: eventId } }, { published: { equals: true } }, CURATED],
    },
    depth: 2,
    pagination: false,
    overrideAccess: true,
    sort: 'order',
  });
  return (result.docs as unknown as GalleryRow[])
    .map((row) => toGalleryEntry(row, locale))
    .filter((entry): entry is GalleryEntry => entry !== null)
    .sort(byOrder);
};

const eventIdOf = async (slug: string): Promise<number | string | null> => {
  const payload = await getSystemPayload();
  const event = await payload.find({
    collection: 'events',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  const row = event.docs[0] as { id: number | string } | undefined;
  return row ? row.id : null;
};

/* The non-localized part of an input, as Payload column values. */
const sharedData = (input: GalleryItemInput): Record<string, unknown> => {
  const data: Record<string, unknown> = {};
  if (input.mediaId !== undefined && input.mediaId !== '') {
    data.media = Number(input.mediaId);
  }
  if (input.posterId !== undefined) {
    data.poster = input.posterId === '' ? null : Number(input.posterId);
  }
  if (input.credit !== undefined) {
    data.credit = input.credit;
  }
  if (input.durationSeconds !== undefined) {
    data.durationSeconds = input.durationSeconds;
  }
  if (input.placement !== undefined) {
    data.placement = input.placement;
  }
  if (input.published !== undefined) {
    data.published = input.published;
  }
  if (input.order !== undefined) {
    data.order = input.order;
  }
  return data;
};

const wordsData = (input: GalleryItemInput, locale: Locale): Record<string, unknown> => {
  const words = input.words?.[locale];
  const data: Record<string, unknown> = {};
  if (!words) {
    return data;
  }
  for (const key of LOCALIZED_WORDS) {
    if (words[key] !== undefined) {
      data[key] = words[key];
    }
  }
  return data;
};

const readAll = async (id: string | number): Promise<GalleryItemSummary | null> => {
  const payload = await getSystemPayload();
  const doc = await payload
    .findByID({ collection: 'gallery-items', id, locale: 'all', depth: 2, overrideAccess: true })
    .catch(() => null);
  return doc ? toSummary(doc as unknown as GalleryRow) : null;
};

/*
 * A participant's photograph, made safe to keep.
 *
 * Decoded and written again as a JPEG: that proves it is an image and
 * not something named like one, turns it the right way up, bounds its
 * size, and drops every piece of metadata the camera wrote — the GPS
 * position of a phone photo above all. A file that does not decode is
 * refused here, whatever its name and type claimed.
 */
const SUBMISSION_MAX_EDGE = 3200;
const SUBMISSION_MAX_PIXELS = 60_000_000;
const WHITE = { r: 255, g: 255, b: 255 };

const normalized = async (data: Uint8Array): Promise<Buffer | null> => {
  try {
    return await sharp(data, { limitInputPixels: SUBMISSION_MAX_PIXELS, failOn: 'error' })
      .rotate()
      .resize({ width: SUBMISSION_MAX_EDGE, height: SUBMISSION_MAX_EDGE, fit: 'inside', withoutEnlargement: true })
      .flatten({ background: WHITE })
      .jpeg({ quality: 85, mozjpeg: true })
      .toBuffer();
  } catch {
    return null;
  }
};

const eventRowOf = async (slug: string) => {
  const payload = await getSystemPayload();
  const result = await payload.find({
    collection: 'events',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  return result.docs[0] as
    | { id: number | string; organization: number | string | { id: number | string } }
    | undefined;
};

/*
 * The sender by name only. Reviewing photographs is not a licence to
 * read participants' contact details — staff who review do not hold
 * participants:read — so the address never reaches this screen.
 */
const participantOf = (value: unknown): { name: string } | undefined => {
  if (value && typeof value === 'object' && 'name' in value) {
    const name = (value as { name?: string | null }).name?.trim() ?? '';
    return name ? { name } : undefined;
  }
  return undefined;
};

export const payloadGalleryRepository: GalleryRepository = {
  listByEvent: async (slug) => {
    const eventId = await eventIdOf(slug);
    if (eventId === null) {
      return [];
    }
    const payload = await getSystemPayload();
    const result = await payload.find({
      collection: 'gallery-items',
      locale: 'all',
      where: { and: [{ event: { equals: eventId } }, CURATED] },
      depth: 2,
      pagination: false,
      overrideAccess: true,
      sort: 'order',
    });
    return (result.docs as unknown as GalleryRow[]).map(toSummary).sort(byOrder);
  },

  listPublished: async (slug, locale) => {
    const eventId = await eventIdOf(slug);
    return eventId === null ? [] : payloadGalleryEntriesOfEvent(eventId, locale);
  },

  create: async (slug, input) => {
    const context = await actorContext();
    if (!context) {
      throw new Error('Sign-in required');
    }
    const { payload, user } = context;
    const result = await payload.find({
      collection: 'events',
      where: { slug: { equals: slug } },
      limit: 1,
      depth: 0,
      overrideAccess: false,
      user,
    });
    const eventRow = result.docs[0] as
      | { id: number | string; organization: number | string | { id: number | string } }
      | undefined;
    if (!eventRow) {
      throw new Error('Event not found');
    }
    const [first, ...rest] = SUPPORTED_LOCALES;
    const doc = await payload.create({
      collection: 'gallery-items',
      locale: first,
      data: {
        organization: Number(relationshipId(eventRow.organization)),
        event: Number(eventRow.id),
        ...sharedData(input),
        ...wordsData(input, first),
      } as never,
      overrideAccess: false,
      user,
    });
    for (const locale of rest) {
      const words = wordsData(input, locale);
      if (Object.keys(words).length > 0) {
        await payload.update({
          collection: 'gallery-items',
          id: doc.id,
          locale,
          data: words,
          overrideAccess: false,
          user,
        });
      }
    }
    return (await readAll(doc.id)) ?? toSummary(doc as unknown as GalleryRow);
  },

  update: async (id, input) => {
    const context = await actorContext();
    if (!context) {
      throw new Error('Sign-in required');
    }
    const { payload, user } = context;
    const [first, ...rest] = SUPPORTED_LOCALES;
    const firstData = { ...sharedData(input), ...wordsData(input, first) };
    try {
      if (Object.keys(firstData).length > 0) {
        await payload.update({
          collection: 'gallery-items',
          id,
          locale: first,
          data: firstData,
          overrideAccess: false,
          user,
        });
      }
      for (const locale of rest) {
        const words = wordsData(input, locale);
        if (Object.keys(words).length > 0) {
          await payload.update({
            collection: 'gallery-items',
            id,
            locale,
            data: words,
            overrideAccess: false,
            user,
          });
        }
      }
    } catch {
      return null;
    }
    return readAll(id);
  },

  /*
   * Written by the system, because the sender is a participant with no
   * role in the organization — which is why the gallery page's action
   * asks, before this is reached, that they are signed in, that the
   * conference is published and that they are within their allowance.
   * The file goes into the one media library, under a random name, held
   * from every listing; the item is pending and unpublished.
   */
  submit: async (slug, input) => {
    const event = await eventRowOf(slug);
    const data = await normalized(input.file.data);
    if (!event || !data) {
      return null;
    }
    const payload = await getSystemPayload();
    const organization = Number(relationshipId(event.organization));
    const media = await payload.create({
      collection: 'media',
      locale: input.locale,
      data: {
        organization,
        alt: FALLBACK_ALT[input.locale].image,
        reviewHold: true,
      },
      file: {
        name: `gallery-${randomUUID()}.jpg`,
        mimetype: 'image/jpeg',
        data,
        size: data.byteLength,
      },
      overrideAccess: true,
    });
    try {
      const item = await payload.create({
        collection: 'gallery-items',
        locale: input.locale,
        data: {
          organization,
          event: Number(event.id),
          media: Number(media.id),
          credit: input.credit,
          status: 'pending',
          published: false,
          placement: 'more',
          submittedBy: Number(input.participantId),
        } as never,
        overrideAccess: true,
      });
      return { id: String(item.id) };
    } catch {
      /* No queued item, no orphaned file. */
      await payload.delete({ collection: 'media', id: media.id, overrideAccess: true }).catch(() => null);
      return null;
    }
  },

  listPending: async (slug) => {
    const event = await eventRowOf(slug);
    if (!event) {
      return [];
    }
    const payload = await getSystemPayload();
    const result = await payload.find({
      collection: 'gallery-items',
      locale: 'all',
      where: { and: [{ event: { equals: event.id } }, { status: { equals: 'pending' } }] },
      depth: 1,
      pagination: false,
      overrideAccess: true,
      sort: 'createdAt',
    });
    return (result.docs as unknown as GalleryRow[]).flatMap((row): GallerySubmission[] => {
      const file = fileOf(mediaOf(row.media));
      if (!file) {
        return [];
      }
      const caption = SUPPORTED_LOCALES.map((locale) => wordIn(row.caption, locale)).find(Boolean) ?? '';
      const submitter = participantOf(row.submittedBy);
      return [
        {
          id: String(row.id),
          file,
          caption,
          credit: row.credit?.trim() ?? '',
          ...(submitter ? { submitter } : {}),
          submittedAt: row.createdAt ?? '',
        },
      ];
    });
  },

  /* As the reviewing member: the collection's access decides, not this file. */
  approve: async (id, order) => {
    const context = await actorContext();
    if (!context) {
      throw new Error('Sign-in required');
    }
    const { payload, user } = context;
    try {
      const item = await payload.update({
        collection: 'gallery-items',
        id,
        data: { status: 'approved', published: true, placement: 'more', order } as never,
        depth: 0,
        overrideAccess: false,
        user,
      });
      const mediaId = idOf(item.media);
      if (mediaId) {
        await payload.update({
          collection: 'media',
          id: mediaId,
          data: { reviewHold: false } as never,
          overrideAccess: false,
          user,
        });
      }
      return true;
    } catch {
      return false;
    }
  },

  /*
   * The file goes with the item — but only a held file, one that came in
   * with this submission and was never part of the library. Anything
   * else is left exactly where it is.
   */
  reject: async (id) => {
    const context = await actorContext();
    if (!context) {
      throw new Error('Sign-in required');
    }
    const { payload, user } = context;
    try {
      const item = (await payload.findByID({
        collection: 'gallery-items',
        id,
        depth: 1,
        overrideAccess: false,
        user,
      })) as unknown as GalleryRow;
      if (item.status !== 'pending') {
        return false;
      }
      await payload.delete({ collection: 'gallery-items', id, overrideAccess: false, user });
      const media = mediaOf(item.media) as (MediaRow & { reviewHold?: boolean | null }) | undefined;
      if (media && media.reviewHold === true) {
        await payload.delete({ collection: 'media', id: media.id, overrideAccess: false, user });
      }
      return true;
    } catch {
      return false;
    }
  },

  /* The row only. The file stays in the media library, as it came. */
  remove: async (id) => {
    const context = await actorContext();
    if (!context) {
      throw new Error('Sign-in required');
    }
    const { payload, user } = context;
    const deleted = await payload
      .delete({ collection: 'gallery-items', id, overrideAccess: false, user })
      .catch(() => null);
    return deleted !== null;
  },
};
