import type { SceneData } from '@/experience-engine';
import type { ComposerAction, ComposerState } from '../types/composer';
import { setAtPath } from '../utils/content-path';

const mapScenes = (
  state: ComposerState,
  transform: (scenes: SceneData[]) => SceneData[],
): ComposerState => ({
  ...state,
  scenesByLocale: Object.fromEntries(
    Object.entries(state.scenesByLocale).map(([locale, scenes]) => [
      locale,
      transform(scenes),
    ]),
  ) as ComposerState['scenesByLocale'],
});

const mapScene = (
  state: ComposerState,
  sceneId: string,
  transform: (scene: SceneData) => SceneData,
  currentLocaleOnly = false,
): ComposerState => ({
  ...state,
  scenesByLocale: Object.fromEntries(
    Object.entries(state.scenesByLocale).map(([locale, scenes]) => [
      locale,
      currentLocaleOnly && locale !== state.locale
        ? scenes
        : scenes.map((scene) =>
            scene.id === sceneId ? transform(scene) : scene,
          ),
    ]),
  ) as ComposerState['scenesByLocale'],
});

const duplicateIn = (scenes: SceneData[], sceneId: string): SceneData[] => {
  const index = scenes.findIndex((scene) => scene.id === sceneId);
  const source = scenes[index];
  if (!source) {
    return scenes;
  }
  const copy: SceneData = {
    ...source,
    id: `${source.id}-copy`,
    content:
      typeof source.content === 'object' && source.content !== null
        ? { ...(source.content as Record<string, unknown>) }
        : source.content,
  };
  return [...scenes.slice(0, index + 1), copy, ...scenes.slice(index + 1)];
};

const moveIn = (
  scenes: SceneData[],
  sceneId: string,
  direction: 'up' | 'down',
): SceneData[] => {
  const index = scenes.findIndex((scene) => scene.id === sceneId);
  const target = direction === 'up' ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= scenes.length) {
    return scenes;
  }
  const next = [...scenes];
  const [moved] = next.splice(index, 1);
  next.splice(target, 0, moved as SceneData);
  return next;
};

export const composerReducer = (
  state: ComposerState,
  action: ComposerAction,
): ComposerState => {
  if (action.type === 'select') {
    return { ...state, selectedSceneId: action.sceneId };
  }
  if (action.type === 'setLocale') {
    return { ...state, locale: action.locale };
  }
  if (action.type === 'setDevice') {
    return { ...state, device: action.device };
  }
  if (action.type === 'updateField') {
    return mapScene(
      state,
      action.sceneId,
      (scene) => ({
        ...scene,
        content: setAtPath(scene.content, action.path, action.value),
      }),
      true,
    );
  }
  if (action.type === 'rename') {
    return mapScene(
      state,
      action.sceneId,
      (scene) => ({ ...scene, title: action.title }),
      true,
    );
  }
  if (action.type === 'toggle') {
    return mapScene(state, action.sceneId, (scene) => ({
      ...scene,
      enabled: !scene.enabled,
    }));
  }
  if (action.type === 'duplicate') {
    return mapScenes(state, (scenes) => duplicateIn(scenes, action.sceneId));
  }
  if (action.type === 'move') {
    return mapScenes(state, (scenes) =>
      moveIn(scenes, action.sceneId, action.direction),
    );
  }
  return {
    ...state,
    identity: { ...state.identity, [action.dimension]: action.value },
  };
};
