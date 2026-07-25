import { setRequestLocale } from 'next-intl/server';
import { isSupportedLocale, type Locale } from '@/config/locales';
import { findPortalEvent, getActiveConferenceSlug } from '@/features/events';
import { buildProgramModel } from '@/features/program';
import ProgramExperience from './program-experience';

interface ProgramPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ notice?: string; activity?: string }>;
}

/*
 * The conference program. Every view model it renders comes from the one
 * shared builder, so the personal dashboard can show the very same cards
 * filtered to what the guest holds — one program, two readings.
 */
const ProgramPage = async ({ params, searchParams }: ProgramPageProps) => {
  const { locale } = await params;
  const lang = (isSupportedLocale(locale) ? locale : 'he') as Locale;
  setRequestLocale(lang);
  const { notice, activity } = await searchParams;

  const slug = await getActiveConferenceSlug(lang).catch(() => null);
  const [event, model] = await Promise.all([
    slug ? findPortalEvent(slug, lang).catch(() => null) : Promise.resolve(null),
    buildProgramModel(slug, lang),
  ]);

  return (
    <ProgramExperience
      locale={lang}
      slug={slug ?? ''}
      title={event?.title ?? (lang === 'he' ? 'תוכנית הכנס' : 'Conference program')}
      activities={model.activities}
      days={model.days}
      filters={model.filters}
      schedule={model.schedule}
      insights={model.insights}
      notice={notice ?? null}
      initialActivityId={activity ?? null}
    />
  );
};

export default ProgramPage;
