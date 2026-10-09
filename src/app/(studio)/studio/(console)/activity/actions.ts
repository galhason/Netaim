'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { type Locale } from '@/config/locales';
import { audit } from '@/features/access';
import { requireCapability } from '@/features/studio';
import { actorFor } from '@/features/studio/services/studio-auth';
import { fromDateTimeInputValue } from '@/shared';
import { publishedEvent } from '@/shared/cache/publish';
import {
  archiveSession,
  createSession,
  updateSession,
  deleteSession,
  getSessionSituation,
  isSessionType,
  restoreSession,
  type CreateSessionInput,
} from '@/features/program';
import { addMedia } from '@/features/events';
import {
  createExternalSpeaker,
  createLinkedSpeaker,
  getSpeaker,
  listConferenceSpeakers,
  updateSpeaker,
  type ResolvedSpeaker,
  type SpeakerSocialLink,
} from '@/features/speakers';
import { activityLanguagesOf, audiencesOf, topicsOf } from '@/shared/constants/activity-facets';

/*
 * Shaping the program (create, edit, duplicate, illustrate) is one
 * capability; shelving is a second; destroying is a third. Staff hold
 * the first, supervisors the first two, admins all three.
 */
const authorized = async (slug?: string): Promise<boolean> =>
  (await requireCapability('activities:manage', slug)) !== null;

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
/*
 * The activity's own two languages, fixed. They are deliberately not
 * the Studio's interface language: the form shows both rows at once, so
 * "which language am I editing" is not a question any more.
 */
const HEBREW: Locale = 'he';
const ENGLISH: Locale = 'en';

export const saveActivityAction = async (formData: FormData) => {
  const slug = String(formData.get('slug') ?? '');
  if (!slug || !(await authorized(slug))) {
    return;
  }
  const sessionId = String(formData.get('sessionId') ?? '').trim();
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
    /* The three facets, as ticked; the form always submits them, so an empty set clears. */
    audiences: audiencesOf(formData.getAll('audiences').map(String)),
    topics: topicsOf(formData.getAll('topics').map(String)),
    languages: activityLanguagesOf(formData.getAll('languages').map(String)),
    translated: formData.get('translated') === 'on',
    languageNote: text(formData.get('languageNote')),
  };

  /*
   * The other language, from the same press.
   *
   * The form shows Hebrew and English side by side, so a save carries
   * both. Only the fields that are actually translated are written —
   * an English row left empty is *not* written as an empty string,
   * because empty is what lets the site fall back to the Hebrew. A
   * conference can translate the four titles that matter and leave the
   * rest, and nothing looks broken.
   *
   * The second write never announces anything to the people registered:
   * updateSession compares time and place before and after, and this
   * write changes neither.
   */
  const english: Partial<CreateSessionInput> = {
    ...(text(formData.get('title_en')) ? { title: text(formData.get('title_en'))! } : {}),
    ...(text(formData.get('subtitle_en')) ? { subtitle: text(formData.get('subtitle_en')) } : {}),
    ...(text(formData.get('description_en'))
      ? { description: text(formData.get('description_en')) }
      : {}),
    ...(text(formData.get('track_en')) ? { track: text(formData.get('track_en')) } : {}),
    ...(text(formData.get('floor_en')) ? { floor: text(formData.get('floor_en')) } : {}),
    ...(text(formData.get('languageNote_en'))
      ? { languageNote: text(formData.get('languageNote_en')) }
      : {}),
  };

  const id = sessionId
    ? ((await updateSession(sessionId, HEBREW, input)) ? sessionId : null)
    : ((await createSession(slug, HEBREW, input))?.id ?? null);

  if (id && Object.keys(english).length > 0) {
    await updateSession(id, ENGLISH, english).catch(() => null);
  }

  const actor = await actorFor('activities:manage', slug);
  if (actor && id) {
    await audit(
      actor,
      sessionId ? 'content.sessionUpdated' : 'content.sessionCreated',
      slug,
      { session: id, title },
      title,
    );
  }
  publishedEvent(slug);
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
    const copy = await createSession(slug, locale, {
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
      audiences: s.audiences,
      topics: s.topics,
      languages: s.languages,
      translated: s.translated,
      languageNote: s.languageNote,
    });
    const actor = await actorFor('activities:manage', slug);
    if (actor && copy) {
      await audit(actor, 'content.sessionCreated', slug, { session: copy.id, duplicatedFrom: sessionId, title: copy.title }, copy.title);
    }
  }
  publishedEvent(slug);
  revalidatePath('/studio/activity');
};

/* Off the program, kept on the shelf — a supervisor's way of removing. */
export const archiveActivityAction = async (formData: FormData) => {
  const slug = String(formData.get('slug') ?? '');
  const sessionId = String(formData.get('sessionId') ?? '').trim();
  const actor = slug ? await actorFor('activities:archive', slug) : null;
  if (!actor || !sessionId) {
    return;
  }
  const before = await getSessionSituation(sessionId, HEBREW).catch(() => null);
  const done = await archiveSession(sessionId);
  if (done) {
    await audit(actor, 'content.sessionArchived', slug, { session: sessionId, title: before?.session.title ?? '' }, before?.session.title);
  }
  publishedEvent(slug);
  revalidatePath('/studio/activity');
};

export const restoreActivityAction = async (formData: FormData) => {
  const slug = String(formData.get('slug') ?? '');
  const sessionId = String(formData.get('sessionId') ?? '').trim();
  const actor = slug ? await actorFor('activities:archive', slug) : null;
  if (!actor || !sessionId) {
    return;
  }
  const done = await restoreSession(sessionId);
  const after = await getSessionSituation(sessionId, HEBREW).catch(() => null);
  if (done) {
    await audit(actor, 'content.sessionRestored', slug, { session: sessionId, title: after?.session.title ?? '' }, after?.session.title);
  }
  publishedEvent(slug);
  revalidatePath('/studio/activity');
};

/* Gone for good — the admin's alone. */
export const removeActivityAction = async (formData: FormData) => {
  const slug = String(formData.get('slug') ?? '');
  const sessionId = String(formData.get('sessionId') ?? '').trim();
  const actor = slug ? await actorFor('activities:delete', slug) : null;
  if (!actor || !sessionId) {
    return;
  }
  const before = await getSessionSituation(sessionId, HEBREW).catch(() => null);
  const done = await deleteSession(sessionId);
  if (done) {
    await audit(actor, 'content.sessionDeleted', slug, { session: sessionId, title: before?.session.title ?? '' }, before?.session.title);
  }
  publishedEvent(slug);
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
 * A speaker's own words, in both languages, as written — read without
 * Payload filling an empty English field from the Hebrew, so the form
 * shows which words are actually translated. For a linked speaker these
 * are the overrides alone; the account's words stay the placeholder.
 */
export interface SpeakerWords {
  name: string;
  jobTitle: string;
  company: string;
  bio: string;
}

const wordsOf = (speaker: ResolvedSpeaker | undefined): SpeakerWords => ({
  name: speaker?.own.name ?? '',
  jobTitle: speaker?.own.jobTitle ?? '',
  company: speaker?.own.company ?? '',
  bio: speaker?.own.bio ?? '',
});

export const speakerWordsAction = async (input: {
  slug: string;
  id: string;
}): Promise<{ he: SpeakerWords; en: SpeakerWords; link: string } | null> => {
  const { slug, id } = input;
  if (!slug || !id || !(await authorized(slug))) {
    return null;
  }
  const [he, en] = await Promise.all([
    listConferenceSpeakers(slug, 'he', { fallback: false }),
    listConferenceSpeakers(slug, 'en', { fallback: false }),
  ]);
  const own = he.find((speaker) => speaker.id === id);
  if (!own) {
    return null;
  }
  return {
    he: wordsOf(own),
    en: wordsOf(en.find((speaker) => speaker.id === id)),
    link: own.socialLinks[0]?.url ?? '',
  };
};

/*
 * The same speaker, rewritten from the activity wizard: two writes, one
 * per language, the link riding the Hebrew one — the shape the roster
 * page saves. An empty English field is written empty, so the site
 * falls back to the Hebrew. Comes back resolved in the wizard's
 * language so the chip can redraw without a reload.
 */
export const updateSpeakerAction = async (input: {
  slug: string;
  id: string;
  contentLocale: Locale;
  he: SpeakerWords;
  en: SpeakerWords;
  link: string;
}): Promise<ResolvedSpeaker | null> => {
  const { slug, id } = input;
  if (!slug || !id || !(await authorized(slug))) {
    return null;
  }
  const trimmed = (words: SpeakerWords): SpeakerWords => ({
    name: words.name.trim(),
    jobTitle: words.jobTitle.trim(),
    company: words.company.trim(),
    bio: words.bio.trim(),
  });
  const he = trimmed(input.he);
  const link = input.link.trim();
  const saved = await updateSpeaker(id, { ...he, socialLinks: link ? [{ url: link }] : [] }, 'he');
  if (!saved) {
    return null;
  }
  await updateSpeaker(id, trimmed(input.en), 'en');
  const actor = await actorFor('activities:manage', slug);
  if (actor) {
    await audit(actor, 'content.speakerSaved', slug, { speaker: id, name: saved.name, created: false }, saved.name);
  }
  publishedEvent(slug);
  return getSpeaker(id, input.contentLocale);
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
