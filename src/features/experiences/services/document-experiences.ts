import type { ExperienceDescriptor } from '@/experience-runtime';
import { readExperienceDocument } from '@/infrastructure';
import { cacheTags, cachedContent } from '@/shared/cache/content-cache';

/*
 * Document experiences: declarative Experiences that exist purely as
 * data. The service only forwards to the composition root — which
 * document store answers is an infrastructure decision.
 *
 * The document is the same for every visitor and the page reads nothing
 * else, so it is served from cache. There is no locale in the key: the
 * descriptor carries every locale and the stage chooses at render time.
 *
 * These documents are files shipped with the build, and there is no
 * Studio write path that could clear the tag — so the ceiling is short
 * rather than the usual hour, and a deploy is what really refreshes it.
 */
const DOCUMENT_TTL_SECONDS = 5 * 60;

export const getDocumentExperience = (
  slug: string,
): Promise<ExperienceDescriptor | null> =>
  cachedContent(
    readExperienceDocument,
    ['document-experience', slug],
    [cacheTags.experience(slug)],
    DOCUMENT_TTL_SECONDS,
  )(slug);
