import type { ComponentType } from 'react';
import type { ZodType } from 'zod';
import type { Locale } from '@/config/locales';

/*
 * Scene type identifiers are open strings resolved against the registry.
 * The approved scene type catalog will constrain this in a later sprint
 * without changing the engine contract.
 */
export type SceneTypeId = string;

export interface SceneData<TContent = unknown> {
  id: string;
  type: SceneTypeId;
  title: string;
  enabled: boolean;
  content: TContent;
}

export interface SceneRenderContext {
  locale: Locale;
  eventSlug: string;
}

export interface SceneComponentProps<TContent = unknown> {
  scene: SceneData<TContent>;
  context: SceneRenderContext;
}

export type SceneComponent<TContent = unknown> = ComponentType<
  SceneComponentProps<TContent>
>;

export interface SceneModule<TContent = unknown> {
  default: SceneComponent<TContent>;
}

/*
 * A scene type is a plugin: schema guards CMS content at the engine
 * boundary, load enables code-splitting per scene type. Registering
 * a definition is the only step required to add a scene type.
 */
export interface SceneTypeDefinition<TContent = unknown> {
  type: SceneTypeId;
  contentSchema: ZodType<TContent>;
  load: () => Promise<SceneModule<TContent>>;
}
