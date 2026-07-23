import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseExperienceDescriptor } from '@/experience-runtime';
import type { ExperienceDescriptor } from '@/experience-runtime';

/*
 * The document content source: declarative Experience documents kept as
 * JSON files under content/experiences. A new experience is a new
 * document — no route, no component, no code (Constitution v2, Phase 2
 * demo). The parser is the only gate between the file and the Runtime.
 */
const DOCUMENTS_DIR = join(process.cwd(), 'content', 'experiences');
const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

export const readExperienceDocument = async (
  slug: string,
): Promise<ExperienceDescriptor | null> => {
  if (!SLUG_PATTERN.test(slug)) {
    return null;
  }
  try {
    const raw = await readFile(join(DOCUMENTS_DIR, `${slug}.json`), 'utf8');
    return parseExperienceDescriptor(JSON.parse(raw));
  } catch {
    return null;
  }
};
