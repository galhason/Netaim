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
