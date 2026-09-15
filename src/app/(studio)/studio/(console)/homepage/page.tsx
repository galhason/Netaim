import Link from 'next/link';
import { LOCALE_LABELS, SUPPORTED_LOCALES, type Locale } from '@/config/locales';
import { listMedia } from '@/features/events';
import {
  buildOpeningDescriptor,
  getHomepageDraft,
  getOpening,
} from '@/features/opening';
import {
  CONSOLE_SCENE_LABELS,
  CONSOLE_UI,
  CMediaMultiPicker,
  CMediaPicker,
  CSaveButton,
  CTextAreaField,
  CTextField,
  ConsoleCanvas,
  ConsoleShell,
  HOMEPAGE_SCENE_GROUPS,
  getStudioCreator,
  getStudioLocale,
} from '@/features/studio';
import { resolveScene } from '@/experience-runtime';
import { saveHomepageAction } from '../../actions';
import {
  moveHomepageSceneAction,
  toggleHomepageSceneAction,
} from '../actions';

/*
 * The Opening's workspace: the real site as the canvas, the composition
 * on the filmstrip, and an inspector that edits the scene the director
 * selected. One Runtime renders everything the iframe shows
 * (Constitution v2 §1, §5, §12).
 */
interface ConsoleHomepageProps {
  searchParams: Promise<{ content?: string; scene?: string }>;
}

const FIELD_LABELS = {
  titleMain: { he: 'כותרת ראשית', en: 'Main title' },
  titleAccent: { he: 'כותרת מודגשת', en: 'Accent title' },
  subtitle: { he: 'כותרת משנה', en: 'Subtitle' },
  image: { he: 'תמונה', en: 'Image' },
  eventsTitle: { he: 'כותרת המדור', en: 'Section title' },
  eventsSubtitle: { he: 'תיאור המדור', en: 'Section subtitle' },
  eyebrow: { he: 'שורת פתיח', en: 'Eyebrow' },
  paragraph: { he: 'פסקה', en: 'Paragraph' },
  momentsTitle: { he: 'כותרת הרגעים', en: 'Moments title' },
  cta: { he: 'קריאה לפעולה', en: 'Call to action' },
  noImage: { he: 'ללא תמונה', en: 'No image' },
  video: { he: 'סרטון רקע', en: 'Background video' },
  noVideo: { he: 'ללא סרטון', en: 'No video' },
  videoHint: {
    he: 'מתנגן בלולאה, מושתק, מאחורי הכותרת. התמונה נשארת — היא מה שרואים עד שהסרטון נטען, ומה שרואים במקומו אם המבקר ביקש פחות תנועה.',
    en: 'Loops silently behind the title. The image stays — it is what shows until the video loads, and instead of it for a visitor who asked for less motion.',
  },
} satisfies Record<string, Record<Locale, string>>;

const ConsoleHomepage = async ({ searchParams }: ConsoleHomepageProps) => {
  const { content: contentParam, scene: sceneParam } = await searchParams;
  const locale = await getStudioLocale();
  const creator = await getStudioCreator();
  const contentLocale: Locale =
    contentParam === 'en' || contentParam === 'he' ? contentParam : 'he';

  const [opening, draft, media] = await Promise.all([
    getOpening(contentLocale),
    getHomepageDraft(contentLocale),
    listMedia().catch(() => []),
  ]);

  const descriptor = buildOpeningDescriptor(opening, contentLocale);
  const selectedScene =
    descriptor.scenes.find((scene) => scene.id === sceneParam) ??
    descriptor.scenes.find((scene) => HOMEPAGE_SCENE_GROUPS[scene.type]);
  const group = selectedScene
    ? (HOMEPAGE_SCENE_GROUPS[selectedScene.type] ?? 'none')
    : 'none';
  const noImage = FIELD_LABELS.noImage[locale];
  const noVideo = FIELD_LABELS.noVideo[locale];
  const sceneHref = (sceneId: string) =>
    `/studio/homepage?content=${contentLocale}&scene=${sceneId}`;

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
          <span className="font-medium text-[var(--c-text)]">
            {CONSOLE_UI.homepageName[locale]}
          </span>
        </>
      }
      actions={
        <nav
          aria-label={CONSOLE_UI.contentLanguage[locale]}
          className="flex items-center gap-2 text-xs"
        >
          {/*
            * The one control that decides which language is being
            * written. It used to be a bare pair of links — "עברית / EN"
            * — sitting a few centimetres from the interface-language
            * buttons, which are also "עברית / EN". Nothing said which
            * was which, so an editor switched the interface, kept
            * writing Hebrew, and watched the English page change too
            * (it inherits Hebrew until English is written). Hence the
            * label, the box and the filled state: this is a switch, not
            * a link, and it says what it switches.
            */}
          <span className="flex items-center gap-1.5 rounded-lg border border-[var(--c-line-strong)] bg-[rgba(6,10,16,0.6)] px-2 py-1">
            <span className="text-[9.5px] font-medium tracking-[0.14em] text-[var(--c-text-faint)]">
              {CONSOLE_UI.contentLanguage[locale].toUpperCase()}
            </span>
            {SUPPORTED_LOCALES.map((entry) => (
              <a
                key={entry}
                href={`/studio/homepage?content=${entry}`}
                aria-current={entry === contentLocale ? 'true' : undefined}
                className={
                  entry === contentLocale
                    ? 'rounded-md bg-[var(--c-bronze)] px-2 py-0.5 font-semibold text-[#161006]'
                    : 'rounded-md px-2 py-0.5 text-[var(--c-text-soft)] transition-colors hover:text-[var(--c-text)]'
                }
              >
                {LOCALE_LABELS[entry]}
              </a>
            ))}
          </span>
        </nav>
      }
    >
      {contentLocale !== 'he' ? (
        <p className="mx-4 mt-3 rounded-xl border border-[var(--c-bronze)]/40 bg-[var(--c-bronze)]/10 px-4 py-2.5 text-xs text-[var(--c-bronze)]">
          {CONSOLE_UI.inheritedNote[locale]}
        </p>
      ) : null}
      <div className="flex h-full min-h-0 gap-4 p-4">
        <aside className="flex w-40 flex-none flex-col gap-1 overflow-y-auto rounded-xl border border-[var(--c-line)] bg-[var(--c-glass)] p-3">
          <p className="mb-1 px-1 text-[10px] font-medium tracking-[0.2em] text-[var(--c-text-faint)]">
            {CONSOLE_UI.scenes[locale]}
          </p>
          {descriptor.scenes.map((scene, index) => {
            const selected = scene.id === selectedScene?.id;
            const flow = (resolveScene(scene.type)?.placement ?? 'flow') === 'flow';
            const hidden = scene.hidden === true;
            return (
              <div key={scene.id} className="group/scene">
                <Link
                  href={sceneHref(scene.id)}
                  aria-current={selected ? 'true' : undefined}
                  className={`flex items-baseline gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors ${
                    selected
                      ? 'border border-[var(--c-bronze)]/50 bg-[var(--c-bronze)]/10 text-[var(--c-bronze)]'
                      : 'text-[var(--c-text-soft)] hover:bg-white/5 hover:text-[var(--c-text)]'
                  } ${hidden ? 'opacity-50' : ''}`}
                >
                  <span className="text-[10px] tabular-nums text-[var(--c-text-faint)]">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className={hidden ? 'line-through decoration-[0.5px]' : ''}>
                    {CONSOLE_SCENE_LABELS[scene.type]?.[locale] ?? scene.type}
                  </span>
                </Link>
                {flow ? (
                  <div className="flex justify-end gap-1 px-1 opacity-0 transition-opacity group-focus-within/scene:opacity-100 group-hover/scene:opacity-100">
                    <form action={moveHomepageSceneAction}>
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
                    <form action={moveHomepageSceneAction}>
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
                    <form action={toggleHomepageSceneAction}>
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
                ) : null}
              </div>
            );
          })}
        </aside>

        <ConsoleCanvas
          src={`/${contentLocale}`}
          title={CONSOLE_UI.homepageName[locale]}
          locale={locale}
        />

        <aside className="flex w-72 flex-none flex-col overflow-y-auto rounded-xl border border-[var(--c-line)] bg-[var(--c-glass)] p-4">
          <h2 className="font-medium">
            {selectedScene
              ? (CONSOLE_SCENE_LABELS[selectedScene.type]?.[locale] ??
                selectedScene.type)
              : CONSOLE_UI.scenes[locale]}
          </h2>
          <p className="mb-4 mt-0.5 text-[10px] tracking-[0.14em] text-[var(--c-text-faint)]">
            {selectedScene?.type.toUpperCase()}
          </p>

          {group === 'none' ? (
            <p className="text-sm text-[var(--c-text-soft)]">
              {CONSOLE_UI.inspectorEmpty[locale]}
            </p>
          ) : null}

          {group === 'featured' ? (
            <div className="flex flex-col gap-3 text-sm text-[var(--c-text-soft)]">
              <p>{CONSOLE_UI.editedInEvent[locale]}</p>
              {opening.posters[0]?.slug ? (
                <Link
                  href={`/studio/experiences/${opening.posters[0].slug}`}
                  className="text-[var(--c-bronze)] underline underline-offset-4"
                >
                  {CONSOLE_UI.toEventEditor[locale]}
                </Link>
              ) : null}
            </div>
          ) : null}

          {group !== 'none' && group !== 'featured' ? (
            <form action={saveHomepageAction} className="flex flex-col gap-4">
              <input type="hidden" name="contentLocale" value={contentLocale} />
              {group === 'hero' ? (
                <>
                  <CTextField
                    name="heroTitleMain"
                    label={FIELD_LABELS.titleMain[locale]}
                    defaultValue={draft?.hero.titleMain}
                  />
                  <CTextField
                    name="heroTitleAccent"
                    label={FIELD_LABELS.titleAccent[locale]}
                    defaultValue={draft?.hero.titleAccent}
                  />
                  <CTextAreaField
                    name="heroSubtitle"
                    label={FIELD_LABELS.subtitle[locale]}
                    defaultValue={draft?.hero.subtitle}
                  />
                  <CMediaPicker
                    name="heroImageId"
                    label={FIELD_LABELS.image[locale]}
                    defaultValue={draft?.hero.imageId}
                    media={media}
                    emptyLabel={noImage}
                    kind="image"
                  />
                  <CMediaPicker
                    name="heroVideoId"
                    label={FIELD_LABELS.video[locale]}
                    defaultValue={draft?.hero.videoId}
                    media={media}
                    emptyLabel={noVideo}
                    kind="video"
                  />
                  <p className="-mt-2 text-[10px] leading-relaxed text-[var(--c-text-faint)]">
                    {FIELD_LABELS.videoHint[locale]}
                  </p>
                </>
              ) : null}
              {group === 'events' ? (
                <>
                  <CTextField
                    name="eventsTitle"
                    label={FIELD_LABELS.eventsTitle[locale]}
                    defaultValue={draft?.events.title}
                  />
                  <CTextField
                    name="eventsSubtitle"
                    label={FIELD_LABELS.eventsSubtitle[locale]}
                    defaultValue={draft?.events.subtitle}
                  />
                </>
              ) : null}
              {group === 'story' ? (
                <>
                  <CTextField
                    name="storyEyebrow"
                    label={FIELD_LABELS.eyebrow[locale]}
                    defaultValue={draft?.story.eyebrow}
                  />
                  <CTextField
                    name="storyTitle"
                    label={FIELD_LABELS.titleMain[locale]}
                    defaultValue={draft?.story.title}
                  />
                  <CTextAreaField
                    name="storyParagraph"
                    label={FIELD_LABELS.paragraph[locale]}
                    defaultValue={draft?.story.paragraph}
                  />
                  <CMediaPicker
                    name="storyImageId"
                    label={FIELD_LABELS.image[locale]}
                    defaultValue={draft?.story.imageId}
                    media={media}
                    emptyLabel={noImage}
                    kind="image"
                  />
                </>
              ) : null}
              {group === 'moments' ? (
                <>
                  <CTextField
                    name="momentsTitle"
                    label={FIELD_LABELS.momentsTitle[locale]}
                    defaultValue={draft?.moments.title}
                  />
                  <input type="hidden" name="momentsImagesSubmitted" value="1" />
                  <CMediaMultiPicker
                    name="momentsImageIds"
                    label={CONSOLE_UI.momentsImages[locale]}
                    hint={CONSOLE_UI.momentsHint[locale]}
                    defaultValues={draft?.moments.imageIds ?? []}
                    media={media}
                  />
                </>
              ) : null}
              {group === 'closing' ? (
                <>
                  <CTextField
                    name="closingTitle"
                    label={FIELD_LABELS.titleMain[locale]}
                    defaultValue={draft?.closing.title}
                  />
                  <CTextAreaField
                    name="closingSubtitle"
                    label={FIELD_LABELS.subtitle[locale]}
                    defaultValue={draft?.closing.subtitle}
                  />
                  <CTextField
                    name="closingCta"
                    label={FIELD_LABELS.cta[locale]}
                    defaultValue={draft?.closing.cta}
                  />
                </>
              ) : null}
              <CSaveButton label={CONSOLE_UI.saveAndPublish[locale]} />
              <p className="text-[11px] leading-relaxed text-[var(--c-text-faint)]">
                {CONSOLE_UI.savedNote[locale]}
              </p>
            </form>
          ) : null}
        </aside>
      </div>
    </ConsoleShell>
  );
};

/*
 * The response depends on who is asking, so it is rendered per request
 * and never prerendered or shared. Declared rather than left to Next to
 * infer from a cookie read: an inferred guard disappears the moment a
 * refactor moves that read behind a helper, and the failure would be a
 * privacy leak that nothing announces.
 */
export const dynamic = 'force-dynamic';

export default ConsoleHomepage;
