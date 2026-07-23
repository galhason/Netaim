import { notFound } from 'next/navigation';
import { isSupportedLocale, type Locale } from '@/config/locales';
import { ExperienceStage } from '@/experience-runtime';
import {
  buildConferenceDescriptor,
  getConferenceExperiencePreview,
} from '@/features/cinematic';
import { CanvasSelectBridge } from '@/features/studio';
import '@/scenes';

/*
 * The draft canvas: the exact public Runtime rendering the exact draft
 * data — the director watches the next take before it goes live. The
 * Studio's sign-in gate guards this route; the public site never links
 * here (Constitution v2 §1, §6).
 */
interface PreviewPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ content?: string; scene?: string }>;
}

const PreviewPage = async ({ params, searchParams }: PreviewPageProps) => {
  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug);
  const { content, scene } = await searchParams;
  const locale: Locale =
    content && isSupportedLocale(content) ? content : 'he';

  const experience = await getConferenceExperiencePreview(slug, locale);

  if (!experience) {
    notFound();
  }

  const descriptor = buildConferenceDescriptor(experience);
  /*
   * Focus take (approved flow): while a scene is being directed, the
   * canvas shows that scene alone — no scrolling, no getting lost.
   */
  const focused = scene
    ? {
        ...descriptor,
        scenes: descriptor.scenes.filter((entry) => entry.type === scene),
      }
    : descriptor;

  return (
    <>
      <CanvasSelectBridge />
      <ExperienceStage
        experience={focused.scenes.length > 0 ? focused : descriptor}
        mode="preview"
        locale={locale}
      />
    </>
  );
};

export default PreviewPage;
