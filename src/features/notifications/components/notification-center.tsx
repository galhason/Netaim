'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import type { Locale } from '@/config/locales';
import type { CenterFilter, NoticeCategory, NoticeIcon } from '../services/feed-links';
import {
  IconBell,
  IconCalendarNote,
  IconCheckAll,
  IconHandshake,
  IconSettingsDot,
  NoticeGlyph,
} from './notice-icons';
import {
  isUnread,
  markAllRead,
  markRead,
  noticeTimeLabel,
  readState,
  subscribeReadState,
  type ReadState,
} from './read-state';

/*
 * The notifications centre — the bell at full size.
 *
 * Everything the bell would show, without the bell's cap, sorted by
 * what is new, with the four shelves a person actually thinks in: all
 * of it, the conference, Networking, and what the production said.
 * The shelves are real filters over real notes, counted from the
 * data; the read state is the very one the bell reads, so the two
 * never disagree about what is new.
 *
 * Interactive rows that need the server (accept a request, confirm a
 * meeting) arrive rendered from the page as nodes and are placed on
 * their shelf; this component only decides what is shown and how.
 */

export interface CenterNotice {
  id: string;
  type: string;
  category: NoticeCategory;
  icon: NoticeIcon;
  subject: string;
  body: string;
  at: string | null;
  href: string;
  conference: string;
}

export interface CenterConversation {
  connectionId: string;
  otherName: string;
  unread: number;
  last: { body: string; mine: boolean; at: string | null } | null;
  conference: string;
  href: string;
}

interface NotificationCenterProps {
  locale: Locale;
  initialFilter: CenterFilter;
  notices: CenterNotice[];
  conversations: CenterConversation[];
  /* server-rendered rows with their forms: pending requests, live meetings */
  requests: { count: number; node: ReactNode };
  meetings: { count: number; node: ReactNode };
}

const COPY = {
  unreadOne: { he: 'התראה אחת שלא נקראה', en: '1 unread notification' },
  unreadMany: { he: 'התראות שלא נקראו', en: 'unread notifications' },
  allRead: { he: 'הכל נקרא', en: 'All caught up' },
  markAll: { he: 'סמן הכל כנקרא', en: 'Mark all as read' },
  markOne: { he: 'סמן כנקרא', en: 'Mark as read' },
  unreadTag: { he: 'לא נקראה', en: 'unread' },
  filters: { he: 'סינון התראות', en: 'Filter notifications' },
  conversations: { he: 'שיחות', en: 'Conversations' },
  requests: { he: 'בקשות התחברות', en: 'Connection requests' },
  meetings: { he: 'פגישות', en: 'Meetings' },
  notices: { he: 'עדכונים', en: 'Updates' },
  newFrom: { he: 'הודעה חדשה מאת', en: 'New message from' },
  you: { he: 'את/ה:', en: 'You:' },
  noWords: { he: 'עוד לא נאמר דבר — אפשר להתחיל.', en: 'Nothing said yet — start the conversation.' },
  open: { he: 'פתיחה', en: 'Open' },
  end: { he: 'אין עוד התראות להצגה', en: 'No more notifications' },
  emptyAll: { he: 'אין כרגע התראות', en: 'No notifications right now' },
  emptyAllSub: { he: 'כשמשהו יקרה — הוא יופיע כאן.', en: 'When something happens, it lands here.' },
  emptyConference: { he: 'אין כרגע התראות מהכנסים', en: 'No conference notifications right now' },
  emptyConferenceSub: { he: 'שינויים בהרצאות, בסדנאות ובהרשמה שלכם יופיעו כאן.', en: 'Changes to your lectures, workshops and registration will appear here.' },
  emptyNetworking: { he: 'אין כרגע התראות מ-Networking', en: 'No Networking notifications right now' },
  emptyNetworkingSub: { he: 'בקשות התחברות, אישורים ופגישות יופיעו כאן.', en: 'Connection requests, acceptances and meetings will appear here.' },
  emptySystem: { he: 'אין כרגע התראות מערכת', en: 'No system notifications right now' },
  emptySystemSub: { he: 'הודעות מצוות הכנס יופיעו כאן.', en: 'Messages from the conference team will appear here.' },
} as const;

const FILTERS: {
  key: CenterFilter;
  label: { he: string; en: string };
  Icon: (p: { className?: string }) => ReactNode;
}[] = [
  { key: 'all', label: { he: 'הכל', en: 'All' }, Icon: IconBell },
  { key: 'conference', label: { he: 'התראות מהכנסים', en: 'Conference updates' }, Icon: IconCalendarNote },
  { key: 'networking', label: { he: 'Networking', en: 'Networking' }, Icon: IconHandshake },
  { key: 'system', label: { he: 'מערכת', en: 'System' }, Icon: IconSettingsDot },
];

const TINT: Record<NoticeCategory, string> = {
  conference: 'bg-[var(--x-primary-wash)] text-[var(--x-primary)]',
  networking: 'bg-[var(--x-ok-wash)] text-[var(--x-ok)]',
  system: 'bg-[#eef0f5] text-[var(--x-soft)]',
};

const card =
  'rounded-[var(--x-r-card)] border border-[var(--x-line)] bg-[var(--x-surface)] shadow-[var(--x-shadow)]';

const NotificationCenter = ({
  locale,
  initialFilter,
  notices,
  conversations,
  requests,
  meetings,
}: NotificationCenterProps) => {
  const he = locale === 'he';
  const t = (entry: { he: string; en: string }) => (he ? entry.he : entry.en);
  const num = (value: number) => value.toLocaleString(he ? 'he-IL' : 'en-GB');

  const [filter, setFilter] = useState<CenterFilter>(initialFilter);
  /*
   * Read state lives in this browser, so the server renders every
   * note as read and the tint arrives with the first paint on the
   * client. Nothing moves — the tint is colour, not layout.
   */
  const [state, setState] = useState<ReadState | null>(null);
  useEffect(() => {
    setState(readState());
    return subscribeReadState(() => setState(readState()));
  }, []);

  const choose = (next: CenterFilter) => {
    setFilter(next);
    try {
      const url = new URL(window.location.href);
      if (next === 'all') url.searchParams.delete('filter');
      else url.searchParams.set('filter', next);
      window.history.replaceState(null, '', url.toString());
    } catch {
      /* the choice still applies on screen */
    }
  };

  const unreadOf = (item: CenterNotice) => (state ? isUnread(item, state) : false);

  const totals: Record<CenterFilter, number> = { all: 0, conference: 0, networking: 0, system: 0 };
  const unread: Record<CenterFilter, number> = { all: 0, conference: 0, networking: 0, system: 0 };
  let unreadNotes = 0;
  for (const notice of notices) {
    totals.all += 1;
    totals[notice.category] += 1;
    if (unreadOf(notice)) {
      unreadNotes += 1;
      unread.all += 1;
      unread[notice.category] += 1;
    }
  }
  /* Live states count on their shelf too: waiting requests and unread chats are news. */
  const live = requests.count + conversations.filter((c) => c.unread > 0).length;
  totals.networking += live;
  totals.all += live;
  unread.networking += live;
  unread.all += live;
  const counts = { totals, unread };

  const shown = notices.filter((notice) => filter === 'all' || notice.category === filter);
  const showSocial = filter === 'all' || filter === 'networking';
  const socialCount = showSocial
    ? conversations.length + requests.count + meetings.count
    : 0;
  const nothing = shown.length === 0 && socialCount === 0;
  const unreadNow = counts.unread[filter];

  const empty = {
    all: [COPY.emptyAll, COPY.emptyAllSub],
    conference: [COPY.emptyConference, COPY.emptyConferenceSub],
    networking: [COPY.emptyNetworking, COPY.emptyNetworkingSub],
    system: [COPY.emptySystem, COPY.emptySystemSub],
  }[filter] as [{ he: string; en: string }, { he: string; en: string }];
  const EmptyIcon = FILTERS.find((entry) => entry.key === filter)?.Icon ?? IconBell;

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[284px_minmax(0,1fr)] lg:items-start lg:gap-8">
      {/* ---- the shelves ---- */}
      <nav
        aria-label={t(COPY.filters)}
        className={`${card} p-2 lg:sticky lg:top-[calc(var(--announcement-h,0px)+6rem)] lg:p-2.5`}
      >
        <ul className="grid grid-cols-2 gap-1 lg:grid-cols-1 lg:gap-0 lg:divide-y lg:divide-[var(--x-line)]">
          {FILTERS.map(({ key, label, Icon }) => {
            const active = key === filter;
            const badge = counts.unread[key];
            const total = counts.totals[key];
            return (
              <li key={key} className="lg:py-1 lg:first:pt-0 lg:last:pb-0">
                <button
                  type="button"
                  onClick={() => choose(key)}
                  aria-current={active ? 'true' : undefined}
                  className={`flex min-h-12 w-full items-center gap-2.5 rounded-[var(--x-r-field)] px-3 text-start text-[13.5px] leading-tight transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--x-ring)] sm:gap-3 sm:text-[14px] lg:min-h-[54px] lg:px-4 lg:text-[15px] ${
                    active
                      ? 'bg-[var(--x-primary-wash)] font-semibold text-[var(--x-ink)]'
                      : 'font-medium text-[var(--x-soft)] hover:bg-[var(--x-raise)] hover:text-[var(--x-ink)]'
                  }`}
                >
                  <Icon
                    className={`hidden size-5 flex-none sm:block ${
                      active ? 'text-[var(--x-primary)]' : 'text-[var(--x-faint)]'
                    }`}
                  />
                  <span className="min-w-0 flex-1" lang={key === 'networking' ? 'en' : undefined}>
                    {t(label)}
                  </span>
                  {badge > 0 ? (
                    <span className="grid min-w-6 flex-none place-items-center rounded-full bg-[var(--x-primary)] px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-white">
                      {num(badge)}
                      <span className="sr-only"> {t(COPY.unreadMany)}</span>
                    </span>
                  ) : total > 0 ? (
                    <span className="flex-none text-xs tabular-nums text-[var(--x-faint)]">
                      {num(total)}
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* ---- the list ---- */}
      <section className={`${card} p-4 sm:p-6 lg:p-7`} aria-live="polite">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-[var(--x-soft)]">
            {unreadNow === 0 ? (
              t(COPY.allRead)
            ) : unreadNow === 1 ? (
              <strong className="font-semibold text-[var(--x-ink)]">{t(COPY.unreadOne)}</strong>
            ) : (
              <>
                <strong className="font-semibold text-[var(--x-ink)]">{num(unreadNow)}</strong>{' '}
                {t(COPY.unreadMany)}
              </>
            )}
          </p>
          <button
            type="button"
            onClick={() => markAllRead()}
            disabled={unreadNotes === 0}
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[var(--x-line-strong)] bg-[var(--x-surface)] px-4 text-[13px] font-medium text-[var(--x-ink)] transition-colors hover:border-[var(--x-primary)] hover:text-[var(--x-primary)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--x-ring)] disabled:cursor-default disabled:opacity-50 disabled:hover:border-[var(--x-line-strong)] disabled:hover:text-[var(--x-ink)]"
          >
            <IconCheckAll className="size-4" />
            {t(COPY.markAll)}
          </button>
        </div>

        {nothing ? (
          <div className="flex flex-col items-center px-4 py-14 text-center">
            <span className="grid size-14 place-items-center rounded-full bg-[var(--x-primary-wash)] text-[var(--x-primary)]">
              <EmptyIcon className="size-6" />
            </span>
            <p className="mt-4 text-[15px] font-semibold text-[var(--x-ink)]">{t(empty[0])}</p>
            <p className="mt-1 max-w-xs text-sm text-[var(--x-soft)]">{t(empty[1])}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {showSocial && conversations.length > 0 ? (
              <div id="conversations" className="scroll-mt-28">
                <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--x-faint)]">
                  {t(COPY.conversations)}
                </h2>
                <ul className="flex flex-col gap-2">
                  {conversations.map((conversation) => {
                    const fresh = conversation.unread > 0;
                    return (
                      <li key={conversation.connectionId}>
                        <Link
                          href={conversation.href}
                          className={`group flex items-start gap-3.5 rounded-2xl border px-4 py-3.5 transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--x-ring)] ${
                            fresh
                              ? 'border-[var(--x-primary)]/15 bg-[var(--x-primary-wash)]/60 hover:bg-[var(--x-primary-wash)]'
                              : 'border-[var(--x-line)] bg-[var(--x-surface)] hover:border-[var(--x-line-strong)] hover:bg-[var(--x-raise)]'
                          }`}
                        >
                          <span className="relative grid size-11 flex-none place-items-center rounded-full bg-[var(--x-ok-wash)] font-display text-base font-semibold text-[var(--x-ok)]">
                            {conversation.otherName.trim().charAt(0) || '·'}
                            {fresh ? (
                              <span className="absolute -end-0.5 -top-0.5 grid min-w-[18px] place-items-center rounded-full bg-[var(--x-primary)] px-1 text-[10px] font-semibold text-white ring-2 ring-white">
                                {num(conversation.unread)}
                              </span>
                            ) : null}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className={`block text-[15px] ${fresh ? 'font-semibold' : 'font-medium'} text-[var(--x-ink)]`}>
                              {fresh ? `${t(COPY.newFrom)} ${conversation.otherName}` : conversation.otherName}
                            </span>
                            <span className={`mt-0.5 block truncate text-sm ${fresh ? 'text-[var(--x-ink)]' : 'text-[var(--x-soft)]'}`}>
                              {conversation.last
                                ? `${conversation.last.mine ? `${t(COPY.you)} ` : ''}${conversation.last.body}`
                                : t(COPY.noWords)}
                            </span>
                            <span className="mt-1 block text-xs text-[var(--x-faint)]" suppressHydrationWarning>
                              {conversation.conference}
                              {conversation.last?.at ? ` · ${noticeTimeLabel(conversation.last.at, locale)}` : ''}
                            </span>
                          </span>
                          <span className="hidden flex-none self-center text-xs font-medium text-[var(--x-primary)] sm:inline">
                            {t(COPY.open)} {he ? '←' : '→'}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}

            {showSocial && requests.count > 0 ? (
              <div id="requests" className="scroll-mt-28">
                <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--x-faint)]">
                  {t(COPY.requests)}
                </h2>
                {requests.node}
              </div>
            ) : null}

            {showSocial && meetings.count > 0 ? (
              <div id="meetings" className="scroll-mt-28">
                <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--x-faint)]">
                  {t(COPY.meetings)}
                </h2>
                {meetings.node}
              </div>
            ) : null}

            {shown.length > 0 ? (
              <div>
                {socialCount > 0 ? (
                  <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--x-faint)]">
                    {t(COPY.notices)}
                  </h2>
                ) : null}
                <ul className="flex flex-col gap-2">
                  {shown.map((notice) => {
                    const unread = unreadOf(notice);
                    return (
                      <li
                        key={notice.id}
                        className={`relative flex items-start gap-3.5 rounded-2xl border px-4 py-4 transition-colors sm:items-center sm:gap-4 ${
                          unread
                            ? 'border-[var(--x-primary)]/15 bg-[var(--x-primary-wash)]/60'
                            : 'border-[var(--x-line)] bg-[var(--x-surface)]'
                        }`}
                      >
                        <span
                          className={`relative grid size-11 flex-none place-items-center rounded-full sm:size-12 ${TINT[notice.category]}`}
                        >
                          <NoticeGlyph icon={notice.icon} className="size-5" />
                          {unread ? (
                            <span
                              aria-hidden="true"
                              className="absolute -start-0.5 -top-0.5 size-2.5 rounded-full bg-[var(--x-primary)] ring-2 ring-white"
                            />
                          ) : null}
                        </span>
                        <Link
                          href={notice.href}
                          onClick={() => markRead(notice.id)}
                          className="min-w-0 flex-1 rounded-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--x-ring)]"
                        >
                          <span
                            className={`block truncate text-[15px] text-[var(--x-ink)] sm:text-base ${
                              unread ? 'font-semibold' : 'font-medium'
                            }`}
                          >
                            {notice.subject}
                            {unread ? <span className="sr-only"> ({t(COPY.unreadTag)})</span> : null}
                          </span>
                          <span className="mt-0.5 block text-sm leading-relaxed text-[var(--x-soft)]">
                            {notice.body}
                          </span>
                          <span className="mt-1.5 flex flex-wrap items-center gap-x-2 text-xs text-[var(--x-faint)]">
                            <time dateTime={notice.at ?? undefined} suppressHydrationWarning className="sm:hidden">
                              {noticeTimeLabel(notice.at, locale)}
                            </time>
                            <span aria-hidden="true" className="sm:hidden">·</span>
                            <span>{notice.conference}</span>
                          </span>
                        </Link>
                        <time
                          dateTime={notice.at ?? undefined}
                          suppressHydrationWarning
                          className="hidden w-24 flex-none text-end text-xs text-[var(--x-faint)] sm:block"
                        >
                          {noticeTimeLabel(notice.at, locale)}
                        </time>
                        {unread ? (
                          <button
                            type="button"
                            onClick={() => markRead(notice.id)}
                            aria-label={`${t(COPY.markOne)}: ${notice.subject}`}
                            title={t(COPY.markOne)}
                            className="grid size-9 flex-none place-items-center self-center rounded-full text-[var(--x-faint)] transition-colors hover:bg-[var(--x-surface)] hover:text-[var(--x-primary)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--x-ring)]"
                          >
                            <IconCheckAll className="size-4" />
                          </button>
                        ) : (
                          <span aria-hidden="true" className="hidden size-9 flex-none sm:block" />
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}

            <p className="flex items-center gap-4 pt-2 text-xs text-[var(--x-faint)] before:h-px before:flex-1 before:bg-[var(--x-line)] after:h-px after:flex-1 after:bg-[var(--x-line)]">
              {t(COPY.end)}
            </p>
          </div>
        )}
      </section>
    </div>
  );
};

export default NotificationCenter;
