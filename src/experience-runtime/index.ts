export { ExperienceRuntime } from './components/experience-runtime';
export { ExperienceStage } from './components/experience-stage';
export { registerScene, resolveScene, listScenes } from './registry/scene-registry';
export {
  registerExperienceType,
  resolveExperienceType,
  experienceHasCapability,
} from './registry/experience-types';
export { canTransition, nextStages } from './model/lifecycle';
export { parseExperienceDescriptor } from './model/descriptor';
export { applyComposition } from './model/composition';
export type { CompositionEntry } from './model/composition';
export { LIFECYCLE_STAGES, EXPERIENCE_CAPABILITIES } from './types/experience';
export type {
  ExperienceDescriptor,
  ExperienceDna,
  ExperienceTexture,
  ExperienceTypeDefinition,
  ExperienceCapability,
  LifecycleStage,
} from './types/experience';
export type {
  RuntimeMode,
  ScenePlacement,
  SceneDefinition,
  SceneInstance,
  SceneComponentProps,
  SceneEditorProps,
} from './types/scene';
export type { ComposerCommands } from './composer/composer-contract';
