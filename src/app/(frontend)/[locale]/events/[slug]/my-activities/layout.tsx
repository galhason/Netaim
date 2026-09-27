import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { brandFor } from '@/config/brand';
import { isSupportedLocale, type Locale } from '@/config/locales';
import { ConferenceFooter } from '@/features/cinematic';
import { ConferenceBar } from '@/features/conference';
import { conferenceBarViewer } from '@/features/conference/services/conference-bar-viewer';
import { getSiteBrand } from '@/features/events';

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

  const [viewer, logo] = await Promise.all([conferenceBarViewer(), getSiteBrand()]);

  return (
    <div className="experience min-h-dvh bg-[var(--x-bg)] text-[var(--x-ink)]">
      <ConferenceBar
        locale={lang}
        slug={slug}
        viewer={viewer}
        brand={brandFor(lang)}
        brandLogo={logo.onLight}
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

export default MyScheduleLayout;
