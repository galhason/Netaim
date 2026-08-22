import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { isSupportedLocale } from '@/config/locales';
import { ExperienceStage } from '@/experience-runtime';
import { getDocumentExperience } from '@/features/experiences';
import { currentParticipant } from '@/features/registration';
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

  const me = await currentParticipant().catch(() => null);
  return (
    <ExperienceStage
      experience={experience}
      locale={locale}
      viewer={me ? { name: me.name || me.email } : null}
    />
  );
};

/*
 * The nav in this experience says who is looking, so the page depends
 * on the visitor and must not be prerendered or shared. The descriptor
 * it renders is still cached — only the viewer is per request.
 */
export const dynamic = 'force-dynamic';

export default DocumentExperiencePage;
