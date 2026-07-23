import type { Locale } from '@/config/locales';
import type { SceneData } from '@/experience-engine';
import { SCENE_TYPES } from '@/features/experience';
import type { EventNavigationItem } from '../types/event-experience';

/*
 * Development fixture exercising the full pipeline, including one
 * deliberately unregistered scene type ('spotlight') that must degrade
 * gracefully without breaking the experience. All images are generated
 * placeholders awaiting real photography.
 */
export const DEMO_EVENT_SLUG = 'demo';

export const DEMO_BRAND_NAME = 'נטעים';

export const DEMO_EVENT_TITLES: Record<Locale, string> = {
  he: 'אירוע הדגמה',
  en: 'Demo Event',
};

const demoNavigation: Record<Locale, EventNavigationItem[]> = {
  he: [
    { label: 'על האירוע', href: '#demo-story' },
    { label: 'סדר יום', href: '#demo-agenda' },
    { label: 'דוברים', href: '#demo-speakers' },
    { label: 'מקום האירוע', href: '#demo-venue' },
    { label: 'שאלות נפוצות', href: '#demo-faq' },
  ],
  en: [
    { label: 'About', href: '#demo-story' },
    { label: 'Agenda', href: '#demo-agenda' },
    { label: 'Speakers', href: '#demo-speakers' },
    { label: 'Venue', href: '#demo-venue' },
    { label: 'FAQ', href: '#demo-faq' },
  ],
};

export const getDemoNavigation = (locale: Locale): EventNavigationItem[] =>
  demoNavigation[locale];

const demoBackgroundImage = {
  url: '/demo/hero-placeholder.jpg',
  width: 1920,
  height: 1280,
};

const demoScenes: Record<Locale, SceneData[]> = {
  he: [
    {
      id: 'demo-hero',
      type: SCENE_TYPES.hero,
      title: 'פתיחה',
      enabled: true,
      content: {
        eyebrow: 'כנס הדגמה 2026',
        headline: 'ברוכים הבאים לאירוע ההדגמה',
        subheadline: 'חוויית אירוע מלאה המנוהלת כולה מהמערכת',
        description: 'עמוד זה מדגים את מנוע החוויות: כל התוכן מגיע ממקור תוכן, מאומת ומרונדר דינמית.',
        badge: 'ההרשמה פתוחה',
        eventDate: '2026-09-01',
        eventLocation: 'ירושלים',
        scrollHintLabel: 'המסע מתחיל כאן',
        primaryCta: { label: 'להרשמה', href: '#demo-cta' },
        secondaryCta: { label: 'לסדר היום', href: '#demo-agenda' },
        backgroundImage: demoBackgroundImage,
      },
    },
    {
      id: 'demo-story',
      type: SCENE_TYPES.story,
      title: 'הייעוד',
      enabled: true,
      content: {
        label: 'למה אנחנו כאן',
        heading: 'אירוע שנולד מתוך שליחות',
        paragraphs: [
          'הכנס מחבר אנשי מקצוע מהמגזר הציבורי סביב מטרה אחת: שירות טוב יותר לציבור.',
          'ביום אחד של מפגשים, סדנאות ושיחות פתוחות נבנית כאן שפה משותפת — ודרכי פעולה שממשיכות הרבה אחרי שהאולם מתרוקן.',
        ],
        quote: {
          text: 'שינוי אמיתי מתחיל כשאנשים נפגשים פנים אל פנים.',
          attribution: 'צוות התוכנית',
        },
        keyNumbers: [
          { value: '600', label: 'משתתפים' },
          { value: '40', label: 'דוברים ומנחים' },
          { value: '12', label: 'סדנאות מעשיות' },
        ],
        image: {
          url: '/demo/story-placeholder.jpg',
          alt: 'מרחב הכנס',
          width: 1600,
          height: 2000,
        },
        cta: { label: 'לגלות את סדר היום', href: '#demo-agenda' },
      },
    },
    {
      id: 'demo-agenda',
      type: SCENE_TYPES.agenda,
      title: 'סדר יום',
      enabled: true,
      content: {
        label: 'היום שלפנינו',
        heading: 'כך ייראה היום שלכם',
        intro: 'מרגע הכניסה ועד השיחה האחרונה — כל רגע ביום תוכנן כדי להשאיר מקום למפגש אמיתי.',
        days: [
          {
            id: 'day-1',
            label: 'יום ראשון',
            sessions: [
              {
                id: 'session-1',
                title: 'מושב פתיחה',
                startTime: '2026-09-01T09:00:00Z',
                endTime: '2026-09-01T10:00:00Z',
                description: 'התכנסות, דברי פתיחה והצבת הכיוון ליום של עשייה משותפת.',
                room: 'אולם מרכזי',
              },
              {
                id: 'session-2',
                title: 'סדנה מעשית',
                startTime: '2026-09-01T10:30:00Z',
                endTime: '2026-09-01T12:00:00Z',
                description: 'עבודה בקבוצות קטנות סביב אתגרים אמיתיים מהשטח.',
                room: 'חדר 2',
              },
              {
                id: 'session-3',
                title: 'הפסקת צהריים ושיח פתוח',
                startTime: '2026-09-01T12:00:00Z',
                endTime: '2026-09-01T13:00:00Z',
                description: 'זמן לנשום, לטעום ולהכיר את האנשים שמאחורי התפקידים.',
                room: 'המרפסת',
              },
              {
                id: 'session-4',
                title: 'שיחות בגובה העיניים',
                startTime: '2026-09-01T13:00:00Z',
                endTime: '2026-09-01T14:30:00Z',
                description: 'מנהיגות המגזר בשיח פתוח עם הקהל — בלי מצגות.',
                room: 'אולם מרכזי',
              },
            ],
          },
        ],
      },
    },
    {
      id: 'demo-speakers',
      type: SCENE_TYPES.speakerGrid,
      title: 'דוברים',
      enabled: true,
      content: {
        label: 'הפנים של האירוע',
        heading: 'האנשים שמאחורי היום הזה',
        intro: 'המובילים והמנחים שילוו אתכם לאורך היום.',
        speakers: [
          {
            id: 'speaker-1',
            name: 'דנה כהן',
            role: 'מנהלת התוכנית',
            photoUrl: '/demo/portrait-1.jpg',
            photoAlt: 'דנה כהן',
          },
          {
            id: 'speaker-2',
            name: 'יוסי לוי',
            role: 'מרצה אורח',
            photoUrl: '/demo/portrait-2.jpg',
            photoAlt: 'יוסי לוי',
          },
          {
            id: 'speaker-3',
            name: 'מיכל אברהם',
            role: 'יועצת דיגיטל ממשלתי',
            photoUrl: '/demo/portrait-3.jpg',
            photoAlt: 'מיכל אברהם',
          },
          {
            id: 'speaker-4',
            name: 'אבי רוזן',
            role: 'מנהל חדשנות',
            photoUrl: '/demo/portrait-4.jpg',
            photoAlt: 'אבי רוזן',
          },
        ],
      },
    },
    {
      id: 'demo-unknown',
      type: 'spotlight',
      title: 'סצנה לא רשומה',
      enabled: true,
      content: {},
    },
    {
      id: 'demo-venue',
      type: SCENE_TYPES.venue,
      title: 'מקום האירוע',
      enabled: true,
      content: {
        label: 'המקום',
        heading: 'בית האירוע',
        description: 'מרכז הכנסים ניצב על קו התפר שבין העיר העתיקה לחדשה — מקום שמזכיר למה התכנסנו.',
        name: 'מרכז הכנסים הלאומי',
        address: 'שדרות התקומה 12, ירושלים',
        image: {
          url: '/demo/venue-placeholder.jpg',
          alt: 'חזית מרכז הכנסים',
          width: 2000,
          height: 900,
        },
        mapUrl: 'https://maps.google.com/?q=Jerusalem',
        mapLabel: 'להוראות הגעה',
        details: [
          { id: 'parking', label: 'חניה', value: 'חניון האומה — 5 דקות הליכה' },
          { id: 'transit', label: 'תחבורה ציבורית', value: 'רכבת קלה — תחנת האומה' },
          { id: 'access', label: 'נגישות', value: 'המתחם נגיש במלואו' },
          { id: 'doors', label: 'פתיחת שערים', value: '08:30' },
        ],
      },
    },
    {
      id: 'demo-faq',
      type: SCENE_TYPES.faq,
      title: 'שאלות נפוצות',
      enabled: true,
      content: {
        label: 'שאלות אחרונות',
        heading: 'לפני שנפגשים',
        items: [
          {
            id: 'faq-1',
            question: 'האם ההשתתפות כרוכה בתשלום?',
            answer: 'לא, ההשתתפות באירוע ההדגמה חינמית.',
          },
          {
            id: 'faq-2',
            question: 'האם יש הרשמה מוקדמת?',
            answer: 'כן, דרך כפתור ההרשמה בעמוד זה.',
          },
        ],
      },
    },
    {
      id: 'demo-cta',
      type: SCENE_TYPES.registrationCta,
      title: 'הרשמה',
      enabled: true,
      content: {
        eyebrow: 'הצטרפות',
        heading: 'נתראה בספטמבר',
        text: 'ההרשמה פתוחה, המקומות מוגבלים, והיום הזה נבנה בשבילכם. כל שנותר הוא להגיע.',
        label: 'להרשמה לאירוע',
        href: '#registration',
        note: 'ללא עלות · בהרשמה מראש בלבד',
      },
    },
  ],
  en: [
    {
      id: 'demo-hero',
      type: SCENE_TYPES.hero,
      title: 'Opening',
      enabled: true,
      content: {
        eyebrow: 'Demo Conference 2026',
        headline: 'Welcome to the Demo Event',
        subheadline: 'A complete event experience driven entirely by content',
        description: 'This page demonstrates the experience engine: all content arrives from a content source, validated and rendered dynamically.',
        badge: 'Registration open',
        eventDate: '2026-09-01',
        eventLocation: 'Jerusalem',
        scrollHintLabel: 'The journey begins here',
        primaryCta: { label: 'Register', href: '#demo-cta' },
        secondaryCta: { label: 'View agenda', href: '#demo-agenda' },
        backgroundImage: demoBackgroundImage,
      },
    },
    {
      id: 'demo-story',
      type: SCENE_TYPES.story,
      title: 'Purpose',
      enabled: true,
      content: {
        label: 'Why we gather',
        heading: 'An event born of purpose',
        paragraphs: [
          'The conference brings public-sector professionals together around one goal: better service for the public.',
          'In one day of sessions, workshops and open conversations, a shared language is built here — and ways of working that last long after the hall empties.',
        ],
        quote: {
          text: 'Real change begins when people meet face to face.',
          attribution: 'The program team',
        },
        keyNumbers: [
          { value: '600', label: 'Participants' },
          { value: '40', label: 'Speakers and facilitators' },
          { value: '12', label: 'Hands-on workshops' },
        ],
        image: {
          url: '/demo/story-placeholder.jpg',
          alt: 'The conference space',
          width: 1600,
          height: 2000,
        },
        cta: { label: 'Explore the agenda', href: '#demo-agenda' },
      },
    },
    {
      id: 'demo-agenda',
      type: SCENE_TYPES.agenda,
      title: 'Agenda',
      enabled: true,
      content: {
        label: 'The day ahead',
        heading: 'This is how your day will look',
        intro: 'From the moment you arrive until the last conversation — every part of the day leaves room for real connection.',
        days: [
          {
            id: 'day-1',
            label: 'Day One',
            sessions: [
              {
                id: 'session-1',
                title: 'Opening Session',
                startTime: '2026-09-01T09:00:00Z',
                endTime: '2026-09-01T10:00:00Z',
                description: 'Gathering, opening words and setting the direction for a day of shared work.',
                room: 'Main Hall',
              },
              {
                id: 'session-2',
                title: 'Hands-on Workshop',
                startTime: '2026-09-01T10:30:00Z',
                endTime: '2026-09-01T12:00:00Z',
                description: 'Small groups working on real challenges from the field.',
                room: 'Room 2',
              },
              {
                id: 'session-3',
                title: 'Lunch and open conversation',
                startTime: '2026-09-01T12:00:00Z',
                endTime: '2026-09-01T13:00:00Z',
                description: 'Time to breathe, taste and meet the people behind the roles.',
                room: 'The Terrace',
              },
              {
                id: 'session-4',
                title: 'Eye-level conversations',
                startTime: '2026-09-01T13:00:00Z',
                endTime: '2026-09-01T14:30:00Z',
                description: 'Sector leadership in open conversation with the audience — no slides.',
                room: 'Main Hall',
              },
            ],
          },
        ],
      },
    },
    {
      id: 'demo-speakers',
      type: SCENE_TYPES.speakerGrid,
      title: 'Speakers',
      enabled: true,
      content: {
        label: 'The faces of the event',
        heading: 'The people behind this day',
        intro: 'The leaders and facilitators who will accompany you through the day.',
        speakers: [
          {
            id: 'speaker-1',
            name: 'Dana Cohen',
            role: 'Program Director',
            photoUrl: '/demo/portrait-1.jpg',
            photoAlt: 'Dana Cohen',
          },
          {
            id: 'speaker-2',
            name: 'Yossi Levy',
            role: 'Guest Lecturer',
            photoUrl: '/demo/portrait-2.jpg',
            photoAlt: 'Yossi Levy',
          },
          {
            id: 'speaker-3',
            name: 'Michal Avraham',
            role: 'Government Digital Advisor',
            photoUrl: '/demo/portrait-3.jpg',
            photoAlt: 'Michal Avraham',
          },
          {
            id: 'speaker-4',
            name: 'Avi Rozen',
            role: 'Head of Innovation',
            photoUrl: '/demo/portrait-4.jpg',
            photoAlt: 'Avi Rozen',
          },
        ],
      },
    },
    {
      id: 'demo-unknown',
      type: 'spotlight',
      title: 'Unregistered scene',
      enabled: true,
      content: {},
    },
    {
      id: 'demo-venue',
      type: SCENE_TYPES.venue,
      title: 'Venue',
      enabled: true,
      content: {
        label: 'The place',
        heading: 'Home of the event',
        description: 'The convention center stands on the seam between the old city and the new — a place that reminds us why we gather.',
        name: 'The National Convention Center',
        address: '12 HaTkuma Boulevard, Jerusalem',
        image: {
          url: '/demo/venue-placeholder.jpg',
          alt: 'The convention center facade',
          width: 2000,
          height: 900,
        },
        mapUrl: 'https://maps.google.com/?q=Jerusalem',
        mapLabel: 'Get directions',
        details: [
          { id: 'parking', label: 'Parking', value: 'HaUma garage — 5 minute walk' },
          { id: 'transit', label: 'Public transit', value: 'Light rail — HaUma station' },
          { id: 'access', label: 'Accessibility', value: 'Fully accessible venue' },
          { id: 'doors', label: 'Doors open', value: '08:30' },
        ],
      },
    },
    {
      id: 'demo-faq',
      type: SCENE_TYPES.faq,
      title: 'FAQ',
      enabled: true,
      content: {
        label: 'Last questions',
        heading: 'Before we meet',
        items: [
          {
            id: 'faq-1',
            question: 'Is attendance free?',
            answer: 'Yes, the demo event is free to attend.',
          },
          {
            id: 'faq-2',
            question: 'Is early registration required?',
            answer: 'Yes, via the registration button on this page.',
          },
        ],
      },
    },
    {
      id: 'demo-cta',
      type: SCENE_TYPES.registrationCta,
      title: 'Registration',
      enabled: true,
      content: {
        eyebrow: 'Join us',
        heading: 'See you in September',
        text: 'Registration is open, seats are limited, and this day was built for you. All that remains is to arrive.',
        label: 'Register for the event',
        href: '#registration',
        note: 'Free of charge · advance registration only',
      },
    },
  ],
};

export const getDemoScenes = (locale: Locale): SceneData[] => demoScenes[locale];
