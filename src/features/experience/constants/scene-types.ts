export const SCENE_TYPES = {
  hero: 'hero',
  story: 'story',
  content: 'content',
  agenda: 'agenda',
  sessionList: 'session-list',
  speakerGrid: 'speaker-grid',
  venue: 'venue',
  sponsorGrid: 'sponsor-grid',
  faq: 'faq',
  registrationCta: 'registration-cta',
} as const;

export type ExperienceSceneType =
  (typeof SCENE_TYPES)[keyof typeof SCENE_TYPES];
