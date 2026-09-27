'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { audit } from '@/features/access';
import {
  archiveEvent,
  deleteEvent,
  duplicateEvent,
  launchExperience,
  restoreEvent,
  setActiveConference,
  updateEventDetails,
} from '@/features/events';
import { actorFor } from '@/features/studio/services/studio-auth';
import { publishedEvent } from '@/shared/cache/publish';
import { fromDateTimeInputValue } from '@/shared';

const workspace = (slug: string) => `/studio/conference/${encodeURIComponent(slug)}`;

/* Dates and the clock. The name is content and is edited with it. */
export const saveConferenceScheduleAction = async (formData: FormData) => {
  const slug = String(formData.get('slug') ?? '').trim();
  const actor = slug ? await actorFor('events:manage', slug) : null;
  if (!actor) {
    return;
  }
  const startsAt = fromDateTimeInputValue(String(formData.get('startsAt') ?? '').trim());
  const endsAt = fromDateTimeInputValue(String(formData.get('endsAt') ?? '').trim());
  const timezone = String(formData.get('timezone') ?? '').trim();
  await updateEventDetails(
    slug,
    {
      ...(startsAt ? { startsAt } : {}),
      ...(endsAt ? { endsAt } : {}),
      ...(timezone ? { timezone } : {}),
    },
    'he',
  );
  await audit(actor, 'content.openingSaved', slug, { section: 'schedule' });
  publishedEvent(slug);
  revalidatePath(workspace(slug), 'layout');
  revalidatePath('/studio', 'layout');
  redirect(`${workspace(slug)}/settings?saved=schedule`);
};

export const publishFromSettingsAction = async (formData: FormData) => {
  const slug = String(formData.get('slug') ?? '').trim();
  const actor = slug ? await actorFor('events:manage', slug) : null;
  if (!actor) {
    return;
  }
  const outcome = await launchExperience(slug, 'he');
  await audit(
    actor,
    'event.launched',
    slug,
    outcome.ok ? { outcome: 'live' } : outcome.retired ? { outcome: 'retired' } : { outcome: 'blocked', blockers: outcome.blockers },
  );
  publishedEvent(slug);
  revalidatePath(workspace(slug), 'layout');
  revalidatePath('/studio', 'layout');
  redirect(`${workspace(slug)}/settings?publish=${outcome.ok ? 'live' : outcome.retired ? 'retired' : 'blocked'}`);
};

export const makeActiveAction = async (formData: FormData) => {
  const slug = String(formData.get('slug') ?? '').trim();
  const actor = slug ? await actorFor('experiences:manage') : null;
  if (!actor) {
    return;
  }
  await setActiveConference(slug);
  await audit(actor, 'event.activeConferenceChanged', slug);
  revalidatePath('/studio', 'layout');
  redirect(`${workspace(slug)}/settings?saved=active`);
};

export const duplicateFromSettingsAction = async (formData: FormData) => {
  const slug = String(formData.get('slug') ?? '').trim();
  const actor = await actorFor('events:manage');
  if (!actor || !slug) {
    return;
  }
  const copy = await duplicateEvent(slug);
  await audit(actor, 'event.duplicated', slug);
  revalidatePath('/studio', 'layout');
  redirect(`${workspace(copy.slug)}/content`);
};

export const archiveFromSettingsAction = async (formData: FormData) => {
  const slug = String(formData.get('slug') ?? '').trim();
  const actor = await actorFor('events:manage');
  if (!actor || !slug) {
    return;
  }
  const result = await archiveEvent(slug);
  if (result.ok) {
    await audit(actor, 'event.archived', slug);
  }
  publishedEvent(slug);
  revalidatePath('/studio', 'layout');
  redirect(`${workspace(slug)}/settings?saved=${result.ok ? 'archived' : 'archive-refused'}`);
};

export const restoreFromSettingsAction = async (formData: FormData) => {
  const slug = String(formData.get('slug') ?? '').trim();
  const actor = await actorFor('events:manage');
  if (!actor || !slug) {
    return;
  }
  const result = await restoreEvent(slug);
  if (result.ok) {
    await audit(actor, 'event.restored', slug);
  }
  publishedEvent(slug);
  revalidatePath('/studio', 'layout');
  redirect(`${workspace(slug)}/settings?saved=${result.ok ? 'restored' : 'restore-refused'}`);
};

export const deleteFromSettingsAction = async (formData: FormData) => {
  const slug = String(formData.get('slug') ?? '').trim();
  const confirm = String(formData.get('confirm') ?? '').trim();
  const actor = await actorFor('events:manage');
  if (!actor || !slug || confirm !== slug) {
    redirect(`${workspace(slug)}/settings?saved=delete-refused`);
  }
  const deleted = await deleteEvent(slug);
  if (deleted) {
    await audit(actor, 'event.deleted', slug);
  }
  revalidatePath('/studio', 'layout');
  redirect(deleted ? '/studio' : `${workspace(slug)}/settings?saved=delete-refused`);
};
