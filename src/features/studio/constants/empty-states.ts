import type { Locale } from '@/config/locales';

/*
 * Empty states are first-class (Objective 7). No surface says "no data";
 * each teaches what the place is for, or encourages the first step. Copy
 * is a bilingual constant; the surface supplies any action.
 */
export interface EmptyStateCopy {
  title: Record<Locale, string>;
  body: Record<Locale, string>;
}

export const EMPTY_STATES = {
  homeContinue: {
    title: { he: 'להתחיל ליצור', en: 'Begin creating' },
    body: {
      he: 'האירוע הראשון שלך יופיע כאן. אפשר להתחיל עכשיו.',
      en: 'Your first event will live here. Start whenever you are ready.',
    },
  },
  events: {
    title: { he: 'עדיין אין אירועים', en: 'No events yet' },
    body: {
      he: 'כל אירוע הוא מרחב עבודה משלו. אפשר ליצור את הראשון.',
      en: 'Every event is its own workspace. Create your first one.',
    },
  },
  people: {
    title: { he: 'האנשים של האירוע', en: 'The event’s people' },
    body: {
      he: 'הדוברים והמנחים של האירוע נאספים כאן. אפשר להוסיף את הראשון.',
      en: 'The speakers and facilitators for this event gather here. Add the first.',
    },
  },
  media: {
    title: { he: 'הצילומים של החוויה', en: 'The experience’s photography' },
    body: {
      he: 'הצילומים שהחוויה תשתמש בהם נאספים כאן. אפשר להעלות את הראשון.',
      en: 'The photographs this experience will use gather here. Upload the first.',
    },
  },
} satisfies Record<string, EmptyStateCopy>;
