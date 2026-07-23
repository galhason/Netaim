import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { BRAND_NAME } from '@/config/brand';
import { isSupportedLocale, type Locale } from '@/config/locales';
import { CinematicNav, ConferenceFooter } from '@/features/cinematic';
import { getActiveConferenceSlug } from '@/features/events';

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

  return (
    <div className="cinematic min-h-dvh bg-surface text-text-primary">
      <CinematicNav
        locale={locale as Locale}
        registerHref={registerHref}
        meHref={meHref}
        brand={BRAND_NAME}
        immediate
      />
      {children}
      <ConferenceFooter locale={locale as Locale} brand={BRAND_NAME} />
    </div>
  );
};

export default SiteLayout;
