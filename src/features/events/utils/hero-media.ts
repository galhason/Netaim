import type { SceneData } from '@/experience-engine';

export const firstSceneHasMedia = (scenes: readonly SceneData[]): boolean => {
  const first = scenes[0];

  if (!first || typeof first.content !== 'object' || first.content === null) {
    return false;
  }

  return Boolean(
    (first.content as { backgroundImage?: unknown }).backgroundImage,
  );
};
