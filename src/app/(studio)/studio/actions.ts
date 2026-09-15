'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { isSupportedLocale, type Locale } from '@/config/locales';
import { audit, type AuditAction } from '@/features/access';
import {
  archiveEvent,
  duplicateEvent,
  launchExperience,
  saveEventOpening,
} from '@/features/events';
import { saveHomepage } from '@/features/opening';
import {
  approveRegistration,
  cancelRegistration,
  declineRegistration,
  promoteFromWaitlist,
  saveRegistrationSettings,
} from '@/features/registration';
import {
  createSession,
  deleteSession,
  isSessionType,
  updateSession,
} from '@/features/program';
import { actorFor, authorized } from '@/features/studio/services/studio-auth';
import { writeStudioLocale } from '@/features/studio/services/studio-locale';
import {
  formText,
  optionalText,
  toIsoDateTime,
} from '@/features/studio/utils/form-values';
import { isRegistrationMode } from '@/registration-engine';
import { publishedEvent, publishedHomepage } from '@/shared/cache/publish';

/*
 * Studio actions both studios perform.
 *
 * They live beside the two route groups rather than inside either,
 * because the Console renders `setStudioLocaleAction` on every page and
 * was importing it — along with nine others — out of `(classic)`. The
 * studio being retired was holding up the studio replacing it, and a
 * folder cannot be deleted while something else depends on it.
 *
 * Imports are by full path, never the `@/features/studio` barrel: the
 * barrel re-exports React components, and a server module that reaches
 * them drags them into a graph that has no use for them (Report 15 §3).
 */

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

export const duplicateEventAction = async (formData: FormData) => {
  const slug = String(formData.get('slug') ?? '');
  const actor = await actorFor('events:manage');
  if (!actor) {
    return;
  }
  if (slug) {
    await duplicateEvent(slug);
    await audit(actor, 'event.duplicated', slug);
    revalidatePath('/studio/events');
  }
};

export const archiveEventAction = async (formData: FormData) => {
  const slug = String(formData.get('slug') ?? '');
  const actor = await actorFor('events:manage');
  if (!actor) {
    return;
  }
  if (slug) {
    await archiveEvent(slug);
    await audit(actor, 'event.archived', slug);
    revalidatePath('/studio/events');
  }
};

export const launchExperienceAction = async (formData: FormData) => {
  const slug = String(formData.get('slug') ?? '');
  const actor = slug ? await actorFor('events:manage', slug) : null;
  if (!actor) {
    return;
  }
  const locale = String(formData.get('contentLocale') ?? 'he') as Locale;
  /*
   * Launching always answers (bug fix): live goes green, a blocked
   * launch says so and how many blockers stand — never silence.
   */
  const outcome = await launchExperience(slug, locale);
  /*
   * `LaunchOutcome` is a union: only the refused branch carries a
   * blocker count, so the trail records the number when there is one and
   * says nothing when the launch went through.
   */
  await audit(
    actor,
    'event.launched',
    slug,
    outcome.ok
      ? { outcome: 'live' }
      : { outcome: 'blocked', blockers: outcome.blockers },
  );
  revalidatePath(`/studio/events/${slug}`, 'layout');
  revalidatePath('/studio', 'layout');
  publishedEvent(slug);
  if (outcome.ok) {
    redirect(`/studio/experiences/${encodeURIComponent(slug)}?launch=live`);
  }
  redirect(
    `/studio/experiences/${encodeURIComponent(slug)}?launch=blocked&blockers=${outcome.blockers}`,
  );
};

export const addSessionAction = async (formData: FormData) => {
  const slug = String(formData.get('slug') ?? '');
  const actor = slug ? await actorFor('events:manage', slug) : null;
  if (!actor) {
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
  await audit(actor, 'content.sessionCreated', slug);
  publishedEvent(slug);
  revalidatePath(`/studio/events/${slug}/program`);
};

/*
 * Editing the program in place (approved upgrade): a session's every
 * detail changes where it lives, and a session may leave — taking its
 * own registrations with it.
 */
export const updateSessionAction = async (formData: FormData) => {
  const slug = String(formData.get('slug') ?? '');
  const actor = slug ? await actorFor('events:manage', slug) : null;
  if (!actor) {
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
  await audit(actor, 'content.sessionUpdated', slug, { sessionId });
  publishedEvent(slug);
  revalidatePath(`/studio/events/${slug}/program`);
};

export const deleteSessionAction = async (formData: FormData) => {
  const slug = String(formData.get('slug') ?? '');
  const actor = slug ? await actorFor('events:manage', slug) : null;
  if (!actor) {
    return;
  }
  const sessionId = String(formData.get('sessionId') ?? '');
  if (!sessionId) {
    return;
  }
  await deleteSession(sessionId);
  await audit(actor, 'content.sessionDeleted', slug, { sessionId });
  publishedEvent(slug);
  revalidatePath(`/studio/events/${slug}/program`);
};

export const saveHomepageAction = async (formData: FormData) => {
  const locale = String(formData.get('contentLocale') ?? 'he') as Locale;
  const actor = await actorFor('experiences:manage');
  if (!actor) {
    return;
  }
  await saveHomepage(locale, {
    heroTitleMain: formText(formData, 'heroTitleMain'),
    heroTitleAccent: formText(formData, 'heroTitleAccent'),
    heroSubtitle: formText(formData, 'heroSubtitle'),
    ...(formData.has('heroImageId')
      ? { heroImageId: formText(formData, 'heroImageId') ?? null }
      : {}),
    ...(formData.has('heroVideoId')
      ? { heroVideoId: formText(formData, 'heroVideoId') ?? null }
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
  await audit(actor, 'content.homepageSaved');
  publishedHomepage();
  revalidatePath('/studio/homepage');
};

export const saveEventOpeningAction = async (formData: FormData) => {
  const slug = String(formData.get('slug') ?? '');
  const actor = slug ? await actorFor('events:manage', slug) : null;
  if (!actor) {
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
    ...(formData.has('heroVideoId')
      ? { heroVideoId: formText(formData, 'heroVideoId') ?? null }
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
    venueAddress: formText(formData, 'venueAddress'),
    venueMapUrl: formText(formData, 'venueMapUrl'),
    venueMapLabel: formText(formData, 'venueMapLabel'),
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
  await audit(actor, 'content.openingSaved', slug);
  publishedEvent(slug);
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
  publishedEvent(slug);
  revalidatePath(`/studio/events/${slug}`, 'layout');
};

/*
 * Moderating who gets in, and the rules that decide it. Shared because
 * the Console shows the same queue on `/studio/insights` that the
 * classic registration page shows — one set of acts, so approving in
 * one place cannot mean something different in the other.
 */
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
  revalidatePath('/studio/insights');
};

const registrationManagerAction =
  (
    act: (slug: string, id: string) => Promise<unknown>,
    recorded: AuditAction,
  ): ((formData: FormData) => Promise<void>) =>
  async (formData) => {
    const slug = String(formData.get('slug') ?? '');
    const id = String(formData.get('registrationId') ?? '');
    const actor = await actorFor('registrations:manage', slug || undefined);
    if (!actor) {
      return;
    }
    if (slug && id) {
      await act(slug, id);
      /*
       * Recorded through the one factory the four acts share, so a
       * fifth cannot be added without a trail entry.
       */
      await audit(actor, recorded, slug, { registrationId: id });
      revalidatePath(`/studio/events/${slug}`, 'layout');
      revalidatePath('/studio/insights');
    }
  };

export const approveRegistrationAction = registrationManagerAction(
  approveRegistration,
  'registration.approved',
);
export const declineRegistrationAction = registrationManagerAction(
  declineRegistration,
  'registration.declined',
);
export const promoteRegistrationAction = registrationManagerAction(
  promoteFromWaitlist,
  'registration.promoted',
);
export const cancelRegistrationAction = registrationManagerAction(
  cancelRegistration,
  'registration.cancelled',
);
