'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { Locale } from '@/config/locales';
import { audit } from '@/features/access';
import {
  createExternalSpeaker,
  createLinkedSpeaker,
  removeSpeaker,
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
  const created = accountId
    ? await createLinkedSpeaker(slug, accountId, { ...heWords, ...(photoId ? { photoId } : {}) }, 'he')
    : await createExternalSpeaker(slug, { ...heWords, ...(photoId ? { photoId } : {}) }, 'he');
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

export const removeSpeakerAction = async (formData: FormData) => {
  const slug = text(formData, 'slug');
  const id = text(formData, 'id');
  const actor = slug ? await actorFor('events:manage', slug) : null;
  if (!actor || !id) {
    return;
  }
  await removeSpeaker(id);
  await audit(actor, 'content.speakerRemoved', slug, { speaker: id });
  publishedEvent(slug);
  revalidatePath(page(slug));
  redirect(`${page(slug)}?notice=removed`);
};
