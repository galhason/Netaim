import type { SceneData, SceneTypeDefinition } from '../types/scene';
import type { SceneRegistry } from '../registry/scene-registry';
import { validateSceneContent } from '../validation/scene-validation';

export type SceneFailureReason = 'unknown-type' | 'invalid-content';

export interface ResolvedScene {
  scene: SceneData;
  definition: SceneTypeDefinition;
  content: unknown;
}

export interface SceneFailure {
  scene: SceneData;
  reason: SceneFailureReason;
  issues: string[];
}

export interface SceneResolution {
  scenes: ResolvedScene[];
  failures: SceneFailure[];
}

/*
 * Resolution is pure and framework-free so it can be tested without
 * rendering. Failures are collected, never thrown: a misconfigured
 * scene degrades to a fallback while the rest of the experience renders.
 */
export const resolveScenes = (
  scenes: readonly SceneData[],
  registry: SceneRegistry,
): SceneResolution => {
  const resolved: ResolvedScene[] = [];
  const failures: SceneFailure[] = [];

  for (const scene of scenes) {
    if (!scene.enabled) {
      continue;
    }

    const definition = registry.resolve(scene.type);

    if (!definition) {
      failures.push({ scene, reason: 'unknown-type', issues: [] });
      continue;
    }

    const validation = validateSceneContent(
      definition.contentSchema,
      scene.content,
    );

    if (!validation.valid) {
      failures.push({
        scene,
        reason: 'invalid-content',
        issues: validation.issues,
      });
      continue;
    }

    resolved.push({ scene, definition, content: validation.content });
  }

  return { scenes: resolved, failures };
};
