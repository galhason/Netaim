import type { SceneTypeDefinition, SceneTypeId } from '../types/scene';

export interface SceneRegistry {
  register: <TContent>(definition: SceneTypeDefinition<TContent>) => void;
  resolve: (type: SceneTypeId) => SceneTypeDefinition | null;
  has: (type: SceneTypeId) => boolean;
  types: () => SceneTypeId[];
}

/*
 * Duplicate registration throws: one source of truth per scene type.
 * Content types are erased at the registry boundary; the definition's
 * schema restores type safety at validation time.
 */
export const createSceneRegistry = (): SceneRegistry => {
  const definitions = new Map<SceneTypeId, SceneTypeDefinition>();

  return {
    register: (definition) => {
      if (definitions.has(definition.type)) {
        throw new Error(`Scene type already registered: ${definition.type}`);
      }
      definitions.set(
        definition.type,
        definition as unknown as SceneTypeDefinition,
      );
    },
    resolve: (type) => definitions.get(type) ?? null,
    has: (type) => definitions.has(type),
    types: () => Array.from(definitions.keys()),
  };
};

export const sceneRegistry = createSceneRegistry();
