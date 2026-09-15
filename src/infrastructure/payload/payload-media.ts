import type { Media } from '@/payload-types';

/*
 * One rule for resolving uploaded artwork: a populated media document
 * yields its URL; anything else (id, null, missing) yields undefined so
 * callers fall back to their placeholder.
 */
export const mediaUrl = (
  media: number | Media | null | undefined,
): string | undefined => {
  if (media && typeof media === 'object' && media.url) {
    return media.url;
  }
  return undefined;
};

export const mediaId = (
  media: number | Media | null | undefined,
): string | undefined => {
  if (media == null) {
    return undefined;
  }
  if (typeof media === 'number') {
    return String(media);
  }
  return String(media.id);
};

export const toMediaRelation = (
  value: string | null | undefined,
): number | null | undefined => {
  if (value === undefined) {
    return undefined;
  }
  if (value === null || value === '') {
    return null;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

/*
 * One media field, either kind.
 *
 * Adding a second relationship beside every image — one for the still,
 * one for the film — would have meant a new column, a new picker and a
 * new decision in every section of the site. But the library already
 * knows what each file is, so the field itself does not need to: a
 * section asks for "the media here", and what comes back is a
 * photograph or a film depending on what the editor chose.
 *
 * A film also yields a still: its poster when one was attached,
 * otherwise nothing, and the section falls back to its own default the
 * way it already does for a missing image.
 */
export interface SceneMedia {
  imageUrl?: string;
  videoUrl?: string;
}

export const sceneMedia = (
  media: number | Media | null | undefined,
): SceneMedia => {
  if (!media || typeof media !== 'object' || !media.url) {
    return {};
  }
  if (!media.mimeType?.startsWith('video/')) {
    return { imageUrl: media.url };
  }
  const poster =
    media.poster && typeof media.poster === 'object' ? media.poster.url : null;
  return {
    videoUrl: media.url,
    ...(poster ? { imageUrl: poster } : {}),
  };
};
