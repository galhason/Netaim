import { CONFERENCE_SCENE_TYPES } from '../constants/cinematic-content';

/*
 * The Rhythm Assistant (Experience Engine v2): quiet editorial advice
 * over the composed journey. Every note is a suggestion, never a block —
 * the Studio guides, the editor decides.
 */
export interface JourneyScene {
  id: string;
  type: string;
  hidden?: boolean;
}

export interface JourneyNote {
  id: string;
  message: Record<'he' | 'en', string>;
  hint: Record<'he' | 'en', string>;
}

const MEDIA_HEAVY: readonly string[] = [
  CONFERENCE_SCENE_TYPES.arrival,
  CONFERENCE_SCENE_TYPES.moments,
  CONFERENCE_SCENE_TYPES.venue,
];

const CHROME: readonly string[] = [
  CONFERENCE_SCENE_TYPES.nav,
  CONFERENCE_SCENE_TYPES.footer,
];

const MIN_JOURNEY_SCENES = 4;
const BREATH_THRESHOLD = 6;

type RhythmRule = (journey: readonly JourneyScene[]) => JourneyNote | null;

const missingDoor: RhythmRule = (journey) =>
  journey.some(
    (scene) => scene.type === CONFERENCE_SCENE_TYPES.closing,
  )
    ? null
    : {
        id: 'rhythm/no-door',
        message: {
          he: 'המסע מסתיים בלי דלת — סצנת הסגירה מוסתרת.',
          en: 'The journey ends without a door — the closing scene is hidden.',
        },
        hint: {
          he: 'החזירו את הסגירה כדי שהמבקר יידע להצטרף.',
          en: 'Show the closing so the visitor knows how to join.',
        },
      };

const tooShort: RhythmRule = (journey) =>
  journey.length >= MIN_JOURNEY_SCENES
    ? null
    : {
        id: 'rhythm/too-short',
        message: {
          he: 'המסע קצר מכדי לספר סיפור.',
          en: 'The journey is too short to tell a story.',
        },
        hint: {
          he: 'הזמינו עוד סצנות מהמפה — סיפור, אנשים, מקום.',
          en: 'Invite more scenes from the map — story, people, place.',
        },
      };

const backToBackMedia: RhythmRule = (journey) => {
  for (let index = 1; index < journey.length; index += 1) {
    const previous = journey[index - 1];
    const current = journey[index];
    if (
      previous &&
      current &&
      MEDIA_HEAVY.includes(previous.type) &&
      MEDIA_HEAVY.includes(current.type)
    ) {
      return {
        id: 'rhythm/media-run',
        message: {
          he: 'שתי סצנות עתירות מדיה ברצף — הקצב עלול להתעייף.',
          en: 'Two media-heavy scenes in a row — the rhythm may tire.',
        },
        hint: {
          he: 'הפרידו ביניהן ברגע שקט — ציטוט, מספרים או פתיח מערכה.',
          en: 'Separate them with a quiet moment — quote, numbers or an act intro.',
        },
      };
    }
  }
  return null;
};

const noBreath: RhythmRule = (journey) =>
  journey.length >= BREATH_THRESHOLD &&
  !journey.some((scene) => scene.type === CONFERENCE_SCENE_TYPES.quote)
    ? {
        id: 'rhythm/no-breath',
        message: {
          he: 'מסע ארוך בלי הפוגה שקטה אחת.',
          en: 'A long journey without one quiet pause.',
        },
        hint: {
          he: 'החזירו את הציטוט — נשימה אחת באמצע הדרך.',
          en: 'Show the quote — one breath along the way.',
        },
      }
    : null;

const RULES: readonly RhythmRule[] = [
  missingDoor,
  tooShort,
  backToBackMedia,
  noBreath,
];

export const inspectJourney = (
  scenes: readonly JourneyScene[],
): JourneyNote[] => {
  const journey = scenes.filter(
    (scene) => scene.hidden !== true && !CHROME.includes(scene.type),
  );
  const notes: JourneyNote[] = [];
  for (const rule of RULES) {
    const note = rule(journey);
    if (note) {
      notes.push(note);
    }
  }
  return notes;
};
