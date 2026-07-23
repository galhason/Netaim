import type { Locale } from '@/config/locales';

/*
 * Session times are authored as wall-clock values; formatting pins UTC
 * so the displayed time always matches the authored time. Event-level
 * timezone modeling belongs to the Event Engine (future sprint).
 */
export const formatSessionTime = (
  iso: string,
  locale: Locale,
): string | null => {
  const parsed = Date.parse(iso);

  if (Number.isNaN(parsed)) {
    return null;
  }

  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  }).format(parsed);
};
