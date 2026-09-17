import type { Locale } from '@/config/locales';

/*
 * Every word the page says, in both languages, in one place.
 *
 * The page is written for Hebrew and English at once — not Hebrew first
 * and translated later — which is why the copy lives beside the
 * components rather than inside them. A string that exists in one
 * language only cannot be added here without the type refusing it.
 */
type Copy = Record<Locale, string>;

export const COPY = {
  /* The page itself. */
  eyebrow: { he: 'הלוז שלי', en: 'My Schedule' },
  title: { he: 'הלוז שלי', en: 'My Schedule' },
  sub: {
    he: 'כל ההרצאות, הסדנאות והפעילויות שבחרתם במקום אחד.',
    en: 'All the talks, workshops and activities you’ve selected, in one place.',
  },
  backToMe: { he: 'לאזור האישי', en: 'Personal area' },
  addActivity: { he: 'הוספת פעילות', en: 'Add activity' },
  toProgram: { he: 'מעבר לתוכנייה', en: 'Explore the program' },

  /* The day selector. */
  days: { he: 'ימי הכנס', en: 'Conference days' },
  dayWord: { he: 'יום', en: 'Day' },
  today: { he: 'היום', en: 'Today' },
  previousDay: { he: 'היום הקודם', en: 'Previous day' },
  nextDay: { he: 'היום הבא', en: 'Next day' },

  /* The card at the top. */
  nextTitle: { he: 'הפעילות הבאה שלך', en: 'Your next activity' },
  nowTitle: { he: 'הפעילות שלך עכשיו', en: 'Your current activity' },
  startsIn: { he: 'מתחיל בעוד', en: 'Starts in' },
  endsIn: { he: 'מסתיים בעוד', en: 'Ends in' },
  startingNow: { he: 'מתחיל עכשיו', en: 'Starting now' },
  noMoreToday: { he: 'אין עוד פעילויות היום', en: 'No more activities today' },
  noMoreTodayHint: {
    he: 'סיימתם להיום. אפשר להציץ בתוכנייה ולהוסיף משהו למחר.',
    en: 'You’re done for today. Browse the program to add something for tomorrow.',
  },
  nothingAhead: { he: 'אין פעילות הבאה בתור', en: 'Nothing up next' },
  nothingAheadHint: {
    he: 'כל הפעילויות שבחרתם הסתיימו. אפשר להוסיף עוד מהתוכנייה.',
    en: 'Everything you chose has ended. You can add more from the program.',
  },
  viewActivity: { he: 'פרטי הפעילות', en: 'View activity' },
  directions: { he: 'ניווט', en: 'Directions' },
  onWaitlist: { he: 'ברשימת המתנה', en: 'On the waiting list' },

  /* The timeline. */
  timelineTitle: { he: 'כל הפעילויות שלי', en: 'All my activities' },
  now: { he: 'עכשיו', en: 'Now' },
  endOfList: { he: 'אין עוד פעילויות להציג', en: 'No more activities to show' },
  remove: { he: 'הסרה מהלוז', en: 'Remove from My Schedule' },
  removing: { he: 'מסיר…', en: 'Removing…' },
  toNetworking: { he: 'לאזור הנטוורקינג', en: 'Open networking' },
  meetingWith: { he: 'פגישה עם', en: 'Meeting with' },
  networking: { he: 'Networking', en: 'Networking' },
  ended: { he: 'הסתיים', en: 'Ended' },
  live: { he: 'מתקיים עכשיו', en: 'Happening now' },
  cancelledByYou: { he: 'פעילויות שביטלתם', en: 'Activities you cancelled' },
  cancelledHint: {
    he: 'אפשר להירשם אליהן מחדש מהתוכנייה, כל עוד יש מקום.',
    en: 'You can re-join them from the program while there is room.',
  },

  /* The sidebar. */
  summary: { he: 'סיכום קצר', en: 'At a glance' },
  savedActivities: { he: 'פעילויות שמורות', en: 'Saved activities' },
  contentHours: { he: 'שעות תוכן', en: 'Hours of content' },
  conferenceDays: { he: 'ימי כנס', en: 'Conference days' },
  inspireTitle: { he: 'צריך עוד השראה?', en: 'Need more inspiration?' },
  inspireBody: {
    he: 'גלו הרצאות, סדנאות ואירועים נוספים בתוכנייה.',
    en: 'Discover more talks, workshops and events in the program.',
  },
  suggested: { he: 'מתאים למה שבחרתם', en: 'Close to what you chose' },
  addToCalendar: { he: 'הוסיפו את הפעילות הבאה ליומן', en: 'Add the next activity to your calendar' },
  mottoLine1: { he: 'אירועים טובים', en: 'Good events' },
  mottoLine2: { he: 'מתחילים באנשים טובים.', en: 'begin with good people.' },

  /* Conflicts. */
  conflictTitle: { he: 'יש התנגשות בלוח הזמנים', en: 'Schedule conflict' },
  conflictBody: {
    he: 'בחרתם שתי פעילויות שחופפות בזמן. ההחלטה איזו להשאיר היא שלכם.',
    en: 'You’ve chosen two activities that overlap. Which one to keep is up to you.',
  },

  /* Notices routed back from an action. */
  noticeConflict: {
    he: 'כבר נרשמתם לפעילות אחרת באותו זמן.',
    en: 'You’re already registered for another activity at this time.',
  },
  noticeFull: {
    he: 'הפעילות התמלאה. נסו פעילות אחרת או הצטרפו לרשימת ההמתנה.',
    en: 'That activity just filled up. Try another or join the waiting list.',
  },

  /* Empty states. */
  emptyTitle: { he: 'הלוז שלכם עדיין ריק', en: 'Your schedule is still empty' },
  emptyHint: {
    he: 'גלו הרצאות, סדנאות ואירועים בתוכנייה והוסיפו אותם ללוז שלכם.',
    en: 'Explore talks, workshops and events in the program and add them to your schedule.',
  },
  emptyDayTitle: { he: 'עדיין אין לכם פעילויות ביום הזה', en: 'No activities saved for this day' },
  emptyDayHint: {
    he: 'יש לכם פעילויות שמורות בימים אחרים.',
    en: 'You have saved activities on other conference days.',
  },
  endedTitle: { he: 'הכנס הסתיים', en: 'The conference has ended' },
  endedHint: {
    he: 'תודה שהייתם איתנו. הלוז שלכם נשאר כאן למזכרת.',
    en: 'Thank you for being with us. Your schedule stays here to look back on.',
  },
  startsIn_days: { he: 'הכנס מתחיל בעוד', en: 'The conference starts in' },
  daysWord: { he: 'ימים', en: 'days' },
  tomorrow: { he: 'הכנס מתחיל מחר', en: 'The conference starts tomorrow' },

  /* The door, for someone not signed in. */
  signInEyebrow: { he: 'הלוז האישי שלך', en: 'Your personal schedule' },
  signInTitle: { he: 'הלוז האישי שלך מחכה לך', en: 'Your personal schedule is waiting for you' },
  signInBody: {
    he: 'כל ההרצאות, הסדנאות והפעילויות שבחרת — במקום אחד.',
    en: 'All the talks, workshops and activities you choose — in one place.',
  },
  signInCta: { he: 'כניסה לכנס', en: 'Enter the conference' },
  signInAlready: { he: 'כבר רשומים? התחברות', en: 'Already registered? Sign in' },
  previewTitle: { he: 'כך ייראה הלוז שלך', en: 'What your schedule will look like' },
  previewTag: { he: 'דוגמה', en: 'Example' },
  previewFoot: { he: 'נפגשים בכנס!', en: 'See you at the conference!' },
  benefitFocus: { he: 'ריכוז כל הפעילויות שבחרת', en: 'Everything you chose, together' },
  benefitAlert: { he: 'התראה לפעילות הבאה שלך', en: 'A heads-up before what’s next' },
  benefitWhere: { he: 'מידע מלא על מיקום וכל מה שצריך לדעת', en: 'Where to be, and everything you need to know' },
} satisfies Record<string, Copy>;

export type CopyKey = keyof typeof COPY;

export const t = (locale: Locale, key: CopyKey): string => COPY[key][locale];

/*
 * The day's ordinal, the way each language writes it: a letter with a
 * geresh in Hebrew, a number in English. Beyond the seventh day the
 * Hebrew falls back to a number too — a conference that long has bigger
 * problems than typography.
 */
const HEBREW_ORDINALS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ז׳'];

export const dayOrdinal = (index: number, locale: Locale): string =>
  locale === 'he' ? (HEBREW_ORDINALS[index - 1] ?? String(index)) : String(index);
