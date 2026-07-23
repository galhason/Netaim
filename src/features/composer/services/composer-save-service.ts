import type { Locale } from '@/config/locales';
import { sceneContentRepository } from '@/infrastructure';

export interface ComposerSceneContent {
  id: string;
  content: unknown;
}

/*
 * Composer persistence — increment 1: the panel's content edits are made
 * durable through the existing SceneContentRepository. Scene order,
 * versions, restore and launch-diff remain the reserved ComposerPersistence
 * contract (a following increment); unsaved duplicates (`-copy` ids) are
 * skipped until scene creation lands with them.
 */
export const saveComposerContent = async (
  locale: Locale,
  scenes: readonly ComposerSceneContent[],
): Promise<number> => {
  let saved = 0;
  for (const scene of scenes) {
    if (scene.id.includes('-copy')) {
      continue;
    }
    if (typeof scene.content !== 'object' || scene.content === null) {
      continue;
    }
    await sceneContentRepository.updateSceneContent(
      scene.id,
      locale,
      scene.content as Record<string, unknown>,
    );
    saved += 1;
  }
  return saved;
};
