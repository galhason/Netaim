import Link from 'next/link';
import type { ReactNode } from 'react';
import type { Locale } from '@/config/locales';
import { SUPPORTED_LOCALES } from '@/config/locales';
import { listMedia } from '@/features/events';
import { formatDuration, listGalleryItems } from '@/features/gallery';
import type { GalleryItemSummary, GalleryPlacement } from '@/features/gallery';
import { CMediaPicker } from '@/features/studio';
import {
  addGalleryItemAction,
  addGalleryItemsAction,
  moveGalleryItemAction,
  placeGalleryItemAction,
  removeGalleryItemAction,
  setGalleryItemPublishedAction,
  updateGalleryItemAction,
} from './actions';
import { GalleryFrame, galleryContext } from './gallery-frame';
import GalleryUploader from './gallery-uploader';

const t = (he: string, en: string): Record<Locale, string> => ({ he, en });

const UI = {
  title: t('בגלריה', 'In the gallery'),
  sub: t(
    'הגלריה מסודרת כאן לפי סדר העמוד: תמונת הפתיחה, הרשת הראשית, הסרטון בפס הירוק, ומה שבהמשך. כל מקום נבחר ידנית.',
    'The gallery is laid out here in page order: the opening photo, the main grid, the film in the green band, and what follows. Every place is chosen by hand.',
  ),
  viewOnSite: t('צפייה בעמוד', 'View the page'),
  fromLibrary: t('הוספה מספריית המדיה', 'Add from the media library'),
  file: t('קובץ', 'File'),
  fileEmpty: t('לא נבחר', 'None chosen'),
  upload: t('העלאה', 'Upload'),
  add: t('הוספה', 'Add'),
  into: t('אל', 'Into'),
  zones: {
    hero: t('תמונת הפתיחה', 'Opening photo'),
    story: t('הרשת הראשית', 'The main grid'),
    film: t('הסרטון בפס הירוק', 'Film in the green band'),
    more: t('בהמשך העמוד', 'Further down'),
  } as Record<GalleryPlacement, Record<Locale, string>>,
  zoneHints: {
    hero: t('התמונה הגדולה שבראש העמוד. בלי בחירה — העמוד נפתח על רקע ירוק.', 'The large photo at the top of the page. With none chosen, the page opens on green.'),
    story: t('התמונות והסרטונים שמעל הפס הירוק.', 'The photos and films above the green band.'),
    film: t('הסרטון שבפס הירוק. בלי בחירה — הפס לא מוצג.', 'The film in the green band. With none chosen, the band is not shown.'),
    more: t('ממשיך אחרי הפס הירוק. תמונות שמשתתפים שלחו ואושרו נכנסות לכאן.', 'Continues after the green band. Approved participant photos land here.'),
  } as Record<GalleryPlacement, Record<Locale, string>>,
  choose: { hero: t('בחירת תמונה', 'Choose a photo'), film: t('בחירת סרטון', 'Choose a film') },
  replace: { hero: t('החלפת התמונה', 'Change the photo'), film: t('החלפת הסרטון', 'Change the film') },
  noCandidates: {
    hero: t('אין עדיין תמונות בגלריה. העלו תמונה ואז בחרו אותה כאן.', 'No photos in the gallery yet. Upload one, then choose it here.'),
    film: t('אין עדיין סרטונים בגלריה. העלו סרטון ואז בחרו אותו כאן.', 'No films in the gallery yet. Upload one, then choose it here.'),
  },
  noneChosen: { hero: t('לא נבחרה תמונת פתיחה', 'No opening photo chosen'), film: t('לא נבחר סרטון', 'No film chosen') },
  clearSlot: t('הוצאה לרשת הראשית', 'Move to the main grid'),
  emptyGrid: t('אין כאן עדיין כלום.', 'Nothing here yet.'),
  earlier: t('מוקדם יותר', 'Earlier'),
  later: t('מאוחר יותר', 'Later'),
  show: t('הצגה באתר', 'Show on the site'),
  hide: t('הסתרה מהאתר', 'Hide from the site'),
  toMore: t('העברה להמשך העמוד', 'Move further down'),
  toStory: t('העברה לרשת הראשית', 'Move to the main grid'),
  edit: t('עריכה', 'Edit'),
  hidden: t('מוסתר', 'Hidden'),
  video: t('סרטון', 'Film'),
  untitled: t('ללא כותרת', 'Untitled'),
  missing: t('הקובץ נמחק מהספרייה', 'The file was deleted from the library'),
  editor: {
    title: t('עריכת פריט', 'Edit item'),
    close: t('סגירה', 'Close'),
    place: t('מיקום בעמוד', 'Place on the page'),
    words: { he: t('עברית', 'Hebrew'), en: t('אנגלית', 'English') } as Record<Locale, Record<Locale, string>>,
    itemTitle: t('כותרת', 'Title'),
    caption: t('כיתוב', 'Caption'),
    alt: t('טקסט חלופי (נגישות)', 'Alt text (accessibility)'),
    altHint: t('מה רואים בתמונה. ריק — הטקסט החלופי של הקובץ.', 'What the picture shows. Empty — the file’s own alt text.'),
    credit: t('קרדיט צילום', 'Photo credit'),
    duration: t('משך הסרטון', 'Film length'),
    poster: t('תמונת תצוגה לסרטון', 'Film still'),
    posterEmpty: t('ללא', 'None'),
    published: t('מוצג באתר', 'Shown on the site'),
    file: t('החלפת הקובץ', 'Replace the file'),
    save: t('שמירה', 'Save'),
    remove: t('הסרה מהגלריה', 'Remove from the gallery'),
    removeHint: t('הקובץ נשאר בספריית המדיה.', 'The file stays in the media library.'),
  },
  notices: {
    added: t('נוסף לגלריה.', 'Added to the gallery.'),
    saved: t('נשמר.', 'Saved.'),
    placed: t('המיקום עודכן.', 'Placed.'),
    removed: t('הוסר מהגלריה. הקובץ נשאר בספריית המדיה.', 'Removed from the gallery. The file stays in the media library.'),
    published: t('מוצג באתר.', 'Now shown on the site.'),
    hidden: t('הוסתר מהאתר.', 'Hidden from the site.'),
    'media-required': t('בחרו קובץ ונסו שוב.', 'Choose a file and try again.'),
    'wrong-kind': t('לתמונת הפתיחה בוחרים תמונה, ולפס הירוק — סרטון.', 'The opening needs a photo, and the green band a film.'),
    failed: t('השמירה לא הצליחה. נסו שוב.', 'Saving did not work. Try again.'),
  } as Record<string, Record<Locale, string>>,
};

const CARD = 'rounded-lg border border-[var(--c-line)] bg-[var(--c-panel)]';
const INPUT = 'w-full rounded-md border border-[var(--c-line)] bg-[rgba(7,19,36,0.55)] px-3 py-2 text-sm text-[var(--c-text)] outline-none focus:border-[var(--c-bronze)]';
const LABEL = 'mb-1 block text-[11px] font-medium tracking-[0.08em] text-[var(--c-text-soft)]';
const HINT = 'mt-1 block text-[11px] text-[var(--c-text-faint)]';
const BTN = 'inline-flex min-h-9 items-center rounded-md border border-[var(--c-line-strong)] px-3 text-sm text-[var(--c-text)] hover:border-[var(--c-bronze)] hover:text-[var(--c-bronze)]';
const BTN_PRIMARY = 'inline-flex min-h-9 items-center rounded-md bg-[var(--c-bronze)] px-4 text-sm font-semibold text-[var(--c-on-accent)] hover:bg-[var(--c-bronze-hover)]';
const ICON = 'grid size-8 place-items-center rounded-md text-[var(--c-text-soft)] hover:bg-[rgba(255,255,255,0.08)] hover:text-[var(--c-text)] disabled:pointer-events-none disabled:opacity-30';

const Icon = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);
const PATHS = {
  earlier: 'M15 6l-6 6 6 6',
  later: 'M9 6l6 6-6 6',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zm10 3a3 3 0 100-6 3 3 0 000 6z',
  eyeOff: 'M3 3l18 18M10.6 5.1A10.9 10.9 0 0112 5c6.5 0 10 7 10 7a17 17 0 01-3.2 4.2M6.6 6.6A17 17 0 002 12s3.5 7 10 7a10 10 0 005.4-1.6M9.9 9.9a3 3 0 004.2 4.2',
  swap: 'M7 4v14m0 0l-3-3m3 3l3-3M17 20V6m0 0l-3 3m3-3l3 3',
  edit: 'M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4',
};

/* The picture of an item: the photo, the film's still, or its first frame. */
const Thumb = ({ item, className }: { item: GalleryItemSummary; className: string }) => {
  if (!item.mediaUrl) {
    return <span className={`${className} grid place-items-center bg-[rgba(255,255,255,0.06)] text-[10px] text-[var(--c-text-faint)]`}>—</span>;
  }
  if (item.kind === 'video' && !item.posterUrl) {
    return <video src={`${item.mediaUrl}#t=0.1`} muted playsInline preload="metadata" aria-hidden="true" className={`${className} bg-black object-cover`} />;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={item.kind === 'video' ? item.posterUrl : item.mediaUrl} alt="" className={`${className} object-cover`} />;
};

const titleOf = (item: GalleryItemSummary, locale: Locale): string =>
  item.words[locale].title || item.words.he.title || item.words.en.title || '';

/* A one-button form: the Studio's actions all take the conference and the item. */
const Act = ({
  action,
  slug,
  id,
  fields = {},
  label,
  className,
  disabled,
  children,
}: {
  action: (formData: FormData) => Promise<void>;
  slug: string;
  id: string;
  fields?: Record<string, string>;
  label: string;
  className: string;
  disabled?: boolean;
  children: ReactNode;
}) => (
  <form action={action}>
    <input type="hidden" name="slug" value={slug} />
    <input type="hidden" name="id" value={id} />
    {Object.entries(fields).map(([name, value]) => (
      <input key={name} type="hidden" name={name} value={value} />
    ))}
    <button type="submit" className={className} aria-label={label} title={label} disabled={disabled}>
      {children}
    </button>
  </form>
);

/* One item in a grid: its picture opens the editor; the row beneath does the rest. */
const ItemCard = ({
  item,
  slug,
  locale,
  first,
  last,
  editing,
}: {
  item: GalleryItemSummary;
  slug: string;
  locale: Locale;
  first: boolean;
  last: boolean;
  editing: boolean;
}) => {
  const other = item.placement === 'more' ? 'story' : 'more';
  return (
    <li id={`item-${item.id}`} className={`${CARD} overflow-hidden ${editing ? 'ring-2 ring-[var(--c-bronze)]' : ''}`}>
      <Link href={`?edit=${item.id}#editor`} scroll={false} className="relative block" aria-label={`${UI.edit[locale]}: ${titleOf(item, locale) || UI.untitled[locale]}`}>
        <Thumb item={item} className={`aspect-[4/3] w-full ${item.published ? '' : 'opacity-40'}`} />
        <span className="absolute start-2 top-2 flex gap-1">
          {item.kind === 'video' ? <span className="rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white">{UI.video[locale]}{item.durationSeconds ? ` · ${formatDuration(item.durationSeconds)}` : ''}</span> : null}
          {!item.published ? <span className="rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white">{UI.hidden[locale]}</span> : null}
        </span>
      </Link>
      {titleOf(item, locale) || !item.mediaUrl ? (
        <div className="px-2.5 pt-2">
          {titleOf(item, locale) ? <p className="truncate text-xs text-[var(--c-text)]">{titleOf(item, locale)}</p> : null}
          {!item.mediaUrl ? <p className="text-[10px] text-[var(--c-bronze)]">{UI.missing[locale]}</p> : null}
        </div>
      ) : null}
      <div className="flex items-center gap-0.5 px-1.5 pb-1.5 pt-1">
        <Act action={moveGalleryItemAction} slug={slug} id={item.id} fields={{ direction: 'up' }} label={UI.earlier[locale]} className={ICON} disabled={first}>
          <span className="ltr:-scale-x-100"><Icon d={PATHS.later} /></span>
        </Act>
        <Act action={moveGalleryItemAction} slug={slug} id={item.id} fields={{ direction: 'down' }} label={UI.later[locale]} className={ICON} disabled={last}>
          <span className="ltr:-scale-x-100"><Icon d={PATHS.earlier} /></span>
        </Act>
        <span className="flex-1" />
        <Act action={setGalleryItemPublishedAction} slug={slug} id={item.id} fields={{ published: item.published ? 'false' : 'true' }} label={item.published ? UI.hide[locale] : UI.show[locale]} className={ICON}>
          <Icon d={item.published ? PATHS.eye : PATHS.eyeOff} />
        </Act>
        <Act action={placeGalleryItemAction} slug={slug} id={item.id} fields={{ placement: other }} label={other === 'more' ? UI.toMore[locale] : UI.toStory[locale]} className={ICON}>
          <Icon d={PATHS.swap} />
        </Act>
        <Link href={`?edit=${item.id}#editor`} scroll={false} className={ICON} aria-label={UI.edit[locale]} title={UI.edit[locale]}>
          <Icon d={PATHS.edit} />
        </Link>
      </div>
    </li>
  );
};

/* A single place — the opening photo or the film — and the picker that fills it. */
const Slot = ({
  zone,
  holder,
  candidates,
  slug,
  locale,
}: {
  zone: 'hero' | 'film';
  holder?: GalleryItemSummary;
  candidates: GalleryItemSummary[];
  slug: string;
  locale: Locale;
}) => (
  <section id={`zone-${zone}`} className={`${CARD} p-4`} aria-labelledby={`zone-${zone}-title`}>
    <div className="flex flex-wrap items-start gap-4">
      <div className={`${zone === 'hero' ? 'aspect-[16/7] w-full sm:w-72' : 'aspect-video w-full sm:w-56'} shrink-0 overflow-hidden rounded-md bg-[rgba(255,255,255,0.04)]`}>
        {holder ? (
          <Link href={`?edit=${holder.id}#editor`} scroll={false} aria-label={UI.edit[locale]}>
            <Thumb item={holder} className="size-full" />
          </Link>
        ) : (
          <span className="grid size-full place-items-center border border-dashed border-[var(--c-line)] px-3 text-center text-xs text-[var(--c-text-faint)]">
            {UI.noneChosen[zone][locale]}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <h3 id={`zone-${zone}-title`} className="text-sm font-semibold text-[var(--c-text)]">{UI.zones[zone][locale]}</h3>
        <p className={HINT}>{UI.zoneHints[zone][locale]}</p>
        <details className="group mt-3">
          <summary className={`${BTN} cursor-pointer list-none`}>{holder ? UI.replace[zone][locale] : UI.choose[zone][locale]}</summary>
          {candidates.length === 0 ? (
            <p className="mt-2 text-xs text-[var(--c-text-soft)]">{UI.noCandidates[zone][locale]}</p>
          ) : (
            <ul className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">
              {candidates.map((item) => (
                <li key={item.id}>
                  <Act action={placeGalleryItemAction} slug={slug} id={item.id} fields={{ placement: zone }} label={`${UI.choose[zone][locale]}: ${titleOf(item, locale) || UI.untitled[locale]}`} className="block w-full overflow-hidden rounded-md ring-[var(--c-bronze)] hover:ring-2 focus-visible:ring-2">
                    <Thumb item={item} className="aspect-square w-full" />
                  </Act>
                </li>
              ))}
            </ul>
          )}
        </details>
        {holder ? (
          <div className="mt-2">
            <Act action={placeGalleryItemAction} slug={slug} id={holder.id} fields={{ placement: 'story' }} label={UI.clearSlot[locale]} className="text-xs text-[var(--c-text-soft)] underline-offset-2 hover:text-[var(--c-text)] hover:underline">
              {UI.clearSlot[locale]}
            </Act>
          </div>
        ) : null}
      </div>
    </div>
  </section>
);

const Grid = ({ zone, items, slug, locale, editId }: { zone: 'story' | 'more'; items: GalleryItemSummary[]; slug: string; locale: Locale; editId?: string }) => (
  <section id={`zone-${zone}`} aria-labelledby={`zone-${zone}-title`}>
    <div className="mb-2 flex items-baseline gap-2">
      <h3 id={`zone-${zone}-title`} className="text-sm font-semibold text-[var(--c-text)]">{UI.zones[zone][locale]}</h3>
      <span className="text-xs text-[var(--c-text-faint)]">{items.length}</span>
    </div>
    <p className={`${HINT} -mt-1 mb-3`}>{UI.zoneHints[zone][locale]}</p>
    {items.length === 0 ? (
      <p className="rounded-lg border border-dashed border-[var(--c-line)] px-4 py-6 text-center text-xs text-[var(--c-text-faint)]">{UI.emptyGrid[locale]}</p>
    ) : (
      <ol className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 xl:grid-cols-5">
        {items.map((item, index) => (
          <ItemCard key={item.id} item={item} slug={slug} locale={locale} first={index === 0} last={index === items.length - 1} editing={item.id === editId} />
        ))}
      </ol>
    )}
  </section>
);

/* The editor for one item, beside the board. */
const Editor = ({ item, slug, locale, media }: { item: GalleryItemSummary; slug: string; locale: Locale; media: Awaited<ReturnType<typeof listMedia>> }) => {
  const words = UI.editor;
  const images = media.filter((entry) => !entry.mimeType?.startsWith('video/'));
  const places: GalleryPlacement[] = item.kind === 'video' ? ['story', 'film', 'more'] : ['hero', 'story', 'more'];
  return (
    <aside id="editor" className={`${CARD} p-4 lg:sticky lg:top-4`} aria-labelledby="editor-title">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 id="editor-title" className="text-sm font-semibold text-[var(--c-text)]">{words.title[locale]}</h3>
        <Link href="?" scroll={false} className="text-xs text-[var(--c-text-soft)] hover:text-[var(--c-text)]">{words.close[locale]}</Link>
      </div>
      <Thumb item={item} className="mb-3 aspect-video w-full rounded-md" />
      <form action={updateGalleryItemAction} className="flex flex-col gap-3">
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="id" value={item.id} />
        <fieldset>
          <legend className={LABEL}>{words.place[locale]}</legend>
          <div className="flex flex-wrap gap-1">
            {places.map((place) => (
              <label key={place} className="cursor-pointer">
                <input type="radio" name="placement" value={place} defaultChecked={item.placement === place} className="peer sr-only" />
                <span className="inline-flex min-h-8 items-center rounded-full border border-[var(--c-line-strong)] px-3 text-xs text-[var(--c-text-soft)] peer-checked:border-[var(--c-bronze)] peer-checked:text-[var(--c-bronze)] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-[var(--c-bronze)]">
                  {UI.zones[place][locale]}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        {SUPPORTED_LOCALES.map((lang) => (
          <fieldset key={lang} className="rounded-md border border-[var(--c-line)] p-3" dir={lang === 'he' ? 'rtl' : 'ltr'} lang={lang}>
            <legend className="px-1 text-[11px] font-semibold text-[var(--c-text-soft)]">{words.words[lang][lang]}</legend>
            <label className="block">
              <span className={LABEL}>{words.itemTitle[lang]}</span>
              <input name={`title_${lang}`} defaultValue={item.words[lang].title} className={INPUT} />
            </label>
            <label className="mt-2 block">
              <span className={LABEL}>{words.caption[lang]}</span>
              <textarea name={`caption_${lang}`} defaultValue={item.words[lang].caption} rows={2} className={INPUT} />
            </label>
            <label className="mt-2 block">
              <span className={LABEL}>{words.alt[lang]}</span>
              <input name={`alt_${lang}`} defaultValue={item.words[lang].alt} className={INPUT} />
              <span className={HINT}>{words.altHint[lang]}</span>
            </label>
          </fieldset>
        ))}
        <div className={`grid gap-3 ${item.kind === 'video' ? 'grid-cols-2' : ''}`}>
          <label className="block">
            <span className={LABEL}>{words.credit[locale]}</span>
            <input name="credit" defaultValue={item.credit} dir="auto" className={INPUT} />
          </label>
          {item.kind === 'video' ? (
            <label className="block">
              <span className={LABEL}>{words.duration[locale]}</span>
              <input name="duration" dir="ltr" inputMode="numeric" placeholder="2:14" defaultValue={formatDuration(item.durationSeconds)} className={INPUT} />
            </label>
          ) : null}
        </div>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="published" defaultChecked={item.published} className="size-4 accent-[var(--c-bronze)]" />
          <span className="text-sm text-[var(--c-text)]">{words.published[locale]}</span>
        </label>
        <details>
          <summary className="cursor-pointer text-xs text-[var(--c-text-soft)] hover:text-[var(--c-text)]">{words.file[locale]}</summary>
          <div className="mt-2 flex flex-col gap-3">
            <CMediaPicker name="mediaId" label={UI.file[locale]} defaultValue={item.mediaId ?? ''} media={media} emptyLabel={UI.fileEmpty[locale]} uploadLabel={UI.upload[locale]} locale={locale} />
            {item.kind === 'video' ? (
              <CMediaPicker name="posterId" label={words.poster[locale]} defaultValue={item.posterId ?? ''} media={images} emptyLabel={words.posterEmpty[locale]} uploadLabel={UI.upload[locale]} locale={locale} kind="image" />
            ) : null}
          </div>
        </details>
        <button type="submit" className={`${BTN_PRIMARY} justify-center`}>{words.save[locale]}</button>
      </form>
      <form action={removeGalleryItemAction} className="mt-3 border-t border-[var(--c-line)] pt-3">
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="id" value={item.id} />
        <button type="submit" className={`${BTN} w-full justify-center`}>{words.remove[locale]}</button>
        <span className={`${HINT} text-center`}>{words.removeHint[locale]}</span>
      </form>
    </aside>
  );
};

interface GalleryStudioPageProps {
  searchParams: Promise<{ notice?: string; edit?: string }>;
}

/*
 * The live conference's gallery, laid out as the page is: the opening
 * photo, the main grid, the film band and what follows — each place
 * chosen here, by hand. Participants' photographs wait on the next tab
 * until approved; approved ones land further down.
 */
const GalleryStudioPage = async ({ searchParams }: GalleryStudioPageProps) => {
  const gate = await galleryContext();
  if (!gate.ok) {
    return gate.screen;
  }
  const { locale, slug } = gate.context;
  const { notice, edit } = await searchParams;
  const [items, media] = await Promise.all([
    listGalleryItems(slug).catch(() => [] as GalleryItemSummary[]),
    listMedia().catch(() => []),
  ]);
  const placed = (placement: GalleryPlacement) => items.filter((item) => item.placement === placement);
  const hero = placed('hero').find((item) => item.kind === 'image');
  const film = placed('film').find((item) => item.kind === 'video');
  const photos = items.filter((item) => item.kind === 'image' && item !== hero);
  const films = items.filter((item) => item.kind === 'video' && item !== film);
  const editing = edit ? items.find((item) => item.id === edit) : undefined;
  const publicPage = `/${locale}/events/${encodeURIComponent(slug)}/gallery`;

  return (
    <GalleryFrame context={gate.context} current="curated" title={UI.title[locale]}>
      <div className="mx-auto flex max-w-6xl flex-col gap-5 px-6 py-6">
        <header className="flex flex-wrap items-start gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-[var(--c-text)]">{UI.title[locale]}</h2>
            <p className="mt-1 max-w-2xl text-xs text-[var(--c-text-soft)]">{UI.sub[locale]}</p>
          </div>
          <a href={publicPage} target="_blank" rel="noreferrer" className={BTN}>{UI.viewOnSite[locale]}</a>
        </header>

        {notice && UI.notices[notice] ? (
          <p role="status" className="rounded-md border border-[var(--c-line)] bg-[var(--c-panel)] px-4 py-2 text-sm">{UI.notices[notice]![locale]}</p>
        ) : null}

        <div className={`${CARD} flex flex-col gap-3 p-4`}>
          <GalleryUploader slug={slug} locale={locale} action={addGalleryItemsAction} />
          <details>
            <summary className="cursor-pointer text-xs text-[var(--c-text-soft)] hover:text-[var(--c-text)]">{UI.fromLibrary[locale]}</summary>
            <form action={addGalleryItemAction} className="mt-3 grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
              <input type="hidden" name="slug" value={slug} />
              <CMediaPicker name="mediaId" label={UI.file[locale]} defaultValue="" media={media} emptyLabel={UI.fileEmpty[locale]} uploadLabel={UI.upload[locale]} locale={locale} />
              <div className="flex flex-col gap-2">
                <label className="block">
                  <span className={LABEL}>{UI.into[locale]}</span>
                  <select name="placement" defaultValue="story" className={INPUT}>
                    <option value="story">{UI.zones.story[locale]}</option>
                    <option value="more">{UI.zones.more[locale]}</option>
                  </select>
                </label>
                <button type="submit" className={BTN_PRIMARY}>{UI.add[locale]}</button>
              </div>
            </form>
          </details>
        </div>

        <div className={`grid items-start gap-5 ${editing ? 'lg:grid-cols-[minmax(0,1fr)_360px]' : ''}`}>
          <div className="flex min-w-0 flex-col gap-6">
            <Slot zone="hero" holder={hero} candidates={photos} slug={slug} locale={locale} />
            <Grid zone="story" items={placed('story')} slug={slug} locale={locale} editId={editing?.id} />
            <Slot zone="film" holder={film} candidates={films} slug={slug} locale={locale} />
            <Grid zone="more" items={placed('more')} slug={slug} locale={locale} editId={editing?.id} />
          </div>
          {editing ? <Editor item={editing} slug={slug} locale={locale} media={media} /> : null}
        </div>
      </div>
    </GalleryFrame>
  );
};

export const dynamic = 'force-dynamic';

export default GalleryStudioPage;
