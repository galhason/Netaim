'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { SUPPORTED_LOCALES, type Locale } from '@/config/locales';
import { audit } from '@/features/access';
import {
  addGalleryItem,
  approveGallerySubmission,
  isGalleryCategory,
  listGalleryItems,
  listGallerySubmissions,
  moveGalleryItem,
  parseDuration,
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

const inputOf = (formData: FormData): GalleryItemInput => {
  const category = text(formData, 'category');
  return {
    words: wordsOf(formData),
    credit: text(formData, 'credit'),
    category: isGalleryCategory(category) ? category : '',
    durationSeconds: parseDuration(text(formData, 'duration')),
    featured: formData.get('featured') === 'on',
    published: formData.get('published') === 'on',
    ...(formData.has('posterId') ? { posterId: text(formData, 'posterId') } : {}),
  };
};

/* The item, if it is one of this conference's; null otherwise. */
const itemOf = async (slug: string, id: string) =>
  (await listGalleryItems(slug)).find((item) => item.id === id) ?? null;

const nameOf = (formData: FormData): string =>
  text(formData, 'title_he') || text(formData, 'title_en') || text(formData, 'alt_he') || '';

export const addGalleryItemAction = async (formData: FormData) => {
  const slug = text(formData, 'slug');
  const actor = slug ? await actorFor(CAPABILITY, slug) : null;
  if (!actor) {
    return;
  }
  const mediaId = text(formData, 'mediaId');
  if (!mediaId) {
    redirect(`${GALLERY}?notice=media-required#gallery-add`);
  }
  const created = await addGalleryItem(slug, { ...inputOf(formData), mediaId });
  await audit(actor, 'content.galleryItemSaved', slug, { item: created.id, created: true, published: created.published }, nameOf(formData));
  changed(slug);
  redirect(`${GALLERY}?notice=added#item-${created.id}`);
};

export const updateGalleryItemAction = async (formData: FormData) => {
  const slug = text(formData, 'slug');
  const id = text(formData, 'id');
  const actor = slug ? await actorFor(CAPABILITY, slug) : null;
  if (!actor || !id || !(await itemOf(slug, id))) {
    return;
  }
  const mediaId = text(formData, 'mediaId');
  if (!mediaId) {
    redirect(`${GALLERY}?notice=media-required#item-${id}`);
  }
  const updated = await updateGalleryItem(id, { ...inputOf(formData), mediaId });
  if (!updated) {
    redirect(`${GALLERY}?notice=failed#item-${id}`);
  }
  await audit(actor, 'content.galleryItemSaved', slug, { item: id, published: updated.published }, nameOf(formData));
  changed(slug);
  redirect(`${GALLERY}?notice=saved#item-${id}`);
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
