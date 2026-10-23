'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { Locale } from '@/config/locales';
import { audit } from '@/features/access';
import {
  activitiesForSpeaker,
  createExternalSpeaker,
  createLinkedSpeaker,
  moveSpeakerOnFront,
  setSpeakerListed,
  type FrontMove,
  updateSpeaker,
} from '@/features/speakers';
import { actorFor } from '@/features/studio/services/studio-auth';
import { publishedEvent } from '@/shared/cache/publish';

const page = (slug: string) => `/studio/conference/${encodeURIComponent(slug)}/speakers`;
const text = (formData: FormData, name: string): string => String(formData.get(name) ?? '').trim();
const LOCALES: Locale[] = ['he', 'en'];

/*
 * The words a speaker card shows are localized; the picture and the
 * account behind them are not. So a save is two writes, one per
 * language, with the picture riding the Hebrew one.
 *
 * A speaker added here is listed on this conference by hand. If the
 * library already holds them — the same account, or the same name — that
 * card is listed, and no second one is made.
 */
export const addSpeakerAction = async (formData: FormData) => {
  const slug = text(formData, 'slug');
  const actor = slug ? await actorFor('events:manage', slug) : null;
  if (!actor) {
    return;
  }
  const accountId = text(formData, 'accountId');
  const photoId = text(formData, 'photoId');
  const words = (locale: Locale) => ({
    name: text(formData, `name_${locale}`),
    jobTitle: text(formData, `jobTitle_${locale}`),
    company: text(formData, `company_${locale}`),
    bio: text(formData, `bio_${locale}`),
  });
  const heWords = words('he');
  if (!accountId && !heWords.name) {
    redirect(`${page(slug)}?notice=name-required`);
  }
  const placement = { slug, listOn: true };
  const created = accountId
    ? await createLinkedSpeaker(accountId, { ...heWords, ...(photoId ? { photoId } : {}) }, 'he', placement)
    : await createExternalSpeaker({ ...heWords, ...(photoId ? { photoId } : {}) }, 'he', placement);
  const enWords = words('en');
  if (Object.values(enWords).some((value) => value !== '')) {
    await updateSpeaker(created.id, enWords, 'en');
  }
  await audit(actor, 'content.speakerSaved', slug, { speaker: created.id, name: heWords.name, created: true }, heWords.name || accountId);
  publishedEvent(slug);
  revalidatePath(page(slug));
  redirect(`${page(slug)}?notice=added`);
};

export const updateSpeakerAction = async (formData: FormData) => {
  const slug = text(formData, 'slug');
  const id = text(formData, 'id');
  const actor = slug ? await actorFor('events:manage', slug) : null;
  if (!actor || !id) {
    return;
  }
  for (const locale of LOCALES) {
    await updateSpeaker(
      id,
      {
        name: text(formData, `name_${locale}`),
        jobTitle: text(formData, `jobTitle_${locale}`),
        company: text(formData, `company_${locale}`),
        bio: text(formData, `bio_${locale}`),
        ...(locale === 'he' && formData.has('photoId') ? { photoId: text(formData, 'photoId') } : {}),
      },
      locale,
    );
  }
  await audit(actor, 'content.speakerSaved', slug, { speaker: id, name: text(formData, 'name_he') }, text(formData, 'name_he'));
  publishedEvent(slug);
  revalidatePath(page(slug));
  redirect(`${page(slug)}?notice=saved#speaker-${id}`);
};

/* A card from the library, listed on this conference — nothing is copied. */
export const listFromLibraryAction = async (formData: FormData) => {
  const slug = text(formData, 'slug');
  const id = text(formData, 'speakerId');
  const actor = slug ? await actorFor('events:manage', slug) : null;
  if (!actor) {
    return;
  }
  if (!id) {
    redirect(`${page(slug)}?notice=pick-required`);
  }
  await setSpeakerListed(id, slug, true);
  await audit(actor, 'content.speakerSaved', slug, { speaker: id, listed: true });
  publishedEvent(slug);
  revalidatePath(page(slug));
  redirect(`${page(slug)}?notice=added#speaker-${id}`);
};

/*
 * Off this conference's list — the card stays in the library, and the
 * speaker stays on the page as long as an activity here names them.
 */
export const removeSpeakerAction = async (formData: FormData) => {
  const slug = text(formData, 'slug');
  const id = text(formData, 'id');
  const actor = slug ? await actorFor('events:manage', slug) : null;
  if (!actor || !id) {
    return;
  }
  await setSpeakerListed(id, slug, false);
  await audit(actor, 'content.speakerRemoved', slug, { speaker: id });
  const stillOn = (await activitiesForSpeaker(id, 'he', slug).catch(() => [])).length > 0;
  /* Off the page altogether, so off its front row too. */
  if (!stillOn) {
    await moveSpeakerOnFront(slug, id, 'off');
  }
  publishedEvent(slug);
  revalidatePath(page(slug));
  redirect(`${page(slug)}?notice=${stillOn ? 'still-scheduled' : 'removed'}`);
};

const FRONT_MOVES: readonly FrontMove[] = ['up', 'down', 'off', 'on'];

/*
 * The front row of the conference's speakers page — the few shown first,
 * in the organisers' order. Each press is one step (`move` = "<id>:<step>"):
 * onto the row at the end, up or down a place, or off it.
 */
export const moveFrontSpeakerAction = async (formData: FormData) => {
  const slug = text(formData, 'slug');
  const actor = slug ? await actorFor('events:manage', slug) : null;
  if (!actor) {
    return;
  }
  const [id = '', step = ''] = text(formData, 'move').split(':');
  const move = FRONT_MOVES.find((candidate) => candidate === step);
  if (!/^\d+$/.test(id) || !move) {
    redirect(page(slug));
  }
  const done = await moveSpeakerOnFront(slug, id, move);
  if (done) {
    await audit(actor, 'content.speakersReordered', slug, { speaker: id, move });
    publishedEvent(slug);
  }
  revalidatePath(page(slug));
  redirect(`${page(slug)}?notice=${done ? 'front' : 'front-refused'}#front-row`);
};
