export type {
  SceneTypeId,
  SceneData,
  SceneRenderContext,
  SceneComponentProps,
  SceneComponent,
  SceneModule,
  SceneTypeDefinition,
} from './types/scene';
export type { ExperienceData } from './types/experience';
export { createSceneRegistry, sceneRegistry } from './registry/scene-registry';
export type { SceneRegistry } from './registry/scene-registry';
export { resolveScenes } from './resolver/scene-resolver';
export type {
  ResolvedScene,
  SceneFailure,
  SceneFailureReason,
  SceneResolution,
} from './resolver/scene-resolver';
export { validateSceneContent } from './validation/scene-validation';
export type { SceneContentValidation } from './validation/scene-validation';
export { getLazySceneComponent } from './loader/scene-loader';
export { inspectExperience } from './inspector/experience-inspector';
export { SceneErrorBoundary } from './components/scene-error-boundary';
export { ExperienceRenderer } from './components/experience-renderer';
