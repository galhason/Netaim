import { notFound } from 'next/navigation';
import { SUPPORTED_LOCALES, type Locale } from '@/config/locales';
import type { SceneData } from '@/experience-engine';
import { getEventExperience } from '@/features/events';
import { Composer } from '@/features/composer';

interface ComposerPageProps {
  params: Promise<{ slug: string }>;
}

const ComposerPage = async ({ params }: ComposerPageProps) => {
  const { slug } = await params;

  const entries = await Promise.all(
    SUPPORTED_LOCALES.map(async (locale) => {
      const content = await getEventExperience(slug, locale, { draft: true });
      return [locale, content?.scenes ?? null] as const;
    }),
  );

  if (entries.some(([, scenes]) => scenes === null)) {
    notFound();
  }

  const scenesByLocale = Object.fromEntries(
    entries.map(([locale, scenes]) => [locale, scenes as SceneData[]]),
  ) as Record<Locale, SceneData[]>;

  return <Composer eventSlug={slug} scenesByLocale={scenesByLocale} />;
};

export default ComposerPage;
