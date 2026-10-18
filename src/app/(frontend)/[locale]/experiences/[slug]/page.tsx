import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { isSupportedLocale } from '@/config/locales';
import { ExperienceStage } from '@/experience-runtime';
import { getDocumentExperience } from '@/features/experiences';
import { requireParticipant } from '@/features/registration';
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

  /* Read by people who registered: a visitor is sent to sign in, and brought back here. */
  const me = await requireParticipant(locale, `/${locale}/experiences/${slug}`);
  const experience = await getDocumentExperience(slug);

  if (!experience) {
    notFound();
  }

  return (
    <ExperienceStage
      experience={experience}
      locale={locale}
      viewer={{ name: me.name || me.email }}
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
