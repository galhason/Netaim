import { isGuidingTone } from '@/shared/utils/guiding-tones';
import { LIFECYCLE_STAGES } from '../types/experience';
import type {
  ExperienceDescriptor,
  ExperienceTexture,
  LifecycleStage,
} from '../types/experience';
import type { SceneInstance } from '../types/scene';

/*
 * The declarative gate (Constitution v2 §13): raw data — a JSON
 * document, a CMS row, a composer draft — becomes an Experience only
 * through this parser. A malformed document yields null; a malformed
 * scene is dropped so the experience always plays.
 */
const TEXTURES: readonly ExperienceTexture[] = ['dust', 'clean'];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isLifecycleStage = (value: unknown): value is LifecycleStage =>
  typeof value === 'string' &&
  (LIFECYCLE_STAGES as readonly string[]).includes(value);

const isTexture = (value: unknown): value is ExperienceTexture =>
  typeof value === 'string' &&
  (TEXTURES as readonly string[]).includes(value);

const parseScene = (input: unknown): SceneInstance | null => {
  if (!isRecord(input)) {
    return null;
  }
  const { id, type, content, version, hidden } = input;
  if (typeof id !== 'string' || id === '') {
    return null;
  }
  if (typeof type !== 'string' || type === '') {
    return null;
  }
  if (content === undefined) {
    return null;
  }
  return {
    id,
    type,
    content,
    ...(typeof version === 'number' ? { version } : {}),
    ...(typeof hidden === 'boolean' ? { hidden } : {}),
  };
};

export const parseExperienceDescriptor = (
  input: unknown,
): ExperienceDescriptor | null => {
  if (!isRecord(input)) {
    return null;
  }
  const { id, type, lifecycle, dna, scenes } = input;
  if (typeof id !== 'string' || id === '') {
    return null;
  }
  if (typeof type !== 'string' || type === '') {
    return null;
  }
  if (!isLifecycleStage(lifecycle)) {
    return null;
  }
  if (!isRecord(dna) || typeof dna.tone !== 'string' || !isGuidingTone(dna.tone)) {
    return null;
  }
  if (dna.texture !== undefined && !isTexture(dna.texture)) {
    return null;
  }
  if (!Array.isArray(scenes)) {
    return null;
  }
  return {
    id,
    type,
    lifecycle,
    dna: {
      tone: dna.tone,
      ...(isTexture(dna.texture) ? { texture: dna.texture } : {}),
    },
    scenes: scenes
      .map(parseScene)
      .filter((scene): scene is SceneInstance => scene !== null),
  };
};
