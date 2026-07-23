import Link from 'next/link';
import { notFound } from 'next/navigation';
import { LOCALE_LABELS, SUPPORTED_LOCALES, type Locale } from '@/config/locales';
import { findEvent, getEventOpeningDraft, listMedia } from '@/features/events';
import { listAgenda } from '@/features/program';
import {
  CONFERENCE_SCENE_SEQUENCE,
  CONFERENCE_SCENE_TYPES,
  actBlocks,
  actOfScene,
  completeComposition,
  inspectJourney,
} from '@/features/cinematic';
import {
  ATMOSPHERE_LABELS,
  CONFERENCE_ACT_LABELS,
  CONFERENCE_SCENE_GROUPS,
  CONSOLE_SCENE_LABELS,
  CONSOLE_UI,
  CSaveButton,
  CMediaPicker,
  CMediaMultiPicker,
  CSelectField,
  CTextAreaField,
  CTextField,
  ConsoleCanvas,
  ConsoleShell,
  EDITOR_MESSAGES,
  SCENE_DENSITY_LABELS,
  SCENE_EMPHASIS_LABELS,
  SCENE_VARIANT_LABELS,
  getStudioCreator,
  getStudioLocale,
  searchAccounts,
} from '@/features/studio';
import type { AccountSearchView } from '@/features/studio';
import { applyComposition, resolveScene } from '@/experience-runtime';
import { formatTimeLabel, toDateTimeInputValue } from '@/shared';
import {
  addSessionAction,
  deleteSessionAction,
  updateSessionAction,
} from '../../../(classic)/actions';
import {
  addConferenceSpeakerAction,
  consoleLaunchExperienceAction,
  consoleSaveEventOpeningAction,
  consoleSaveProgramDaysAction,
  moveEventActAction,
  moveEventSceneAction,
  setEventSceneStyleAction,
  removeConferenceSpeakerAction,
  toggleEventActAction,
  toggleEventSceneAction,
  updateConferenceSettingsAction,
  uploadOpeningImageAction,
} from '../../actions';

/*
 * A conference's workspace: the same stage as the opening — filmstrip,
 * the live experience as the canvas, and an inspector over the event's
 * own scenes. List-driven scenes point honestly at the classic Studio
 * until the Composer arrives.
 */
interface ConsoleEventProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    content?: string;
    scene?: string;
    launch?: string;
    blockers?: string;
    speakerQuery?: string;
  }>;
}

const label = (key: string, locale: Locale): string =>
  EDITOR_MESSAGES[key]?.[locale] ?? key;

/*
 * Where each list-driven scene is edited in the classic Studio until
 * the Composer absorbs it.
 */
const CLASSIC_EDITOR_PATHS: Record<string, string> = {
  'conference-speakers': '/people',
  'conference-sponsors': '/sponsors',
};

/*
 * The image slots each inspector group can fill straight from the
 * editor's computer (Experience Engine v2): the upload action stores
 * the file and points the slot at it in one gesture.
 */
const GROUP_UPLOAD_SLOTS: Record<string, { field: string; labelKey: string }[]> = {
  arrival: [
    { field: 'heroImageId', labelKey: 'heroImage' },
    { field: 'posterId', labelKey: 'poster' },
  ],
  story: [{ field: 'storyImageId', labelKey: 'storyImage' }],
  quote: [{ field: 'quoteImageId', labelKey: 'storyImage' }],
  venue: [{ field: 'venueImageId', labelKey: 'storyImage' }],
  closing: [{ field: 'closingImageId', labelKey: 'storyImage' }],
};

const ConsoleEventPage = async ({ params, searchParams }: ConsoleEventProps) => {
  const { slug: rawSlug } = await params;
  /*
   * Route params arrive percent-encoded; legacy addresses may hold
   * Hebrew letters, so the workspace decodes before looking up.
   */
  const slug = decodeURIComponent(rawSlug);
  const {
    content: contentParam,
    scene: sceneParam,
    launch,
    blockers,
    speakerQuery: speakerQueryParam,
  } = await searchParams;
  const locale = await getStudioLocale();
  const creator = await getStudioCreator();
  const contentLocale: Locale =
    contentParam === 'en' || contentParam === 'he' ? contentParam : 'he';

  const [draft, media, summary, agenda] = await Promise.all([
    getEventOpeningDraft(slug, contentLocale),
    listMedia().catch(() => []),
    findEvent(slug).catch(() => null),
    listAgenda(slug, contentLocale).catch(() => []),
  ]);

  if (!draft) {
    notFound();
  }

  const programDayKeys = Array.from(
    new Set(
      agenda
        .map((session) => (session.startsAt ? session.startsAt.slice(0, 10) : ''))
        .filter((key) => key !== ''),
    ),
  ).sort();

  const scenes = applyComposition(
    CONFERENCE_SCENE_SEQUENCE.map((entry) => ({
      id: entry.id,
      type: entry.type,
      hidden: entry.hidden,
      content: {},
    })),
    completeComposition(draft.composition),
  );
  const selectedType =
    scenes.find((scene) => scene.type === sceneParam)?.type ??
    CONFERENCE_SCENE_TYPES.arrival;
  const group = CONFERENCE_SCENE_GROUPS[selectedType] ?? 'none';
  const selectedScene = scenes.find((scene) => scene.type === selectedType);
  const selectedDefinition = resolveScene(selectedType);
  /*
   * The three presentation axes (Experience Engine v3): each chooser
   * appears only when the package declares choices for it.
   */
  const styleAxes = [
    {
      axis: 'variant',
      title: CONSOLE_UI.variantTitle,
      options: selectedDefinition?.variants ?? [],
      labels: SCENE_VARIANT_LABELS,
      current: selectedScene?.variant ?? '',
    },
    {
      axis: 'density',
      title: CONSOLE_UI.densityTitle,
      options: selectedDefinition?.densities ?? [],
      labels: SCENE_DENSITY_LABELS,
      current: selectedScene?.density ?? '',
    },
    {
      axis: 'emphasis',
      title: CONSOLE_UI.emphasisTitle,
      options: selectedDefinition?.emphases ?? [],
      labels: SCENE_EMPHASIS_LABELS,
      current: selectedScene?.emphasis ?? '',
    },
  ].filter((entry) => entry.options.length > 0);
  const noImage = CONSOLE_UI.noImage[locale];
  const atmosphereOptions = Object.entries(ATMOSPHERE_LABELS).map(
    ([value, entry]) => ({ value, label: entry[locale] }),
  );
  const sceneHref = (type: string) =>
    `/studio/experiences/${slug}?content=${contentLocale}&scene=${type}`;
  /*
   * The Experience Map (Experience Engine v2): the journey as Acts over
   * the composed order; stage chrome sits outside every Act.
   */
  const acts = actBlocks(scenes);
  const chromeScenes = scenes.filter((scene) => actOfScene(scene.id) === null);
  const overlayChrome = chromeScenes.filter(
    (scene) => (resolveScene(scene.type)?.placement ?? 'flow') === 'overlay',
  );
  const closingChrome = chromeScenes.filter(
    (scene) => (resolveScene(scene.type)?.placement ?? 'flow') !== 'overlay',
  );
  const rhythmNotes = inspectJourney(scenes);
  const draftMoments = draft.moments.filter(
    (moment): moment is { imageId: string; caption?: string } =>
      typeof moment.imageId === 'string' && moment.imageId !== '',
  );
  const draftMomentIds = draftMoments.map((moment) => moment.imageId);
  const mediaById = new Map(media.map((item) => [item.id, item] as const));
  const uploadSlots =
    group === 'moments'
      ? [{ field: 'moments', labelKey: '' }]
      : (GROUP_UPLOAD_SLOTS[group] ?? []);

  /*
   * The speakers scene lets the editor choose who appears: an existing
   * platform account (found by name or email) or a manual name + photo.
   * The account search runs only while that scene is open and a query
   * is present, so no other inspector pays for it.
   */
  const speakerQuery = (speakerQueryParam ?? '').trim();
  const speakerAccounts: AccountSearchView[] =
    group === 'speakers' && speakerQuery
      ? await searchAccounts(speakerQuery).catch(() => [])
      : [];
  const chosenSpeakerAccountIds = new Set(
    draft.speakers
      .map((speaker) => speaker.accountId)
      .filter((id): id is string => Boolean(id)),
  );

  return (
    <ConsoleShell
      locale={locale}
      userName={creator?.name ?? ''}
      breadcrumb={
        <>
          <Link href="/studio" className="transition-colors hover:text-[var(--c-text)]">
            {CONSOLE_UI.backToConsole[locale]}
          </Link>
          <span aria-hidden="true">›</span>
          <span className="truncate font-medium text-[var(--c-text)]">
            {draft.title ?? summary?.title ?? slug}
          </span>
          <span
            className={`flex-none rounded-full border px-2.5 py-0.5 text-[10px] tracking-widest ${
              summary?.launched
                ? 'border-[var(--c-live)]/40 text-[var(--c-live)]'
                : 'border-[var(--c-bronze)]/40 text-[var(--c-bronze)]'
            }`}
          >
            {summary?.launched
              ? CONSOLE_UI.statusLive[locale]
              : CONSOLE_UI.statusDraft[locale]}
          </span>
        </>
      }
      actions={
        <nav
          aria-label={CONSOLE_UI.contentLanguage[locale]}
          className="flex items-center gap-3 text-xs"
        >
          <form action={consoleLaunchExperienceAction}>
            <input type="hidden" name="slug" value={slug} />
            <input type="hidden" name="contentLocale" value={contentLocale} />
            <button
              type="submit"
              className="rounded-lg bg-[var(--c-bronze)] px-4 py-2 text-xs font-medium text-[#161006] transition-colors hover:bg-[#dcbe84]"
            >
              {summary?.launched
                ? CONSOLE_UI.publishChanges[locale]
                : CONSOLE_UI.launch[locale]}
            </button>
          </form>
          {SUPPORTED_LOCALES.map((entry) => (
            <a
              key={entry}
              href={`/studio/experiences/${slug}?content=${entry}`}
              aria-current={entry === contentLocale ? 'true' : undefined}
              className={
                entry === contentLocale
                  ? 'font-medium text-[var(--c-bronze)]'
                  : 'text-[var(--c-text-soft)] transition-colors hover:text-[var(--c-text)]'
              }
            >
              {LOCALE_LABELS[entry]}
            </a>
          ))}
        </nav>
      }
    >
      {launch === 'live' ? (
        <p className="mx-4 mt-3 rounded-xl border border-[var(--c-live)]/40 bg-[var(--c-live)]/10 px-4 py-2.5 text-sm text-[var(--c-live)]">
          {locale === 'he'
            ? 'הכנס באוויר! העמוד הציבורי ועמוד הבית עודכנו.'
            : 'The conference is live! The public page and homepage are updated.'}
        </p>
      ) : null}
      {launch === 'blocked' ? (
        <p className="mx-4 mt-3 rounded-xl border border-[#B0442F]/40 bg-[#B0442F]/10 px-4 py-2.5 text-sm text-[#E39A8B]">
          {locale === 'he'
            ? `ההעלאה נעצרה — ${blockers ?? '?'} חסמים בבדיקת המוכנות. `
            : `Launch stopped — ${blockers ?? '?'} readiness blockers. `}
          <Link
            href={`/studio/events/${slug}`}
            className="underline underline-offset-4"
          >
            {locale === 'he' ? 'לפירוט ולתיקון' : 'See details'}
          </Link>
        </p>
      ) : null}
      <div className="flex h-full min-h-0 gap-4 p-4">
        <aside className="flex w-48 flex-none flex-col gap-1 overflow-y-auto rounded-xl border border-[var(--c-line)] bg-[var(--c-glass)] p-3">
          <p className="mb-2 px-1 text-[10px] font-medium tracking-[0.2em] text-[var(--c-text-faint)]">
            {CONSOLE_UI.experienceMap[locale]}
          </p>
          {overlayChrome.map((scene) => (
            <Link
              key={scene.id}
              href={sceneHref(scene.type)}
              aria-current={scene.type === selectedType ? 'true' : undefined}
              className={`rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
                scene.type === selectedType
                  ? 'border border-[var(--c-bronze)]/50 bg-[var(--c-bronze)]/10 text-[var(--c-bronze)]'
                  : 'text-[var(--c-text-faint)] hover:bg-white/5 hover:text-[var(--c-text)]'
              }`}
            >
              {CONSOLE_SCENE_LABELS[scene.type]?.[locale] ?? scene.type}
            </Link>
          ))}
          {acts.map((act, actIndex) => (
            <section key={act.id} className="group/act mt-2">
              <div className="flex items-center gap-2 px-1">
                <span
                  aria-hidden="true"
                  className={`text-[8px] ${
                    act.hidden
                      ? 'text-[var(--c-text-faint)]'
                      : 'text-[var(--c-bronze)]'
                  }`}
                >
                  {act.hidden ? '◌' : '●'}
                </span>
                <span className="text-[9px] tabular-nums tracking-[0.2em] text-[var(--c-text-faint)]">
                  {CONSOLE_UI.actTag[locale]} {String(actIndex + 1).padStart(2, '0')}
                </span>
                <span
                  className={`min-w-0 flex-1 truncate text-xs font-medium ${
                    act.hidden
                      ? 'text-[var(--c-text-faint)] line-through decoration-[0.5px]'
                      : 'text-[var(--c-text)]'
                  }`}
                >
                  {CONFERENCE_ACT_LABELS[act.id]?.[locale] ?? act.id}
                </span>
              </div>
              <div className="flex justify-end gap-1 px-1 opacity-0 transition-opacity group-focus-within/act:opacity-100 group-hover/act:opacity-100">
                <form action={moveEventActAction}>
                  <input type="hidden" name="slug" value={slug} />
                  <input type="hidden" name="act" value={act.id} />
                  <input type="hidden" name="direction" value="up" />
                  <button
                    type="submit"
                    aria-label={CONSOLE_UI.moveActUp[locale]}
                    title={CONSOLE_UI.moveActUp[locale]}
                    className="rounded px-1.5 text-xs text-[var(--c-text-faint)] transition-colors hover:text-[var(--c-bronze)]"
                  >
                    ↑
                  </button>
                </form>
                <form action={moveEventActAction}>
                  <input type="hidden" name="slug" value={slug} />
                  <input type="hidden" name="act" value={act.id} />
                  <input type="hidden" name="direction" value="down" />
                  <button
                    type="submit"
                    aria-label={CONSOLE_UI.moveActDown[locale]}
                    title={CONSOLE_UI.moveActDown[locale]}
                    className="rounded px-1.5 text-xs text-[var(--c-text-faint)] transition-colors hover:text-[var(--c-bronze)]"
                  >
                    ↓
                  </button>
                </form>
                <form action={toggleEventActAction}>
                  <input type="hidden" name="slug" value={slug} />
                  <input type="hidden" name="act" value={act.id} />
                  <button
                    type="submit"
                    aria-label={
                      act.hidden
                        ? CONSOLE_UI.showAct[locale]
                        : CONSOLE_UI.hideAct[locale]
                    }
                    title={
                      act.hidden
                        ? CONSOLE_UI.showAct[locale]
                        : CONSOLE_UI.hideAct[locale]
                    }
                    className="rounded px-1.5 text-xs text-[var(--c-text-faint)] transition-colors hover:text-[var(--c-bronze)]"
                  >
                    {act.hidden ? '◌' : '●'}
                  </button>
                </form>
              </div>
              <div className="ms-[3px] flex flex-col gap-0.5 border-s border-[var(--c-line)] ps-2.5">
                {act.scenes.map((scene) => {
                  const selected = scene.type === selectedType;
                  const hidden = scene.hidden === true;
                  if (scene.type === CONFERENCE_SCENE_TYPES.actIntro) {
                    return (
                      <div
                        key={scene.id}
                        className="group/scene flex items-center justify-between rounded-lg px-2.5 py-1"
                      >
                        <span
                          className={`text-xs text-[var(--c-text-faint)] ${
                            hidden ? '' : 'text-[var(--c-text-soft)]'
                          }`}
                        >
                          <span className={hidden ? 'line-through decoration-[0.5px]' : ''}>
                            {CONSOLE_SCENE_LABELS[scene.type]?.[locale] ?? scene.type}
                          </span>
                        </span>
                        <form action={toggleEventSceneAction}>
                          <input type="hidden" name="slug" value={slug} />
                          <input type="hidden" name="scene" value={scene.id} />
                          <button
                            type="submit"
                            aria-label={
                              hidden
                                ? CONSOLE_UI.showScene[locale]
                                : CONSOLE_UI.hideScene[locale]
                            }
                            title={
                              hidden
                                ? CONSOLE_UI.showScene[locale]
                                : CONSOLE_UI.hideScene[locale]
                            }
                            className="rounded px-1.5 text-xs text-[var(--c-text-faint)] opacity-0 transition-opacity hover:text-[var(--c-bronze)] group-focus-within/scene:opacity-100 group-hover/scene:opacity-100"
                          >
                            {hidden ? '◌' : '●'}
                          </button>
                        </form>
                      </div>
                    );
                  }
                  return (
                    <div key={scene.id} className="group/scene">
                      <Link
                        href={sceneHref(scene.type)}
                        aria-current={selected ? 'true' : undefined}
                        className={`block rounded-lg px-2.5 py-1.5 text-sm transition-colors ${
                          selected
                            ? 'border border-[var(--c-bronze)]/50 bg-[var(--c-bronze)]/10 text-[var(--c-bronze)]'
                            : 'text-[var(--c-text-soft)] hover:bg-white/5 hover:text-[var(--c-text)]'
                        } ${hidden ? 'opacity-50' : ''}`}
                      >
                        <span className={hidden ? 'line-through decoration-[0.5px]' : ''}>
                          {CONSOLE_SCENE_LABELS[scene.type]?.[locale] ?? scene.type}
                        </span>
                      </Link>
                      <div className="flex justify-end gap-1 px-1 opacity-0 transition-opacity group-focus-within/scene:opacity-100 group-hover/scene:opacity-100">
                        <form action={moveEventSceneAction}>
                          <input type="hidden" name="slug" value={slug} />
                          <input type="hidden" name="scene" value={scene.id} />
                          <input type="hidden" name="direction" value="up" />
                          <button
                            type="submit"
                            aria-label={CONSOLE_UI.moveUp[locale]}
                            title={CONSOLE_UI.moveUp[locale]}
                            className="rounded px-1.5 text-xs text-[var(--c-text-faint)] transition-colors hover:text-[var(--c-bronze)]"
                          >
                            ↑
                          </button>
                        </form>
                        <form action={moveEventSceneAction}>
                          <input type="hidden" name="slug" value={slug} />
                          <input type="hidden" name="scene" value={scene.id} />
                          <input type="hidden" name="direction" value="down" />
                          <button
                            type="submit"
                            aria-label={CONSOLE_UI.moveDown[locale]}
                            title={CONSOLE_UI.moveDown[locale]}
                            className="rounded px-1.5 text-xs text-[var(--c-text-faint)] transition-colors hover:text-[var(--c-bronze)]"
                          >
                            ↓
                          </button>
                        </form>
                        <form action={toggleEventSceneAction}>
                          <input type="hidden" name="slug" value={slug} />
                          <input type="hidden" name="scene" value={scene.id} />
                          <button
                            type="submit"
                            aria-label={
                              hidden
                                ? CONSOLE_UI.showScene[locale]
                                : CONSOLE_UI.hideScene[locale]
                            }
                            title={
                              hidden
                                ? CONSOLE_UI.showScene[locale]
                                : CONSOLE_UI.hideScene[locale]
                            }
                            className="rounded px-1.5 text-xs text-[var(--c-text-faint)] transition-colors hover:text-[var(--c-bronze)]"
                          >
                            {hidden ? '◌' : '●'}
                          </button>
                        </form>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
          {closingChrome.map((scene) => (
            <Link
              key={scene.id}
              href={sceneHref(scene.type)}
              aria-current={scene.type === selectedType ? 'true' : undefined}
              className={`mt-2 rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
                scene.type === selectedType
                  ? 'border border-[var(--c-bronze)]/50 bg-[var(--c-bronze)]/10 text-[var(--c-bronze)]'
                  : 'text-[var(--c-text-faint)] hover:bg-white/5 hover:text-[var(--c-text)]'
              }`}
            >
              {CONSOLE_SCENE_LABELS[scene.type]?.[locale] ?? scene.type}
            </Link>
          ))}
          {rhythmNotes.length > 0 ? (
            <section className="mt-4 border-t border-[var(--c-line)] pt-3">
              <p className="mb-2 px-1 text-[10px] font-medium tracking-[0.2em] text-[var(--c-text-faint)]">
                {CONSOLE_UI.rhythmTitle[locale]}
              </p>
              <ul className="flex flex-col gap-2.5 px-1">
                {rhythmNotes.map((note) => (
                  <li key={note.id} className="text-[11px] leading-relaxed">
                    <p className="text-[var(--c-text-soft)]">
                      {note.message[locale]}
                    </p>
                    <p className="mt-0.5 text-[var(--c-text-faint)]">
                      {note.hint[locale]}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </aside>

        <div className="flex min-h-0 flex-1 flex-col gap-2">
          <ConsoleCanvas
            src={`/studio/preview/${slug}?content=${contentLocale}${
              sceneParam ? `&scene=${encodeURIComponent(selectedType)}` : ''
            }`}
            title={draft.title ?? summary?.title ?? slug}
            locale={locale}
            sceneLinkTemplate={`/studio/experiences/${slug}?content=${contentLocale}&scene={type}`}
          />
          <p className="text-[11px] text-[var(--c-text-faint)]">
            {CONSOLE_UI.draftCanvasNote[locale]}
          </p>
        </div>

        <aside className="flex w-72 flex-none flex-col overflow-y-auto rounded-xl border border-[var(--c-line)] bg-[var(--c-glass)] p-4">
          <h2 className="font-medium">
            {CONSOLE_SCENE_LABELS[selectedType]?.[locale] ?? selectedType}
          </h2>
          <p className="mb-4 mt-0.5 text-[10px] tracking-[0.14em] text-[var(--c-text-faint)]">
            {selectedType.toUpperCase()}
          </p>

          {group === 'none' ? (
            <p className="text-sm text-[var(--c-text-soft)]">
              {CONSOLE_UI.inspectorEmpty[locale]}
            </p>
          ) : null}

          {group === 'auto' ? (
            <p className="mb-4 text-sm leading-relaxed text-[var(--c-text-soft)]">
              {CONSOLE_UI.autoSceneNote[locale]}
            </p>
          ) : null}

          {group === 'classic' && selectedType === 'conference-program' ? (
            <div className="flex flex-col gap-3">
              <p className="text-[10px] font-medium tracking-[0.16em] text-[var(--c-text-faint)]">
                {locale === 'he' ? 'התוכנית' : 'PROGRAM'}
              </p>
              {agenda.map((session) => (
                <details
                  key={session.id}
                  className="rounded-lg border border-[var(--c-line)] bg-[rgba(6,10,16,0.4)]"
                >
                  <summary className="flex cursor-pointer list-none items-baseline gap-2 px-3 py-2 text-sm text-[var(--c-text)]">
                    <span className="text-[10px] tabular-nums text-[var(--c-text-faint)]">
                      {formatTimeLabel(session.startsAt, contentLocale) ||
                        '--:--'}
                    </span>
                    <span className="min-w-0 flex-1 truncate">
                      {session.title}
                    </span>
                  </summary>
                  <form
                    action={updateSessionAction}
                    className="flex flex-col gap-3 border-t border-[var(--c-line)] p-3"
                  >
                    <input type="hidden" name="slug" value={slug} />
                    <input type="hidden" name="sessionId" value={session.id} />
                    <input
                      type="hidden"
                      name="contentLocale"
                      value={contentLocale}
                    />
                    <input
                      type="hidden"
                      name="sessionType"
                      value={session.sessionType}
                    />
                    {session.capacity !== null ? (
                      <input
                        type="hidden"
                        name="capacity"
                        value={session.capacity}
                      />
                    ) : null}
                    {session.waitlistEnabled ? (
                      <input type="hidden" name="waitlistEnabled" value="on" />
                    ) : null}
                    <CTextField
                      name="title"
                      label={locale === 'he' ? 'שם' : 'Title'}
                      defaultValue={session.title}
                    />
                    <label className="block">
                      <span className="mb-1.5 block text-[10px] font-medium tracking-[0.16em] text-[var(--c-text-faint)]">
                        {locale === 'he' ? 'התחלה' : 'Starts'}
                      </span>
                      <input
                        type="datetime-local"
                        name="startsAt"
                        defaultValue={toDateTimeInputValue(session.startsAt)}
                        className="w-full rounded-lg border border-[var(--c-line)] bg-[rgba(6,10,16,0.6)] px-3 py-2 text-sm text-[var(--c-text)] [color-scheme:dark]"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block text-[10px] font-medium tracking-[0.16em] text-[var(--c-text-faint)]">
                        {locale === 'he' ? 'סיום' : 'Ends'}
                      </span>
                      <input
                        type="datetime-local"
                        name="endsAt"
                        defaultValue={toDateTimeInputValue(session.endsAt)}
                        className="w-full rounded-lg border border-[var(--c-line)] bg-[rgba(6,10,16,0.6)] px-3 py-2 text-sm text-[var(--c-text)] [color-scheme:dark]"
                      />
                    </label>
                    <label className="flex items-center gap-2 text-xs text-[var(--c-text-soft)]">
                      <input
                        type="checkbox"
                        name="featured"
                        defaultChecked={session.featured === true}
                        className="size-4 accent-[var(--c-bronze)]"
                      />
                      {locale === 'he'
                        ? 'הרצאה מרכזית (בדף הבית)'
                        : 'Featured session (on the landing)'}
                    </label>
                    <button
                      type="submit"
                      className="min-h-9 rounded-lg bg-[var(--c-bronze)] text-xs font-medium text-[#161006]"
                    >
                      {locale === 'he' ? 'שמירה' : 'Save'}
                    </button>
                  </form>
                  <form
                    action={deleteSessionAction}
                    className="border-t border-[var(--c-line)] p-3"
                  >
                    <input type="hidden" name="slug" value={slug} />
                    <input type="hidden" name="sessionId" value={session.id} />
                    <button
                      type="submit"
                      className="text-[11px] text-[#E39A8B] underline underline-offset-4"
                    >
                      {locale === 'he' ? 'מחיקה מהתוכנית' : 'Remove'}
                    </button>
                  </form>
                </details>
              ))}
              <details className="rounded-lg border border-dashed border-[var(--c-line-strong)]">
                <summary className="cursor-pointer list-none px-3 py-2 text-sm text-[var(--c-bronze)]">
                  + {locale === 'he' ? 'הוספה לתוכנית' : 'Add to program'}
                </summary>
                <form
                  action={addSessionAction}
                  className="flex flex-col gap-3 border-t border-[var(--c-line)] p-3"
                >
                  <input type="hidden" name="slug" value={slug} />
                  <input
                    type="hidden"
                    name="contentLocale"
                    value={contentLocale}
                  />
                  <CTextField
                    name="title"
                    label={locale === 'he' ? 'שם' : 'Title'}
                  />
                  <label className="block">
                    <span className="mb-1.5 block text-[10px] font-medium tracking-[0.16em] text-[var(--c-text-faint)]">
                      {locale === 'he' ? 'סוג' : 'Type'}
                    </span>
                    <select
                      name="sessionType"
                      defaultValue="workshop"
                      className="w-full rounded-lg border border-[var(--c-line)] bg-[rgba(6,10,16,0.6)] px-3 py-2 text-sm text-[var(--c-text)] [color-scheme:dark]"
                    >
                      <option value="talk">{locale === 'he' ? 'הרצאה' : 'Talk'}</option>
                      <option value="workshop">{locale === 'he' ? 'סדנה' : 'Workshop'}</option>
                      <option value="keynote">{locale === 'he' ? 'מליאה' : 'Keynote'}</option>
                      <option value="tour">{locale === 'he' ? 'סיור' : 'Tour'}</option>
                      <option value="break">{locale === 'he' ? 'הפסקה' : 'Break'}</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-[10px] font-medium tracking-[0.16em] text-[var(--c-text-faint)]">
                      {locale === 'he' ? 'התחלה' : 'Starts'}
                    </span>
                    <input
                      type="datetime-local"
                      name="startsAt"
                      className="w-full rounded-lg border border-[var(--c-line)] bg-[rgba(6,10,16,0.6)] px-3 py-2 text-sm text-[var(--c-text)] [color-scheme:dark]"
                    />
                  </label>
                  <CTextField
                    name="capacity"
                    label={locale === 'he' ? 'מספר מקומות (רשות)' : 'Places (optional)'}
                  />
                  <button
                    type="submit"
                    className="min-h-9 rounded-lg bg-[var(--c-bronze)] text-xs font-medium text-[#161006]"
                  >
                    {locale === 'he' ? 'הוספה' : 'Add'}
                  </button>
                </form>
              </details>
              {programDayKeys.length > 0 ? (
                <form
                  action={consoleSaveProgramDaysAction}
                  className="mt-1 flex flex-col gap-3 rounded-lg border border-[var(--c-line)] bg-[rgba(6,10,16,0.4)] p-3"
                >
                  <p className="text-[10px] font-medium tracking-[0.16em] text-[var(--c-text-faint)]">
                    {locale === 'he' ? 'נושא לכל יום' : 'DAY THEMES'}
                  </p>
                  <input type="hidden" name="slug" value={slug} />
                  <input
                    type="hidden"
                    name="contentLocale"
                    value={contentLocale}
                  />
                  <input
                    type="hidden"
                    name="programDaysCount"
                    value={programDayKeys.length}
                  />
                  {programDayKeys.map((key, index) => (
                    <div
                      key={key}
                      className="flex flex-col gap-2 border-t border-[var(--c-line)] pt-3 first:border-0 first:pt-0"
                    >
                      <span className="text-[11px] text-[var(--c-text-soft)]">
                        {locale === 'he' ? `יום ${index + 1}` : `Day ${index + 1}`} · {key}
                      </span>
                      <CTextField
                        name={`programDayTheme${index}`}
                        label={locale === 'he' ? 'נושא היום' : 'Day theme'}
                        defaultValue={draft.programDays[index]?.theme ?? ''}
                      />
                      <CTextField
                        name={`programDayDescription${index}`}
                        label={locale === 'he' ? 'תיאור קצר' : 'Short description'}
                        defaultValue={draft.programDays[index]?.description ?? ''}
                      />
                    </div>
                  ))}
                  <button
                    type="submit"
                    className="min-h-9 rounded-lg bg-[var(--c-bronze)] text-xs font-medium text-[#161006]"
                  >
                    {locale === 'he' ? 'שמירת נושאי הימים' : 'Save day themes'}
                  </button>
                </form>
              ) : null}
            </div>
          ) : group === 'classic' ? (
            <div className="flex flex-col gap-3 text-sm text-[var(--c-text-soft)]">
              <p>{CONSOLE_UI.editedInClassic[locale]}</p>
              <Link
                href={`/studio/events/${slug}${
                  CLASSIC_EDITOR_PATHS[selectedType] ?? '/media'
                }`}
                className="text-[var(--c-bronze)] underline underline-offset-4"
              >
                {CONSOLE_UI.toClassicEditor[locale]}
              </Link>
            </div>
          ) : null}

          {group === 'speakers' ? (
            <div className="flex flex-col gap-5">
              <p className="text-sm leading-relaxed text-[var(--c-text-soft)]">
                {locale === 'he'
                  ? 'בחרו מי עולה לבמה: חשבון קיים מהמערכת, או שם ותמונה שתזינו.'
                  : 'Choose who takes the stage: an existing platform account, or a name and photo you enter.'}
              </p>

              {draft.speakers.length > 0 ? (
                <div className="flex flex-col gap-2">
                  <p className="text-[10px] font-medium tracking-[0.16em] text-[var(--c-text-faint)]">
                    {locale === 'he' ? 'על הבמה' : 'ON STAGE'}
                  </p>
                  {draft.speakers.map((speaker, index) => {
                    const shownName =
                      (speaker.name ?? '').trim() ||
                      speaker.accountName ||
                      (locale === 'he' ? 'ללא שם' : 'Unnamed');
                    const shownRole =
                      (speaker.role ?? '').trim() || speaker.accountRole || '';
                    const shownPhoto =
                      speaker.photoUrl ?? speaker.accountPhotoUrl;
                    return (
                      <div
                        key={speaker.id ?? `${shownName}-${index}`}
                        className="flex items-center gap-3 rounded-lg border border-[var(--c-line)] bg-[rgba(6,10,16,0.4)] px-3 py-2"
                      >
                        {shownPhoto ? (
                          /* eslint-disable-next-line @next/next/no-img-element -- portraits come straight from the media API */
                          <img
                            src={shownPhoto}
                            alt=""
                            className="h-9 w-9 flex-none rounded-full border border-[var(--c-line)] object-cover"
                          />
                        ) : (
                          <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full border border-[var(--c-line)] bg-[rgba(201,161,93,0.12)] text-xs font-medium text-[var(--c-bronze)]">
                            {shownName.slice(0, 1)}
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm text-[var(--c-text)]">
                            {shownName}
                          </p>
                          {shownRole ? (
                            <p className="truncate text-xs text-[var(--c-text-faint)]">
                              {shownRole}
                            </p>
                          ) : null}
                          {speaker.accountId ? (
                            <p className="text-[10px] tracking-[0.12em] text-[var(--c-bronze)]">
                              {locale === 'he' ? 'חשבון מקושר' : 'Linked account'}
                            </p>
                          ) : null}
                        </div>
                        <form action={removeConferenceSpeakerAction}>
                          <input type="hidden" name="slug" value={slug} />
                          <input
                            type="hidden"
                            name="contentLocale"
                            value={contentLocale}
                          />
                          <input type="hidden" name="index" value={index} />
                          <button
                            type="submit"
                            className="flex-none rounded-md px-2 py-1 text-[11px] text-[#E39A8B] underline underline-offset-4"
                          >
                            {locale === 'he' ? 'הסרה' : 'Remove'}
                          </button>
                        </form>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="rounded-lg border border-dashed border-[var(--c-line)] px-3 py-4 text-center text-xs text-[var(--c-text-faint)]">
                  {locale === 'he'
                    ? 'עדיין לא נבחרו דוברים — עד אז מוצגים הדוברים מתוך התוכנית.'
                    : 'No speakers chosen yet — until then the program’s voices are shown.'}
                </p>
              )}

              <details className="rounded-xl border border-[var(--c-line)] bg-[rgba(6,10,16,0.4)]">
                <summary className="cursor-pointer list-none px-4 py-3 text-sm text-[var(--c-bronze)]">
                  + {locale === 'he' ? 'מתוך חשבונות המערכת' : 'From platform accounts'}
                </summary>
                <div className="flex flex-col gap-3 border-t border-[var(--c-line)] p-3">
                  <form method="get" className="flex items-center gap-2">
                    <input type="hidden" name="content" value={contentLocale} />
                    <input type="hidden" name="scene" value={selectedType} />
                    <input
                      name="speakerQuery"
                      defaultValue={speakerQuery}
                      placeholder={
                        locale === 'he' ? 'חיפוש לפי שם או אימייל' : 'Search by name or email'
                      }
                      className="min-w-0 flex-1 rounded-lg border border-[var(--c-line)] bg-[rgba(6,10,16,0.6)] px-3 py-2 text-sm text-[var(--c-text)]"
                    />
                    <button
                      type="submit"
                      className="flex-none rounded-lg border border-[var(--c-line-strong)] px-3 py-2 text-xs text-[var(--c-text-soft)] transition-colors hover:border-[var(--c-bronze)]/50 hover:text-[var(--c-bronze)]"
                    >
                      {locale === 'he' ? 'חיפוש' : 'Search'}
                    </button>
                  </form>
                  {speakerQuery ? (
                    speakerAccounts.length > 0 ? (
                      <ul className="flex flex-col gap-1.5">
                        {speakerAccounts.map((account) => {
                          const already = chosenSpeakerAccountIds.has(account.id);
                          return (
                            <li key={account.id}>
                              <form
                                action={addConferenceSpeakerAction}
                                className="flex items-center gap-2"
                              >
                                <input type="hidden" name="slug" value={slug} />
                                <input
                                  type="hidden"
                                  name="contentLocale"
                                  value={contentLocale}
                                />
                                <input
                                  type="hidden"
                                  name="accountId"
                                  value={account.id}
                                />
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm text-[var(--c-text)]">
                                    {account.name || account.email}
                                  </p>
                                  <p className="truncate text-xs text-[var(--c-text-faint)]">
                                    {account.email}
                                  </p>
                                </div>
                                <button
                                  type="submit"
                                  disabled={already}
                                  className="flex-none rounded-lg border border-[var(--c-line-strong)] px-3 py-1.5 text-xs text-[var(--c-bronze)] transition-colors enabled:hover:border-[var(--c-bronze)]/50 disabled:opacity-40"
                                >
                                  {already
                                    ? locale === 'he'
                                      ? 'נבחר'
                                      : 'Added'
                                    : locale === 'he'
                                      ? 'הוספה'
                                      : 'Add'}
                                </button>
                              </form>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p className="text-xs text-[var(--c-text-faint)]">
                        {locale === 'he' ? 'לא נמצאו חשבונות' : 'No accounts found'}
                      </p>
                    )
                  ) : null}
                </div>
              </details>

              <details className="rounded-xl border border-[var(--c-line)] bg-[rgba(6,10,16,0.4)]">
                <summary className="cursor-pointer list-none px-4 py-3 text-sm text-[var(--c-bronze)]">
                  + {locale === 'he' ? 'שם ותמונה ידניים' : 'Manual name & photo'}
                </summary>
                <form
                  action={addConferenceSpeakerAction}
                  className="flex flex-col gap-3 border-t border-[var(--c-line)] p-3"
                >
                  <input type="hidden" name="slug" value={slug} />
                  <input type="hidden" name="contentLocale" value={contentLocale} />
                  <CTextField
                    name="name"
                    label={locale === 'he' ? 'שם' : 'Name'}
                  />
                  <CTextField
                    name="role"
                    label={locale === 'he' ? 'תפקיד / נושא' : 'Role / topic'}
                  />
                  <CMediaPicker
                    name="photoId"
                    label={locale === 'he' ? 'תמונה' : 'Photo'}
                    media={media}
                    emptyLabel={noImage}
                  />
                  <button
                    type="submit"
                    className="min-h-9 rounded-lg bg-[var(--c-bronze)] text-xs font-medium text-[#161006]"
                  >
                    {locale === 'he' ? 'הוספה לבמה' : 'Add to stage'}
                  </button>
                </form>
              </details>
            </div>
          ) : null}

          <details className="mb-4 rounded-xl border border-[var(--c-line)] bg-[rgba(6,10,16,0.4)]">
            <summary className="cursor-pointer list-none px-4 py-3 text-xs font-medium tracking-[0.12em] text-[var(--c-text-soft)] transition-colors hover:text-[var(--c-bronze)]">
              {locale === 'he' ? 'הגדרות הכנס' : 'Conference settings'}
            </summary>
            <form
              action={updateConferenceSettingsAction}
              className="flex flex-col gap-4 px-4 pb-4"
            >
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="contentLocale" value={contentLocale} />
              <CTextField
                name="title"
                label={locale === 'he' ? 'שם הכנס' : 'Conference name'}
                defaultValue={draft.title ?? summary?.title ?? ''}
              />
              <label className="block">
                <span className="mb-1.5 block text-[10px] font-medium tracking-[0.16em] text-[var(--c-text-faint)]">
                  {locale === 'he' ? 'תאריך התחלה' : 'Starts at'}
                </span>
                <input
                  type="datetime-local"
                  name="startsAt"
                  defaultValue={(summary?.startsAt ?? '').slice(0, 16)}
                  className="w-full rounded-lg border border-[var(--c-line-strong)] bg-[rgba(6,10,16,0.6)] px-3 py-2 text-sm text-[var(--c-text)] focus:border-[var(--c-bronze)]/60 focus:outline-none"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[10px] font-medium tracking-[0.16em] text-[var(--c-text-faint)]">
                  {locale === 'he' ? 'תאריך סיום' : 'Ends at'}
                </span>
                <input
                  type="datetime-local"
                  name="endsAt"
                  defaultValue={(summary?.endsAt ?? '').slice(0, 16)}
                  className="w-full rounded-lg border border-[var(--c-line-strong)] bg-[rgba(6,10,16,0.6)] px-3 py-2 text-sm text-[var(--c-text)] focus:border-[var(--c-bronze)]/60 focus:outline-none"
                />
              </label>
              <button
                type="submit"
                className="rounded-lg border border-[var(--c-line-strong)] px-4 py-2 text-xs text-[var(--c-text-soft)] transition-colors hover:border-[var(--c-bronze)]/50 hover:text-[var(--c-bronze)]"
              >
                {locale === 'he' ? 'שמירת הגדרות' : 'Save settings'}
              </button>
            </form>
          </details>

          {selectedScene
            ? styleAxes.map((entry) => (
                <section key={entry.axis} className="mb-4">
                  <p className="mb-1.5 text-[10px] font-medium tracking-[0.16em] text-[var(--c-text-faint)]">
                    {entry.title[locale]}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {['', ...entry.options].map((optionName) => {
                      const active = entry.current === optionName;
                      return (
                        <form
                          key={optionName || 'default'}
                          action={setEventSceneStyleAction}
                        >
                          <input type="hidden" name="slug" value={slug} />
                          <input
                            type="hidden"
                            name="scene"
                            value={selectedScene.id}
                          />
                          <input type="hidden" name="axis" value={entry.axis} />
                          <input type="hidden" name="value" value={optionName} />
                          <button
                            type="submit"
                            aria-pressed={active}
                            className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                              active
                                ? 'border-[var(--c-bronze)]/60 bg-[var(--c-bronze)]/10 text-[var(--c-bronze)]'
                                : 'border-[var(--c-line)] text-[var(--c-text-soft)] hover:border-[var(--c-bronze)]/40 hover:text-[var(--c-text)]'
                            }`}
                          >
                            {optionName
                              ? (entry.labels[optionName]?.[locale] ?? optionName)
                              : CONSOLE_UI.variantDefault[locale]}
                          </button>
                        </form>
                      );
                    })}
                  </div>
                </section>
              ))
            : null}

          {group !== 'none' &&
          group !== 'classic' &&
          group !== 'auto' &&
          group !== 'speakers' ? (
            <form action={consoleSaveEventOpeningAction} className="flex flex-col gap-4">
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="contentLocale" value={contentLocale} />
              {group === 'arrival' ? (
                <>
                  <CTextField
                    name="arrivalEyebrow"
                    label={label('arrivalEyebrow', locale)}
                    defaultValue={draft.arrivalEyebrow}
                  />
                  <CTextAreaField
                    name="teaser"
                    label={label('teaser', locale)}
                    defaultValue={draft.teaser}
                  />
                  <CTextField
                    name="location"
                    label={label('location', locale)}
                    defaultValue={draft.location}
                  />
                  <CSelectField
                    name="atmosphere"
                    label={label('atmosphere', locale)}
                    defaultValue={draft.atmosphere}
                    options={atmosphereOptions}
                  />
                  <CMediaPicker
                    name="heroImageId"
                    label={label('heroImage', locale)}
                    defaultValue={draft.heroImageId}
                    media={media}
                    emptyLabel={noImage}
                  />
                  <CMediaPicker
                    name="posterId"
                    label={label('poster', locale)}
                    defaultValue={draft.posterId}
                    media={media}
                    emptyLabel={noImage}
                  />
                  <label className="flex items-center gap-2 text-sm text-[var(--c-text-soft)]">
                    <input
                      type="checkbox"
                      name="featured"
                      defaultChecked={draft.featured}
                      className="size-4 accent-[var(--c-bronze)]"
                    />
                    {label('featured', locale)}
                  </label>
                </>
              ) : null}
              {group === 'story' ? (
                <>
                  <CTextField
                    name="storyEyebrow"
                    label={label('storyEyebrow', locale)}
                    defaultValue={draft.story.eyebrow}
                  />
                  <CTextField
                    name="storyTitle"
                    label={label('storyTitle', locale)}
                    defaultValue={draft.story.title}
                  />
                  <CTextAreaField
                    name="storyParagraph"
                    label={label('storyParagraph', locale)}
                    defaultValue={draft.story.paragraph}
                  />
                  <CMediaPicker
                    name="storyImageId"
                    label={label('storyImage', locale)}
                    defaultValue={draft.story.imageId}
                    media={media}
                    emptyLabel={noImage}
                  />
                </>
              ) : null}
              {group === 'quote' ? (
                <>
                  <CTextAreaField
                    name="quoteText"
                    label={label('quoteText', locale)}
                    defaultValue={draft.quote.text}
                  />
                  <CTextField
                    name="quoteAttribution"
                    label={label('quoteAttribution', locale)}
                    defaultValue={draft.quote.attribution}
                  />
                  <CTextField
                    name="quoteRole"
                    label={label('quoteRole', locale)}
                    defaultValue={draft.quote.role}
                  />
                  <CTextField
                    name="quoteStatValue"
                    label={label('quoteStatValue', locale)}
                    defaultValue={draft.quote.statValue}
                  />
                  <CTextField
                    name="quoteStatLabel"
                    label={label('quoteStatLabel', locale)}
                    defaultValue={draft.quote.statLabel}
                  />
                  <CMediaPicker
                    name="quoteImageId"
                    label={label('storyImage', locale)}
                    defaultValue={draft.quote.imageId}
                    media={media}
                    emptyLabel={noImage}
                  />
                </>
              ) : null}
              {group === 'venue' ? (
                <>
                  <CTextField
                    name="venueName"
                    label={label('venueName', locale)}
                    defaultValue={draft.venue.name}
                  />
                  <CTextAreaField
                    name="venueNarrative"
                    label={label('venueNarrative', locale)}
                    defaultValue={draft.venue.narrative}
                  />
                  <CTextAreaField
                    name="venueAccessibility"
                    label={locale === 'he' ? 'מידע נגישות' : 'Accessibility info'}
                    defaultValue={draft.venue.accessibility}
                  />
                  <CTextAreaField
                    name="venueEmergency"
                    label={
                      locale === 'he'
                        ? 'איש קשר ונוהל חירום'
                        : 'Emergency contact & procedure'
                    }
                    defaultValue={draft.venue.emergency}
                  />
                  <input type="hidden" name="venueFactsSubmitted" value="1" />
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] font-medium tracking-[0.16em] text-[var(--c-text-faint)]">
                      {locale === 'he'
                        ? 'נקודות מידע על המקום (ריק = מוסתר)'
                        : 'Venue facts (empty = hidden)'}
                    </span>
                    {[0, 1, 2, 3].map((index) => {
                      const fact = draft.venue.facts?.[index];
                      return (
                        <div key={index} className="flex flex-col gap-2">
                          <div className="flex gap-2">
                            <input
                              name={`venueFactLabel${index}`}
                              defaultValue={fact?.label ?? ''}
                              placeholder={
                                locale === 'he' ? 'למשל: חניה בבניין' : 'e.g. On-site parking'
                              }
                              className="min-w-0 flex-1 rounded-lg border border-[var(--c-line)] bg-[rgba(6,10,16,0.6)] px-3 py-2 text-sm text-[var(--c-text)]"
                            />
                            <select
                              name={`venueFactIcon${index}`}
                              defaultValue={fact?.icon ?? 'accessibility'}
                              className="w-24 rounded-lg border border-[var(--c-line)] bg-[rgba(6,10,16,0.6)] px-2 py-2 text-xs text-[var(--c-text)]"
                            >
                              <option value="accessibility">{locale === 'he' ? 'נגישות' : 'Access'}</option>
                              <option value="parking">{locale === 'he' ? 'חניה' : 'Parking'}</option>
                              <option value="transit">{locale === 'he' ? 'תחבורה' : 'Transit'}</option>
                              <option value="hotel">{locale === 'he' ? 'לינה' : 'Hotel'}</option>
                              <option value="leaf">{locale === 'he' ? 'סביבה' : 'Green'}</option>
                              <option value="coffee">{locale === 'he' ? 'קפה' : 'Coffee'}</option>
                            </select>
                          </div>
                          <input
                            name={`venueFactDescription${index}`}
                            defaultValue={fact?.description ?? ''}
                            placeholder={
                              locale === 'he' ? 'תיאור קצר (רשות)' : 'Short description (optional)'
                            }
                            className="w-full rounded-lg border border-[var(--c-line)] bg-[rgba(6,10,16,0.6)] px-3 py-2 text-sm text-[var(--c-text)]"
                          />
                        </div>
                      );
                    })}
                  </div>
                  <CMediaPicker
                    name="venueImageId"
                    label={label('storyImage', locale)}
                    defaultValue={draft.venue.imageId}
                    media={media}
                    emptyLabel={noImage}
                  />
                </>
              ) : null}
              {group === 'moments' ? (
                <>
                  <input type="hidden" name="momentsSubmitted" value="1" />
                  <CMediaMultiPicker
                    name="momentIds"
                    label={CONSOLE_UI.momentsImages[locale]}
                    hint={CONSOLE_UI.momentsHint[locale]}
                    defaultValues={draftMomentIds}
                    media={media}
                  />
                  {draftMoments.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      <span className="text-[10px] font-medium tracking-[0.16em] text-[var(--c-text-faint)]">
                        {CONSOLE_UI.momentCaptions[locale]}
                      </span>
                      {draftMoments.map((moment) => (
                        <div
                          key={moment.imageId}
                          className="flex items-center gap-2"
                        >
                          {mediaById.get(moment.imageId ?? '') ? (
                            /* eslint-disable-next-line @next/next/no-img-element -- library thumbnails come straight from the media API */
                            <img
                              src={mediaById.get(moment.imageId ?? '')?.url}
                              alt=""
                              className="h-9 w-14 flex-none rounded-md border border-[var(--c-line)] object-cover"
                            />
                          ) : null}
                          <input
                            name={`momentCaption-${moment.imageId}`}
                            defaultValue={moment.caption ?? ''}
                            placeholder={CONSOLE_UI.momentCaption[locale]}
                            className="min-w-0 flex-1 rounded-lg border border-[var(--c-line)] bg-[rgba(6,10,16,0.6)] px-3 py-2 text-sm text-[var(--c-text)]"
                          />
                        </div>
                      ))}
                    </div>
                  ) : null}
                </>
              ) : null}
              {group === 'closing' ? (
                <>
                  <CTextField
                    name="closingLine"
                    label={label('closingLine', locale)}
                    defaultValue={draft.closing.line}
                  />
                  <CMediaPicker
                    name="closingImageId"
                    label={label('storyImage', locale)}
                    defaultValue={draft.closing.imageId}
                    media={media}
                    emptyLabel={noImage}
                  />
                </>
              ) : null}
              <CSaveButton label={CONSOLE_UI.saveAndPublish[locale]} />
              <p className="text-[11px] leading-relaxed text-[var(--c-text-faint)]">
                {CONSOLE_UI.draftSavedNote[locale]}
              </p>
            </form>
          ) : null}

          {uploadSlots.length > 0 ? (
            <section className="mt-5 border-t border-[var(--c-line)] pt-4">
              <p className="text-[10px] font-medium tracking-[0.16em] text-[var(--c-text-faint)]">
                {CONSOLE_UI.uploadToScene[locale]}
              </p>
              <div className="mt-3 flex flex-col gap-3">
                {uploadSlots.map((slot) => (
                  <form
                    key={slot.field}
                    action={uploadOpeningImageAction}
                    className="flex flex-col gap-2"
                  >
                    <input type="hidden" name="slug" value={slug} />
                    <input
                      type="hidden"
                      name="contentLocale"
                      value={contentLocale}
                    />
                    <input type="hidden" name="field" value={slot.field} />
                    {slot.labelKey ? (
                      <span className="text-[10px] text-[var(--c-text-faint)]">
                        {label(slot.labelKey, locale)}
                      </span>
                    ) : null}
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        name="file"
                        required
                        accept="image/*"
                        className="min-w-0 flex-1 text-xs text-[var(--c-text-soft)] file:me-2 file:rounded-lg file:border file:border-[var(--c-line-strong)] file:bg-transparent file:px-3 file:py-1.5 file:text-xs file:text-[var(--c-text-soft)]"
                      />
                      <button
                        type="submit"
                        className="flex-none rounded-lg border border-[var(--c-line-strong)] px-3 py-1.5 text-xs text-[var(--c-text-soft)] transition-colors hover:border-[var(--c-bronze)]/50 hover:text-[var(--c-bronze)]"
                      >
                        {CONSOLE_UI.uploadAction[locale]}
                      </button>
                    </div>
                  </form>
                ))}
              </div>
              <p className="mt-2 text-[10px] leading-relaxed text-[var(--c-text-faint)]">
                {CONSOLE_UI.uploadToSceneHint[locale]}
              </p>
            </section>
          ) : null}
        </aside>
      </div>
    </ConsoleShell>
  );
};

export default ConsoleEventPage;
