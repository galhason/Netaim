import type { SceneInstance } from '../types/scene';

/*
 * Composition as data (Constitution v2 §13, §14): an ordered list of
 * scene ids with visibility flags is all the Composer persists. This
 * pure function applies it to a scene list — mentioned scenes take the
 * stored order and visibility, unmentioned scenes keep their original
 * relative order after them, unknown ids are ignored. An empty
 * composition leaves the experience exactly as authored.
 */
export interface CompositionEntry {
  scene: string;
  hidden?: boolean;
  variant?: string;
  density?: string;
  emphasis?: string;
}

export const applyComposition = (
  scenes: SceneInstance[],
  composition: CompositionEntry[],
): SceneInstance[] => {
  if (composition.length === 0) {
    return scenes;
  }
  const byId = new Map(scenes.map((scene) => [scene.id, scene]));
  const placed = new Set<string>();
  const ordered: SceneInstance[] = [];
  for (const entry of composition) {
    const scene = byId.get(entry.scene);
    if (!scene || placed.has(entry.scene)) {
      continue;
    }
    placed.add(entry.scene);
    ordered.push({
      ...scene,
      hidden: entry.hidden === true ? true : undefined,
      variant: entry.variant || undefined,
      density: entry.density || undefined,
      emphasis: entry.emphasis || undefined,
    });
  }
  for (const scene of scenes) {
    if (!placed.has(scene.id)) {
      ordered.push(scene);
    }
  }
  return ordered;
};
