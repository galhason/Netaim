import type { Locale } from '@/config/locales';
import type { ConferenceExperience } from '../types/cinematic';

export const CONFERENCE_SCENE_TYPES = {
  nav: 'conference-nav',
  footer: 'conference-footer',
  arrival: 'conference-arrival',
  countdown: 'conference-countdown',
  facts: 'conference-facts',
  story: 'conference-story',
  quote: 'conference-quote',
  moments: 'conference-moments',
  featuredSessions: 'conference-featured-sessions',
  speakers: 'conference-speakers',
  sponsors: 'conference-sponsors',
  program: 'conference-program',
  venue: 'conference-venue',
  closing: 'conference-closing',
  actIntro: 'conference-act-intro',
} as const;

/*
 * The conference journey as the Composer sees it: instance ids in the
 * authored order, matching the descriptor exactly. Scenes born hidden
 * (Experience Engine v2) wait quietly until an editor invites them in —
 * existing conferences do not change by surprise.
 */
export const CONFERENCE_SCENE_SEQUENCE: {
  id: string;
  type: string;
  hidden?: boolean;
}[] = [
  { id: 'nav', type: CONFERENCE_SCENE_TYPES.nav },
  { id: 'arrival', type: CONFERENCE_SCENE_TYPES.arrival },
  { id: 'countdown', type: CONFERENCE_SCENE_TYPES.countdown, hidden: true },
  { id: 'facts', type: CONFERENCE_SCENE_TYPES.facts, hidden: true },
  { id: 'intro-story', type: CONFERENCE_SCENE_TYPES.actIntro, hidden: true },
  { id: 'story', type: CONFERENCE_SCENE_TYPES.story },
  { id: 'quote', type: CONFERENCE_SCENE_TYPES.quote },
  { id: 'moments', type: CONFERENCE_SCENE_TYPES.moments },
  {
    id: 'featured-sessions',
    type: CONFERENCE_SCENE_TYPES.featuredSessions,
  },
  { id: 'intro-people', type: CONFERENCE_SCENE_TYPES.actIntro, hidden: true },
  { id: 'speakers', type: CONFERENCE_SCENE_TYPES.speakers },
  { id: 'sponsors', type: CONFERENCE_SCENE_TYPES.sponsors },
  {
    id: 'intro-experience',
    type: CONFERENCE_SCENE_TYPES.actIntro,
    hidden: true,
  },
  { id: 'program', type: CONFERENCE_SCENE_TYPES.program },
  { id: 'venue', type: CONFERENCE_SCENE_TYPES.venue },
  { id: 'intro-join', type: CONFERENCE_SCENE_TYPES.actIntro, hidden: true },
  { id: 'closing', type: CONFERENCE_SCENE_TYPES.closing },
  { id: 'footer', type: CONFERENCE_SCENE_TYPES.footer },
];

export const NAV_LINKS = [
  { id: 'story', label: { he: 'הסיפור', en: 'The story' } },
  { id: 'speakers', label: { he: 'האנשים', en: 'The people' } },
  { id: 'program', label: { he: 'המסע', en: 'The journey' } },
  { id: 'venue', label: { he: 'המקום', en: 'The place' } },
  { id: 'register', label: { he: 'הרשמה', en: 'Register' } },
] as const;

/*
 * The site navigation (product direction v6): the public site is the
 * active conference, so the top-level links are pages of that
 * conference — never an index of conferences. Paths are locale-relative
 * ('' is the landing); the nav prefixes the current locale.
 */
export const SITE_NAV_LINKS: {
  key: string;
  path: string;
  label: Record<Locale, string>;
}[] = [
  { key: 'home', path: '', label: { he: 'בית', en: 'Home' } },
  { key: 'program', path: '/program', label: { he: 'תוכנית', en: 'Program' } },
  { key: 'speakers', path: '/speakers', label: { he: 'דוברים', en: 'Speakers' } },
  {
    key: 'info',
    path: '/info',
    label: { he: 'מידע למשתתפים', en: 'Information' },
  },
  {
    key: 'networking',
    path: '/me/networking',
    label: { he: 'Networking', en: 'Networking' },
  },
  { key: 'contact', path: '/contact', label: { he: 'צור קשר', en: 'Contact' } },
];

export const CINEMATIC_UI = {
  register: { he: 'הרשמה לכנס', en: 'Register' },
  registerShort: { he: 'הרשמה', en: 'Register' },
  scrollHint: { he: 'המסע מתחיל בגלילה', en: 'The journey begins below' },
  toStudio: { he: 'כניסה לסטודיו', en: 'Enter Studio' },
  myArea: { he: 'האזור האישי', en: 'My Space' },
  momentsEyebrow: { he: 'כך זה מרגיש', en: 'How it feels' },
  momentsTitle: { he: 'דמיינו את עצמכם שם', en: 'Imagine yourself there' },
  speakersEyebrow: { he: 'המרצים המובילים', en: 'Featured speakers' },
  speakersTitle: {
    he: 'מובילים מחשבה. מניעים שינוי.',
    en: 'Leading minds. Driving change.',
  },
  featuredSessionsEyebrow: {
    he: 'ההרצאות המרכזיות',
    en: 'Featured sessions',
  },
  featuredSessionsTitle: {
    he: 'מה מחכה לכם בכנס?',
    en: 'What awaits you?',
  },
  viewFullProgram: { he: 'לתוכנית המלאה', en: 'View full program' },
  programEyebrow: { he: 'לוח זמנים', en: 'Schedule' },
  programTitle: { he: 'טעימה מהתוכנית', en: 'A taste of the program' },
  venueEyebrow: { he: 'המקום', en: 'The place' },
  countdownEyebrow: { he: 'זה מתקרב', en: 'It is getting close' },
  countdownDays: { he: 'ימים', en: 'days' },
  countdownHours: { he: 'שעות', en: 'hours' },
  countdownMinutes: { he: 'דקות', en: 'minutes' },
  countdownSeconds: { he: 'שניות', en: 'seconds' },
  sponsorsEyebrow: { he: 'שותפים לדרך', en: 'Partners on the road' },
  factDays: { he: 'ימי תוכן', en: 'days of content' },
  factSessions: { he: 'מפגשים בתוכנית', en: 'sessions in the program' },
  factSpeakers: { he: 'קולות על הבמה', en: 'voices on stage' },
  detailsCta: { he: 'לפרטים נוספים', en: 'More details' },
  heroAllSessions: {
    he: 'לכל ההרצאות והסדנאות',
    en: 'All sessions & workshops',
  },
  heroJoin: { he: 'הצטרפו אליהם', en: 'Join them' },
  scrollOn: { he: 'גללו להמשך', en: 'Scroll on' },
  heroCountdownTitle: { he: 'הכנס מתחיל בעוד', en: 'The conference begins in' },
  communityTitle: { he: 'מי כבר בדרך?', en: 'Who is already on the way?' },
  communitySub: {
    he: 'הארגונים שכבר הצטרפו למסע',
    en: 'The organizations already on board',
  },
} as const;

const photo = (seed: string, w: number, h: number): string =>
  `https://picsum.photos/seed/${seed}/${w}/${h}`;

const portrait = (id: number): string => `https://i.pravatar.cc/640?img=${id}`;

/*
 * The cinematic fallback: complete emotional copy for every scene, so the
 * opening experience always plays in full even before the CMS holds real
 * content. Photography is placeholder until production stills arrive.
 */
export const fallbackConference = (locale: Locale): ConferenceExperience => {
  const he = locale === 'he';
  return {
    registerHref: '/studio',
    meHref: `/${locale}/me`,
    tone: 'bronze',
    countdown: {},
    facts: [
      { value: '2', label: he ? 'ימים של השראה' : 'days of inspiration' },
      { value: '40+', label: he ? 'מפגשים וסדנאות' : 'sessions and workshops' },
      { value: '80+', label: he ? 'קולות על הבמה' : 'voices on stage' },
      { value: '2,000+', label: he ? 'שותפים לדרך' : 'partners on the road' },
    ],
    sponsors: [],
    featuredSessions: [],
    arrival: {
      image: photo('hason-hero', 1600, 2000),
      facts: [
        { value: '2', label: he ? 'ימים של השראה' : 'days of inspiration' },
        { value: '80+', label: he ? 'קולות על הבמה' : 'voices on stage' },
        { value: '2,000+', label: he ? 'שותפים לדרך' : 'partners on the road' },
      ],
      eyebrow: he
        ? 'ועידת החדשנות בשירות הציבורי'
        : 'The Public Service Innovation Summit',
      title: he ? 'יש רגע שבו הכל משתנה' : 'There is a moment everything changes',
      tagline: he
        ? 'באוקטובר, בירושלים, הוא יקרה שוב.'
        : 'This October, in Jerusalem, it happens again.',
      date: he ? '21–20 באוקטובר 2026' : '20–21 October 2026',
      location: he ? 'הבינלאומי, ירושלים' : 'The ICC, Jerusalem',
    },
    story: {
      eyebrow: he ? 'על הכנס' : 'About',
      title: he
        ? 'הכנס שמחבר בין חזון לביצוע'
        : 'Where vision meets execution',
      values: [
        {
          icon: 'network',
          title: he ? 'נטוורקינג איכותי' : 'Quality networking',
          subtitle: he ? 'אלפי משתתפים מהענף' : 'Thousands of peers',
        },
        {
          icon: 'innovation',
          title: he ? 'חדשנות וטכנולוגיה' : 'Innovation & technology',
          subtitle: he ? 'הפתרונות המתקדמים בעולם' : 'The world’s leading solutions',
        },
        {
          icon: 'knowledge',
          title: he ? 'ידע מעשי' : 'Practical knowledge',
          subtitle: he ? 'תובנות וכלים ליישום' : 'Insights and tools to apply',
        },
        {
          icon: 'impact',
          title: he ? 'השפעה אמיתית' : 'Real impact',
          subtitle: he ? 'מעצבים את עתיד הענף' : 'Shaping the future',
        },
      ],
      paragraph: he
        ? 'כי שינוי אמיתי לא קורה במסמכים. הוא קורה כשאנשים שמאמינים באותו דבר נמצאים באותו חדר, באותו רגע. יומיים אחד בשנה, האנשים שמעצבים את השירות הציבורי של ישראל עוצרים הכל — כדי לדמיין אותו מחדש.'
        : 'Real change does not happen in documents. It happens when people who believe the same thing share the same room, at the same moment. For two days a year, the people shaping Israel’s public service stop everything — to imagine it anew.',
      image: photo('hason-story', 1800, 1200),
    },
    why: {
      quote: he
        ? 'יצאתי משם עם רשימת טלפונים, אבל בעיקר עם תחושה שאני לא לבד במערכה הזאת.'
        : 'I left with a list of phone numbers — but mostly with the feeling that I am not alone in this.',
      attribution: he ? 'נועה, מנהלת דיגיטל' : 'Noa, digital director',
      role: he ? 'משתתפת בוועידה הקודמת' : 'Attendee, last summit',
      image: photo('hason-people', 1600, 2000),
      statistic: {
        value: '2,500',
        label: he ? 'שותפים לדרך בשנה שעברה' : 'partners on this road last year',
      },
    },
    moments: [
      {
        image: photo('hason-stage', 2400, 1400),
        caption: he ? 'האור עולה על הבמה' : 'The lights rise on the stage',
      },
      {
        image: photo('hason-crowd', 2400, 1400),
        caption: he ? 'אלפיים אנשים, נשימה אחת' : 'Two thousand people, one breath',
      },
      {
        image: photo('hason-talk', 2400, 1400),
        caption: he
          ? 'השיחות שממשיכות אל תוך ההפסקה'
          : 'Conversations that outlive the break',
      },
      {
        image: photo('hason-coffee', 2400, 1400),
        caption: he ? 'קפה, ורעיון שנולד ליד הדלפק' : 'Coffee, and an idea born at the counter',
      },
    ],
    speakers: [
      {
        name: he ? 'פרופ׳ רון שפירא' : 'Prof. Ron Shapira',
        role: he ? 'חדשנות מערכתית · אוניברסיטת תל אביב' : 'Systemic innovation · Tel Aviv University',
        photo: portrait(52),
      },
      {
        name: he ? 'מיכל כהן' : 'Michal Cohen',
        role: he ? 'מנכ״לית משותפת · Microsoft ישראל' : 'Co-CEO · Microsoft Israel',
        photo: portrait(5),
      },
      {
        name: he ? 'אלון רוזן' : 'Alon Rozen',
        role: he ? 'מנהל דיגיטל ראשי · משרד המשפטים' : 'Chief Digital Officer · Ministry of Justice',
        photo: portrait(13),
      },
      {
        name: he ? 'קרן מאיר בנימין' : 'Keren Meir Benjamin',
        role: he ? 'סמנכ״לית חדשנות · השלטון המקומי' : 'VP Innovation · Local government',
        photo: portrait(47),
      },
      {
        name: he ? 'עו״ד עופר פורר' : 'Ofer Porer, Adv.',
        role: he ? 'יו״ר ועדת המשנה לשירות הציבורי' : 'Public service committee chair',
        photo: portrait(68),
      },
    ],
    program: [
      {
        label: he ? 'היום הראשון' : 'Day one',
        items: [
          { time: '08:30', title: he ? 'הגעה והתכנסות' : 'Arrival' },
          { time: '09:30', title: he ? 'מושב פתיחה: פתרונות מהשטח' : 'Opening plenary: solutions from the field' },
          { time: '11:00', title: he ? 'סדנאות מקבילות' : 'Parallel workshops' },
          { time: '14:00', title: he ? 'מושב מליאה: החזון החדש' : 'Plenary: the new vision' },
          { time: '17:30', title: he ? 'קבלת פנים בשקיעה' : 'Reception at dusk' },
        ],
      },
      {
        label: he ? 'היום השני' : 'Day two',
        items: [
          { time: '09:00', title: he ? 'פתיחת היום השני' : 'Day two opening' },
          { time: '10:30', title: he ? 'סדנאות מתקדמות' : 'Advanced workshops' },
          { time: '13:00', title: he ? 'מושב סיכום' : 'Closing plenary' },
          { time: '15:00', title: he ? 'נעילה' : 'Farewell' },
        ],
      },
    ],
    venue: {
      name: he ? 'הבינלאומי, ירושלים' : 'The ICC, Jerusalem',
      narrative: he
        ? 'בלב ירושלים, במרכז הכנסים הגדול בישראל — מקום שנבנה כדי שאלפי אנשים יוכלו להיפגש בו כאילו הם חדר אחד.'
        : 'In the heart of Jerusalem, at Israel’s largest convention centre — a place built so thousands can meet as if they were one room.',
      image: photo('hason-venue', 2400, 1500),
      facts: [
        { label: he ? 'נגישות מלאה' : 'Fully accessible', icon: 'accessibility' },
        { label: he ? 'רכבת קלה עד הדלת' : 'Light rail to the door', icon: 'transit' },
        { label: he ? 'חניה בבניין' : 'On-site parking', icon: 'parking' },
        { label: he ? 'מלונות במרחק הליכה' : 'Hotels within walking distance', icon: 'hotel' },
      ],
    },
    closing: {
      line: he
        ? 'השאלה היא לא אם השירות הציבורי ישתנה. השאלה היא אם תהיו שם כשזה יקרה.'
        : 'The question is not whether public service will change. The question is whether you will be there when it does.',
      image: photo('hason-dusk', 2400, 1200),
    },
  };
};
