import type { Locale } from '@/config/locales';

/*
 * Home speaks in sentences, never counters (Objective 7). Templates
 * live here until Studio localization moves to catalogs (S2).
 */
export const HOME_SENTENCES = {
  startsIn: (days: number): Record<Locale, string> => ({
    he: `האירוע מתחיל בעוד ${days} ימים.`,
    en: `The event starts in ${days} days.`,
  }),
  readyToLaunch: (score: number): Record<Locale, string> => ({
    he: `מוכנות להשקה: ${score}%.`,
    en: `Ready to launch: ${score}%.`,
  }),
  readyNow: (): Record<Locale, string> => ({
    he: 'החוויה מוכנה — לא נותרו חסמים.',
    en: 'Your experience is ready — no blockers remain.',
  }),
  greeting: (
    part: 'morning' | 'afternoon' | 'evening',
    name: string,
  ): Record<Locale, string> => {
    const he = {
      morning: 'בוקר טוב',
      afternoon: 'צהריים טובים',
      evening: 'ערב טוב',
    };
    const en = {
      morning: 'Good morning',
      afternoon: 'Good afternoon',
      evening: 'Good evening',
    };
    const suffix = name ? `, ${name}` : '';
    return { he: `${he[part]}${suffix}`, en: `${en[part]}${suffix}` };
  },
  invite: (): Record<Locale, string> => ({
    he: 'בואו ניצור חוויות בלתי נשכחות.',
    en: 'Let’s create remarkable experiences.',
  }),
} as const;
