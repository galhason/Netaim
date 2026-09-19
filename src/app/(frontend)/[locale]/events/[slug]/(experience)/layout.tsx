import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { brandFor } from '@/config/brand';
import { isSupportedLocale, type Locale } from '@/config/locales';
import { ConferenceFooter, SITE_NAV_LINKS } from '@/features/cinematic';
import { ExperienceNav } from '@/features/conference';
import { findPortalEvent, getSiteBrand } from '@/features/events';
import { currentParticipant } from '@/features/registration';

interface ExperienceLayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string; slug: string }>;
}

/*
 * The Conference Experience shell — the participant-facing chrome for the
 * Program, Activity and Speaker pages. Its own calm navy navigation and a
 * light daylight body set it apart from the cinematic landing, so every
 * public page a participant browses feels like one modern product.
 *
 * The conference is named in the address. It used to be whichever one the
 * Site pointer happened to be naming, which meant these pages could only
 * ever describe a single conference; now the slug decides, and 2026 and
 * 2030 can be open in two tabs.
 */
const ExperienceLayout = async ({ children, params }: ExperienceLayoutProps) => {
  const { locale, slug } = await params;
  if (!isSupportedLocale(locale)) {
    notFound();
  }
  setRequestLocale(locale);
  const lang = locale as Locale;

  /*
   * One existence check for the whole group, here rather than four times
   * below. An unpublished or misspelled slug is a 404 — never a page that
   * quietly shows a different conference than the address asked for.
   */
  const event = await findPortalEvent(slug, lang).catch(() => null);
  if (!event) {
    notFound();
  }

  const participant = await currentParticipant().catch(() => null);
  const logo = await getSiteBrand();

  return (
    <div className="experience min-h-dvh bg-[var(--x-bg)] text-[var(--x-ink)]">
      <ExperienceNav
        locale={lang}
        links={SITE_NAV_LINKS}
        brand={brandFor(lang)}
        brandLogo={logo.onDark}
        registerHref={`/${lang}/events/${slug}/register`}
        meHref={`/${lang}/me`}
        userName={participant?.name ?? undefined}
        {...(participant
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
