import type { Locale } from '@/config/locales';
import type { OpeningContent, PortalPoster } from '../types/opening';

export const NAV_LINKS = [
  { id: 'events', label: { he: 'כנסים', en: 'Conferences' } },
  { id: 'why', label: { he: 'למה אנחנו', en: 'Why us' } },
  { id: 'moments', label: { he: 'רגעים', en: 'Moments' } },
] as const;

export const OPENING_SCENE_TYPES = {
  nav: 'opening-nav',
  footer: 'opening-footer',
  featuredHero: 'opening-featured-hero',
  hero: 'opening-hero',
  portalWall: 'opening-portal-wall',
  story: 'opening-story',
  moments: 'opening-moments',
  closing: 'opening-closing',
} as const;

export const OPENING_UI = {
  scrollHint: { he: 'גללו כדי להתחיל', en: 'Scroll to begin' },
  enterEvent: { he: 'גלו את הכנס', en: 'Discover the event' },
  myArea: { he: 'האזור האישי', en: 'My Space' },
  watchStory: { he: 'צפו בסיפור', en: 'Watch the story' },
  carouselPrev: { he: 'האירוע הקודם', en: 'Previous event' },
  carouselNext: { he: 'האירוע הבא', en: 'Next event' },
  toStudio: { he: 'כניסה לסטודיו', en: 'Enter Studio' },
  footerTagline: {
    he: 'PLATFORM FOR MEANINGFUL EVENTS',
    en: 'PLATFORM FOR MEANINGFUL EVENTS',
  },
  rights: { he: 'כל הזכויות שמורות', en: 'All rights reserved' },
} as const;

/*
 * Generic teasers cover events whose editors have not yet written one —
 * every portal keeps an emotional sentence until the CMS holds the real
 * copy.
 */
/*
 * Color flow (Transition Rule 08): the light each scene inherits from
 * the one before it — warm stage bronze cooling gradually toward navy.
 */
export const SCENE_BLEEDS = {
  worlds: 'rgb(201 161 93 / 0.1)',
  story: 'rgb(214 200 178 / 0.08)',
  moments: 'rgb(148 170 200 / 0.07)',
} as const;

export const FEATURED_CLOSING_CTA = {
  he: 'גלו את הכנס המוביל',
  en: 'Discover the featured event',
} as const;

export const GENERIC_TEASERS = {
  he: [
    'מקום שבו רעיונות הופכים למציאות.',
    'החוויה הבאה שלכם מתחילה כאן.',
    'בואו לפגוש את האנשים שמובילים את השינוי.',
  ],
  en: [
    'Where ideas become reality.',
    'Your next experience starts here.',
    'Meet the people leading the change.',
  ],
} as const;

const photo = (seed: string, w: number, h: number): string =>
  `https://picsum.photos/seed/${seed}/${w}/${h}`;

const fallbackPosters = (locale: Locale): PortalPoster[] => {
  const he = locale === 'he';
  return [
    {
      slug: null,
      href: null,
      comingSoon: he ? 'בקרוב' : 'Coming soon',
      title: he
        ? 'ועידת החדשנות בשירות הציבורי'
        : 'The Public Service Innovation Summit',
      location: he ? 'ירושלים' : 'Jerusalem',
      dateLabel: he ? '21–20 באוקטובר 2026' : '20–21 October 2026',
      teaser: he
        ? 'מקום שבו רעיונות הופכים למציאות.'
        : 'Where ideas become reality.',
      image: photo('hason-portal-innovation', 900, 1200),
      featured: true,
      tone: 'bronze',
    },
    {
      slug: null,
      href: null,
      comingSoon: he ? 'בקרוב' : 'Coming soon',
      title: he ? 'ועידת האקלים 2026' : 'Climate Summit 2026',
      location: he ? 'חיפה' : 'Haifa',
      dateLabel: he ? '4–3 בדצמבר 2026' : '3–4 December 2026',
      teaser: he
        ? 'הדור הבא של קיימות מתחיל כאן.'
        : 'The next generation of sustainability starts here.',
      image: photo('hason-portal-climate', 900, 1200),
      featured: false,
      tone: 'nature',
    },
    {
      slug: null,
      href: null,
      comingSoon: he ? 'בקרוב' : 'Coming soon',
      title: he ? 'עתיד העיר' : 'The Future of the City',
      location: he ? 'תל אביב' : 'Tel Aviv',
      dateLabel: he ? '15 בספטמבר 2026' : '15 September 2026',
      teaser: he ? 'העיר של מחר נבנית היום.' : 'Tomorrow’s city is built today.',
      image: photo('hason-portal-city', 900, 1200),
      featured: false,
      tone: 'innovation',
    },
    {
      slug: null,
      href: null,
      comingSoon: he ? 'בקרוב' : 'Coming soon',
      title: he ? 'AI לרווחת הציבור' : 'AI for the Public Good',
      location: he ? 'באר שבע' : 'Be’er Sheva',
      dateLabel: he ? '12–11 בינואר 2027' : '11–12 January 2027',
      teaser: he ? 'טכנולוגיה בשירות האדם.' : 'Technology in the service of people.',
      image: photo('hason-portal-ai', 900, 1200),
      featured: false,
      tone: 'daylight',
    },
  ];
};

/*
 * The opening's fallback: the platform voice and a demo portal wall, so
 * the homepage always plays in full before real conferences are
 * launched. Photography is placeholder until production artwork lands.
 */
export const fallbackOpeningContent = (locale: Locale): OpeningContent => {
  const he = locale === 'he';
  return {
    meHref: `/${locale}/me`,
    featured: null,
    hero: {
      titleMain: he ? 'מקום לרעיונות' : 'A place for ideas',
      titleAccent: he ? 'שמשנים מציאות.' : 'that change reality.',
      subtitle: he
        ? 'מחברים בין אנשים, רעיונות ומנהיגות כדי לבנות עתיד טוב יותר.'
        : 'Connecting people, ideas and leadership to build a better future.',
      image: '/demo/hero-placeholder.jpg',
    },
    events: {
      title: he ? 'האירועים שמחכים לכם' : 'The events waiting for you',
      subtitle: he
        ? 'כל כנס הוא עולם שלם. בחרו את החוויה הבאה שלכם.'
        : 'Every conference is a whole world. Choose your next experience.',
    },
    posters: fallbackPosters(locale),
    why: {
      eyebrow: he ? 'למה אנחנו נפגשים' : 'Why we gather',
      title: he
        ? 'כל כנס גדול מתחיל חודשים לפני שהאורח הראשון מגיע.'
        : 'Every great conference begins months before the first guest arrives.',
      paragraph: he
        ? 'רעיונות צומחים משיחות. קהילות נבנות ממפגשים. השפעה ציבורית מתחילה כשאנשים חולקים חדר אחד.'
        : 'Ideas grow through conversations. Communities grow through meetings. Public impact begins when people share a room.',
      image: '/demo/story-placeholder.jpg',
    },
    moments: {
      title: he ? 'רגעים שנשארים' : 'Moments that stay',
      images: [
        '/demo/venue-placeholder.jpg',
        '/demo/portrait-1.jpg',
        '/demo/portrait-2.jpg',
        '/demo/portrait-3.jpg',
        '/demo/portrait-4.jpg',
        photo('hason-moment-backstage', 900, 900),
      ],
    },
    closing: {
      title: he
        ? 'השיחה המשמעותית הבאה מתחילה כאן.'
        : 'The next meaningful conversation starts here.',
      subtitle: he ? 'היו שם כשזה קורה.' : 'Be there when it happens.',
      cta: he ? 'גלו את הכנסים' : 'Discover the conferences',
      href: null,
    },
  };
};
