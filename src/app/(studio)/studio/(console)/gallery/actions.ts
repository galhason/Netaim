'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { SUPPORTED_LOCALES, type Locale } from '@/config/locales';
import { audit } from '@/features/access';
import {
  addGalleryItem,
  addGalleryItems,
  approveGallerySubmission,
  isGalleryPlacement,
  listGalleryItems,
  listGallerySubmissions,
  moveGalleryItem,
  parseDuration,
  placeGalleryItem,
  rejectGallerySubmission,
  removeGalleryItem,
  updateGalleryItem,
  type GalleryItemInput,
  type GalleryWords,
} from '@/features/gallery';
import { actorFor } from '@/features/studio/services/studio-auth';
import { publishedEvent } from '@/shared/cache/publish';

/*
 * The gallery of one conference, from the Studio: what it shows, and
 * the photographs participants sent for it.
 *
 * Every action asks the server, not the page, whether the person may
 * keep this conference's gallery (`gallery:manage` for this slug — the
 * Netaim admin, supervisor and staff alike). An item named in a form
 * must belong to the conference named beside it, and a submission must
 * be one of its pending photographs, so a form edited by hand cannot
 * reach another conference's gallery. Beneath that the collection's own
 * access decides again (content:write in the organization), because the
 * writes run as the member, not as the system.
 *
 * Removing a curated item takes it out of the gallery and nothing more:
 * the file stays in the media library. Declining a submission removes
 * the photograph it brought, which was never part of the library.
 */
const GALLERY = '/studio/gallery';
const PENDING = '/studio/gallery/pending';
const CAPABILITY = 'gallery:manage' as const;
const text = (formData: FormData, name: string): string => String(formData.get(name) ?? '').trim();

const changed = (slug: string) => {
  publishedEvent(slug);
  revalidatePath(GALLERY);
  revalidatePath(PENDING);
  revalidatePath('/studio');
};

/* The words of both languages, as the form sends them: title_he, caption_en… */
const wordsOf = (formData: FormData): Partial<Record<Locale, Partial<GalleryWords>>> =>
  Object.fromEntries(
    SUPPORTED_LOCALES.map((locale) => [
      locale,
      {
        title: text(formData, `title_${locale}`),
        caption: text(formData, `caption_${locale}`),
        alt: text(formData, `alt_${locale}`),
      },
    ]),
  );

/* The fields the item editor sends; where the item sits is set apart. */
const inputOf = (formData: FormData): GalleryItemInput => ({
  words: wordsOf(formData),
  credit: text(formData, 'credit'),
  durationSeconds: parseDuration(text(formData, 'duration')),
  published: formData.get('published') === 'on',
  ...(formData.has('posterId') ? { posterId: text(formData, 'posterId') } : {}),
});

/* A grid to add into: the main grid unless "further down" was chosen. */
const gridOf = (formData: FormData): 'story' | 'more' => (text(formData, 'placement') === 'more' ? 'more' : 'story');

/* The item, if it is one of this conference's; null otherwise. */
const itemOf = async (slug: string, id: string) =>
  (await listGalleryItems(slug)).find((item) => item.id === id) ?? null;

const nameOf = (formData: FormData): string =>
  text(formData, 'title_he') || text(formData, 'title_en') || text(formData, 'alt_he') || '';

/* Files just uploaded through the library's own upload, placed in one grid. */
export const addGalleryItemsAction = async (formData: FormData) => {
  const slug = text(formData, 'slug');
  const actor = slug ? await actorFor(CAPABILITY, slug) : null;
  if (!actor) {
    return;
  }
  const mediaIds = text(formData, 'mediaIds')
    .split(',')
    .map((id) => id.trim())
    .filter((id) => /^\d+$/.test(id));
  if (mediaIds.length === 0) {
    redirect(`${GALLERY}?notice=media-required`);
  }
  const placement = gridOf(formData);
  const created = await addGalleryItems(slug, mediaIds, placement);
  await audit(actor, 'content.galleryItemSaved', slug, { items: created.map((item) => item.id).join(','), created: true, placement });
  changed(slug);
  redirect(`${GALLERY}?notice=added#zone-${placement}`);
};

/* One file chosen from the media library. */
export const addGalleryItemAction = async (formData: FormData) => {
  const slug = text(formData, 'slug');
  const actor = slug ? await actorFor(CAPABILITY, slug) : null;
  if (!actor) {
    return;
  }
  const mediaId = text(formData, 'mediaId');
  if (!mediaId) {
    redirect(`${GALLERY}?notice=media-required`);
  }
  const placement = gridOf(formData);
  const created = await addGalleryItem(slug, { mediaId, placement, published: true });
  await audit(actor, 'content.galleryItemSaved', slug, { item: created.id, created: true, placement });
  changed(slug);
  redirect(`${GALLERY}?notice=added#item-${created.id}`);
};

export const updateGalleryItemAction = async (formData: FormData) => {
  const slug = text(formData, 'slug');
  const id = text(formData, 'id');
  const actor = slug ? await actorFor(CAPABILITY, slug) : null;
  const item = actor && id ? await itemOf(slug, id) : null;
  if (!actor || !item) {
    return;
  }
  const mediaId = text(formData, 'mediaId');
  if (!mediaId) {
    redirect(`${GALLERY}?edit=${id}&notice=media-required#editor`);
  }
  const updated = await updateGalleryItem(id, { ...inputOf(formData), mediaId });
  if (!updated) {
    redirect(`${GALLERY}?edit=${id}&notice=failed#editor`);
  }
  const placement = text(formData, 'placement');
  if (isGalleryPlacement(placement) && placement !== item.placement) {
    const placed = await placeGalleryItem(slug, id, placement);
    if (!placed.ok) {
      redirect(`${GALLERY}?edit=${id}&notice=wrong-kind#editor`);
    }
  }
  await audit(actor, 'content.galleryItemSaved', slug, { item: id, published: updated.published, placement }, nameOf(formData));
  changed(slug);
  redirect(`${GALLERY}?edit=${id}&notice=saved#editor`);
};

/*
 * Where an item sits: the hero, the main grid, the film band or further
 * down. The hero and the film take one each, and only a photograph or
 * a film respectively; the service keeps both rules.
 */
export const placeGalleryItemAction = async (formData: FormData) => {
  const slug = text(formData, 'slug');
  const id = text(formData, 'id');
  const placement = text(formData, 'placement');
  const actor = slug ? await actorFor(CAPABILITY, slug) : null;
  if (!actor || !id || !isGalleryPlacement(placement) || !(await itemOf(slug, id))) {
    return;
  }
  const placed = await placeGalleryItem(slug, id, placement);
  if (!placed.ok) {
    redirect(`${GALLERY}?notice=wrong-kind`);
  }
  await audit(actor, 'content.galleryItemSaved', slug, { item: id, placement });
  changed(slug);
  redirect(`${GALLERY}?notice=placed#zone-${placement}`);
};

/* Show or hide one item without opening its form. */
export const setGalleryItemPublishedAction = async (formData: FormData) => {
  const slug = text(formData, 'slug');
  const id = text(formData, 'id');
  const actor = slug ? await actorFor(CAPABILITY, slug) : null;
  if (!actor || !id || !(await itemOf(slug, id))) {
    return;
  }
  const published = text(formData, 'published') === 'true';
  const updated = await updateGalleryItem(id, { published });
  if (!updated) {
    redirect(`${GALLERY}?notice=failed#item-${id}`);
  }
  await audit(actor, 'content.galleryItemSaved', slug, { item: id, published });
  changed(slug);
  redirect(`${GALLERY}?notice=${published ? 'published' : 'hidden'}#item-${id}`);
};

export const removeGalleryItemAction = async (formData: FormData) => {
  const slug = text(formData, 'slug');
  const id = text(formData, 'id');
  const actor = slug ? await actorFor(CAPABILITY, slug) : null;
  if (!actor || !id || !(await itemOf(slug, id))) {
    return;
  }
  await removeGalleryItem(id);
  await audit(actor, 'content.galleryItemRemoved', slug, { item: id }, nameOf(formData));
  changed(slug);
  redirect(`${GALLERY}?notice=removed`);
};

export const moveGalleryItemAction = async (formData: FormData) => {
  const slug = text(formData, 'slug');
  const id = text(formData, 'id');
  const direction = text(formData, 'direction') === 'up' ? 'up' : 'down';
  const actor = slug ? await actorFor(CAPABILITY, slug) : null;
  if (!actor || !id) {
    return;
  }
  const order = await moveGalleryItem(slug, id, direction);
  await audit(actor, 'content.galleryReordered', slug, { item: id, direction, count: order.length });
  changed(slug);
  redirect(`${GALLERY}#item-${id}`);
};

/* A pending photograph of this conference, or null. */
const submissionOf = async (slug: string, id: string) =>
  (await listGallerySubmissions(slug)).find((item) => item.id === id) ?? null;

export const approveGallerySubmissionAction = async (formData: FormData) => {
  const slug = text(formData, 'slug');
  const id = text(formData, 'id');
  const actor = slug ? await actorFor(CAPABILITY, slug) : null;
  const submission = actor && id ? await submissionOf(slug, id) : null;
  if (!actor || !submission) {
    return;
  }
  const approved = await approveGallerySubmission(slug, id);
  if (!approved) {
    redirect(`${PENDING}?notice=failed`);
  }
  await audit(actor, 'content.gallerySubmissionApproved', slug, { item: id, by: submission.submitter?.name ?? '' }, submission.caption);
  changed(slug);
  redirect(`${PENDING}?notice=approved`);
};

export const rejectGallerySubmissionAction = async (formData: FormData) => {
  const slug = text(formData, 'slug');
  const id = text(formData, 'id');
  const actor = slug ? await actorFor(CAPABILITY, slug) : null;
  const submission = actor && id ? await submissionOf(slug, id) : null;
  if (!actor || !submission) {
    return;
  }
  const rejected = await rejectGallerySubmission(id);
  if (!rejected) {
    redirect(`${PENDING}?notice=failed`);
  }
  await audit(actor, 'content.gallerySubmissionRejected', slug, { item: id, by: submission.submitter?.name ?? '' }, submission.caption);
  changed(slug);
  redirect(`${PENDING}?notice=rejected`);
};
