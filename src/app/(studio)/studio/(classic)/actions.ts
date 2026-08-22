'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { isSupportedLocale } from '@/config/locales';
import { audit } from '@/features/access';
import { saveComposerContent } from '@/features/composer/services/composer-save-service';
import { addMedia, addPerson, createEvent } from '@/features/events';
import { checkInByToken } from '@/features/registration';
import { addSponsor, isSponsorTier } from '@/features/sponsors';
import { actorFor, authorized } from '@/features/studio/services/studio-auth';
import {
  renameOrganization,
  updateCreatorName,
} from '@/features/studio/services/studio-settings';
import {
  addTeamMember,
  renameTeamMember,
} from '@/features/studio/services/studio-team';
import { optionalText } from '@/features/studio/utils/form-values';
import {
  publishedEvent,
  publishedSpeakers,
  publishedSponsors,
} from '@/shared/cache/publish';

/*
 * What only the classic Studio still performs. The actions both studios
 * share moved to `studio/actions.ts`; these stay until the Console grows
 * a screen for each, and this file goes when the last one is ported.
 */

export const createEventAction = async (formData: FormData) => {
  const title = String(formData.get('title') ?? '').trim();
  const actor = await actorFor('events:manage');
  if (!actor) {
    return;
  }
  const startsAt = String(formData.get('startsAt') ?? '').trim();
  if (!title) {
    return;
  }
  const event = await createEvent(title, startsAt || undefined);
  await audit(actor, 'event.created', event.slug, undefined, title);
  revalidatePath('/studio', 'layout');
  redirect(`/studio/events/${encodeURIComponent(event.slug)}`);
};

export const addPersonAction = async (formData: FormData) => {
  const name = String(formData.get('name') ?? '').trim();
  if (!(await authorized('experiences:manage'))) {
    return;
  }
  const role = String(formData.get('role') ?? '').trim();
  if (name) {
    await addPerson({ name, role: role || undefined });
    publishedSpeakers();
    revalidatePath('/studio', 'layout');
  }
};

export const addMediaAction = async (formData: FormData) => {
  const file = formData.get('file');
  if (!(await authorized('experiences:manage'))) {
    return;
  }
  const alt = String(formData.get('alt') ?? '').trim();
  if (file instanceof File && file.size > 0 && alt) {
    await addMedia({
      file: {
        name: file.name,
        type: file.type,
        data: new Uint8Array(await file.arrayBuffer()),
      },
      alt,
    });
    revalidatePath('/studio', 'layout');
  }
};

export const renameOrganizationAction = async (formData: FormData) => {
  const name = String(formData.get('name') ?? '').trim();
  if (!(await authorized('platform:manage'))) {
    return;
  }
  if (name) {
    await renameOrganization(name);
    revalidatePath('/studio', 'layout');
  }
};

export const updateProfileNameAction = async (formData: FormData) => {
  const name = String(formData.get('name') ?? '').trim();
  if (!(await authorized('content:read'))) {
    return;
  }
  if (name) {
    await updateCreatorName(name);
    revalidatePath('/studio', 'layout');
  }
};

export const saveComposerAction = async (
  slug: string,
  locale: string,
  scenes: { id: string; content: unknown }[],
): Promise<number> => {
  const actor = slug ? await actorFor('experiences:manage', slug) : null;
  if (!actor) {
    return 0;
  }
  if (!slug || !isSupportedLocale(locale)) {
    return 0;
  }
  const saved = await saveComposerContent(locale, scenes);
  await audit(actor, 'content.composerSaved', slug, {
    scenes: saved,
    contentLocale: locale,
  });
  publishedEvent(slug);
  revalidatePath(`/studio/events/${slug}/composer`);
  return saved;
};

type CheckInOutcome = 'checkedin' | 'already' | 'blocked' | 'invalid';

export const checkInAction = async (
  token: string,
): Promise<{ outcome: CheckInOutcome; name?: string }> => {
  const actor = await actorFor('checkin:operate');
  if (!actor) {
    return { outcome: 'invalid' };
  }
  const trimmed = token.trim();
  if (!trimmed) {
    return { outcome: 'invalid' };
  }
  const result = await checkInByToken(trimmed);
  if (!result) {
    return { outcome: 'invalid' };
  }
  const name =
    result.registration.participant.name ||
    result.registration.participant.email;
  if (result.attended) {
    /*
     * Only the admission itself is recorded, not every scan: a door
     * operator sweeps continuously, and a trail of rejected scans would
     * bury the entries that matter.
     */
    await audit(actor, 'registration.checkedIn', undefined, {
      registrationId: result.registration.id,
    });
    return { outcome: 'checkedin', name };
  }
  if (result.registration.status === 'attended') {
    return { outcome: 'already', name };
  }
  return { outcome: 'blocked', name };
};

export const addSponsorAction = async (formData: FormData) => {
  const slug = String(formData.get('slug') ?? '');
  if (!slug || !(await authorized('events:manage', slug))) {
    return;
  }
  const name = String(formData.get('name') ?? '').trim();
  const tier = String(formData.get('tier') ?? 'partner');
  if (!slug || !name || !isSponsorTier(tier)) {
    return;
  }
  const orderRaw = String(formData.get('order') ?? '').trim();
  const orderValue = orderRaw ? Number(orderRaw) : undefined;
  await addSponsor(slug, {
    name,
    tier,
    website: optionalText(formData.get('website')),
    description: optionalText(formData.get('description')),
    order:
      orderValue !== undefined && Number.isFinite(orderValue)
        ? orderValue
        : undefined,
  });
  publishedSponsors();
  publishedEvent(slug);
  revalidatePath(`/studio/events/${slug}/sponsors`);
};

export const addTeamMemberAction = async (formData: FormData) => {
  const name = String(formData.get('name') ?? '').trim();
  if (!(await authorized('platform:manage'))) {
    return;
  }
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const role = String(formData.get('role') ?? '');
  if (!email || !password || !role) {
    return;
  }
  await addTeamMember({ name, email, password, role });
  revalidatePath('/studio/team');
};

export const renameTeamMemberAction = async (formData: FormData) => {
  const id = String(formData.get('id') ?? '');
  if (!(await authorized('platform:manage'))) {
    return;
  }
  const name = String(formData.get('name') ?? '').trim();
  if (!id) {
    return;
  }
  await renameTeamMember(id, name);
  revalidatePath('/studio/team');
};
