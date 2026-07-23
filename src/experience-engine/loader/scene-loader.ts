import { lazy, type LazyExoticComponent } from 'react';
import type { SceneComponent, SceneTypeDefinition } from '../types/scene';

const cache = new WeakMap<
  SceneTypeDefinition,
  LazyExoticComponent<SceneComponent>
>();

/*
 * Lazy components are cached per definition: React.lazy must receive
 * the same reference across renders or Suspense remounts the scene.
 */
export const getLazySceneComponent = (
  definition: SceneTypeDefinition,
): LazyExoticComponent<SceneComponent> => {
  const cached = cache.get(definition);

  if (cached) {
    return cached;
  }

  const component = lazy(definition.load);
  cache.set(definition, component);
  return component;
};
