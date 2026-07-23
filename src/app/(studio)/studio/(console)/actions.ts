'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { Locale } from '@/config/locales';
import {
  addMedia,
  createEvent,
  deleteEvent,
  getEventOpeningDraft,
  saveEventComposition,
  saveEventOpening,
  setActiveConference,
  updateEventDetails,
} from '@/features/events';
import type { EventOpeningInput } from '@/features/events';
import {
  CONFERENCE_SCENE_SEQUENCE,
  actBlocks,
  completeComposition,
  moveAct,
  moveSceneWithinAct,
  setActHidden,
} from '@/features/cinematic';
import {
  cancelParticipantRegistration,
  deleteParticipantAccount,
  moveParticipantRegistration,
  renameParticipant,
  requireCapability,
  setParticipantBlocked,
} from '@/features/studio';
import { grantRole, revokeGrant } from '@/features/access';
import { cancelRegistration } from '@/features/registration';
import { broadcastAnnouncement } from '@/features/notifications';
import {
  buildOpeningDescriptor,
  getOpening,
  saveHomepageCompositionEntries,
} from '@/features/opening';
import { applyComposition, resolveScene } from '@/experience-runtime';
import { fromDateTimeInputValue } from '@/shared';
import '@/scenes';
import {
  launchExperienceAction,
  saveEventOpeningAction,
  saveProgramDaysAction,
} from '../(classic)/actions';

/*
 * Console actions: thin envelopes over the Studio's existing actions —
 * same engines, plus the Console's own revalidation and destinations.
 */
/*
 * Defence in depth (Identity Architecture §4): each console action
 * re-derives the actor's capability before acting. Envelopes over
 * classic actions inherit the inner action's own check as well.
 */
const authorized = async (
  capability: Parameters<typeof requireCapability>[0],
  eventSlug?: string,
): Promise<boolean> => (await requireCapability(capability, eventSlug)) !== null;

export const createExperienceAction = async (formData: FormData) => {
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
  redirect(`/studio/experiences/${encodeURIComponent(event.slug)}`);
};

/*
 * Permanent deletion from the control center (approved decision: keep
 * no data for nothing). Guarded per conference; the repository sweeps
 * every dependent world before the event itself.
 */
export const deleteEventAction = async (formData: FormData) => {
  const slug = String(formData.get('slug') ?? '');
  if (!slug || !(await authorized('events:manage', slug))) {
    return;
  }
  await deleteEvent(slug);
  revalidatePath('/studio', 'layout');
  revalidatePath('/', 'layout');
};

export const consoleSaveEventOpeningAction = async (formData: FormData) => {
  await saveEventOpeningAction(formData);
  revalidatePath('/studio', 'layout');
};

export const consoleSaveProgramDaysAction = async (formData: FormData) => {
  await saveProgramDaysAction(formData);
  revalidatePath('/studio', 'layout');
  revalidatePath('/', 'layout');
};

export const consoleLaunchExperienceAction = async (formData: FormData) => {
  await launchExperienceAction(formData);
  revalidatePath('/studio', 'layout');
  revalidatePath('/', 'layout');
};

/*
 * Composer commands: the filmstrip's move and hide controls. The
 * current composition is derived from the real descriptor, mutated as
 * data, and persisted — the Runtime does the rest (Constitution v2
 * §13, §14).
 */
const COMPOSER_LOCALE = 'he';

const currentScenes = async () => {
  const opening = await getOpening(COMPOSER_LOCALE);
  return buildOpeningDescriptor(opening).scenes;
};

const isFlow = (type: string): boolean =>
  (resolveScene(type)?.placement ?? 'flow') === 'flow';

const persistComposition = async (
  scenes: { id: string; hidden?: boolean }[],
) => {
  await saveHomepageCompositionEntries(
    scenes.map((scene) => ({ scene: scene.id, hidden: scene.hidden === true })),
  );
  revalidatePath('/', 'layout');
  revalidatePath('/studio/homepage');
};

export const moveHomepageSceneAction = async (formData: FormData) => {
  const sceneId = String(formData.get('scene') ?? '');
  if (!(await authorized('experiences:manage'))) {
    return;
  }
  const direction = formData.get('direction') === 'up' ? -1 : 1;
  const scenes = await currentScenes();
  const index = scenes.findIndex((scene) => scene.id === sceneId);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= scenes.length) {
    return;
  }
  const moving = scenes[index];
  const neighbor = scenes[target];
  if (!moving || !neighbor || !isFlow(moving.type) || !isFlow(neighbor.type)) {
    return;
  }
  const next = [...scenes];
  next[index] = neighbor;
  next[target] = moving;
  await persistComposition(next);
};

export const toggleHomepageSceneAction = async (formData: FormData) => {
  const sceneId = String(formData.get('scene') ?? '');
  if (!(await authorized('experiences:manage'))) {
    return;
  }
  const scenes = await currentScenes();
  const scene = scenes.find((entry) => entry.id === sceneId);
  if (!scene || !isFlow(scene.type)) {
    return;
  }
  await persistComposition(
    scenes.map((entry) =>
      entry.id === sceneId ? { ...entry, hidden: entry.hidden !== true } : entry,
    ),
  );
};

/*
 * Media arrives through the Studio, never through the engine's panel:
 * the file streams into the adapter under the acting creator.
 */
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export const uploadMediaAction = async (formData: FormData) => {
  const file = formData.get('file');
  if (!(await authorized('experiences:manage'))) {
    return;
  }
  const alt = String(formData.get('alt') ?? '').trim();
  if (!(file instanceof File) || file.size === 0 || file.size > MAX_UPLOAD_BYTES) {
    return;
  }
  const data = new Uint8Array(await file.arrayBuffer());
  await addMedia({
    file: { name: file.name, type: file.type, data },
    alt: alt || file.name,
  });
  revalidatePath('/studio/media');
};

/*
 * Upload from the editor's own computer, straight into the scene being
 * directed (Experience Engine v2): one action receives the file, places
 * it in the library under the acting creator, and points the chosen
 * scene image at it — or appends it to the moments gallery. The editor
 * never leaves the workspace.
 */
const OPENING_IMAGE_FIELDS = new Set([
  'heroImageId',
  'posterId',
  'storyImageId',
  'quoteImageId',
  'venueImageId',
  'closingImageId',
]);

export const uploadOpeningImageAction = async (formData: FormData) => {
  const slug = String(formData.get('slug') ?? '');
  if (!slug || !(await authorized('experiences:manage', slug))) {
    return;
  }
  const field = String(formData.get('field') ?? '');
  const contentLocale = (
    formData.get('contentLocale') === 'en' ? 'en' : 'he'
  ) as Locale;
  const file = formData.get('file');
  if (
    !(file instanceof File) ||
    file.size === 0 ||
    file.size > MAX_UPLOAD_BYTES ||
    !file.type.startsWith('image/')
  ) {
    return;
  }
  const data = new Uint8Array(await file.arrayBuffer());
  const media = await addMedia({
    file: { name: file.name, type: file.type, data },
    alt: file.name,
  });
  if (field === 'moments') {
    const draft = await getEventOpeningDraft(slug, contentLocale);
    if (!draft) {
      return;
    }
    const existing = draft.moments.filter(
      (moment): moment is { imageId: string; caption?: string } =>
        typeof moment.imageId === 'string' && moment.imageId !== '',
    );
    await saveEventOpening(slug, contentLocale, {
      moments: [...existing, { imageId: media.id }],
    });
  } else if (OPENING_IMAGE_FIELDS.has(field)) {
    await saveEventOpening(slug, contentLocale, {
      [field]: media.id,
    } as EventOpeningInput);
  } else {
    return;
  }
  revalidatePath('/', 'layout');
  revalidatePath('/studio/media');
  revalidatePath(`/studio/experiences/${slug}`);
};

/*
 * The conference Composer works over the draft: the authored sequence
 * plus the stored composition give the effective order even before the
 * experience is live.
 */
const eventScenes = async (slug: string) => {
  const draft = await getEventOpeningDraft(slug, COMPOSER_LOCALE);
  if (!draft) {
    return null;
  }
  return applyComposition(
    CONFERENCE_SCENE_SEQUENCE.map((entry) => ({
      id: entry.id,
      type: entry.type,
      hidden: entry.hidden,
      content: {},
    })),
    completeComposition(draft.composition),
  );
};

const persistEventComposition = async (
  slug: string,
  scenes: {
    id: string;
    hidden?: boolean;
    variant?: string;
    density?: string;
    emphasis?: string;
  }[],
) => {
  await saveEventComposition(
    slug,
    scenes.map((scene) => ({
      scene: scene.id,
      hidden: scene.hidden === true,
      variant: scene.variant || undefined,
      density: scene.density || undefined,
      emphasis: scene.emphasis || undefined,
    })),
  );
  revalidatePath('/', 'layout');
  revalidatePath(`/studio/experiences/${slug}`);
};

/*
 * The Experience Map's moves (Experience Engine v2): a scene trades
 * places inside its own Act; crossing an Act border is the Act's move.
 */
export const moveEventSceneAction = async (formData: FormData) => {
  const slug = String(formData.get('slug') ?? '');
  if (!slug || !(await authorized('experiences:manage', slug))) {
    return;
  }
  const sceneId = String(formData.get('scene') ?? '');
  const direction = formData.get('direction') === 'up' ? -1 : 1;
  const scenes = await eventScenes(slug);
  if (!scenes) {
    return;
  }
  const next = moveSceneWithinAct(scenes, sceneId, direction);
  if (!next) {
    return;
  }
  await persistEventComposition(slug, next);
};

export const moveEventActAction = async (formData: FormData) => {
  const slug = String(formData.get('slug') ?? '');
  if (!slug || !(await authorized('experiences:manage', slug))) {
    return;
  }
  const actId = String(formData.get('act') ?? '');
  const direction = formData.get('direction') === 'up' ? -1 : 1;
  const scenes = await eventScenes(slug);
  if (!scenes) {
    return;
  }
  const next = moveAct(scenes, actId, direction);
  if (!next) {
    return;
  }
  await persistEventComposition(slug, next);
};

export const toggleEventActAction = async (formData: FormData) => {
  const slug = String(formData.get('slug') ?? '');
  if (!slug || !(await authorized('experiences:manage', slug))) {
    return;
  }
  const actId = String(formData.get('act') ?? '');
  const scenes = await eventScenes(slug);
  if (!scenes) {
    return;
  }
  const block = actBlocks(scenes).find((entry) => entry.id === actId);
  if (!block) {
    return;
  }
  const next = setActHidden(scenes, actId, !block.hidden);
  if (!next) {
    return;
  }
  await persistEventComposition(slug, next);
};

export const toggleEventSceneAction = async (formData: FormData) => {
  const slug = String(formData.get('slug') ?? '');
  if (!slug || !(await authorized('experiences:manage', slug))) {
    return;
  }
  const sceneId = String(formData.get('scene') ?? '');
  const scenes = slug ? await eventScenes(slug) : null;
  if (!scenes) {
    return;
  }
  const scene = scenes.find((entry) => entry.id === sceneId);
  if (!scene || !isFlow(scene.type)) {
    return;
  }
  await persistEventComposition(
    slug,
    scenes.map((entry) =>
      entry.id === sceneId ? { ...entry, hidden: entry.hidden !== true } : entry,
    ),
  );
};

/*
 * The three presentation axes (Experience Engine v3): the composition
 * may choose a variant, a density and an emphasis the package declared
 * — content untouched, unknown names denied at the door.
 */
const STYLE_AXES = ['variant', 'density', 'emphasis'] as const;

type StyleAxis = (typeof STYLE_AXES)[number];

const declaredFor = (type: string, axis: StyleAxis): readonly string[] => {
  const definition = resolveScene(type);
  if (axis === 'variant') {
    return definition?.variants ?? [];
  }
  if (axis === 'density') {
    return definition?.densities ?? [];
  }
  return definition?.emphases ?? [];
};

export const setEventSceneStyleAction = async (formData: FormData) => {
  const slug = String(formData.get('slug') ?? '');
  if (!slug || !(await authorized('experiences:manage', slug))) {
    return;
  }
  const sceneId = String(formData.get('scene') ?? '');
  const rawAxis = String(formData.get('axis') ?? '');
  const axis = STYLE_AXES.find((entry) => entry === rawAxis);
  if (!axis) {
    return;
  }
  const value = String(formData.get('value') ?? '').trim();
  const scenes = await eventScenes(slug);
  if (!scenes) {
    return;
  }
  const scene = scenes.find((entry) => entry.id === sceneId);
  if (!scene) {
    return;
  }
  if (value && !declaredFor(scene.type, axis).includes(value)) {
    return;
  }
  await persistEventComposition(
    slug,
    scenes.map((entry) =>
      entry.id === sceneId
        ? { ...entry, [axis]: value || undefined }
        : entry,
    ),
  );
};

/*
 * The broadcast composer (PRD §4): a message from the production to
 * every guest of a conference, landing straight in their messages feed.
 */
export const broadcastAnnouncementAction = async (formData: FormData) => {
  let slug = String(formData.get('slug') ?? '');
  /* targeted audience: "slug::sessionId" narrows to one activity */
  const target = String(formData.get('target') ?? '');
  let targetSessionId: string | undefined;
  if (target.includes('::')) {
    const [targetSlug, sessionId] = target.split('::');
    if (targetSlug && sessionId) {
      slug = targetSlug;
      targetSessionId = sessionId;
    }
  }
  if (!slug || !(await authorized('participants:manage', slug))) {
    return;
  }
  const rawKind = String(formData.get('kind') ?? 'feed');
  const kind =
    rawKind === 'banner' || rawKind === 'popup' ? rawKind : 'feed';
  const sent = await broadcastAnnouncement({
    eventSlug: slug,
    versions: [
      {
        locale: 'he',
        subject: String(formData.get('subjectHe') ?? ''),
        body: String(formData.get('bodyHe') ?? ''),
      },
      {
        locale: 'en',
        subject: String(formData.get('subjectEn') ?? ''),
        body: String(formData.get('bodyEn') ?? ''),
      },
    ],
    kind,
    targetSessionId,
  });
  if (sent) {
    revalidatePath('/studio/communications');
    revalidatePath('/', 'layout');
    redirect('/studio/communications?broadcast=sent');
  }
};

/*
 * Participant governance from the Studio: rename and the door switch.
 */
export const renameParticipantAction = async (formData: FormData) => {
  const id = String(formData.get('id') ?? '');
  if (!(await authorized('participants:manage'))) {
    return;
  }
  const name = String(formData.get('name') ?? '').trim();
  if (!id || !name) {
    return;
  }
  await renameParticipant(id, name);
  revalidatePath('/studio/participants');
};

export const toggleParticipantBlockedAction = async (formData: FormData) => {
  const id = String(formData.get('id') ?? '');
  if (!(await authorized('participants:manage'))) {
    return;
  }
  if (!id) {
    return;
  }
  await setParticipantBlocked(id, formData.get('blocked') === '1');
  revalidatePath('/studio/participants');
};

/*
 * Access governance (Identity Build Brief WP6): granting and revoking
 * roles requires platform:manage; the last Owner is protected in the
 * grant service itself.
 */
export const grantRoleAction = async (formData: FormData) => {
  const access = await requireCapability('platform:manage');
  if (!access) {
    return;
  }
  const accountId = String(formData.get('accountId') ?? '');
  const role = String(formData.get('role') ?? '');
  const eventSlug = String(formData.get('eventSlug') ?? '').trim();
  if (!accountId || !role) {
    return;
  }
  await grantRole(accountId, role, eventSlug || null, access.creator.id);
  revalidatePath('/studio/participants');
  revalidatePath('/studio/people');
};

export const revokeGrantAction = async (formData: FormData) => {
  if (!(await authorized('platform:manage'))) {
    return;
  }
  const grantId = String(formData.get('grantId') ?? '');
  if (!grantId) {
    return;
  }
  const home =
    formData.get('from') === 'people'
      ? '/studio/people'
      : '/studio/participants';
  const outcome = await revokeGrant(grantId);
  if (!outcome.ok && outcome.reason === 'lastOwner') {
    redirect(`${home}?grants=lastOwner`);
  }
  revalidatePath('/studio/participants');
  revalidatePath('/studio/people');
};

/*
 * Registration governance (approved decision §8): release a place, or
 * move a guest between conferences through the same engine they used.
 */
export const cancelParticipantRegistrationAction = async (
  formData: FormData,
) => {
  const slug = String(formData.get('slug') ?? '');
  if (!slug || !(await authorized('registrations:manage', slug))) {
    return;
  }
  const participantId = String(formData.get('participantId') ?? '');
  if (!participantId) {
    return;
  }
  await cancelParticipantRegistration(slug, participantId);
  revalidatePath('/studio/participants');
};

/*
 * Remove a registrant straight from the conference-info surface: cancel
 * their place through the same engine a guest's own flow uses, so
 * capacity and waitlists follow. Guarded by registrations:manage on the
 * conference; the repository re-checks the actor.
 */
export const removeEventRegistrationAction = async (formData: FormData) => {
  const slug = String(formData.get('slug') ?? '');
  if (!slug || !(await authorized('registrations:manage', slug))) {
    return;
  }
  const registrationId = String(formData.get('registrationId') ?? '');
  if (!registrationId) {
    return;
  }
  await cancelRegistration(slug, registrationId);
  revalidatePath('/studio/insights');
};

export const moveParticipantRegistrationAction = async (
  formData: FormData,
) => {
  if (!(await authorized('registrations:manage'))) {
    return;
  }
  const participantId = String(formData.get('participantId') ?? '');
  const fromSlug = String(formData.get('fromSlug') ?? '');
  const toSlug = String(formData.get('toSlug') ?? '');
  if (!participantId || !fromSlug || !toSlug || fromSlug === toSlug) {
    return;
  }
  const outcome = await moveParticipantRegistration(
    participantId,
    fromSlug,
    toSlug,
    'he',
  );
  if (!outcome.ok) {
    redirect('/studio/participants?move=failed');
  }
  revalidatePath('/studio/participants');
};

export const deleteParticipantAction = async (formData: FormData) => {
  if (!(await authorized('platform:manage'))) {
    return;
  }
  const id = String(formData.get('id') ?? '');
  if (!id) {
    return;
  }
  await deleteParticipantAccount(id);
  revalidatePath('/studio/participants');
};

/*
 * Conference settings from inside the workspace (approved flow): name
 * and dates change in place; the workspace never sends the editor away.
 */
export const updateConferenceSettingsAction = async (formData: FormData) => {
  const slug = String(formData.get('slug') ?? '');
  if (!slug || !(await authorized('events:manage', slug))) {
    return;
  }
  const contentLocale = (
    formData.get('contentLocale') === 'en' ? 'en' : 'he'
  ) as Locale;
  const title = String(formData.get('title') ?? '').trim();
  const startsAt = String(formData.get('startsAt') ?? '').trim();
  const endsAt = String(formData.get('endsAt') ?? '').trim();
  const toIsoOrSkip = (value: string): string | undefined =>
    fromDateTimeInputValue(value);
  /*
   * The name is a localized field: it rides the opening save — the
   * write every other bilingual field already uses — into the content
   * language being edited. Dates are language-free.
   */
  if (title) {
    await saveEventOpening(slug, contentLocale, { title });
  }
  await updateEventDetails(
    slug,
    {
      startsAt: toIsoOrSkip(startsAt),
      endsAt: toIsoOrSkip(endsAt),
    },
    contentLocale,
  );
  revalidatePath('/studio', 'layout');
  revalidatePath(`/studio/experiences/${slug}`);
};

/*
 * The voices on stage are chosen inside the speakers scene: each
 * command reads the current draft list, mutates it as data, and saves
 * the whole array back — preserving every row id so a manual role
 * written in one language survives an edit in the other.
 */
type SpeakerInput = NonNullable<EventOpeningInput['speakers']>[number];

const draftSpeakersAsInput = (
  speakers: {
    id?: string;
    accountId?: string;
    name?: string;
    role?: string;
    photoId?: string;
  }[],
): SpeakerInput[] =>
  speakers.map((speaker) => ({
    id: speaker.id,
    accountId: speaker.accountId ?? null,
    name: speaker.name,
    role: speaker.role,
    photoId: speaker.photoId ?? null,
  }));

export const addConferenceSpeakerAction = async (formData: FormData) => {
  const slug = String(formData.get('slug') ?? '');
  if (!slug || !(await authorized('events:manage', slug))) {
    return;
  }
  const contentLocale = (
    formData.get('contentLocale') === 'en' ? 'en' : 'he'
  ) as Locale;
  const accountId = String(formData.get('accountId') ?? '').trim();
  const name = String(formData.get('name') ?? '').trim();
  const role = String(formData.get('role') ?? '').trim();
  const photoId = String(formData.get('photoId') ?? '').trim();
  /*
   * A speaker must resolve to a name: either an account lends one, or
   * the editor types one. An empty manual entry is dropped silently.
   */
  if (!accountId && !name) {
    return;
  }
  const draft = await getEventOpeningDraft(slug, contentLocale);
  if (!draft) {
    return;
  }
  const next: SpeakerInput[] = [
    ...draftSpeakersAsInput(draft.speakers),
    {
      accountId: accountId ? accountId : null,
      name: name || undefined,
      role: role || undefined,
      photoId: photoId ? photoId : null,
    },
  ];
  await saveEventOpening(slug, contentLocale, { speakers: next });
  revalidatePath('/studio', 'layout');
  revalidatePath(`/studio/experiences/${slug}`);
};

export const removeConferenceSpeakerAction = async (formData: FormData) => {
  const slug = String(formData.get('slug') ?? '');
  if (!slug || !(await authorized('events:manage', slug))) {
    return;
  }
  const contentLocale = (
    formData.get('contentLocale') === 'en' ? 'en' : 'he'
  ) as Locale;
  const index = Number.parseInt(String(formData.get('index') ?? ''), 10);
  const draft = await getEventOpeningDraft(slug, contentLocale);
  if (!draft || Number.isNaN(index)) {
    return;
  }
  const next = draftSpeakersAsInput(draft.speakers).filter(
    (_, position) => position !== index,
  );
  await saveEventOpening(slug, contentLocale, { speakers: next });
  revalidatePath('/studio', 'layout');
  revalidatePath(`/studio/experiences/${slug}`);
};


/*
 * Flip which conference IS the public website. Changing the pointer
 * re-renders the entire frontend (landing, program, speakers, info),
 * so the homepage layout is revalidated alongside the Studio.
 */
export const setActiveConferenceAction = async (formData: FormData) => {
  const slug = String(formData.get('slug') ?? '').trim();
  if (!slug || !(await authorized('experiences:manage'))) {
    return;
  }
  await setActiveConference(slug);
  revalidatePath('/studio', 'layout');
  revalidatePath('/', 'layout');
};
