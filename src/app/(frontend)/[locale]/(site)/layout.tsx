import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { brandFor } from '@/config/brand';
import { isSupportedLocale, type Locale } from '@/config/locales';
import { CinematicNav, ConferenceFooter } from '@/features/cinematic';
import { getActiveConferenceSlug, getSiteBrand } from '@/features/events';
import { currentParticipant } from '@/features/registration';

interface SiteLayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

/*
 * Shared chrome for the conference site's inner pages (Program,
 * Speakers, Information, Contact): the same route-based navigation and
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
  const registerHref = slug
    ? `/${locale}/events/${slug}/register`
    : `/${locale}`;
  const meHref = `/${locale}/me`;
  /*
   * Resolved per request, never cached: the nav says who is looking, and
   * a shared answer would say it to the wrong person. The layout is
   * already dynamic because of this read.
   */
  const me = await currentParticipant().catch(() => null);
  const logo = await getSiteBrand();

  return (
    <div className="cinematic min-h-dvh bg-surface text-text-primary">
      <CinematicNav
        locale={locale as Locale}
        registerHref={registerHref}
        meHref={meHref}
        brand={brandFor(locale as Locale)}
        brandLogo={logo.onDark}
        viewer={me ? { name: me.name || me.email } : null}
        immediate
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
 * `/contact` in particular was being served with a one-hour revalidate
 * before this line existed.
 */
export const dynamic = 'force-dynamic';

export default SiteLayout;
