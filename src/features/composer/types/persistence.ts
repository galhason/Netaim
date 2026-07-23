import type { Locale } from '@/config/locales';
import type { SceneData } from '@/experience-engine';
import type { ExperienceIdentityDraft } from './composer';

/*
 * The reserved persistence boundary (Master Sprint 03): drafts,
 * history, restore, compare, review and launch all flow through this
 * contract when versioning is implemented (S4). The Composer composes
 * against it; no implementation exists yet by design.
 */
export interface ComposerSnapshot {
  eventSlug: string;
  scenesByLocale: Record<Locale, SceneData[]>;
  identity: ExperienceIdentityDraft;
}

export interface ComposerPersistence {
  saveDraft: (snapshot: ComposerSnapshot) => Promise<void>;
  history: (eventSlug: string) => Promise<{ id: string; savedAt: string }[]>;
  restore: (versionId: string) => Promise<ComposerSnapshot>;
  submitForReview: (snapshot: ComposerSnapshot) => Promise<void>;
  launch: (snapshot: ComposerSnapshot) => Promise<void>;
}
