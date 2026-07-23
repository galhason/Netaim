import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { BRAND_NAME } from '@/config/brand';
import { isSupportedLocale, type Locale } from '@/config/locales';
import { ConferenceFooter, SITE_NAV_LINKS } from '@/features/cinematic';
import { ExperienceNav } from '@/features/conference';
import { getActiveConferenceSlug } from '@/features/events';
import { currentParticipant } from '@/features/registration';

interface ExperienceLayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

/*
 * The Conference Experience shell — the participant-facing chrome for the
 * Program, Activity and Speaker pages. Its own calm navy navigation and a
 * light daylight body set it apart from the cinematic landing, so every
 * public page a participant browses feels like one modern product.
 */
const ExperienceLayout = async ({ children, params }: ExperienceLayoutProps) => {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) {
    notFound();
  }
  setRequestLocale(locale);
  const lang = locale as Locale;

  const slug = await getActiveConferenceSlug(lang).catch(() => null);
  const participant = await currentParticipant().catch(() => null);
  const registerHref = slug ? `/${lang}/events/${slug}/register` : `/${lang}`;

  return (
    <div className="experience min-h-dvh bg-[var(--x-bg)] text-[var(--x-ink)]">
      <ExperienceNav
        locale={lang}
        links={SITE_NAV_LINKS}
        brand={BRAND_NAME}
        registerHref={registerHref}
        meHref={`/${lang}/me`}
        userName={participant?.name ?? undefined}
      />
      {children}
      <ConferenceFooter locale={lang} brand={BRAND_NAME} />
    </div>
  );
};

export default ExperienceLayout;
