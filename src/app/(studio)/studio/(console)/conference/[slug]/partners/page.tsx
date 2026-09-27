import { notFound } from 'next/navigation';
import type { Locale } from '@/config/locales';
import { wordpressHref } from '@/config/wordpress';
import { findEvent, listMedia } from '@/features/events';
import { listSponsors } from '@/features/sponsors';
import type { SponsorSummary } from '@/features/sponsors';
import { CMediaPicker, getStudioLocale } from '@/features/studio';
import {
  addPartnerAction,
  movePartnerAction,
  removePartnerAction,
  updatePartnerAction,
} from './actions';

const t = (he: string, en: string): Record<Locale, string> => ({ he, en });

const UI = {
  title: t('שותפים', 'Partners'),
  sub: t(
    'הלוגואים שרצים בתחתית עמוד הכנס באתר, בסדר הזה. לוגו אחד לכל שותף — רצוי PNG או SVG עם רקע שקוף.',
    'The logos that scroll along the foot of the conference page on the site, in this order. One logo per partner — PNG or SVG with a transparent background works best.',
  ),
  viewOnSite: t('צפייה באתר', 'View on site'),
  preview: t('כך זה נראה באתר', 'How it looks on the site'),
  previewEmpty: t('הרצועה תופיע באתר ברגע שיהיה שותף אחד עם לוגו.', 'The strip appears on the site as soon as one partner has a logo.'),
  add: t('הוספת שותף', 'Add a partner'),
  name: t('שם השותף', 'Partner name'),
  nameHint: t('משמש כטקסט חלופי ללוגו, ומוצג במקומו כשאין לוגו.', 'Used as the logo’s alt text, and shown instead of it when there is none.'),
  website: t('קישור (אופציונלי)', 'Link (optional)'),
  websiteHint: t('לחיצה על הלוגו באתר תפתח את הקישור.', 'A click on the logo on the site opens this link.'),
  logo: t('לוגו', 'Logo'),
  logoEmpty: t('ללא לוגו', 'No logo'),
  noLogo: t('חסר לוגו — מוצג באתר כטקסט', 'No logo — shown on the site as text'),
  upload: t('העלאה', 'Upload'),
  save: t('שמירה', 'Save'),
  addButton: t('הוספה', 'Add'),
  remove: t('הסרה', 'Remove'),
  up: t('הזזה קדימה', 'Move earlier'),
  down: t('הזזה אחורה', 'Move later'),
  position: t('מיקום', 'Position'),
  empty: t('עדיין אין שותפים. הוסיפו את הראשון למטה.', 'No partners yet. Add the first one below.'),
  notices: {
    added: t('השותף נוסף.', 'Partner added.'),
    saved: t('נשמר.', 'Saved.'),
    removed: t('הוסר.', 'Removed.'),
    'name-required': t('לשותף צריך שם — הוסיפו שם ושמרו שוב.', 'A partner needs a name — add one and save again.'),
  } as Record<string, Record<Locale, string>>,
};

const CARD = 'rounded-lg border border-[var(--c-line)] bg-[var(--c-panel)] p-5';
const INPUT = 'w-full rounded-md border border-[var(--c-line)] bg-[rgba(7,19,36,0.55)] px-3 py-2 text-sm text-[var(--c-text)] outline-none focus:border-[var(--c-bronze)]';
const LABEL = 'mb-1 block text-[11px] font-medium tracking-[0.08em] text-[var(--c-text-soft)]';
const HINT = 'mt-1 block text-[11px] text-[var(--c-text-faint)]';
const BTN = 'inline-flex min-h-9 items-center rounded-md border border-[var(--c-line-strong)] px-3 text-sm text-[var(--c-text)] hover:border-[var(--c-bronze)] hover:text-[var(--c-bronze)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-[var(--c-line-strong)] disabled:hover:text-[var(--c-text)]';
const BTN_ICON = `${BTN} min-w-9 justify-center px-0 text-base leading-none`;
const BTN_PRIMARY = 'inline-flex min-h-9 items-center rounded-md bg-[var(--c-bronze)] px-4 text-sm font-semibold text-[var(--c-on-accent)] hover:bg-[var(--c-bronze-hover)]';

/*
 * The strip as the site shows it: white ground, logos at one height,
 * scrolling. A partner without a logo shows its name, exactly as the
 * WordPress side falls back — so what is missing is visible here first.
 */
const StripPreview = ({ partners, locale }: { partners: SponsorSummary[]; locale: Locale }) => {
  const shown = partners.filter((partner) => partner.logoUrl || partner.name);
  if (shown.length === 0) {
    return <p className="text-xs text-[var(--c-text-soft)]">{UI.previewEmpty[locale]}</p>;
  }
  const loop = shown.length < 6 ? [...shown, ...shown, ...shown] : [...shown, ...shown];
  return (
    <div className="studio-partners-preview overflow-hidden rounded-md bg-white py-4" dir="ltr" aria-label={UI.preview[locale]}>
      <ul className="studio-partners-preview__track flex w-max items-center gap-12 px-6">
        {loop.map((partner, index) => (
          <li key={`${partner.id}-${index}`} className="flex h-12 shrink-0 items-center" aria-hidden={index >= shown.length}>
            {partner.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={partner.logoUrl} alt={partner.name} className="max-h-12 w-auto max-w-[160px] object-contain" />
            ) : (
              <span className="text-sm font-semibold text-neutral-700">{partner.name}</span>
            )}
          </li>
        ))}
      </ul>
      <style>{`
        .studio-partners-preview__track { animation: studio-partners-run 28s linear infinite; }
        .studio-partners-preview:hover .studio-partners-preview__track { animation-play-state: paused; }
        @keyframes studio-partners-run { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @media (prefers-reduced-motion: reduce) { .studio-partners-preview__track { animation: none; } }
      `}</style>
    </div>
  );
};

interface PartnersPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ notice?: string }>;
}

const ConferencePartnersPage = async ({ params, searchParams }: PartnersPageProps) => {
  const { slug: raw } = await params;
  const slug = decodeURIComponent(raw);
  const { notice } = await searchParams;
  const locale = await getStudioLocale();
  const [summary, partners, media] = await Promise.all([
    findEvent(slug).catch(() => null),
    listSponsors(slug).catch(() => [] as SponsorSummary[]),
    listMedia().catch(() => []),
  ]);
  if (!summary) {
    notFound();
  }
  const images = media.filter((item) => !item.mimeType?.startsWith('video/'));

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5 px-6 py-6">
      <header className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-[var(--c-text)]">{UI.title[locale]}</h2>
          <p className="mt-1 text-xs text-[var(--c-text-soft)]">{UI.sub[locale]}</p>
        </div>
        <a href={`${wordpressHref('conferences', locale)}#nt-partners`} target="_blank" rel="noreferrer" className={BTN}>
          {UI.viewOnSite[locale]}
        </a>
      </header>
      {notice && UI.notices[notice] ? (
        <p role="status" className="rounded-md border border-[var(--c-line)] bg-[var(--c-panel)] px-4 py-2 text-sm">
          {UI.notices[notice]![locale]}
        </p>
      ) : null}

      <section className={CARD}>
        <h3 className="mb-3 text-xs font-semibold tracking-[0.08em] text-[var(--c-text-soft)]">{UI.preview[locale]}</h3>
        <StripPreview partners={partners} locale={locale} />
      </section>

      {partners.length === 0 ? <p className="text-sm text-[var(--c-text-soft)]">{UI.empty[locale]}</p> : null}

      <ol className="flex flex-col gap-4">
        {partners.map((partner, index) => (
          <li key={partner.id} id={`partner-${partner.id}`} className={CARD}>
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <span className="flex size-8 items-center justify-center rounded-full border border-[var(--c-line-strong)] text-xs font-semibold text-[var(--c-text-soft)]" title={UI.position[locale]}>
                {index + 1}
              </span>
              <span className="flex h-12 w-24 items-center justify-center rounded-md bg-white p-1">
                {partner.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={partner.logoUrl} alt="" className="max-h-10 w-auto max-w-full object-contain" />
                ) : (
                  <span className="text-[10px] text-neutral-500">{UI.logoEmpty[locale]}</span>
                )}
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-semibold text-[var(--c-text)]">{partner.name || '—'}</h3>
                <p className="truncate text-xs text-[var(--c-text-soft)]">
                  {partner.website ? partner.website : partner.logoUrl ? '' : UI.noLogo[locale]}
                </p>
              </div>
              <div className="flex gap-1">
                {(['up', 'down'] as const).map((direction) => (
                  <form key={direction} action={movePartnerAction}>
                    <input type="hidden" name="slug" value={slug} />
                    <input type="hidden" name="id" value={partner.id} />
                    <input type="hidden" name="direction" value={direction} />
                    <button
                      type="submit"
                      className={BTN_ICON}
                      disabled={direction === 'up' ? index === 0 : index === partners.length - 1}
                      aria-label={UI[direction][locale]}
                      title={UI[direction][locale]}
                    >
                      {direction === 'up' ? '↑' : '↓'}
                    </button>
                  </form>
                ))}
              </div>
            </div>
            <form action={updatePartnerAction} className="grid gap-3 lg:grid-cols-[1fr_1fr_220px]">
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="id" value={partner.id} />
              <label className="block">
                <span className={LABEL}>{UI.name[locale]}</span>
                <input name="name" defaultValue={partner.name} required className={INPUT} />
                <span className={HINT}>{UI.nameHint[locale]}</span>
              </label>
              <label className="block">
                <span className={LABEL}>{UI.website[locale]}</span>
                <input name="website" dir="ltr" defaultValue={partner.website ?? ''} placeholder="https://" className={INPUT} />
                <span className={HINT}>{UI.websiteHint[locale]}</span>
              </label>
              <CMediaPicker name="logoId" label={UI.logo[locale]} defaultValue={partner.logoId ?? ''} media={images} emptyLabel={UI.logoEmpty[locale]} uploadLabel={UI.upload[locale]} locale={locale} kind="image" />
              <div className="flex gap-2 lg:col-span-3">
                <button type="submit" className={BTN_PRIMARY}>{UI.save[locale]}</button>
                <button type="submit" formAction={removePartnerAction} className={BTN}>{UI.remove[locale]}</button>
              </div>
            </form>
          </li>
        ))}
      </ol>

      <form action={addPartnerAction} className={`${CARD} border-dashed`}>
        <input type="hidden" name="slug" value={slug} />
        <h3 className="mb-3 text-sm font-semibold text-[var(--c-text)]">{UI.add[locale]}</h3>
        <div className="grid gap-3 lg:grid-cols-[1fr_1fr_220px]">
          <label className="block">
            <span className={LABEL}>{UI.name[locale]}</span>
            <input name="name" required className={INPUT} />
            <span className={HINT}>{UI.nameHint[locale]}</span>
          </label>
          <label className="block">
            <span className={LABEL}>{UI.website[locale]}</span>
            <input name="website" dir="ltr" placeholder="https://" className={INPUT} />
            <span className={HINT}>{UI.websiteHint[locale]}</span>
          </label>
          <CMediaPicker name="logoId" label={UI.logo[locale]} defaultValue="" media={images} emptyLabel={UI.logoEmpty[locale]} uploadLabel={UI.upload[locale]} locale={locale} kind="image" />
        </div>
        <div className="mt-4">
          <button type="submit" className={BTN_PRIMARY}>{UI.addButton[locale]}</button>
        </div>
      </form>
    </div>
  );
};

export const dynamic = 'force-dynamic';

export default ConferencePartnersPage;
