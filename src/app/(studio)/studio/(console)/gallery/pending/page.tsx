import type { Locale } from '@/config/locales';
import { listGallerySubmissions } from '@/features/gallery';
import type { GallerySubmission } from '@/features/gallery';
import { formatDayLabel } from '@/shared';
import { approveGallerySubmissionAction, rejectGallerySubmissionAction } from '../actions';
import { GalleryFrame, galleryContext } from '../gallery-frame';

const t = (he: string, en: string): Record<Locale, string> => ({ he, en });

const UI = {
  title: t('ממתינים לאישור', 'Awaiting approval'),
  sub: t(
    'תמונות שמשתתפים שלחו מעמוד הגלריה. שום דבר כאן לא מוצג באתר עד שמאשרים אותו; תמונה שנמחקת נמחקת לגמרי.',
    'Photos participants sent from the gallery page. Nothing here is shown on the site until it is approved; a photo that is deleted is gone for good.',
  ),
  empty: t('אין תמונות שממתינות לאישור.', 'No photos are waiting for approval.'),
  from: t('נשלחה על ידי', 'Sent by'),
  unknown: t('משתתף/ת', 'A participant'),
  credit: t('קרדיט', 'Credit'),
  noCaption: t('ללא כיתוב', 'No caption'),
  approve: t('אישור והעלאה לגלריה', 'Approve and add to the gallery'),
  reject: t('מחיקה', 'Delete'),
  open: t('פתיחה בגודל מלא', 'Open full size'),
  notices: {
    approved: t('התמונה אושרה ונוספה לסוף הגלריה.', 'Approved and added to the end of the gallery.'),
    rejected: t('התמונה נמחקה.', 'The photo was deleted.'),
    failed: t('הפעולה לא הצליחה. נסו שוב.', 'That did not work. Try again.'),
  } as Record<string, Record<Locale, string>>,
};

const CARD = 'rounded-lg border border-[var(--c-line)] bg-[var(--c-panel)] p-4';
const BTN = 'inline-flex min-h-9 items-center rounded-md border border-[var(--c-line-strong)] px-3 text-sm text-[var(--c-text)] hover:border-[var(--c-bronze)] hover:text-[var(--c-bronze)]';
const BTN_PRIMARY = 'inline-flex min-h-9 items-center rounded-md bg-[var(--c-bronze)] px-4 text-sm font-semibold text-[var(--c-on-accent)] hover:bg-[var(--c-bronze-hover)]';

const Submission = ({ item, slug, locale }: { item: GallerySubmission; slug: string; locale: Locale }) => (
  <li id={`submission-${item.id}`} className={`${CARD} flex flex-col gap-3`}>
    <a href={item.file.url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-md bg-black" title={UI.open[locale]}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={item.file.url} alt={item.caption || UI.noCaption[locale]} className="aspect-[4/3] w-full object-contain" />
    </a>
    <div className="min-w-0 text-sm">
      <p className="text-[var(--c-text)]" dir="auto">{item.caption || <span className="text-[var(--c-text-faint)]">{UI.noCaption[locale]}</span>}</p>
      <p className="mt-1 text-xs text-[var(--c-text-soft)]">
        {UI.from[locale]} <span dir="auto">{item.submitter?.name ?? UI.unknown[locale]}</span>
        {item.submittedAt ? ` · ${formatDayLabel(item.submittedAt, locale)}` : ''}
      </p>
      {item.credit ? (
        <p className="mt-0.5 text-xs text-[var(--c-text-faint)]">
          {UI.credit[locale]}: <span dir="auto">{item.credit}</span>
        </p>
      ) : null}
    </div>
    <form className="mt-auto flex flex-wrap gap-2">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="id" value={item.id} />
      <button type="submit" formAction={approveGallerySubmissionAction} className={BTN_PRIMARY}>
        {UI.approve[locale]}
      </button>
      <button type="submit" formAction={rejectGallerySubmissionAction} className={BTN}>
        {UI.reject[locale]}
      </button>
    </form>
  </li>
);

interface PendingPageProps {
  searchParams: Promise<{ notice?: string }>;
}

/*
 * The review queue: every photograph participants sent to the live
 * conference's gallery, oldest first. Approve puts it at the end of the
 * gallery, shown; delete removes it and its file. Nothing else happens
 * to a photograph here — editing its words is done in the gallery once
 * it is in.
 */
const GalleryPendingPage = async ({ searchParams }: PendingPageProps) => {
  const gate = await galleryContext();
  if (!gate.ok) {
    return gate.screen;
  }
  const { locale, slug } = gate.context;
  const { notice } = await searchParams;
  const items = await listGallerySubmissions(slug).catch(() => [] as GallerySubmission[]);

  return (
    <GalleryFrame context={gate.context} current="pending" title={UI.title[locale]}>
      <div className="mx-auto flex max-w-5xl flex-col gap-5 px-6 py-6">
        <header>
          <h2 className="text-base font-semibold text-[var(--c-text)]">{UI.title[locale]}</h2>
          <p className="mt-1 text-xs text-[var(--c-text-soft)]">{UI.sub[locale]}</p>
        </header>
        {notice && UI.notices[notice] ? (
          <p role="status" className="rounded-md border border-[var(--c-line)] bg-[var(--c-panel)] px-4 py-2 text-sm">
            {UI.notices[notice]![locale]}
          </p>
        ) : null}
        {items.length === 0 ? (
          <p className="text-sm text-[var(--c-text-soft)]">{UI.empty[locale]}</p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <Submission key={item.id} item={item} slug={slug} locale={locale} />
            ))}
          </ul>
        )}
      </div>
    </GalleryFrame>
  );
};

export const dynamic = 'force-dynamic';

export default GalleryPendingPage;
