import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { isSupportedLocale, type Locale } from '@/config/locales';
import { ExperienceStage } from '@/experience-runtime';
import {
  buildConferenceDescriptor,
  getConferenceExperience,
} from '@/features/cinematic';
import { getActiveConferenceSlug } from '@/features/events';
import { ConferenceSpotlight } from '@/features/notifications';
import '@/scenes';

interface ConferenceLandingPageProps {
  params: Promise<{ locale: string }>;
}

/*
 * The Conference Landing (product direction v6): the site's front door
 * is no longer an index of conferences — it IS the active conference.
 * The Studio names one published conference the live site; here it is
 * assembled and played exactly like its own page, so a visitor lands
 * straight inside the event: hero, story, speakers, program, venue and
 * the invitation to register.
 */
const ConferenceLandingPage = async ({
  params,
}: ConferenceLandingPageProps) => {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) {
    notFound();
  }
  setRequestLocale(locale);

  const slug = await getActiveConferenceSlug(locale as Locale).catch(
    () => null,
  );
  const experience = slug
    ? await getConferenceExperience(slug, locale as Locale)
    : null;

  if (!slug || !experience) {
    return <ConferenceLandingEmpty locale={locale as Locale} />;
  }

  return (
    <>
      <ConferenceSpotlight slug={slug} locale={locale as Locale} />
      <ExperienceStage
        experience={buildConferenceDescriptor(experience)}
        locale={locale as Locale}
      />
    </>
  );
};

/*
 * Nothing is live yet: a calm, on-brand holding frame rather than a
 * broken page. Once an editor publishes a conference and marks it the
 * active site, this is replaced by the full landing.
 */
const ConferenceLandingEmpty = ({ locale }: { locale: Locale }) => (
  <main className="cinematic flex min-h-dvh flex-col items-center justify-center gap-4 bg-surface px-6 text-center">
    <p className="text-xs font-medium uppercase tracking-[0.34em] text-accent">
      {locale === 'he' ? 'בקרוב' : 'Coming soon'}
    </p>
    <h1 className="max-w-xl font-display text-3xl font-semibold text-text-primary md:text-4xl">
      {locale === 'he'
        ? 'הכנס הבא נמצא כעת בהכנה'
        : 'The next conference is being prepared'}
    </h1>
    <p className="max-w-md text-sm text-text-secondary">
      {locale === 'he'
        ? 'חזרו בקרוב — חוויית הכנס המלאה תעלה לכאן ברגע שתפורסם.'
        : 'Check back soon — the full conference experience will appear here once it goes live.'}
    </p>
  </main>
);

export default ConferenceLandingPage;
