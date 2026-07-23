import { sceneRegistry } from '@/experience-engine';
import { SCENE_TYPES } from '../constants/scene-types';
import { heroContentSchema } from '../schemas/hero';
import { storyContentSchema } from '../schemas/story';
import { contentSceneSchema } from '../schemas/content';
import { agendaContentSchema } from '../schemas/agenda';
import { sessionListContentSchema } from '../schemas/session-list';
import { speakerGridContentSchema } from '../schemas/speaker-grid';
import { venueContentSchema } from '../schemas/venue';
import { sponsorGridContentSchema } from '../schemas/sponsor-grid';
import { faqContentSchema } from '../schemas/faq';
import { registrationCtaContentSchema } from '../schemas/registration-cta';

let registered = false;

/*
 * Idempotent by design: the registry rejects duplicates, and module
 * re-evaluation (dev HMR, multiple entry points) must not throw.
 */
export const registerExperienceScenes = (): void => {
  if (registered) {
    return;
  }
  registered = true;

  sceneRegistry.register({
    type: SCENE_TYPES.hero,
    contentSchema: heroContentSchema,
    load: () => import('../components/hero-scene'),
  });
  sceneRegistry.register({
    type: SCENE_TYPES.story,
    contentSchema: storyContentSchema,
    load: () => import('../components/story-scene'),
  });
  sceneRegistry.register({
    type: SCENE_TYPES.content,
    contentSchema: contentSceneSchema,
    load: () => import('../components/content-scene'),
  });
  sceneRegistry.register({
    type: SCENE_TYPES.agenda,
    contentSchema: agendaContentSchema,
    load: () => import('../components/agenda-scene'),
  });
  sceneRegistry.register({
    type: SCENE_TYPES.sessionList,
    contentSchema: sessionListContentSchema,
    load: () => import('../components/session-list-scene'),
  });
  sceneRegistry.register({
    type: SCENE_TYPES.speakerGrid,
    contentSchema: speakerGridContentSchema,
    load: () => import('../components/speaker-grid-scene'),
  });
  sceneRegistry.register({
    type: SCENE_TYPES.venue,
    contentSchema: venueContentSchema,
    load: () => import('../components/venue-scene'),
  });
  sceneRegistry.register({
    type: SCENE_TYPES.sponsorGrid,
    contentSchema: sponsorGridContentSchema,
    load: () => import('../components/sponsor-grid-scene'),
  });
  sceneRegistry.register({
    type: SCENE_TYPES.faq,
    contentSchema: faqContentSchema,
    load: () => import('../components/faq-scene'),
  });
  sceneRegistry.register({
    type: SCENE_TYPES.registrationCta,
    contentSchema: registrationCtaContentSchema,
    load: () => import('../components/registration-cta-scene'),
  });
};
