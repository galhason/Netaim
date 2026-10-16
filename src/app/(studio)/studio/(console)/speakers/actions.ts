'use server';

import { revalidatePath } from 'next/cache';
import type { Locale } from '@/config/locales';
import { audit, type AuditActor } from '@/features/access';
import {
  listSpeakerLibrary,
  mergeSpeakers,
  removeSpeaker,
  updateSpeaker,
} from '@/features/speakers';
import { actorFor } from '@/features/studio/services/studio-auth';
import { publishedEvent } from '@/shared/cache/publish';

const PAGE = '/studio/speakers';
const LOCALES: Locale[] = ['he', 'en'];
const text = (formData: FormData, name: string): string => String(formData.get(name) ?? '').trim();

/* The library is the organisation's, not one conference's: either hand that runs content may edit it. */
const libraryActor = async (): Promise<AuditActor | null> =>
  (await actorFor('events:manage')) ?? (await actorFor('activities:manage'));

/* Every conference a card is on is a page to refresh. */
const conferencesOf = async (ids: string[]): Promise<string[]> => {
  const library = await listSpeakerLibrary('he').catch(() => []);
  return [
    ...new Set(
      library
        .filter((speaker) => ids.includes(speaker.id))
        .flatMap((speaker) => (speaker.conferences ?? []).map((conference) => conference.slug))
        .filter(Boolean),
    ),
  ];
};

const refresh = (slugs: string[]) => {
  for (const slug of slugs) {
    publishedEvent(slug);
    revalidatePath(`/studio/conference/${encodeURIComponent(slug)}/speakers`);
  }
  revalidatePath(PAGE);
};

/*
 * Each action answers with the address to show next (see action-form.tsx)
 * rather than redirecting.
 */
export const saveLibrarySpeakerAction = async (formData: FormData): Promise<string | null> => {
  const actor = await libraryActor();
  const id = text(formData, 'id');
  if (!actor || !id) {
    return null;
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
  await audit(actor, 'content.speakerSaved', undefined, { speaker: id, name: text(formData, 'name_he') }, text(formData, 'name_he'));
  refresh(await conferencesOf([id]));
  return `${PAGE}?notice=saved#speaker-${id}`;
};

/*
 * Several cards that are one person, made one. The card chosen to keep
 * takes the others' activities, conferences, and whatever words or
 * picture it lacked; the others are deleted.
 */
export const mergeSpeakersAction = async (formData: FormData): Promise<string | null> => {
  const actor = await libraryActor();
  const keepId = text(formData, 'keepId');
  const foldIds = formData.getAll('foldId').map(String).filter((id) => id && id !== keepId);
  if (!actor || !keepId || foldIds.length === 0) {
    return null;
  }
  const slugs = await conferencesOf([keepId, ...foldIds]);
  let merged = 0;
  for (const foldId of foldIds) {
    if (await mergeSpeakers(keepId, foldId).catch(() => null)) {
      merged += 1;
    }
  }
  await audit(actor, 'content.speakersMerged', undefined, { speaker: keepId, folded: foldIds.join(',') });
  refresh(slugs);
  return `${PAGE}?notice=${merged === foldIds.length ? 'merged' : 'merge-partial'}#speaker-${keepId}`;
};

/* Only a card no conference shows can be deleted from the library. */
export const deleteLibrarySpeakerAction = async (formData: FormData): Promise<string | null> => {
  const actor = await libraryActor();
  const id = text(formData, 'id');
  if (!actor || !id) {
    return null;
  }
  if ((await conferencesOf([id])).length > 0) {
    return `${PAGE}?notice=in-use#speaker-${id}`;
  }
  await removeSpeaker(id);
  await audit(actor, 'content.speakerRemoved', undefined, { speaker: id });
  revalidatePath(PAGE);
  return `${PAGE}?notice=deleted`;
};
