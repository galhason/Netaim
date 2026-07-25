'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { type Locale } from '@/config/locales';
import { requireCapability } from '@/features/studio';
import { fromDateTimeInputValue } from '@/shared';
import {
  createSession,
  updateSession,
  deleteSession,
  getSessionSituation,
  isSessionType,
  type CreateSessionInput,
} from '@/features/program';
import { addMedia } from '@/features/events';
import {
  createExternalSpeaker,
  createLinkedSpeaker,
  type ResolvedSpeaker,
  type SpeakerSocialLink,
} from '@/features/speakers';

const authorized = async (slug?: string): Promise<boolean> =>
  (await requireCapability('events:manage', slug)) !== null;

const text = (value: FormDataEntryValue | null): string | undefined => {
  const s = String(value ?? '').trim();
  return s === '' ? undefined : s;
};

const iso = (value: FormDataEntryValue | null): string | undefined => {
  const s = String(value ?? '').trim();
  return s === '' ? undefined : fromDateTimeInputValue(s);
};

/*
 * One write for the whole wizard: create when there is no id, update
 * otherwise. Registration/capacity/waitlist behaviour stays in the
 * frozen engine — this only persists the activity's structured content.
 */
export const saveActivityAction = async (formData: FormData) => {
  const slug = String(formData.get('slug') ?? '');
  if (!slug || !(await authorized(slug))) {
    return;
  }
  const sessionId = String(formData.get('sessionId') ?? '').trim();
  const locale = String(formData.get('contentLocale') ?? 'he') as Locale;
  const title = String(formData.get('title') ?? '').trim();
  const type = String(formData.get('sessionType') ?? 'talk');
  if (!title || !isSessionType(type)) {
    return;
  }
  const capacityRaw = String(formData.get('capacity') ?? '').trim();
  const capacityValue = capacityRaw ? Number(capacityRaw) : null;

  const input: CreateSessionInput = {
    title,
    subtitle: text(formData.get('subtitle')),
    description: text(formData.get('description')),
    sessionType: type,
    speakerIds: formData
      .getAll('speakerId')
      .map((value) => String(value))
      .filter((value) => value !== ''),
    startsAt: iso(formData.get('startsAt')),
    endsAt: iso(formData.get('endsAt')),
    floor: text(formData.get('floor')),
    capacity:
      capacityValue !== null && Number.isFinite(capacityValue)
        ? capacityValue
        : null,
    waitlistEnabled: formData.get('waitlistEnabled') === 'on',
    registrationOpensAt: iso(formData.get('registrationOpensAt')),
    registrationClosesAt: iso(formData.get('registrationClosesAt')),
    allowCancellation: formData.get('allowCancellation') === 'on',
    cancellationDeadline: iso(formData.get('cancellationDeadline')),
    featured: formData.get('featured') === 'on',
    /*
     * The picker always submits the field, so an empty value is a real
     * instruction ("remove the cover"), not a missing one.
     */
    imageId: formData.has('imageId')
      ? String(formData.get('imageId') ?? '').trim()
      : undefined,
    track: text(formData.get('track')),
    language: text(formData.get('language')),
  };

  if (sessionId) {
    await updateSession(sessionId, locale, input);
  } else {
    await createSession(slug, locale, input);
  }
  revalidatePath('/studio/activity');
  redirect('/studio/activity');
};

export const duplicateActivityAction = async (formData: FormData) => {
  const slug = String(formData.get('slug') ?? '');
  const sessionId = String(formData.get('sessionId') ?? '').trim();
  if (!slug || !sessionId || !(await authorized(slug))) {
    return;
  }
  const locale = String(formData.get('contentLocale') ?? 'he') as Locale;
  const situation = await getSessionSituation(sessionId, locale);
  if (situation) {
    const s = situation.session;
    await createSession(slug, locale, {
      title: `${s.title} (${locale === 'he' ? 'עותק' : 'copy'})`,
      subtitle: s.subtitle,
      description: s.description,
      sessionType: s.sessionType,
      speakerIds: s.speakers?.map((speaker) => speaker.id),
      startsAt: s.startsAt,
      endsAt: s.endsAt,
      floor: s.floor,
      capacity: s.capacity,
      waitlistEnabled: s.waitlistEnabled,
      registrationOpensAt: s.registrationOpensAt,
      registrationClosesAt: s.registrationClosesAt,
      allowCancellation: s.allowCancellation,
      cancellationDeadline: s.cancellationDeadline,
      featured: false,
      imageId: s.imageId,
      track: s.track,
      language: s.language,
    });
  }
  revalidatePath('/studio/activity');
};

export const removeActivityAction = async (formData: FormData) => {
  const slug = String(formData.get('slug') ?? '');
  const sessionId = String(formData.get('sessionId') ?? '').trim();
  if (!slug || !sessionId || !(await authorized(slug))) {
    return;
  }
  await deleteSession(sessionId);
  revalidatePath('/studio/activity');
};

/*
 * Adding a speaker from the picker: link an existing account, or create an
 * external one. Called directly by the client (not via a form), so it
 * returns the resolved speaker to drop straight into the selection.
 */
export const createSpeakerAction = async (input: {
  slug: string;
  contentLocale: Locale;
  mode: 'linked' | 'external';
  accountId?: string;
  name?: string;
  jobTitle?: string;
  company?: string;
  bio?: string;
  socialLinks?: SpeakerSocialLink[];
}): Promise<ResolvedSpeaker | null> => {
  const { slug } = input;
  if (!slug || !(await authorized(slug))) {
    return null;
  }
  const locale = input.contentLocale;
  const links = (input.socialLinks ?? []).filter((link) => link.url.trim());
  if (input.mode === 'linked') {
    if (!input.accountId) {
      return null;
    }
    return createLinkedSpeaker(slug, input.accountId, {}, locale);
  }
  const name = (input.name ?? '').trim();
  if (!name) {
    return null;
  }
  return createExternalSpeaker(
    slug,
    {
      name,
      jobTitle: input.jobTitle?.trim() || undefined,
      company: input.company?.trim() || undefined,
      bio: input.bio?.trim() || undefined,
      socialLinks: links.length > 0 ? links : undefined,
    },
    locale,
  );
};

/*
 * A cover for the activity, uploaded from the organizer's own computer.
 * The file lands in the media library under the acting creator and the
 * saved reference comes straight back to the picker, so the wizard never
 * has to send the editor to another screen.
 */
const MAX_COVER_BYTES = 10 * 1024 * 1024;

export const uploadActivityImageAction = async (
  formData: FormData,
): Promise<{ id: string; url: string } | null> => {
  const slug = String(formData.get('slug') ?? '');
  if (!slug || !(await authorized(slug))) {
    return null;
  }
  const file = formData.get('file');
  if (
    !(file instanceof File) ||
    file.size === 0 ||
    file.size > MAX_COVER_BYTES ||
    !file.type.startsWith('image/')
  ) {
    return null;
  }
  const data = new Uint8Array(await file.arrayBuffer());
  const media = await addMedia({
    file: { name: file.name, type: file.type, data },
    alt: String(formData.get('alt') ?? '').trim() || file.name,
  });
  revalidatePath('/studio/media');
  return { id: media.id, url: media.url };
};
