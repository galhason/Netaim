import type { SceneDefinition } from '../types/scene';

/*
 * The open catalog of Scene Packages. The single controlled type
 * erasure of the platform lives here: packages register with their
 * concrete content type and are stored under the shared contract; each
 * package's own renderer/validator restores the type at its boundary.
 */
const definitions = new Map<string, SceneDefinition>();

export const registerScene = <TContent>(
  definition: SceneDefinition<TContent>,
): void => {
  definitions.set(definition.type, definition as SceneDefinition);
};

export const resolveScene = (type: string): SceneDefinition | undefined =>
  definitions.get(type);

export const listScenes = (): SceneDefinition[] => [...definitions.values()];
