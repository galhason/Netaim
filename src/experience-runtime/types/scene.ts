import type { ComponentType } from 'react';
import type { Locale } from '@/config/locales';

/*
 * The Scene contract (Constitution v2): a scene is a self-contained
 * package with full responsibility — renderer, optional editor,
 * validator, defaults, version. The core knows this contract and
 * nothing else.
 */
export type RuntimeMode = 'read' | 'preview' | 'edit' | 'presentation';

/*
 * Where a scene lives on the stage. Flow scenes play inside the main
 * journey; overlay scenes float above it (navigation); closing scenes
 * play after it (footer). The package declares its nature — the
 * composition never does (Constitution v2 §14).
 */
export type ScenePlacement = 'flow' | 'overlay' | 'closing';

export interface SceneComponentProps<TContent = unknown> {
  content: TContent;
  mode: RuntimeMode;
  locale: Locale;
  /*
   * The three presentation axes (Experience Engine v3): a variant
   * chooses the layout, density chooses how tightly it breathes,
   * emphasis chooses how loudly it speaks. All three are chosen by the
   * composition, declared by the package, and never affect content.
   */
  variant?: string;
  density?: string;
  emphasis?: string;
}

export interface SceneEditorProps<TContent = unknown> {
  content: TContent;
  locale: Locale;
  onChange: (content: TContent) => void;
}

export interface SceneDefinition<TContent = unknown> {
  type: string;
  version: number;
  placement?: ScenePlacement;
  /*
   * The presentation axes the package understands, beyond its default.
   * The composition may pick one per axis; unknown names fall back to
   * the default.
   */
  variants?: readonly string[];
  densities?: readonly string[];
  emphases?: readonly string[];
  renderer: ComponentType<SceneComponentProps<TContent>>;
  editor?: ComponentType<SceneEditorProps<TContent>>;
  validate?: (content: unknown) => content is TContent;
  defaultContent: TContent;
  migrate?: (content: unknown, fromVersion: number) => TContent;
}

export interface SceneInstance {
  id: string;
  type: string;
  version?: number;
  content: unknown;
  hidden?: boolean;
  variant?: string;
  density?: string;
  emphasis?: string;
}
