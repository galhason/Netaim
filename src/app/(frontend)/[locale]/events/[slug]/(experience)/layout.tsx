import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { brandFor } from '@/config/brand';
import { isSupportedLocale, type Locale } from '@/config/locales';
import { ConferenceFooter, SITE_NAV_LINKS } from '@/features/cinematic';
import { ExperienceNav } from '@/features/conference';
import { getActiveConferenceSlug, getSiteBrand } from '@/features/events';
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
  const logo = await getSiteBrand();
  const registerHref = slug ? `/${lang}/events/${slug}/register` : `/${lang}`;

  return (
    <div className="experience min-h-dvh bg-[var(--x-bg)] text-[var(--x-ink)]">
      <ExperienceNav
        locale={lang}
        links={SITE_NAV_LINKS}
        brand={brandFor(lang)}
        brandLogo={logo.onDark}
        registerHref={registerHref}
        meHref={`/${lang}/me`}
        userName={participant?.name ?? undefined}
        {...(slug && participant
          ? { scheduleHref: `/${lang}/events/${slug}/my-activities` }
          : {})}
      />
      {children}
      <ConferenceFooter
        locale={lang}
        brand={brandFor(lang)}
        brandLogo={logo.onLight}
      />
    </div>
  );
};

/*
 * This layout resolves who is looking, so every page beneath it depends
 * on the visitor and none may be prerendered or shared. Declared rather
 * than left to Next to infer: an inferred guard disappears the moment a
 * refactor moves the read behind a helper.
 */
export const dynamic = 'force-dynamic';

export default ExperienceLayout;
