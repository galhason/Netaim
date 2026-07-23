import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { isSupportedLocale } from '@/config/locales';
import { ExperienceStage } from '@/experience-runtime';
import { getDocumentExperience } from '@/features/experiences';
import '@/scenes';

interface DocumentExperiencePageProps {
  params: Promise<{ locale: string; slug: string }>;
}

const DocumentExperiencePage = async ({
  params,
}: DocumentExperiencePageProps) => {
  const { locale, slug } = await params;

  if (!isSupportedLocale(locale)) {
    notFound();
  }

  setRequestLocale(locale);

  const experience = await getDocumentExperience(slug);

  if (!experience) {
    notFound();
  }

  return <ExperienceStage experience={experience} locale={locale} />;
};

export default DocumentExperiencePage;
