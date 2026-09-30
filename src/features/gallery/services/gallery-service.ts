import type { Locale } from '@/config/locales';
import { galleryRepository } from '@/infrastructure';
import { cacheTags, cachedContent } from '@/shared/cache/content-cache';
import {
  SUBMISSION_CAPTION_MAX,
  SUBMISSION_CREDIT_MAX,
  SUBMISSION_MAX_BYTES,
  SUBMISSION_TYPES,
} from '../constants/gallery-limits';
import type {
  GalleryEntry,
  GalleryItemInput,
  GalleryItemSummary,
  GallerySubmission,
} from '../types/gallery';

/* Every item of the conference, shown or not — the Studio's list. */
export const listGalleryItems = (slug: string): Promise<GalleryItemSummary[]> =>
  galleryRepository.listByEvent(slug);

/*
 * What a visitor sees: published items with a file, in one language.
 *
 * Shared across visitors and kept until the Studio changes something —
 * every gallery write clears the conference's tag (publishedEvent), so
 * a picture published in the Studio is on the page at the next load.
 */
export const publishedGallery = (slug: string, locale: Locale): Promise<GalleryEntry[]> =>
  cachedContent(
    (s: string, l: Locale) => galleryRepository.listPublished(s, l),
    ['gallery', slug, locale],
    [cacheTags.event(slug)],
  )(slug, locale);

/* A new item joins at the end, so the list the team sees is the page's order. */
export const addGalleryItem = async (
  slug: string,
  input: GalleryItemInput,
): Promise<GalleryItemSummary> => {
  const existing = await galleryRepository.listByEvent(slug);
  const last = existing.reduce((max, item) => Math.max(max, item.order), -1);
  return galleryRepository.create(slug, { ...input, order: input.order ?? last + 1 });
};

export const updateGalleryItem = (
  id: string,
  input: GalleryItemInput,
): Promise<GalleryItemSummary | null> => galleryRepository.update(id, input);

/* Out of the gallery. The file stays in the media library. */
export const removeGalleryItem = (id: string): Promise<boolean> => galleryRepository.remove(id);

/*
 * One step earlier or later. The whole list is renumbered 0..n-1 in its
 * new order, as the partners strip does, so gaps and ties left by an
 * older list cannot swallow the move.
 */
export const moveGalleryItem = async (
  slug: string,
  id: string,
  direction: 'up' | 'down',
): Promise<GalleryItemSummary[]> => {
  const list = await galleryRepository.listByEvent(slug);
  const index = list.findIndex((item) => item.id === id);
  if (index === -1) {
    return list;
  }
  const target = direction === 'up' ? index - 1 : index + 1;
  if (target < 0 || target >= list.length) {
    return list;
  }
  const next = [...list];
  [next[index], next[target]] = [next[target]!, next[index]!];
  await Promise.all(
    next.map((item, order) =>
      item.order === order ? Promise.resolve(null) : galleryRepository.update(item.id, { order }),
    ),
  );
  return next.map((item, order) => ({ ...item, order }));
};

/*
 * What the file's first bytes say it is — not what its name or the
 * browser claim. Only the three formats a participant may send are
 * recognised; everything else is null.
 */
export const sniffImageType = (data: Uint8Array): (typeof SUBMISSION_TYPES)[number] | null => {
  const starts = (bytes: number[], at = 0) => bytes.every((byte, i) => data[at + i] === byte);
  if (starts([0xff, 0xd8, 0xff])) {
    return 'image/jpeg';
  }
  if (starts([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return 'image/png';
  }
  if (starts([0x52, 0x49, 0x46, 0x46]) && starts([0x57, 0x45, 0x42, 0x50], 8)) {
    return 'image/webp';
  }
  return null;
};

export type SubmissionRefusal = 'missing' | 'size' | 'type' | 'rights' | 'failed';

export interface SubmissionRequest {
  file: { name: string; type: string; data: Uint8Array } | null;
  caption: string;
  credit: string;
  rightsConfirmed: boolean;
}

/*
 * A participant's photograph, checked and queued for the team.
 *
 * Who may send, and to which conference, is the caller's question (the
 * gallery page's action answers it: signed in, published conference,
 * within the allowance). This answers what may be sent: one photograph,
 * no larger than the ceiling, really one of the three formats, with the
 * sender's word that they may share it. It never publishes anything.
 */
export const submitGalleryPhoto = async (
  slug: string,
  participant: { id: string; name: string },
  locale: Locale,
  request: SubmissionRequest,
): Promise<{ ok: true } | { ok: false; reason: SubmissionRefusal }> => {
  const { file } = request;
  if (!file || file.data.byteLength === 0) {
    return { ok: false, reason: 'missing' };
  }
  if (file.data.byteLength > SUBMISSION_MAX_BYTES) {
    return { ok: false, reason: 'size' };
  }
  if (!sniffImageType(file.data)) {
    return { ok: false, reason: 'type' };
  }
  if (!request.rightsConfirmed) {
    return { ok: false, reason: 'rights' };
  }
  const queued = await galleryRepository
    .submit(slug, {
      file,
      participantId: participant.id,
      caption: request.caption.trim().slice(0, SUBMISSION_CAPTION_MAX),
      credit: (request.credit.trim() || participant.name).slice(0, SUBMISSION_CREDIT_MAX),
      locale,
    })
    .catch(() => null);
  return queued ? { ok: true } : { ok: false, reason: 'failed' };
};

/* Photographs waiting for the team, oldest first. */
export const listGallerySubmissions = (slug: string): Promise<GallerySubmission[]> =>
  galleryRepository.listPending(slug);

/* Into the gallery, at the end of it, shown. */
export const approveGallerySubmission = async (slug: string, id: string): Promise<boolean> => {
  const existing = await galleryRepository.listByEvent(slug);
  const last = existing.reduce((max, item) => Math.max(max, item.order), -1);
  return galleryRepository.approve(id, last + 1);
};

/* Out, with the file it brought. */
export const rejectGallerySubmission = (id: string): Promise<boolean> => galleryRepository.reject(id);
