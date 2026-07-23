import type { Locale } from '@/config/locales';
import type { EventPhase } from '@/event-engine';

/*
 * The adaptive Studio contract (Objective 5): each lifecycle phase
 * declares its creative focus and the actions that leave the surface.
 * Surfaces consult this table; behavior never branches in components.
 */
export interface PhaseAdaptation {
  focus: Record<Locale, string>;
  hiddenActions: readonly string[];
  readOnly: boolean;
}

export const PHASE_ADAPTATION: Record<EventPhase, PhaseAdaptation> = {
  draft: {
    focus: {
      he: 'עכשיו בונים: החוויה קודמת לכל.',
      en: 'Creation time: the experience comes first.',
    },
    hiddenActions: ['manage-registrations', 'announce', 'publish-recordings'],
    readOnly: false,
  },
  planning: {
    focus: {
      he: 'משלימים תוכנית, אנשים ומקום.',
      en: 'Completing program, people and place.',
    },
    hiddenActions: ['announce', 'publish-recordings'],
    readOnly: false,
  },
  registrationOpen: {
    focus: {
      he: 'ההרשמה פתוחה — עוקבים אחרי הקצב.',
      en: 'Registration is open — watch the pace.',
    },
    hiddenActions: ['publish-recordings'],
    readOnly: false,
  },
  registrationClosed: {
    focus: {
      he: 'ההרשמה נסגרה — מתכוננים לקבל את האורחים.',
      en: 'Registration closed — preparing to welcome guests.',
    },
    hiddenActions: ['edit-registration', 'publish-recordings'],
    readOnly: false,
  },
  preparation: {
    focus: {
      he: 'ימים אחרונים: בדיקות מוכנות והתארגנות בשטח.',
      en: 'Final days: readiness checks and on-site preparation.',
    },
    hiddenActions: ['edit-registration', 'publish-recordings'],
    readOnly: false,
  },
  live: {
    focus: {
      he: 'האירוע חי — עדכונים לאורחים במרכז.',
      en: 'The event is live — announcements take the stage.',
    },
    hiddenActions: ['edit-experience', 'edit-registration'],
    readOnly: false,
  },
  completed: {
    focus: {
      he: 'האירוע הסתיים — משתפים חומרים וסוגרים מעגל.',
      en: 'The event ended — share materials and close the circle.',
    },
    hiddenActions: ['edit-experience', 'edit-registration', 'announce'],
    readOnly: false,
  },
  archived: {
    focus: {
      he: 'בארכיון — לקריאה בלבד.',
      en: 'Archived — read only.',
    },
    hiddenActions: [
      'edit-experience',
      'edit-registration',
      'announce',
      'publish-recordings',
    ],
    readOnly: true,
  },
};
