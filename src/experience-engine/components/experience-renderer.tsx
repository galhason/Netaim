'use client';

import { Suspense, useEffect, useMemo, type ReactNode } from 'react';
import { createLogger } from '@/shared';
import { sceneRegistry, type SceneRegistry } from '../registry/scene-registry';
import { resolveScenes } from '../resolver/scene-resolver';
import { getLazySceneComponent } from '../loader/scene-loader';
import { SceneErrorBoundary } from './scene-error-boundary';
import type { SceneData, SceneRenderContext } from '../types/scene';

const log = createLogger('experience-engine');

interface ExperienceRendererProps {
  scenes: readonly SceneData[];
  context: SceneRenderContext;
  registry?: SceneRegistry;
  sceneFallback?: ReactNode;
}

/*
 * The renderer knows no individual scene implementation: resolution is
 * registration-based, so new scene types require zero renderer changes.
 * Each scene is isolated behind its own error boundary and Suspense
 * boundary; a failing or unknown scene degrades to the fallback while
 * the remaining scenes continue to render. The wrapper carries the
 * scene id so navigation can anchor to any scene.
 */
export const ExperienceRenderer = ({
  scenes,
  context,
  registry = sceneRegistry,
  sceneFallback = null,
}: ExperienceRendererProps) => {
  const resolution = useMemo(
    () => resolveScenes(scenes, registry),
    [scenes, registry],
  );

  useEffect(() => {
    for (const failure of resolution.failures) {
      log.warn('Scene skipped', {
        eventSlug: context.eventSlug,
        sceneId: failure.scene.id,
        sceneType: failure.scene.type,
        reason: failure.reason,
        issues: failure.issues,
      });
    }
  }, [resolution.failures, context.eventSlug]);

  return (
    <>
      {resolution.scenes.map(({ scene, definition, content }) => {
        const LazyScene = getLazySceneComponent(definition);

        return (
          <div key={scene.id} id={scene.id}>
            <SceneErrorBoundary
              sceneId={scene.id}
              sceneType={scene.type}
              fallback={sceneFallback}
            >
              <Suspense fallback={sceneFallback}>
                <LazyScene scene={{ ...scene, content }} context={context} />
              </Suspense>
            </SceneErrorBoundary>
          </div>
        );
      })}
    </>
  );
};
