'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { isSupportedLocale, type Locale } from '@/config/locales';
import {
  addMedia,
  addPerson,
  archiveEvent,
  createEvent,
  duplicateEvent,
  launchExperience,
  updateVenueChapter,
} from '@/features/events';
import { writeStudioLocale } from '@/features/studio/services/studio-locale';
import {
  renameOrganization,
  updateCreatorName,
} from '@/features/studio/services/studio-settings';
import { isRegistrationMode } from '@/registration-engine';
import {
  approveRegistration,
  cancelRegistration,
  checkInByToken,
  declineRegistration,
  promoteFromWaitlist,
  saveRegistrationSettings,
} from '@/features/registration';
import { saveComposerContent } from '@/features/composer/services/composer-save-service';
import { saveHomepage } from '@/features/opening';
import { saveEventOpening } from '@/features/events';
import {
  addTeamMember,
  renameTeamMember,
} from '@/features/studio';
import { createSession,
  updateSession,
  deleteSession, isSessionType } from '@/features/program';
import { requireCapability } from '@/features/studio';
import { fromDateTimeInputValue } from '@/shared';
import { addSponsor, isSponsorTier } from '@/features/sponsors';

/*
 * Defence in depth (Identity Architecture §4): every action re-derives
 * the actor and its capability from the database before touching
 * anything. The interface is never trusted; a hidden button is not a
 * permission.
 */
const authorized = async (
  capability: Parameters<typeof requireCapability>[0],
  eventSlug?: string,
): Promise<boolean> => (await requireCapability(capability, eventSlug)) !== null;

export const setStudioLocaleAction = async (formData: FormData) => {
  const locale = String(formData.get('locale') ?? '');
  if (!(await authorized('content:read'))) {
    return;
  }
  if (isSupportedLocale(locale)) {
    await writeStudioLocale(locale);
  }
  revalidatePath('/studio', 'layout');
};

export const createEventAction = async (formData: FormData) => {
  const title = String(formData.get('title') ?? '').trim();
  if (!(await authorized('events:manage'))) {
    return;
  }
  const startsAt = String(formData.get('startsAt') ?? '').trim();
  if (!title) {
    return;
  }
  const event = await createEvent(title, startsAt || undefined);
  revalidatePath('/studio', 'layout');
  redirect(`/studio/events/${encodeURIComponent(event.slug)}`);
};

export const duplicateEventAction = async (formData: FormData) => {
  const slug = String(formData.get('slug') ?? '');
  if (!(await authorized('events:manage'))) {
    return;
  }
  if (slug) {
    await duplicateEvent(slug);
    revalidatePath('/studio/events');
  }
};

export const archiveEventAction = async (formData: FormData) => {
  const slug = String(formData.get('slug') ?? '');
  if (!(await authorized('events:manage'))) {
    return;
  }
  if (slug) {
    await archiveEvent(slug);
    revalidatePath('/studio/events');
  }
};

export const launchExperienceAction = async (formData: FormData) => {
  const slug = String(formData.get('slug') ?? '');
  if (!slug || !(await authorized('events:manage', slug))) {
    return;
  }
  const locale = String(formData.get('contentLocale') ?? 'he') as Locale;
  /*
   * Launching always answers (bug fix): live goes green, a blocked
   * launch says so and how many blockers stand — never silence.
   */
  const outcome = await launchExperience(slug, locale);
  revalidatePath(`/studio/events/${slug}`, 'layout');
  revalidatePath('/studio', 'layout');
  revalidatePath('/', 'layout');
  if (outcome.ok) {
    redirect(`/studio/experiences/${encodeURIComponent(slug)}?launch=live`);
  }
  redirect(
    `/studio/experiences/${encodeURIComponent(slug)}?launch=blocked&blockers=${outcome.blockers}`,
  );
};

export const addPersonAction = async (formData: FormData) => {
  const name = String(formData.get('name') ?? '').trim();
  if (!(await authorized('experiences:manage'))) {
    return;
  }
  const role = String(formData.get('role') ?? '').trim();
  if (name) {
    await addPerson({ name, role: role || undefined });
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

export const updateVenueAction = async (formData: FormData) => {
  const slug = String(formData.get('slug') ?? '');
  if (!slug || !(await authorized('events:manage', slug))) {
    return;
  }
  const locale = String(formData.get('contentLocale') ?? 'he') as Locale;
  if (!slug) {
    return;
  }
  const field = (name: string): string | undefined => {
    const value = formData.get(name);
    return typeof value === 'string' ? value : undefined;
  };
  await updateVenueChapter(slug, locale, {
    name: field('name'),
    address: field('address'),
    description: field('description'),
    mapUrl: field('mapUrl'),
    mapLabel: field('mapLabel'),
    access: field('access'),
    emergency: field('emergency'),
    parking: field('parking'),
    transit: field('transit'),
  });
  revalidatePath(`/studio/events/${slug}`, 'layout');
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

const optionalText = (value: FormDataEntryValue | null): string | undefined => {
  const text = typeof value === 'string' ? value.trim() : '';
  return text.length > 0 ? text : undefined;
};

export const saveRegistrationSettingsAction = async (formData: FormData) => {
  const slug = String(formData.get('slug') ?? '');
  if (!slug || !(await authorized('registrations:manage', slug))) {
    return;
  }
  const locale = String(formData.get('contentLocale') ?? 'he') as Locale;
  const mode = String(formData.get('mode') ?? 'open');
  if (!slug || !isRegistrationMode(mode)) {
    return;
  }
  const capacityRaw = String(formData.get('capacity') ?? '').trim();
  const capacityValue = capacityRaw ? Number(capacityRaw) : null;
  await saveRegistrationSettings(slug, locale, {
    mode,
    capacity:
      capacityValue !== null && Number.isFinite(capacityValue)
        ? capacityValue
        : null,
    opensAt: optionalText(formData.get('opensAt')),
    closesAt: optionalText(formData.get('closesAt')),
    waitlistEnabled: formData.get('waitlistEnabled') === 'on',
    confirmationMessage: optionalText(formData.get('confirmationMessage')),
    collectPhone: formData.get('collectPhone') === 'on',
    collectAccessibility: formData.get('collectAccessibility') === 'on',
    collectDietary: formData.get('collectDietary') === 'on',
  });
  revalidatePath(`/studio/events/${slug}`, 'layout');
};

const registrationManagerAction =
  (
    act: (slug: string, id: string) => Promise<unknown>,
  ): ((formData: FormData) => Promise<void>) =>
  async (formData) => {
    const slug = String(formData.get('slug') ?? '');
    const id = String(formData.get('registrationId') ?? '');
    if (!(await authorized('registrations:manage', slug || undefined))) {
      return;
    }
    if (slug && id) {
      await act(slug, id);
      revalidatePath(`/studio/events/${slug}`, 'layout');
    }
  };

export const approveRegistrationAction = registrationManagerAction(
  approveRegistration,
);
export const declineRegistrationAction = registrationManagerAction(
  declineRegistration,
);
export const promoteRegistrationAction = registrationManagerAction(
  promoteFromWaitlist,
);
export const cancelRegistrationAction = registrationManagerAction(
  cancelRegistration,
);

export const saveComposerAction = async (
  slug: string,
  locale: string,
  scenes: { id: string; content: unknown }[],
): Promise<number> => {
  if (!slug || !(await authorized('experiences:manage', slug))) {
    return 0;
  }
  if (!slug || !isSupportedLocale(locale)) {
    return 0;
  }
  const saved = await saveComposerContent(locale, scenes);
  revalidatePath(`/studio/events/${slug}/composer`);
  return saved;
};

const toIsoDateTime = (
  value: FormDataEntryValue | null,
): string | undefined => {
  const text = typeof value === 'string' ? value.trim() : '';
  return fromDateTimeInputValue(text);
};

export const addSessionAction = async (formData: FormData) => {
  const slug = String(formData.get('slug') ?? '');
  if (!slug || !(await authorized('events:manage', slug))) {
    return;
  }
  const locale = String(formData.get('contentLocale') ?? 'he') as Locale;
  const title = String(formData.get('title') ?? '').trim();
  const type = String(formData.get('sessionType') ?? 'talk');
  if (!slug || !title || !isSessionType(type)) {
    return;
  }
  const capacityRaw = String(formData.get('capacity') ?? '').trim();
  const capacityValue = capacityRaw ? Number(capacityRaw) : null;
  await createSession(slug, locale, {
    title,
    sessionType: type,
    startsAt: toIsoDateTime(formData.get('startsAt')),
    endsAt: toIsoDateTime(formData.get('endsAt')),
    capacity:
      capacityValue !== null && Number.isFinite(capacityValue)
        ? capacityValue
        : null,
    waitlistEnabled: formData.get('waitlistEnabled') === 'on',
    featured: formData.get('featured') === 'on',
    track: optionalText(formData.get('track')),
    language: optionalText(formData.get('language')),
  });
  revalidatePath(`/studio/events/${slug}/program`);
};

/*
 * Editing the program in place (approved upgrade): a session's every
 * detail changes where it lives, and a session may leave — taking its
 * own registrations with it.
 */
export const updateSessionAction = async (formData: FormData) => {
  const slug = String(formData.get('slug') ?? '');
  if (!slug || !(await authorized('events:manage', slug))) {
    return;
  }
  const sessionId = String(formData.get('sessionId') ?? '');
  const locale = String(formData.get('contentLocale') ?? 'he') as Locale;
  const title = String(formData.get('title') ?? '').trim();
  const type = String(formData.get('sessionType') ?? '');
  if (!sessionId || !title || !isSessionType(type)) {
    return;
  }
  const capacityRaw = String(formData.get('capacity') ?? '').trim();
  const capacityValue = capacityRaw ? Number(capacityRaw) : null;
  await updateSession(sessionId, locale, {
    title,
    sessionType: type,
    startsAt: toIsoDateTime(formData.get('startsAt')) ?? '',
    endsAt: toIsoDateTime(formData.get('endsAt')) ?? '',
    capacity:
      capacityValue !== null && Number.isFinite(capacityValue)
        ? capacityValue
        : null,
    waitlistEnabled: formData.get('waitlistEnabled') === 'on',
    featured: formData.get('featured') === 'on',
    track: optionalText(formData.get('track')),
    language: optionalText(formData.get('language')),
  });
  revalidatePath(`/studio/events/${slug}/program`);
};

export const deleteSessionAction = async (formData: FormData) => {
  const slug = String(formData.get('slug') ?? '');
  if (!slug || !(await authorized('events:manage', slug))) {
    return;
  }
  const sessionId = String(formData.get('sessionId') ?? '');
  if (!sessionId) {
    return;
  }
  await deleteSession(sessionId);
  revalidatePath(`/studio/events/${slug}/program`);
};

type CheckInOutcome = 'checkedin' | 'already' | 'blocked' | 'invalid';

export const checkInAction = async (
  token: string,
): Promise<{ outcome: CheckInOutcome; name?: string }> => {
  if (!(await authorized('checkin:operate'))) {
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
  revalidatePath(`/studio/events/${slug}/sponsors`);
};

const formText = (formData: FormData, name: string): string | undefined => {
  const value = formData.get(name);
  return typeof value === 'string' ? value : undefined;
};

export const saveHomepageAction = async (formData: FormData) => {
  const locale = String(formData.get('contentLocale') ?? 'he') as Locale;
  if (!(await authorized('experiences:manage'))) {
    return;
  }
  await saveHomepage(locale, {
    heroTitleMain: formText(formData, 'heroTitleMain'),
    heroTitleAccent: formText(formData, 'heroTitleAccent'),
    heroSubtitle: formText(formData, 'heroSubtitle'),
    ...(formData.has('heroImageId')
      ? { heroImageId: formText(formData, 'heroImageId') ?? null }
      : {}),
    eventsTitle: formText(formData, 'eventsTitle'),
    eventsSubtitle: formText(formData, 'eventsSubtitle'),
    storyEyebrow: formText(formData, 'storyEyebrow'),
    storyTitle: formText(formData, 'storyTitle'),
    storyParagraph: formText(formData, 'storyParagraph'),
    ...(formData.has('storyImageId')
      ? { storyImageId: formText(formData, 'storyImageId') ?? null }
      : {}),
    momentsTitle: formText(formData, 'momentsTitle'),
    ...(formData.has('momentsImagesSubmitted')
      ? {
          momentsImageIds: formData
            .getAll('momentsImageIds')
            .filter((value): value is string => typeof value === 'string'),
        }
      : {}),
    closingTitle: formText(formData, 'closingTitle'),
    closingSubtitle: formText(formData, 'closingSubtitle'),
    closingCta: formText(formData, 'closingCta'),
  });
  revalidatePath('/', 'layout');
  revalidatePath('/studio/homepage');
};

export const saveEventOpeningAction = async (formData: FormData) => {
  const slug = String(formData.get('slug') ?? '');
  if (!slug || !(await authorized('events:manage', slug))) {
    return;
  }
  const locale = String(formData.get('contentLocale') ?? 'he') as Locale;
  if (!slug) {
    return;
  }
  await saveEventOpening(slug, locale, {
    teaser: formText(formData, 'teaser'),
    location: formText(formData, 'location'),
    featured: formData.get('featured') === 'on',
    atmosphere: formText(formData, 'atmosphere'),
    ...(formData.has('posterId')
      ? { posterId: formText(formData, 'posterId') ?? null }
      : {}),
    ...(formData.has('heroImageId')
      ? { heroImageId: formText(formData, 'heroImageId') ?? null }
      : {}),
    arrivalEyebrow: formText(formData, 'arrivalEyebrow'),
    storyEyebrow: formText(formData, 'storyEyebrow'),
    storyTitle: formText(formData, 'storyTitle'),
    storyParagraph: formText(formData, 'storyParagraph'),
    ...(formData.has('storyImageId')
      ? { storyImageId: formText(formData, 'storyImageId') ?? null }
      : {}),
    quoteText: formText(formData, 'quoteText'),
    quoteAttribution: formText(formData, 'quoteAttribution'),
    quoteRole: formText(formData, 'quoteRole'),
    quoteStatValue: formText(formData, 'quoteStatValue'),
    quoteStatLabel: formText(formData, 'quoteStatLabel'),
    ...(formData.has('quoteImageId')
      ? { quoteImageId: formText(formData, 'quoteImageId') ?? null }
      : {}),
    venueName: formText(formData, 'venueName'),
    venueNarrative: formText(formData, 'venueNarrative'),
    venueAccessibility: formText(formData, 'venueAccessibility'),
    venueEmergency: formText(formData, 'venueEmergency'),
    ...(formData.has('venueFactsSubmitted')
      ? {
          venueFacts: [0, 1, 2, 3]
            .map((index) => ({
              label: String(formData.get(`venueFactLabel${index}`) ?? '').trim(),
              icon: String(
                formData.get(`venueFactIcon${index}`) ?? 'accessibility',
              ),
              description: String(
                formData.get(`venueFactDescription${index}`) ?? '',
              ).trim(),
            }))
            .filter((fact) => fact.label),
        }
      : {}),
    ...(formData.has('venueImageId')
      ? { venueImageId: formText(formData, 'venueImageId') ?? null }
      : {}),
    closingLine: formText(formData, 'closingLine'),
    ...(formData.has('closingImageId')
      ? { closingImageId: formText(formData, 'closingImageId') ?? null }
      : {}),
    ...(formData.has('momentsSubmitted')
      ? {
          moments: formData
            .getAll('momentIds')
            .filter((value): value is string => typeof value === 'string')
            .map((imageId) => ({
              imageId,
              caption: formText(formData, `momentCaption-${imageId}`),
            })),
        }
      : {}),
  });
  revalidatePath('/', 'layout');
  revalidatePath(`/studio/events/${slug}`, 'layout');
};

/*
 * The program-preview day themes: one editable theme + description per
 * conference day (Day 1, 2, 3…), in order. A dedicated write so it only
 * touches programDays and leaves every other opening field untouched.
 */
export const saveProgramDaysAction = async (formData: FormData) => {
  const slug = String(formData.get('slug') ?? '');
  if (!slug || !(await authorized('events:manage', slug))) {
    return;
  }
  const locale = String(formData.get('contentLocale') ?? 'he') as Locale;
  const count = Number(formData.get('programDaysCount') ?? 0) || 0;
  const programDays = Array.from({ length: count }, (_, index) => ({
    theme: formText(formData, `programDayTheme${index}`),
    description: formText(formData, `programDayDescription${index}`),
  }));
  await saveEventOpening(slug, locale, { programDays });
  revalidatePath('/', 'layout');
  revalidatePath(`/studio/events/${slug}`, 'layout');
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
