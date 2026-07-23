import type { Finding } from '@/event-engine';
import type { SceneData } from '../types/scene';

/*
 * Editorial intelligence, not validation (Experience-Identity.md):
 * a read-only analyzer over the experience narrative. Identity-aware
 * checks arrive when Experience Identity is modeled (S4); the rhythm
 * and narrative rules below need no identity.
 */
const MEDIA_HEAVY_TYPES = ['hero', 'venue', 'gallery'] as const;
const PURPOSE_MAX_CHARACTERS = 600;

interface HeroLikeContent {
  subheadline?: unknown;
  description?: unknown;
  backgroundImage?: unknown;
}

interface StoryLikeContent {
  paragraphs?: unknown;
}

const isMediaHeavy = (scene: SceneData): boolean =>
  (MEDIA_HEAVY_TYPES as readonly string[]).includes(scene.type);

type InspectorRule = (scenes: readonly SceneData[]) => Finding[];

const consecutiveMediaScenes: InspectorRule = (scenes) => {
  for (let i = 1; i < scenes.length; i += 1) {
    const previous = scenes[i - 1];
    const current = scenes[i];
    if (previous && current && isMediaHeavy(previous) && isMediaHeavy(current)) {
      return [
        {
          id: 'inspector/consecutive-media',
          severity: 'advice',
          category: 'experience',
          message: {
            he: 'שתי סצנות עתירות מדיה ברצף — הקצב עלול להתעייף.',
            en: 'Two media-heavy scenes in sequence — the rhythm may tire.',
          },
          action: {
            he: 'שקלו סצנת טקסט שקטה ביניהן.',
            en: 'Consider a quiet typographic scene between them.',
          },
        },
      ];
    }
  }
  return [];
};

const heroEmotionalAnchor: InspectorRule = (scenes) => {
  const hero = scenes.find((scene) => scene.type === 'hero');
  if (!hero) {
    return [];
  }
  const content = hero.content as HeroLikeContent;
  return !content.subheadline && !content.description
    ? [
        {
          id: 'inspector/hero-anchor-missing',
          severity: 'warning',
          category: 'experience',
          message: {
            he: 'לסצנת הפתיחה אין עוגן רגשי — כותרת בלבד.',
            en: 'The arrival scene has no emotional anchor — a headline alone.',
          },
          action: {
            he: 'הוסיפו שורת משנה או משפט תיאור אחד.',
            en: 'Add a subheadline or one descriptive sentence.',
          },
        },
      ]
    : [];
};

const purposeTooLong: InspectorRule = (scenes) => {
  const story = scenes.find((scene) => scene.type === 'story');
  if (!story) {
    return [];
  }
  const paragraphs = (story.content as StoryLikeContent).paragraphs;
  if (!Array.isArray(paragraphs)) {
    return [];
  }
  const length = paragraphs.join(' ').length;
  return length > PURPOSE_MAX_CHARACTERS
    ? [
        {
          id: 'inspector/purpose-too-long',
          severity: 'advice',
          category: 'experience',
          message: {
            he: 'פרק הייעוד ארוך מהמקצב העריכתי.',
            en: 'The purpose chapter runs longer than the editorial rhythm.',
          },
          action: {
            he: 'קצרו את הנרטיב או העבירו חלק לציטוט.',
            en: 'Shorten the narrative or move part of it into the quote.',
          },
        },
      ]
    : [];
};

const joinPresence: InspectorRule = (scenes) => {
  const hasJoin = scenes.some((scene) => scene.type === 'registration-cta');
  if (!hasJoin) {
    return [
      {
        id: 'inspector/join-missing',
        severity: 'warning',
        category: 'experience',
        message: {
          he: 'למסע אין פרק סיום — המבקר נשאר בלי דלת.',
          en: 'The journey has no closing chapter — the visitor is left without a door.',
        },
        action: {
          he: 'הוסיפו סצנת הצטרפות בסוף המסע.',
          en: 'Add a join scene at the end of the journey.',
        },
      },
    ];
  }
  const last = scenes[scenes.length - 1];
  return last && last.type !== 'registration-cta'
    ? [
        {
          id: 'inspector/join-not-last',
          severity: 'advice',
          category: 'experience',
          message: {
            he: 'פרק ההצטרפות אינו סוגר את המסע.',
            en: 'The join chapter does not close the journey.',
          },
          action: {
            he: 'העבירו את ההצטרפות לסוף.',
            en: 'Move the join chapter to the end.',
          },
        },
      ]
    : [];
};

const narrativeRhythm: InspectorRule = (scenes) => {
  for (let i = 1; i < scenes.length; i += 1) {
    const previous = scenes[i - 1];
    const current = scenes[i];
    if (previous && current && previous.type === current.type) {
      return [
        {
          id: 'inspector/repeated-scene-type',
          severity: 'advice',
          category: 'experience',
          message: {
            he: 'שתי סצנות עוקבות מאותו סוג — המקצב חוזר על עצמו.',
            en: 'Two consecutive scenes of the same type — the rhythm repeats.',
          },
          action: {
            he: 'אחדו אותן או הפרידו בסצנה מסוג אחר.',
            en: 'Merge them or separate them with a different scene type.',
          },
        },
      ];
    }
  }
  return [];
};

const RULES: readonly InspectorRule[] = [
  consecutiveMediaScenes,
  heroEmotionalAnchor,
  purposeTooLong,
  joinPresence,
  narrativeRhythm,
];

export const inspectExperience = (
  scenes: readonly SceneData[],
): Finding[] => {
  const enabled = scenes.filter((scene) => scene.enabled);
  return RULES.flatMap((rule) => rule(enabled));
};
