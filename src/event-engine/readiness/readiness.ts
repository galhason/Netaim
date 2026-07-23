import type { Locale } from '@/config/locales';
import type { EventCapability } from '../capabilities/capabilities';
import type { EventPhase } from '../lifecycle/phases';
import type { Finding } from './findings';

/*
 * Readiness evaluates facts, not documents: the application layer
 * extracts this snapshot from content sources, keeping the engine free
 * of any dependency on the Experience Engine or the CMS (Objective 8).
 */
export interface ReadinessInput {
  phase: EventPhase;
  capabilities: readonly EventCapability[];
  experience: {
    sceneCount: number;
    hasHero: boolean;
    heroHasImage: boolean;
    hasJoin: boolean;
  } | null;
  program: {
    sessions: { start: string; end: string; room?: string }[];
    speakersWithoutPhoto: number;
  } | null;
  venue: {
    present: boolean;
    hasAccessibilityInfo: boolean;
    hasEmergencyInfo: boolean;
  };
  localization: {
    enabledLocales: readonly Locale[];
    missingTranslations: number;
  };
  registration: {
    closesAt?: string;
    eventStartsAt?: string;
    configured?: boolean;
    requiresCapacity?: boolean;
    capacitySet?: boolean;
    hasConfirmationMessage?: boolean;
  } | null;
}

type ReadinessRule = (input: ReadinessInput) => Finding[];

const sessionsOverlap = (
  a: { start: string; end: string; room?: string },
  b: { start: string; end: string; room?: string },
): boolean => {
  if (!a.room || !b.room || a.room !== b.room) {
    return false;
  }
  return (
    Date.parse(a.start) < Date.parse(b.end) &&
    Date.parse(b.start) < Date.parse(a.end)
  );
};

const missingHeroImage: ReadinessRule = ({ experience }) =>
  experience && experience.hasHero && !experience.heroHasImage
    ? [
        {
          id: 'experience/hero-image-missing',
          severity: 'warning',
          category: 'media',
          message: {
            he: 'לסצנת הפתיחה אין צילום רקע.',
            en: 'The arrival scene has no background photograph.',
          },
          action: {
            he: 'בחרו צילום מקום מהספרייה לסצנת הפתיחה.',
            en: 'Choose a venue photograph from the library for the arrival scene.',
          },
        },
      ]
    : [];

const missingVenue: ReadinessRule = ({ venue }) =>
  venue.present
    ? []
    : [
        {
          id: 'venue/missing',
          severity: 'blocker',
          category: 'venue',
          message: {
            he: 'לאירוע אין מקום מוגדר.',
            en: 'The event has no venue.',
          },
          action: {
            he: 'הוסיפו את מקום האירוע ופרטי ההגעה.',
            en: 'Add the venue and arrival details.',
          },
        },
      ];

const missingEmergencyInfo: ReadinessRule = ({ venue }) =>
  venue.present && !venue.hasEmergencyInfo
    ? [
        {
          id: 'safety/emergency-missing',
          severity: 'blocker',
          category: 'safety',
          message: {
            he: 'חסר מידע חירום למשתתפים.',
            en: 'Emergency information for participants is missing.',
          },
          action: {
            he: 'הוסיפו איש קשר ונוהל חירום בפרטי המקום.',
            en: 'Add an emergency contact and procedure to the venue details.',
          },
        },
      ]
    : [];

const missingAccessibilityInfo: ReadinessRule = ({ venue }) =>
  venue.present && !venue.hasAccessibilityInfo
    ? [
        {
          id: 'venue/accessibility-missing',
          severity: 'warning',
          category: 'venue',
          message: {
            he: 'חסר מידע נגישות למקום.',
            en: 'Venue accessibility information is missing.',
          },
          action: {
            he: 'הוסיפו מידע נגישות בפרטי המקום.',
            en: 'Add accessibility information to the venue details.',
          },
        },
      ]
    : [];

const incompleteTranslations: ReadinessRule = ({ localization }) =>
  localization.enabledLocales.length > 1 &&
  localization.missingTranslations > 0
    ? [
        {
          id: 'localization/incomplete',
          severity: 'warning',
          category: 'localization',
          message: {
            he: `${localization.missingTranslations} פריטי תוכן ממתינים לתרגום.`,
            en: `${localization.missingTranslations} content items await translation.`,
          },
          action: {
            he: 'השלימו את התרגומים בשפות הפעילות.',
            en: 'Complete translations for the enabled languages.',
          },
        },
      ]
    : [];

const agendaOverlaps: ReadinessRule = ({ program }) => {
  if (!program) {
    return [];
  }
  const sessions = program.sessions;
  for (let i = 0; i < sessions.length; i += 1) {
    for (let j = i + 1; j < sessions.length; j += 1) {
      const a = sessions[i];
      const b = sessions[j];
      if (a && b && sessionsOverlap(a, b)) {
        return [
          {
            id: 'program/overlap',
            severity: 'blocker',
            category: 'program',
            message: {
              he: 'סדר היום מכיל מושבים חופפים באותו חדר.',
              en: 'The program contains overlapping sessions in the same room.',
            },
            action: {
              he: 'הזיזו אחד מהמושבים החופפים.',
              en: 'Move one of the overlapping sessions.',
            },
          },
        ];
      }
    }
  }
  return [];
};

const speakersMissingPhotos: ReadinessRule = ({ program }) =>
  program && program.speakersWithoutPhoto > 0
    ? [
        {
          id: 'people/photos-missing',
          severity: 'advice',
          category: 'media',
          message: {
            he: `${program.speakersWithoutPhoto} דוברים ללא פורטרט.`,
            en: `${program.speakersWithoutPhoto} speakers have no portrait.`,
          },
          action: {
            he: 'העלו פורטרטים לדוברים החסרים.',
            en: 'Upload portraits for the remaining speakers.',
          },
        },
      ]
    : [];

const registrationWindow: ReadinessRule = ({ capabilities, registration }) => {
  if (!capabilities.includes('registration') || !registration) {
    return [];
  }
  const { closesAt, eventStartsAt } = registration;
  if (!closesAt || !eventStartsAt) {
    return [];
  }
  return Date.parse(closesAt) > Date.parse(eventStartsAt)
    ? [
        {
          id: 'registration/closes-after-start',
          severity: 'warning',
          category: 'registration',
          message: {
            he: 'ההרשמה נסגרת אחרי תחילת האירוע.',
            en: 'Registration closes after the event begins.',
          },
          action: {
            he: 'הקדימו את מועד סגירת ההרשמה.',
            en: 'Move the registration closing time earlier.',
          },
        },
      ]
    : [];
};

const registrationConfigMissing: ReadinessRule = ({
  capabilities,
  registration,
}) =>
  capabilities.includes('registration') &&
  registration !== null &&
  registration.configured === false
    ? [
        {
          id: 'registration/config-missing',
          severity: 'blocker',
          category: 'registration',
          message: {
            he: 'ההרשמה מופעלת אך טרם הוגדרה.',
            en: 'Registration is enabled but not yet set up.',
          },
          action: {
            he: 'הגדירו את ההרשמה במרחב ההרשמה.',
            en: 'Set up registration in the Registration workspace.',
          },
        },
      ]
    : [];

const registrationCapacityMissing: ReadinessRule = ({ registration }) =>
  registration &&
  registration.requiresCapacity &&
  registration.capacitySet === false
    ? [
        {
          id: 'registration/capacity-missing',
          severity: 'warning',
          category: 'registration',
          message: {
            he: 'לא הוגדר מספר מקומות להרשמה.',
            en: 'No number of places is set for registration.',
          },
          action: {
            he: 'קבעו כמה מקומות יש לאירוע.',
            en: 'Set how many places the event has.',
          },
        },
      ]
    : [];

const registrationConfirmationMissing: ReadinessRule = ({ registration }) =>
  registration && registration.hasConfirmationMessage === false
    ? [
        {
          id: 'registration/confirmation-missing',
          severity: 'warning',
          category: 'registration',
          message: {
            he: 'אין הודעת אישור למשתתפים לאחר ההרשמה.',
            en: 'There is no confirmation message for participants after they register.',
          },
          action: {
            he: 'כתבו הודעת אישור חמה במרחב ההרשמה.',
            en: 'Write a warm confirmation message in the Registration workspace.',
          },
        },
      ]
    : [];

const RULES: readonly ReadinessRule[] = [
  missingHeroImage,
  missingVenue,
  missingEmergencyInfo,
  missingAccessibilityInfo,
  incompleteTranslations,
  agendaOverlaps,
  speakersMissingPhotos,
  registrationWindow,
  registrationConfigMissing,
  registrationCapacityMissing,
  registrationConfirmationMissing,
];

export const evaluateReadiness = (input: ReadinessInput): Finding[] =>
  RULES.flatMap((rule) => rule(input));
