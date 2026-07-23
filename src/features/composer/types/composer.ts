import type { Locale } from '@/config/locales';
import type { SceneData } from '@/experience-engine';

export type ComposerDevice = 'desktop' | 'tablet' | 'mobile';

export interface ExperienceIdentityDraft {
  photographyStyle: string;
  atmosphere: string;
  venuePersonality: string;
  motionLevel: string;
  editorialDensity: string;
  contentTone: string;
}

export interface ComposerState {
  scenesByLocale: Record<Locale, SceneData[]>;
  locale: Locale;
  device: ComposerDevice;
  selectedSceneId: string | null;
  identity: ExperienceIdentityDraft;
}

export type ComposerAction =
  | { type: 'select'; sceneId: string | null }
  | { type: 'setLocale'; locale: Locale }
  | { type: 'setDevice'; device: ComposerDevice }
  | { type: 'updateField'; sceneId: string; path: string; value: string }
  | { type: 'rename'; sceneId: string; title: string }
  | { type: 'toggle'; sceneId: string }
  | { type: 'duplicate'; sceneId: string }
  | { type: 'move'; sceneId: string; direction: 'up' | 'down' }
  | { type: 'setIdentity'; dimension: keyof ExperienceIdentityDraft; value: string };
