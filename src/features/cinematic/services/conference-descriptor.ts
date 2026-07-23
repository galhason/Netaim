import { BRAND_NAME } from '@/config/brand';
import { applyComposition } from '@/experience-runtime';
import type { ExperienceDescriptor, SceneInstance } from '@/experience-runtime';
import {
  CONFERENCE_SCENE_TYPES,
  NAV_LINKS,
} from '../constants/cinematic-content';
import {
  ACT_INTRO_SCENES,
  CONFERENCE_ACT_TITLES,
} from '../constants/conference-acts';
import { completeComposition } from '../utils/composition';
import type { ConferenceExperience, NavSection } from '../types/cinematic';

/*
 * A conference as a declarative Experience: the journey described as
 * data, rendered by the one Runtime. Scenes born hidden (Experience
 * Engine v2) travel with the descriptor and wait for the composition to
 * invite them in; the navigation is derived from the visible journey —
 * never configured by hand.
 */
const ACT_INTRO_INDEX: Record<string, string> = {
  'intro-story': 'ACT 02',
  'intro-people': 'ACT 03',
  'intro-experience': 'ACT 04',
  'intro-join': 'ACT 05',
};

const actIntroInstance = (id: string): SceneInstance => {
  const actId = ACT_INTRO_SCENES[id] ?? '';
  return {
    id,
    type: CONFERENCE_SCENE_TYPES.actIntro,
    hidden: true,
    content: {
      number: ACT_INTRO_INDEX[id] ?? 'ACT',
      title: CONFERENCE_ACT_TITLES[actId] ?? { he: '', en: '' },
    },
  };
};

const deriveSections = (scenes: SceneInstance[]): NavSection[] => {
  const visible = new Set(
    scenes.filter((scene) => scene.hidden !== true).map((scene) => scene.id),
  );
  return NAV_LINKS.filter(
    (link) => link.id === 'register' || visible.has(link.id),
  ).map((link) => ({ id: link.id, label: link.label }));
};

export const buildConferenceDescriptor = (
  experience: ConferenceExperience,
): ExperienceDescriptor => {
  const scenes = applyComposition(
    [
      {
        id: 'nav',
        type: CONFERENCE_SCENE_TYPES.nav,
        content: {
          brand: BRAND_NAME,
          registerHref: experience.registerHref,
          meHref: experience.meHref,
        },
      },
      {
        id: 'arrival',
        type: CONFERENCE_SCENE_TYPES.arrival,
        content: {
          arrival: {
            ...experience.arrival,
            avatars: experience.speakers
              .map((speaker) => speaker.photo)
              .slice(0, 5),
          },
          registerHref: experience.registerHref,
        },
      },
      {
        id: 'countdown',
        type: CONFERENCE_SCENE_TYPES.countdown,
        hidden: true,
        content: experience.countdown,
      },
      {
        id: 'facts',
        type: CONFERENCE_SCENE_TYPES.facts,
        hidden: true,
        content: experience.facts,
      },
      actIntroInstance('intro-story'),
      {
        id: 'story',
        type: CONFERENCE_SCENE_TYPES.story,
        content: experience.story,
      },
      { id: 'quote', type: CONFERENCE_SCENE_TYPES.quote, content: experience.why },
      {
        id: 'moments',
        type: CONFERENCE_SCENE_TYPES.moments,
        content: experience.moments,
      },
      {
        id: 'featured-sessions',
        type: CONFERENCE_SCENE_TYPES.featuredSessions,
        content: experience.featuredSessions,
      },
      actIntroInstance('intro-people'),
      {
        id: 'speakers',
        type: CONFERENCE_SCENE_TYPES.speakers,
        content: experience.speakers,
      },
      {
        id: 'sponsors',
        type: CONFERENCE_SCENE_TYPES.sponsors,
        content: experience.sponsors,
      },
      actIntroInstance('intro-experience'),
      {
        id: 'program',
        type: CONFERENCE_SCENE_TYPES.program,
        content: experience.program,
      },
      {
        id: 'venue',
        type: CONFERENCE_SCENE_TYPES.venue,
        content: experience.venue,
      },
      actIntroInstance('intro-join'),
      {
        id: 'closing',
        type: CONFERENCE_SCENE_TYPES.closing,
        content: {
          closing: experience.closing,
          registerHref: experience.registerHref,
          facts: experience.facts,
        },
      },
      {
        id: 'footer',
        type: CONFERENCE_SCENE_TYPES.footer,
        content: { brand: BRAND_NAME },
      },
    ],
    completeComposition(experience.composition ?? []),
  );

  const sections = deriveSections(scenes);
  return {
    id: 'conference',
    type: 'conference',
    lifecycle: 'live',
    dna: { tone: experience.tone, texture: 'clean' },
    scenes: scenes.map((scene) =>
      scene.id === 'nav'
        ? {
            ...scene,
            content: { ...(scene.content as object), sections },
          }
        : scene,
    ),
  };
};
