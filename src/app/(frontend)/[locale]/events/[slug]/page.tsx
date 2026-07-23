import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { isSupportedLocale } from '@/config/locales';
import { ExperienceStage } from '@/experience-runtime';
import {
  buildConferenceDescriptor,
  getConferenceExperience,
} from '@/features/cinematic';
import { ConferenceSpotlight } from '@/features/notifications';
import '@/scenes';

interface EventPageProps {
  params: Promise<{ locale: string; slug: string }>;
}

const EventPage = async ({ params }: EventPageProps) => {
  const { locale, slug } = await params;

  if (!isSupportedLocale(locale)) {
    notFound();
  }

  setRequestLocale(locale);

  const experience = await getConferenceExperience(slug, locale);

  if (!experience) {
    notFound();
  }

  return (
    <>
      <ConferenceSpotlight slug={slug} locale={locale} />
      <ExperienceStage
        experience={buildConferenceDescriptor(experience)}
        locale={locale}
      />
    </>
  );
};

export default EventPage;
