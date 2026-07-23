import type { GuidingTone } from '@/shared';
import type { SceneInstance } from './scene';

/*
 * An Experience is declarative (Constitution v2 §13): it describes what
 * it is — type, lifecycle stage, DNA, scenes — and the Runtime decides
 * how it is rendered.
 */
export const LIFECYCLE_STAGES = [
  'draft',
  'planning',
  'building',
  'review',
  'scheduled',
  'live',
  'inProgress',
  'completed',
  'archive',
] as const;

export type LifecycleStage = (typeof LIFECYCLE_STAGES)[number];

export const EXPERIENCE_CAPABILITIES = [
  'hero',
  'story',
  'moments',
  'portalWall',
  'agenda',
  'speakers',
  'venue',
  'registration',
  'sponsors',
  'networking',
  'liveStream',
  'gallery',
] as const;

export type ExperienceCapability = (typeof EXPERIENCE_CAPABILITIES)[number];

export interface ExperienceTypeDefinition {
  id: string;
  capabilities: ExperienceCapability[];
}

/*
 * The air an experience breathes: 'dust' keeps a faint particle layer
 * alive above every scene; 'clean' leaves the atmosphere to the scenes
 * themselves.
 */
export type ExperienceTexture = 'dust' | 'clean';

export interface ExperienceDna {
  tone: GuidingTone;
  texture?: ExperienceTexture;
}

export interface ExperienceDescriptor {
  id: string;
  type: string;
  lifecycle: LifecycleStage;
  dna: ExperienceDna;
  scenes: SceneInstance[];
}
