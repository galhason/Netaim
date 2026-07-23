import type { Locale } from '@/config/locales';
import type { PublicRegistrationState } from '@/registration-engine';

/*
 * Public registration state as a sentence, never a badge — one label set
 * shared by the Studio, the Join scene and the participant area.
 */
export const PUBLIC_STATE_LABELS: Record<
  PublicRegistrationState,
  Record<Locale, string>
> = {
  draft: { he: 'טרם פורסם', en: 'Not published yet' },
  open: { he: 'ההרשמה פתוחה', en: 'Registration is open' },
  limited: { he: 'נותרו מעט מקומות', en: 'Only a few places left' },
  waitlist: { he: 'רשימת המתנה', en: 'Waiting list' },
  closed: { he: 'ההרשמה סגורה', en: 'Registration is closed' },
  cancelled: { he: 'האירוע בוטל', en: 'The event is cancelled' },
  completed: { he: 'האירוע הסתיים', en: 'The event has ended' },
};
