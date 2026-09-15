import type { Locale } from '@/config/locales';
import { isAnnouncement } from './notifications-service';

/*
 * One taxonomy for the notes a person reads, shared by the bell in the
 * navigation and the notifications centre — so a click on "X wants to
 * connect" lands on the same shelf whether it was pressed in the bar
 * or on the page, and a note counted under "Networking" on the page
 * is the same kind the bell shows. If the two ever disagreed, the
 * person would learn to trust neither.
 *
 * The category is read from the note's `type` — the field the outbox
 * has always written — never from its words:
 *
 *   networking.*             what happened in the networking room
 *   registration.*           the person's own place at the conference
 *   announcement.*.activity  an activity they hold a seat in moved,
 *                            changed its hour or was cancelled
 *   announcement.*           what the production said from the Studio
 *
 * Everything else the outbox carries (a sign-in receipt, a
 * verification code) is bookkeeping, not news, and is not shown.
 */
export type NoticeCategory = 'conference' | 'networking' | 'system';

export const categoryOf = (type: string): NoticeCategory | null => {
  if (type.startsWith('networking.')) {
    return 'networking';
  }
  if (type.startsWith('registration.')) {
    return 'conference';
  }
  if (isAnnouncement(type)) {
    return type.endsWith('.activity') ? 'conference' : 'system';
  }
  return null;
};

export const isNewsworthy = (type: string): boolean => categoryOf(type) !== null;

/* The four shelves of the notifications centre. */
export type CenterFilter = 'all' | NoticeCategory;

export const isCenterFilter = (value: unknown): value is CenterFilter =>
  value === 'all' || value === 'conference' || value === 'networking' || value === 'system';

/*
 * The glyph a note wears. Chosen by type, so the bell and the page
 * draw the same picture for the same kind of news.
 */
export type NoticeIcon =
  | 'calendar'
  | 'ticket'
  | 'person-plus'
  | 'handshake'
  | 'meeting'
  | 'megaphone';

export const noticeIconOf = (type: string): NoticeIcon => {
  if (type.startsWith('networking.connectionRequested')) return 'person-plus';
  if (type.startsWith('networking.connectionAccepted')) return 'handshake';
  if (type.startsWith('networking.meeting')) return 'meeting';
  if (type.startsWith('networking.')) return 'handshake';
  if (type.startsWith('registration.')) return 'ticket';
  if (type.endsWith('.activity')) return 'calendar';
  return 'megaphone';
};

export const feedItemHref = (
  type: string,
  locale: Locale,
  slug: string,
): string => {
  if (type.startsWith('networking.connectionRequested')) {
    return `/${locale}/me/networking#requests`;
  }
  if (type.startsWith('networking.connectionAccepted')) {
    return `/${locale}/me/networking#connections`;
  }
  if (type.startsWith('networking.meeting')) {
    return `/${locale}/me/networking#meetings`;
  }
  if (type.startsWith('networking.')) {
    return `/${locale}/me/networking`;
  }
  /* An announcement about an activity the reader holds a seat in. */
  if (type.endsWith('.activity')) {
    return `/${locale}/events/${slug}/my-activities`;
  }
  /* The person's own registration: its state lives in their space. */
  if (type.startsWith('registration.')) {
    return `/${locale}/me`;
  }
  return `/${locale}/events/${slug}`;
};

/* Every note the person may read, newest first, in their language. */
export const newsworthyInLocale = <
  T extends { type: string; locale?: string | null; createdAt?: string | null },
>(
  feed: T[],
  locale: Locale,
): T[] =>
  feed
    .filter(
      (entry) =>
        isNewsworthy(entry.type) && (!entry.locale || entry.locale === locale),
    )
    .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
