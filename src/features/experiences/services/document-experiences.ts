import type { ExperienceDescriptor } from '@/experience-runtime';
import { readExperienceDocument } from '@/infrastructure';

/*
 * Document experiences: declarative Experiences that exist purely as
 * data. The service only forwards to the composition root — which
 * document store answers is an infrastructure decision.
 */
export const getDocumentExperience = (
  slug: string,
): Promise<ExperienceDescriptor | null> => readExperienceDocument(slug);
