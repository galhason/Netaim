import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { BRAND_NAME } from '@/config/brand';
import { isSupportedLocale, type Locale } from '@/config/locales';
import { ConferenceFooter, SITE_NAV_LINKS } from '@/features/cinematic';
import { ExperienceNav } from '@/features/conference';
import { currentParticipant } from '@/features/registration';

interface Props {
  children: ReactNode;
  params: Promise<{ locale: string; slug: string }>;
}

/*
 * The personal dashboard lives under /events/[slug], outside the
 * (experience) route group, yet it is the same product as the Program.
 * This shell repeats the Experience chrome — the navy navigation, the
 * daylight body, the conference footer — so a participant moving between
 * the program, an activity, a speaker and their own day never notices a
 * seam.
 */
const MyScheduleLayout = async ({ children, params }: Props) => {
  const { locale, slug } = await params;
  if (!isSupportedLocale(locale)) {
    notFound();
  }
  setRequestLocale(locale);
  const lang = locale as Locale;

  const participant = await currentParticipant().catch(() => null);

  return (
    <div className="experience min-h-dvh bg-[var(--x-bg)] text-[var(--x-ink)]">
      <ExperienceNav
        locale={lang}
        links={SITE_NAV_LINKS}
        brand={BRAND_NAME}
        registerHref={`/${lang}/events/${slug}/register`}
        meHref={`/${lang}/me`}
        userName={participant?.name ?? undefined}
        {...(participant
          ? { scheduleHref: `/${lang}/events/${slug}/my-activities` }
          : {})}
      />
      {children}
      <ConferenceFooter locale={lang} brand={BRAND_NAME} />
    </div>
  );
};

export default MyScheduleLayout;
