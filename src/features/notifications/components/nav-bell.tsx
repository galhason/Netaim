'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { Locale } from '@/config/locales';
import type { NoticeIcon } from '../services/feed-links';
import { IconBell, IconCheckAll, IconMeeting, IconPersonPlus, NoticeGlyph } from './notice-icons';
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
 * The bell in the navigation — the platform's quiet voice, and the
 * small window onto the notifications centre.
 *
 * It repeats exactly three kinds of news, all read from the server
 * through one small endpoint: what the production announced from its
 * panel, what happened in the networking room, and how many chat
 * messages are waiting. Messages arrive as ONE aggregated line —
 * "3 new messages" — never a ping per message; a person at a
 * conference does not need their pocket buzzing forty times.
 *
 * "Real time" here is honest polling: every half minute, plus a fresh
 * ask whenever the tab regains focus — the same pattern the live chat
 * uses, no sockets, no new infrastructure.
 *
 * What counts as unread is the same per-device state the centre page
 * reads (`read-state.ts`): the badge here and "N unread" there are one
 * number, and marking read in either place clears both. The actionable
 * numbers (requests, unread messages) never clear on their own — they
 * clear when acted upon, because they are live states, not news.
 *
 * Signed out, or before the first answer arrives, the bell renders
 * nothing at all: the navigation must not carry a dead button.
 */
interface BellItem {
  id: string;
  type: string;
  icon: NoticeIcon;
  subject: string;
  body: string;
  at: string | null;
  /* where a click lands — decided by the server, by type */
  href: string;
}

interface BellData {
  items: BellItem[];
  requests: number;
  unread: number;
}

const POLL_MS = 30_000;

const COPY = {
  label: { he: 'התראות', en: 'Notifications' },
  title: { he: 'התראות', en: 'Notifications' },
  empty: { he: 'אין התראות חדשות', en: 'No new notifications' },
  messagesOne: { he: 'הודעה חדשה אחת', en: '1 new message' },
  messagesMany: { he: 'הודעות חדשות', en: 'new messages' },
  messagesWhere: { he: 'בשיחות ה-Networking שלכם', en: 'in your Networking conversations' },
  requestsOne: { he: 'בקשת התחברות ממתינה', en: 'A connection request is waiting' },
  requestsMany: { he: 'בקשות התחברות ממתינות', en: 'connection requests waiting' },
  requestsWhere: { he: 'מחכות לתשובתכם', en: 'waiting for your answer' },
  markAll: { he: 'סמן הכל כנקרא', en: 'Mark all as read' },
  viewAll: { he: 'לכל ההתראות', en: 'View all notifications' },
} as const;

const NavBell = ({ locale }: { locale: Locale }) => {
  const he = locale === 'he';
  const [data, setData] = useState<BellData | null>(null);
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<ReadState>(() => ({ seenAt: 0, readIds: new Set() }));
  const deadRef = useRef(false);

  useEffect(() => {
    setState(readState());
    return subscribeReadState(() => setState(readState()));
  }, []);

  /* Escape closes the panel, as any dialog should. */
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    let stopped = false;
    const ask = async () => {
      if (stopped || deadRef.current || document.hidden) {
        return;
      }
      try {
        const res = await fetch(`/${locale}/me/notifications`, {
          cache: 'no-store',
        });
        if (res.status === 401) {
          /* signed out — stop asking, render nothing */
          deadRef.current = true;
          setData(null);
          return;
        }
        if (res.ok) {
          setData((await res.json()) as BellData);
        }
      } catch {
        /* weak connectivity — keep the last answer, try again later */
      }
    };
    void ask();
    const timer = setInterval(() => void ask(), POLL_MS);
    const onFocus = () => void ask();
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      stopped = true;
      clearInterval(timer);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [locale]);

  if (!data) {
    return null;
  }

  const unreadNotes = data.items.filter((item) => isUnread(item, state)).length;
  const badge = unreadNotes + data.requests + (data.unread > 0 ? 1 : 0);

  const num = (value: number) =>
    value.toLocaleString(he ? 'he-IL' : 'en-GB');
  const t = (entry: { he: string; en: string }) => (he ? entry.he : entry.en);

  const rowClass =
    'flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-start transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60';

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={t(COPY.label)}
        aria-expanded={open}
        className="relative grid size-11 place-items-center rounded-full text-text-secondary transition-colors hover:bg-white/10 hover:text-text-primary"
      >
        <IconBell className="size-5" />
        {badge > 0 ? (
          <span className="absolute end-1 top-1 grid min-w-4 place-items-center rounded-full bg-accent px-1 text-[9.5px] font-semibold tabular-nums text-brand-contrast">
            {badge > 9 ? '9+' : num(badge)}
          </span>
        ) : null}
      </button>

      {open ? (
        <>
          {/* an invisible sheet: clicking anywhere else closes the panel */}
          <button
            type="button"
            aria-hidden="true"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          {/* a phone gets a sheet pinned under the bar; wider screens a popover */}
          <div
            role="dialog"
            aria-label={t(COPY.title)}
            className="fixed inset-x-4 top-[6rem] z-50 rounded-2xl border border-white/10 bg-surface-raised p-2 text-text-primary shadow-[0_24px_64px_rgba(0,0,0,0.5)] sm:absolute sm:inset-x-auto sm:end-0 sm:top-full sm:mt-2 sm:w-[22rem]"
          >
            <div className="flex items-center justify-between gap-3 px-3 pb-2 pt-1.5">
              <span className="text-sm font-semibold">{t(COPY.title)}</span>
              {unreadNotes > 0 ? (
                <button
                  type="button"
                  onClick={() => markAllRead()}
                  className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11.5px] text-text-secondary transition-colors hover:bg-white/10 hover:text-text-primary"
                >
                  <IconCheckAll className="size-3.5" />
                  {t(COPY.markAll)}
                </button>
              ) : null}
            </div>

            {data.unread > 0 ? (
              <Link
                href={`/${locale}/me/messages#conversations`}
                onClick={() => setOpen(false)}
                className={rowClass}
              >
                <span className="grid size-9 flex-none place-items-center rounded-full bg-accent/15 text-accent">
                  <IconMeeting className="size-[18px]" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium">
                    {data.unread === 1
                      ? t(COPY.messagesOne)
                      : `${num(data.unread)} ${t(COPY.messagesMany)}`}
                  </span>
                  <span className="block text-xs text-text-secondary">
                    {t(COPY.messagesWhere)}
                  </span>
                </span>
              </Link>
            ) : null}

            {data.requests > 0 ? (
              <Link
                href={`/${locale}/me/networking#requests`}
                onClick={() => setOpen(false)}
                className={rowClass}
              >
                <span className="grid size-9 flex-none place-items-center rounded-full bg-accent/15 text-accent">
                  <IconPersonPlus className="size-[18px]" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium">
                    {data.requests === 1
                      ? t(COPY.requestsOne)
                      : `${num(data.requests)} ${t(COPY.requestsMany)}`}
                  </span>
                  <span className="block text-xs text-text-secondary">
                    {t(COPY.requestsWhere)}
                  </span>
                </span>
              </Link>
            ) : null}

            {data.items.length > 0 ? (
              <ul
                className={`max-h-[min(60vh,26rem)] overflow-y-auto overscroll-contain ${
                  data.unread > 0 || data.requests > 0
                    ? 'mt-1 border-t border-white/10 pt-1'
                    : ''
                }`}
              >
                {data.items.map((item) => {
                  const unread = isUnread(item, state);
                  return (
                    <li key={item.id}>
                      {/* every note is a door: click lands where it happened */}
                      <Link
                        href={item.href}
                        onClick={() => {
                          markRead(item.id);
                          setOpen(false);
                        }}
                        className={`${rowClass} ${unread ? 'bg-white/[0.04]' : ''}`}
                      >
                        <span
                          className={`grid size-9 flex-none place-items-center rounded-full ${
                            unread
                              ? 'bg-accent/15 text-accent'
                              : 'bg-white/8 text-text-secondary'
                          }`}
                        >
                          <NoticeGlyph icon={item.icon} className="size-[18px]" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span
                            className={`flex items-center gap-1.5 text-sm ${
                              unread ? 'font-semibold' : 'font-medium'
                            }`}
                          >
                            <span className="truncate">{item.subject}</span>
                            {unread ? (
                              <>
                                <span
                                  aria-hidden="true"
                                  className="size-1.5 flex-none rounded-full bg-accent"
                                />
                                <span className="sr-only">
                                  {he ? '(לא נקראה)' : '(unread)'}
                                </span>
                              </>
                            ) : null}
                          </span>
                          <span className="line-clamp-2 block text-xs leading-relaxed text-text-secondary">
                            {item.body}
                          </span>
                          <span
                            className="mt-0.5 block text-[10.5px] text-text-secondary/70"
                            suppressHydrationWarning
                          >
                            {noticeTimeLabel(item.at, locale)}
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : data.unread === 0 && data.requests === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-text-secondary">
                {t(COPY.empty)}
              </p>
            ) : null}

            <Link
              href={`/${locale}/me/messages`}
              onClick={() => setOpen(false)}
              className="mt-1 flex items-center justify-center gap-1.5 rounded-xl border-t border-white/10 px-3 py-2.5 text-sm font-medium text-accent transition-colors hover:bg-white/5"
            >
              {t(COPY.viewAll)}
              <svg viewBox="0 0 20 20" aria-hidden="true" className="size-3.5 rtl:-scale-x-100" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 10h12M11 5l5 5-5 5" />
              </svg>
            </Link>
          </div>
        </>
      ) : null}
    </div>
  );
};

export default NavBell;
