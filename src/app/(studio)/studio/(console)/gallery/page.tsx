import type { Locale } from '@/config/locales';
import { SUPPORTED_LOCALES } from '@/config/locales';
import { listMedia } from '@/features/events';
import {
  GALLERY_CATEGORIES,
  GALLERY_CATEGORY_LABELS,
  formatDuration,
  listGalleryItems,
} from '@/features/gallery';
import type { GalleryItemSummary } from '@/features/gallery';
import { CMediaPicker } from '@/features/studio';
import {
  addGalleryItemAction,
  moveGalleryItemAction,
  removeGalleryItemAction,
  setGalleryItemPublishedAction,
  updateGalleryItemAction,
} from './actions';
import { GalleryFrame, galleryContext } from './gallery-frame';

const t = (he: string, en: string): Record<Locale, string> => ({ he, en });

const UI = {
  title: t('גלריה', 'Gallery'),
  curatedTitle: t('בגלריה', 'In the gallery'),
  sub: t(
    'התמונות והסרטונים שבעמוד הגלריה של הכנס, בסדר הזה. הקבצים עצמם נשארים בספריית המדיה — כאן בוחרים מה מוצג, ומה נכתב לצדו בעברית ובאנגלית.',
    'The photos and films on the conference gallery page, in this order. The files stay in the media library — here you choose what is shown, and what is written beside it in Hebrew and English.',
  ),
  viewOnSite: t('צפייה בעמוד', 'View the page'),
  preview: t('כך זה ייראה באתר', 'How it will appear'),
  previewEmpty: t('העמוד יציג "הגלריה בדרך" עד שיפורסם פריט אחד לפחות.', 'The page shows “The gallery is on its way” until at least one item is published.'),
  hero: t('תמונת הפתיחה', 'Opening photo'),
  heroHint: t('התמונה המסומנת "מודגש" הראשונה, או התמונה הראשונה.', 'The first photo marked “Featured”, or the first photo.'),
  film: t('הסרטון בפס הירוק', 'Film in the green band'),
  filmHint: t('הסרטון המודגש הראשון, או הסרטון הראשון. בלי סרטון — הפס לא מוצג.', 'The first featured film, or the first film. No film — no band.'),
  none: t('אין', 'None'),
  story: t('ברשת הראשית', 'In the main grid'),
  more: t('בהמשך העמוד', 'Further down'),
  add: t('הוספה לגלריה', 'Add to the gallery'),
  file: t('תמונה או סרטון', 'Photo or film'),
  fileEmpty: t('לא נבחר', 'None chosen'),
  poster: t('תמונת תצוגה לסרטון', 'Film still'),
  posterHint: t('לסרטונים בלבד. בלעדיה מוצגת תמונת התצוגה של הקובץ, או הפריים הראשון.', 'Films only. Without it, the file’s own still — or its first frame — is shown.'),
  posterEmpty: t('ללא', 'None'),
  upload: t('העלאה', 'Upload'),
  words: { he: t('עברית', 'Hebrew'), en: t('אנגלית', 'English') } as Record<Locale, Record<Locale, string>>,
  itemTitle: t('כותרת', 'Title'),
  caption: t('כיתוב', 'Caption'),
  alt: t('טקסט חלופי', 'Alt text'),
  altHint: t('מה רואים בתמונה, למי שלא רואה אותה. ריק — הטקסט החלופי של הקובץ.', 'What the picture shows, for someone who cannot see it. Empty — the file’s own alt text.'),
  credit: t('קרדיט צילום', 'Photo credit'),
  category: t('קטגוריה', 'Category'),
  categoryNone: t('ללא', 'None'),
  categoryHint: t('מוצגת מעל הכיתוב כשהתמונה נפתחת במסך מלא.', 'Shown above the caption when the picture is opened full screen.'),
  duration: t('משך הסרטון', 'Film length'),
  durationHint: t('למשל 2:14', 'e.g. 2:14'),
  featured: t('מודגש', 'Featured'),
  featuredHint: t('מועמד לתמונת הפתיחה או לפס הסרטון, ומקבל כותרת על האריח.', 'A candidate for the opening photo or the film band, and shows its title on its tile.'),
  published: t('מוצג באתר', 'Shown on the site'),
  hidden: t('מוסתר', 'Hidden'),
  live: t('מוצג', 'Shown'),
  show: t('הצגה', 'Show'),
  hide: t('הסתרה', 'Hide'),
  video: t('סרטון', 'Film'),
  photo: t('תמונה', 'Photo'),
  missing: t('הקובץ נמחק מהספרייה — הפריט לא מוצג באתר', 'The file was deleted from the library — the item is not shown'),
  save: t('שמירה', 'Save'),
  edit: t('עריכת הפריט — קובץ, כיתובים, קרדיט', 'Edit the item — file, words, credit'),
  addButton: t('הוספה', 'Add'),
  remove: t('הסרה מהגלריה', 'Remove from gallery'),
  removeHint: t('הקובץ נשאר בספריית המדיה.', 'The file stays in the media library.'),
  up: t('הזזה קדימה', 'Move earlier'),
  down: t('הזזה אחורה', 'Move later'),
  position: t('מיקום', 'Position'),
  empty: t('הגלריה עדיין ריקה. הוסיפו את הפריט הראשון למטה.', 'The gallery is empty. Add the first item below.'),
  notices: {
    added: t('נוסף לגלריה.', 'Added to the gallery.'),
    saved: t('נשמר.', 'Saved.'),
    removed: t('הוסר מהגלריה. הקובץ נשאר בספריית המדיה.', 'Removed from the gallery. The file stays in the media library.'),
    published: t('מוצג באתר.', 'Now shown on the site.'),
    hidden: t('הוסתר מהאתר.', 'Hidden from the site.'),
    'media-required': t('בחרו תמונה או סרטון ושמרו שוב.', 'Choose a photo or a film and save again.'),
    failed: t('השמירה לא הצליחה. נסו שוב.', 'Saving did not work. Try again.'),
  } as Record<string, Record<Locale, string>>,
};

const CARD = 'rounded-lg border border-[var(--c-line)] bg-[var(--c-panel)] p-5';
const INPUT = 'w-full rounded-md border border-[var(--c-line)] bg-[rgba(7,19,36,0.55)] px-3 py-2 text-sm text-[var(--c-text)] outline-none focus:border-[var(--c-bronze)]';
const LABEL = 'mb-1 block text-[11px] font-medium tracking-[0.08em] text-[var(--c-text-soft)]';
const HINT = 'mt-1 block text-[11px] text-[var(--c-text-faint)]';
const BTN = 'inline-flex min-h-9 items-center rounded-md border border-[var(--c-line-strong)] px-3 text-sm text-[var(--c-text)] hover:border-[var(--c-bronze)] hover:text-[var(--c-bronze)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-[var(--c-line-strong)] disabled:hover:text-[var(--c-text)]';
const BTN_ICON = `${BTN} min-w-9 justify-center px-0 text-base leading-none`;
const BTN_PRIMARY = 'inline-flex min-h-9 items-center rounded-md bg-[var(--c-bronze)] px-4 text-sm font-semibold text-[var(--c-on-accent)] hover:bg-[var(--c-bronze-hover)]';
const BADGE = 'rounded-full px-2 py-0.5 text-[11px] font-medium';

/* The thumbnail the Studio shows for an item: the photo, the still, or the film's first frame. */
const Thumb = ({ item, className = 'h-16 w-24' }: { item: GalleryItemSummary; className?: string }) => {
  if (!item.mediaUrl) {
    return <span className={`${className} grid place-items-center rounded-md bg-[rgba(255,255,255,0.06)] text-[10px] text-[var(--c-text-faint)]`}>—</span>;
  }
  if (item.kind === 'video' && !item.posterUrl) {
    return <video src={`${item.mediaUrl}#t=0.1`} muted playsInline preload="metadata" aria-hidden="true" className={`${className} rounded-md bg-black object-cover`} />;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={item.kind === 'video' ? item.posterUrl : item.mediaUrl} alt="" className={`${className} rounded-md object-cover`} />;
};

/*
 * Which published item the page will open on, and which it will play:
 * the same rule the page applies (the first featured, else the first),
 * shown here so the choice is made knowingly.
 */
const composition = (items: GalleryItemSummary[]) => {
  const shown = items.filter((item) => item.published && item.mediaUrl);
  const photos = shown.filter((item) => item.kind === 'image');
  const films = shown.filter((item) => item.kind === 'video');
  const hero = photos.find((item) => item.featured) ?? photos[0];
  const film = films.find((item) => item.featured) ?? films[0];
  return { shown, hero, film };
};

const WordsFields = ({ item }: { item?: GalleryItemSummary }) => (
  <div className="grid gap-3 md:grid-cols-2">
    {SUPPORTED_LOCALES.map((locale) => (
      <fieldset key={locale} className="rounded-md border border-[var(--c-line)] p-3" dir={locale === 'he' ? 'rtl' : 'ltr'} lang={locale}>
        <legend className="px-1 text-[11px] font-semibold text-[var(--c-text-soft)]">{UI.words[locale][locale]}</legend>
        <label className="block">
          <span className={LABEL}>{UI.itemTitle[locale]}</span>
          <input name={`title_${locale}`} defaultValue={item?.words[locale].title ?? ''} className={INPUT} />
        </label>
        <label className="mt-2 block">
          <span className={LABEL}>{UI.caption[locale]}</span>
          <textarea name={`caption_${locale}`} defaultValue={item?.words[locale].caption ?? ''} rows={2} className={INPUT} />
        </label>
        <label className="mt-2 block">
          <span className={LABEL}>{UI.alt[locale]}</span>
          <input name={`alt_${locale}`} defaultValue={item?.words[locale].alt ?? ''} className={INPUT} />
          <span className={HINT}>{UI.altHint[locale]}</span>
        </label>
      </fieldset>
    ))}
  </div>
);

const DetailFields = ({ item, locale }: { item?: GalleryItemSummary; locale: Locale }) => (
  <div className="grid gap-3 md:grid-cols-3">
    <label className="block">
      <span className={LABEL}>{UI.credit[locale]}</span>
      <input name="credit" defaultValue={item?.credit ?? ''} dir="auto" className={INPUT} />
    </label>
    <label className="block">
      <span className={LABEL}>{UI.category[locale]}</span>
      <select name="category" defaultValue={item?.category ?? ''} className={INPUT}>
        <option value="">{UI.categoryNone[locale]}</option>
        {GALLERY_CATEGORIES.map((category) => (
          <option key={category} value={category}>
            {GALLERY_CATEGORY_LABELS[category][locale]}
          </option>
        ))}
      </select>
      <span className={HINT}>{UI.categoryHint[locale]}</span>
    </label>
    <label className="block">
      <span className={LABEL}>{UI.duration[locale]}</span>
      <input name="duration" dir="ltr" inputMode="numeric" placeholder="2:14" defaultValue={formatDuration(item?.durationSeconds)} className={INPUT} />
      <span className={HINT}>{UI.durationHint[locale]}</span>
    </label>
    <label className="flex items-start gap-2 md:col-span-3">
      <input type="checkbox" name="featured" defaultChecked={item?.featured ?? false} className="mt-1 size-4 accent-[var(--c-bronze)]" />
      <span>
        <span className="text-sm text-[var(--c-text)]">{UI.featured[locale]}</span>
        <span className={HINT}>{UI.featuredHint[locale]}</span>
      </span>
    </label>
    <label className="flex items-center gap-2 md:col-span-3">
      <input type="checkbox" name="published" defaultChecked={item ? item.published : true} className="size-4 accent-[var(--c-bronze)]" />
      <span className="text-sm text-[var(--c-text)]">{UI.published[locale]}</span>
    </label>
  </div>
);

interface GalleryStudioPageProps {
  searchParams: Promise<{ notice?: string }>;
}

/*
 * What the live conference's gallery shows, in its order. Participants'
 * photographs are not here until the team approves them — they wait on
 * the next tab.
 */
const GalleryStudioPage = async ({ searchParams }: GalleryStudioPageProps) => {
  const gate = await galleryContext();
  if (!gate.ok) {
    return gate.screen;
  }
  const { locale, slug } = gate.context;
  const { notice } = await searchParams;
  const [items, media] = await Promise.all([
    listGalleryItems(slug).catch(() => [] as GalleryItemSummary[]),
    listMedia().catch(() => []),
  ]);
  const images = media.filter((item) => !item.mimeType?.startsWith('video/'));
  const { shown, hero, film } = composition(items);
  const publicPage = `/${locale}/events/${encodeURIComponent(slug)}/gallery`;

  return (
    <GalleryFrame context={gate.context} current="curated" title={UI.curatedTitle[locale]}>
      <div className="mx-auto flex max-w-5xl flex-col gap-5 px-6 py-6">
        <header className="flex flex-wrap items-start gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-[var(--c-text)]">{UI.title[locale]}</h2>
            <p className="mt-1 text-xs text-[var(--c-text-soft)]">{UI.sub[locale]}</p>
          </div>
          <a href={publicPage} target="_blank" rel="noreferrer" className={BTN}>
            {UI.viewOnSite[locale]}
          </a>
        </header>
        {notice && UI.notices[notice] ? (
          <p role="status" className="rounded-md border border-[var(--c-line)] bg-[var(--c-panel)] px-4 py-2 text-sm">
            {UI.notices[notice]![locale]}
          </p>
        ) : null}

        <section className={CARD} aria-labelledby="gallery-preview-title">
          <h3 id="gallery-preview-title" className="mb-3 text-xs font-semibold tracking-[0.08em] text-[var(--c-text-soft)]">{UI.preview[locale]}</h3>
          {shown.length === 0 ? (
            <p className="text-xs text-[var(--c-text-soft)]">{UI.previewEmpty[locale]}</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-[1fr_1fr_1.4fr]">
              <div>
                <p className="text-sm font-medium text-[var(--c-text)]">{UI.hero[locale]}</p>
                <p className={HINT}>{UI.heroHint[locale]}</p>
                <div className="mt-2">{hero ? <Thumb item={hero} className="aspect-[16/9] w-full" /> : <span className="text-xs text-[var(--c-text-faint)]">{UI.none[locale]}</span>}</div>
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--c-text)]">{UI.film[locale]}</p>
                <p className={HINT}>{UI.filmHint[locale]}</p>
                <div className="mt-2">{film ? <Thumb item={film} className="aspect-[16/9] w-full" /> : <span className="text-xs text-[var(--c-text-faint)]">{UI.none[locale]}</span>}</div>
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--c-text)]">
                  {UI.story[locale]} · {UI.more[locale]}
                </p>
                <ul className="mt-2 grid grid-cols-6 gap-1">
                  {shown
                    .filter((item) => item !== hero && item !== film)
                    .slice(0, 18)
                    .map((item, index) => (
                      <li key={item.id} className={index >= 12 ? 'opacity-50' : ''}>
                        <Thumb item={item} className="aspect-square w-full" />
                      </li>
                    ))}
                </ul>
              </div>
            </div>
          )}
        </section>

        {items.length === 0 ? <p className="text-sm text-[var(--c-text-soft)]">{UI.empty[locale]}</p> : null}

        <ol className="flex flex-col gap-4">
          {items.map((item, index) => (
            <li key={item.id} id={`item-${item.id}`} className={CARD}>
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <span className="flex size-8 items-center justify-center rounded-full border border-[var(--c-line-strong)] text-xs font-semibold text-[var(--c-text-soft)]" title={UI.position[locale]}>
                  {index + 1}
                </span>
                <Thumb item={item} />
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-semibold text-[var(--c-text)]">
                    {item.words[locale].title || item.words.he.title || item.words.en.title || (item.kind === 'video' ? UI.video[locale] : UI.photo[locale])}
                  </h3>
                  <p className="mt-1 flex flex-wrap gap-1.5">
                    <span className={`${BADGE} ${item.published ? 'bg-[rgba(52,211,153,0.15)] text-[var(--c-live)]' : 'bg-[rgba(255,255,255,0.08)] text-[var(--c-text-soft)]'}`}>
                      {item.published ? UI.live[locale] : UI.hidden[locale]}
                    </span>
                    {item.kind ? <span className={`${BADGE} bg-[rgba(255,255,255,0.08)] text-[var(--c-text-soft)]`}>{item.kind === 'video' ? UI.video[locale] : UI.photo[locale]}</span> : null}
                    {item.featured ? <span className={`${BADGE} bg-[rgba(245,158,11,0.15)] text-[var(--c-bronze)]`}>{UI.featured[locale]}</span> : null}
                    {item === hero ? <span className={`${BADGE} bg-[rgba(245,158,11,0.15)] text-[var(--c-bronze)]`}>{UI.hero[locale]}</span> : null}
                    {item === film ? <span className={`${BADGE} bg-[rgba(245,158,11,0.15)] text-[var(--c-bronze)]`}>{UI.film[locale]}</span> : null}
                  </p>
                  {!item.mediaUrl ? <p className="mt-1 text-xs text-[var(--c-bronze)]">{UI.missing[locale]}</p> : null}
                </div>
                <form action={setGalleryItemPublishedAction}>
                  <input type="hidden" name="slug" value={slug} />
                  <input type="hidden" name="id" value={item.id} />
                  <input type="hidden" name="published" value={item.published ? 'false' : 'true'} />
                  <button type="submit" className={BTN}>{item.published ? UI.hide[locale] : UI.show[locale]}</button>
                </form>
                <div className="flex gap-1">
                  {(['up', 'down'] as const).map((direction) => (
                    <form key={direction} action={moveGalleryItemAction}>
                      <input type="hidden" name="slug" value={slug} />
                      <input type="hidden" name="id" value={item.id} />
                      <input type="hidden" name="direction" value={direction} />
                      <button
                        type="submit"
                        className={BTN_ICON}
                        disabled={direction === 'up' ? index === 0 : index === items.length - 1}
                        aria-label={UI[direction][locale]}
                        title={UI[direction][locale]}
                      >
                        {direction === 'up' ? '↑' : '↓'}
                      </button>
                    </form>
                  ))}
                </div>
              </div>
              <details className="group">
                <summary className="cursor-pointer text-xs text-[var(--c-text-soft)] hover:text-[var(--c-text)]">{UI.edit[locale]}</summary>
                <form action={updateGalleryItemAction} className="mt-3 flex flex-col gap-4">
                  <input type="hidden" name="slug" value={slug} />
                  <input type="hidden" name="id" value={item.id} />
                  <div className="grid gap-3 md:grid-cols-2">
                    <CMediaPicker name="mediaId" label={UI.file[locale]} defaultValue={item.mediaId ?? ''} media={media} emptyLabel={UI.fileEmpty[locale]} uploadLabel={UI.upload[locale]} locale={locale} />
                    <div>
                      <CMediaPicker name="posterId" label={UI.poster[locale]} defaultValue={item.posterId ?? ''} media={images} emptyLabel={UI.posterEmpty[locale]} uploadLabel={UI.upload[locale]} locale={locale} kind="image" />
                      <span className={HINT}>{UI.posterHint[locale]}</span>
                    </div>
                  </div>
                  <WordsFields item={item} />
                  <DetailFields item={item} locale={locale} />
                  <div className="flex flex-wrap items-center gap-2">
                    <button type="submit" className={BTN_PRIMARY}>{UI.save[locale]}</button>
                    <button type="submit" formAction={removeGalleryItemAction} className={BTN}>{UI.remove[locale]}</button>
                    <span className={HINT}>{UI.removeHint[locale]}</span>
                  </div>
                </form>
              </details>
            </li>
          ))}
        </ol>

        <form id="gallery-add" action={addGalleryItemAction} className={`${CARD} flex flex-col gap-4 border-dashed`}>
          <input type="hidden" name="slug" value={slug} />
          <h3 className="text-sm font-semibold text-[var(--c-text)]">{UI.add[locale]}</h3>
          <div className="grid gap-3 md:grid-cols-2">
            <CMediaPicker name="mediaId" label={UI.file[locale]} defaultValue="" media={media} emptyLabel={UI.fileEmpty[locale]} uploadLabel={UI.upload[locale]} locale={locale} />
            <div>
              <CMediaPicker name="posterId" label={UI.poster[locale]} defaultValue="" media={images} emptyLabel={UI.posterEmpty[locale]} uploadLabel={UI.upload[locale]} locale={locale} kind="image" />
              <span className={HINT}>{UI.posterHint[locale]}</span>
            </div>
          </div>
          <WordsFields />
          <DetailFields locale={locale} />
          <div>
            <button type="submit" className={BTN_PRIMARY}>{UI.addButton[locale]}</button>
          </div>
        </form>
      </div>
    </GalleryFrame>
  );
};

export const dynamic = 'force-dynamic';

export default GalleryStudioPage;
