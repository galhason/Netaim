import Link from 'next/link';
import type { ReactNode } from 'react';
import type { Locale } from '@/config/locales';
import { getActiveConferenceSlug } from '@/features/events';
import { listGallerySubmissions } from '@/features/gallery';
import { ConsoleDenied, ConsoleShell, getStudioAccess, getStudioLocale } from '@/features/studio';
import { can } from '@/permission-engine';

const t = (he: string, en: string): Record<Locale, string> => ({ he, en });

export const FRAME_UI = {
  title: t('גלריה', 'Gallery'),
  curated: t('בגלריה', 'In the gallery'),
  pending: t('ממתינים לאישור', 'Awaiting approval'),
  tabsLabel: t('אזורי הגלריה', 'Gallery areas'),
  noConference: t(
    'אין כרגע כנס פעיל. הגלריה פועלת על הכנס הפעיל — בחרו אותו בהגדרות הכנס.',
    'There is no active conference. The gallery works on the active conference — choose it in the conference settings.',
  ),
};

export interface GalleryContext {
  locale: Locale;
  slug: string;
  userName: string;
  pendingCount: number;
}

/*
 * Who is here, on which conference, and may they keep its gallery.
 *
 * Both gallery screens act on the live conference, as the activities
 * and logistics screens do, and both ask for `gallery:manage` there —
 * the Netaim admin, supervisor and staff. The answer is the context the
 * screen renders with, or the screen to show instead: a refusal, or a
 * word that nothing is live yet.
 */
export const galleryContext = async (): Promise<
  { ok: true; context: GalleryContext } | { ok: false; screen: ReactNode }
> => {
  const locale = await getStudioLocale();
  const [access, slug] = await Promise.all([
    getStudioAccess(),
    getActiveConferenceSlug(locale).catch(() => null),
  ]);
  const userName = access?.creator.name ?? '';
  if (!access || !can(access.grants, 'gallery:manage', slug ?? undefined)) {
    return { ok: false, screen: <ConsoleDenied locale={locale} title={FRAME_UI.title[locale]} userName={userName} /> };
  }
  if (!slug) {
    return {
      ok: false,
      screen: (
        <ConsoleShell locale={locale} userName={userName} breadcrumb={<span className="font-medium text-[var(--c-text)]">{FRAME_UI.title[locale]}</span>}>
          <p className="mx-auto max-w-2xl px-6 py-16 text-sm text-[var(--c-text-soft)]">{FRAME_UI.noConference[locale]}</p>
        </ConsoleShell>
      ),
    };
  }
  const pendingCount = (await listGallerySubmissions(slug).catch(() => [])).length;
  return { ok: true, context: { locale, slug, userName, pendingCount } };
};

/* The shell, the page's name, and the two areas: what is shown, and what waits. */
export const GalleryFrame = ({
  context,
  current,
  title,
  children,
}: {
  context: GalleryContext;
  current: 'curated' | 'pending';
  title: string;
  children: ReactNode;
}) => {
  const { locale, userName, pendingCount } = context;
  const tabs = [
    { id: 'curated' as const, href: '/studio/gallery', label: FRAME_UI.curated[locale] },
    { id: 'pending' as const, href: '/studio/gallery/pending', label: FRAME_UI.pending[locale], count: pendingCount },
  ];
  return (
    <ConsoleShell
      locale={locale}
      userName={userName}
      pendingGallery={pendingCount}
      breadcrumb={
        <>
          <span className="font-medium text-[var(--c-text)]">{FRAME_UI.title[locale]}</span>
          <span aria-hidden="true">/</span>
          <span>{title}</span>
        </>
      }
    >
      <div className="border-b border-[var(--c-line)]">
        <nav aria-label={FRAME_UI.tabsLabel[locale]} className="mx-auto flex max-w-5xl gap-1 px-3">
          {tabs.map((tab) => (
            <Link
              key={tab.id}
              href={tab.href}
              aria-current={tab.id === current ? 'page' : undefined}
              className={`-mb-px inline-flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm transition-colors ${
                tab.id === current
                  ? 'border-[var(--c-bronze)] text-[var(--c-text)]'
                  : 'border-transparent text-[var(--c-text-soft)] hover:text-[var(--c-text)]'
              }`}
            >
              {tab.label}
              {tab.count ? (
                <span className="rounded-full bg-[var(--c-bronze)] px-1.5 text-[11px] font-semibold text-[var(--c-on-accent)]">{tab.count}</span>
              ) : null}
            </Link>
          ))}
        </nav>
      </div>
      {children}
    </ConsoleShell>
  );
};
