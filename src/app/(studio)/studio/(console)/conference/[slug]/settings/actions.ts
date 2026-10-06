'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { audit } from '@/features/access';
import {
  archiveEvent,
  deleteEvent,
  duplicateEvent,
  findEvent,
  getStaffOnlyConferenceSlug,
  launchExperience,
  restoreEvent,
  setActiveConference,
  setStaffOnlyConference,
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

/*
 * Who may see the conference: the Netaim team only, or everyone.
 *
 * Takes effect at once and publishes nothing — a draft stays a draft.
 * Closing it to the team is for checking a published conference before
 * the public may; the site says "being prepared" to everyone else.
 */
export const setConferenceAudienceAction = async (formData: FormData) => {
  const slug = String(formData.get('slug') ?? '').trim();
  const audience = String(formData.get('audience') ?? '');
  const actor = slug ? await actorFor('events:manage', slug) : null;
  if (!actor || (audience !== 'staff' && audience !== 'everyone')) {
    redirect(`${workspace(slug)}/settings?saved=audience-refused`);
  }
  /*
   * One conference holds the door at a time. Opening a conference that
   * does not hold it changes nothing; moving it away from another
   * conference that is published would open that one to the public
   * without anyone asking, so that is refused and said.
   */
  const current = await getStaffOnlyConferenceSlug();
  if (audience === 'everyone' && current !== slug) {
    redirect(`${workspace(slug)}/settings?saved=audience-everyone`);
  }
  if (audience === 'staff' && current && current !== slug) {
    const holder = await findEvent(current).catch(() => null);
    if (holder?.launched) {
      redirect(`${workspace(slug)}/settings?saved=audience-busy`);
    }
  }
  try {
    await setStaffOnlyConference(audience === 'staff' ? slug : null);
  } catch {
    redirect(`${workspace(slug)}/settings?saved=audience-refused`);
  }
  await audit(actor, 'event.audienceChanged', slug, { audience });
  publishedEvent(slug);
  revalidatePath(workspace(slug), 'layout');
  revalidatePath('/studio', 'layout');
  redirect(`${workspace(slug)}/settings?saved=${audience === 'staff' ? 'audience-staff' : 'audience-everyone'}`);
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
