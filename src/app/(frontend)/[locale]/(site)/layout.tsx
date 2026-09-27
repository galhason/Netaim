import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { brandFor } from '@/config/brand';
import { isSupportedLocale, type Locale } from '@/config/locales';
import { ConferenceFooter } from '@/features/cinematic';
import { ConferenceBar } from '@/features/conference';
import { conferenceBarViewer } from '@/features/conference/services/conference-bar-viewer';
import { getActiveConferenceSlug, getSiteBrand } from '@/features/events';

interface SiteLayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

/*
 * Shared chrome for the platform's own site pages (privacy, terms,
 * accessibility): the same route-based navigation and
 * footer that wrap the landing, so every page feels like part of one
 * live conference website. The active conference supplies the register
 * destination; the nav links are the conference's own pages.
 */
const SiteLayout = async ({ children, params }: SiteLayoutProps) => {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) {
    notFound();
  }
  setRequestLocale(locale);

  const slug = await getActiveConferenceSlug(locale as Locale).catch(
    () => null,
  );
  /* Resolved per request, never cached: the bar says who is looking. */
  const viewer = await conferenceBarViewer();
  const logo = await getSiteBrand();

  return (
    <div className="cinematic min-h-dvh bg-surface text-text-primary">
      <ConferenceBar
        locale={locale as Locale}
        slug={slug}
        viewer={viewer}
        brand={brandFor(locale as Locale)}
        brandLogo={logo.onLight}
      />
      {children}
      <ConferenceFooter
        locale={locale as Locale}
        brand={brandFor(locale as Locale)}
        brandLogo={logo.onDark}
      />
    </div>
  );
};

/*
 * The nav in this layout says who is looking, so every page beneath it
 * depends on the visitor and none may be prerendered or shared.
 */
export const dynamic = 'force-dynamic';

export default SiteLayout;
