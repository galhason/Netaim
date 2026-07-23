import type { Locale } from '@/config/locales';

/*
 * Studio chrome labels carry both locales in code until Studio
 * localization is wired (S2); the shell resolves against the user's
 * preference, falling back to the platform fallback locale.
 */
export interface StudioArea {
  id: string;
  path: string;
  label: Record<Locale, string>;
}

export const STUDIO_AREAS: StudioArea[] = [
  { id: 'home', path: '/studio', label: { he: 'בית', en: 'Home' } },
  { id: 'events', path: '/studio/events', label: { he: 'אירועים', en: 'Events' } },
  {
    id: 'homepage',
    path: '/studio/homepage',
    label: { he: 'דף הבית', en: 'Homepage' },
  },
  { id: 'team', path: '/studio/team', label: { he: 'צוות', en: 'Team' } },
  {
    id: 'organization',
    path: '/studio/organization',
    label: { he: 'הארגון', en: 'Organization' },
  },
];

export const HOME_SECTIONS: { id: string; label: Record<Locale, string> }[] = [
  { id: 'continue', label: { he: 'להמשיך ליצור', en: 'Continue creating' } },
  { id: 'attention', label: { he: 'דורש תשומת לב', en: 'Needs attention' } },
  { id: 'ready', label: { he: 'מוכן להשקה', en: 'Ready to launch' } },
];

export const STUDIO_MESSAGES: Record<
  'title' | 'signInRequired' | 'signInAction',
  Record<Locale, string>
> = {
  title: { he: 'סטודיו', en: 'Studio' },
  signInRequired: {
    he: 'הכניסה לסטודיו דורשת הזדהות.',
    en: 'The Studio requires sign-in.',
  },
  signInAction: { he: 'לכניסה', en: 'Sign in' },
};
