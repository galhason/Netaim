import type { SceneInstance } from '../types/scene';

/*
 * The Composer skeleton (Phase 1): the contract the real Composer
 * (Phase 3) will implement. One composer for every experience — it
 * reorders, hides, duplicates and edits scenes through their own
 * declared editors, never through bespoke screens.
 */
export interface ComposerCommands {
  reorder: (sceneIds: string[]) => void;
  hide: (sceneId: string, hidden: boolean) => void;
  duplicate: (sceneId: string) => void;
  update: (sceneId: string, content: SceneInstance['content']) => void;
}
