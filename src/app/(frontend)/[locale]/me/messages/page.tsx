import { notFound, redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { brandFor } from '@/config/brand';
import { isSupportedLocale, type Locale } from '@/config/locales';
import {
  ACCOUNT_UI,
  JOINED_CONFERENCE_FANOUT,
  fanoutTruncates,
  getMyAccount,
} from '@/features/account';
import { LOUNGE_UI } from '@/features/attendee';
import { CinematicNav } from '@/features/cinematic';
import { getActiveConferenceSlug, getEventExperience } from '@/features/events';
import { myConnections, myConversations, myMeetings } from '@/features/networking';
import type { ConversationPreview } from '@/features/networking';
import {
  NotificationCenter,
  categoryOf,
  feedItemHref,
  isCenterFilter,
  listMyFeed,
  newsworthyInLocale,
  noticeIconOf,
} from '@/features/notifications';
import type { CenterConversation, CenterNotice } from '@/features/notifications';
import { formatLongDate, formatTimeLabel } from '@/shared';
import {
  cancelMeetingAction,
  confirmMeetingAction,
  respondConnectionAction,
  suggestMeetingTimeAction,
} from '../networking/actions';

/*
 * The notifications centre (one account, one home): every joined
 * conference pours its conversations, requests, meetings and updates
 * into one place at /me/messages — the vision's "not a bell, a feed",
 * platform wide.
 *
 * The bell in the navigation and this page are one thing seen at two
 * sizes. The bell shows the newest few and where they lead; this page
 * shows all of them, on four shelves, and a click here lands exactly
 * where the same click in the bell would — the rule is shared, not
 * copied. And the bell's "3 new messages" points here, so here is
 * where the conversations are: each one a door into its chat.
 *
 * This file gathers; `NotificationCenter` shows. The rows that need
 * the server — accept a request, confirm a meeting — are rendered
 * here with their forms and handed over as nodes.
 */
interface MessagesPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ filter?: string }>;
}

const COPY = {
  eyebrow: { he: 'מרכז ההתראות', en: 'Notification centre' },
  title: { he: 'התראות', en: 'Notifications' },
  intro: { he: 'כל העדכונים החשובים במקום אחד.', en: 'Everything that matters, in one place.' },
  wantsToConnect: { he: 'רוצה להתחבר איתך', en: 'would like to connect' },
  confirmed: { he: 'מאושרת', en: 'Confirmed' },
  proposed: { he: 'ממתינה לאישור', en: 'Awaiting confirmation' },
  another: { he: 'הצעת זמן אחר', en: 'Suggest another time' },
  start: { he: 'התחלה', en: 'Start' },
  end: { he: 'סיום', en: 'End' },
  send: { he: 'שליחת ההצעה', en: 'Send suggestion' },
} as const;

const primary =
  'inline-flex min-h-10 items-center justify-center rounded-[var(--x-r-field)] bg-[var(--x-primary)] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-[var(--x-primary-strong)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--x-ring)]';
const quiet =
  'inline-flex min-h-10 items-center justify-center rounded-[var(--x-r-field)] border border-[var(--x-line-strong)] bg-[var(--x-surface)] px-4 text-[13px] font-medium text-[var(--x-ink)] transition-colors hover:border-[var(--x-primary)] hover:text-[var(--x-primary)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--x-ring)]';
const row =
  'flex flex-wrap items-center gap-3.5 rounded-2xl border border-[var(--x-primary)]/15 bg-[var(--x-primary-wash)]/60 px-4 py-3.5';

const Leaf = () => (
  <svg
    viewBox="0 0 320 320"
    aria-hidden="true"
    className="pointer-events-none absolute -top-10 end-[-3rem] size-64 opacity-[0.12] rtl:-scale-x-100 md:size-80"
    fill="var(--x-ok)"
  >
    <path d="M60 300c0-90 55-160 150-180-10 95-60 160-150 180Z" />
    <path d="M120 310c20-60 70-100 140-110-20 70-70 110-140 110Z" opacity=".6" />
    <path d="M40 320c-5-40 10-80 45-100 5 40-10 80-45 100Z" opacity=".5" />
  </svg>
);

const BellMark = () => (
  <span className="grid size-12 flex-none place-items-center rounded-full bg-[var(--x-primary-wash)] text-[var(--x-primary)] md:size-14">
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8.5a6 6 0 0 0-12 0c0 7-3 8.5-3 8.5h18s-3-1.5-3-8.5" />
      <path d="M13.7 20.5a2 2 0 0 1-3.4 0" />
    </svg>
  </span>
);

const MessagesPage = async ({ params, searchParams }: MessagesPageProps) => {
  const { locale: raw } = await params;
  if (!isSupportedLocale(raw)) {
    notFound();
  }
  const locale = raw as Locale;
  setRequestLocale(locale);
  const he = locale === 'he';
  const t = (entry: { he: string; en: string }) => (he ? entry.he : entry.en);

  const { filter } = await searchParams;
  const initialFilter = isCenterFilter(filter) ? filter : 'all';

  const account = await getMyAccount(locale);
  if (!account) {
    redirect(`/${locale}/me`);
  }

  /*
   * The conferences this centre reads: the ones the account joined, and
   * the live one besides — a guest who took a workshop seat without an
   * event-level registration still receives that workshop's notes, and
   * the bell already reads the live conference for the same reason.
   */
  const activeSlug = await getActiveConferenceSlug(locale).catch(() => null);
  const slugs = [
    ...new Set([
      ...(activeSlug ? [activeSlug] : []),
      ...account.joined.map((conference) => conference.slug),
    ]),
  ].slice(0, JOINED_CONFERENCE_FANOUT);
  const titleOf = new Map(
    account.joined.map((conference) => [conference.slug, conference.title]),
  );
  if (activeSlug && !titleOf.has(activeSlug)) {
    const live = await getEventExperience(activeSlug, locale, { draft: false }).catch(
      () => null,
    );
    if (live?.title) {
      titleOf.set(activeSlug, live.title);
    }
  }
  const nameOf = (slug: string) => titleOf.get(slug) ?? slug;

  const perConference = await Promise.all(
    slugs.map(async (slug) => {
      const [connections, meetings, notifications] = await Promise.all([
        myConnections(slug).catch(() => []),
        myMeetings(slug).catch(() => []),
        listMyFeed(slug).catch(() => []),
      ]);
      const conversations = await myConversations(connections).catch(
        () => [] as ConversationPreview[],
      );
      return { slug, connections, meetings, notifications, conversations };
    }),
  );

  const requests = perConference.flatMap(({ slug, connections }) =>
    connections
      .filter(
        (connection) =>
          connection.status === 'pending' &&
          connection.direction === 'incoming',
      )
      .map((connection) => ({ ...connection, slug })),
  );
  const liveMeetings = perConference.flatMap(({ slug, meetings }) =>
    meetings
      .filter(
        (meeting) =>
          meeting.status === 'proposed' || meeting.status === 'confirmed',
      )
      .map((meeting) => ({ ...meeting, slug })),
  );
  const conversations: CenterConversation[] = perConference
    .flatMap(({ slug, conversations: previews }) =>
      previews.map((preview) => ({
        connectionId: preview.connectionId,
        otherName: preview.otherName,
        unread: preview.unread,
        last: preview.last
          ? { body: preview.last.body, mine: preview.last.mine, at: preview.last.createdAt ?? null }
          : null,
        conference: nameOf(slug),
        href: `/${locale}/me/chat/${preview.connectionId}`,
      })),
    )
    .sort((a, b) => {
      if ((b.unread > 0) !== (a.unread > 0)) {
        return b.unread > 0 ? 1 : -1;
      }
      return (b.last?.at ?? '').localeCompare(a.last?.at ?? '');
    });

  /*
   * Everything the bell would show, without the bell's cap: the
   * production's announcements, the networking notes and the person's
   * own registration, in their language, newest first, each with its
   * shelf and the place it leads to — all read from the note's type.
   */
  const notices: CenterNotice[] = perConference
    .flatMap(({ slug, notifications }) =>
      newsworthyInLocale(notifications, locale).flatMap((notification) => {
        const category = categoryOf(notification.type);
        return category
          ? [
              {
                id: notification.id,
                type: notification.type,
                category,
                icon: noticeIconOf(notification.type),
                subject: notification.subject,
                body: notification.body,
                at: notification.createdAt ?? null,
                href: feedItemHref(notification.type, locale, slug),
                conference: nameOf(slug),
              },
            ]
          : [];
      }),
    )
    .sort((a, b) => (b.at ?? '').localeCompare(a.at ?? ''))
    .slice(0, 100);

  /* This screen reaches into a bounded number of conferences; say so
     rather than let a sixth one quietly not be here. */
  const truncated = fanoutTruncates(account.joined);

  const requestsNode = (
    <ul className="flex flex-col gap-2">
      {requests.map((request) => (
        <li key={request.id} className={row}>
          <span className="grid size-11 flex-none place-items-center rounded-full bg-[var(--x-ok-wash)] font-display text-base font-semibold text-[var(--x-ok)]">
            {request.otherName.trim().charAt(0) || '·'}
          </span>
          <span className="min-w-0 flex-1 basis-48">
            <span className="block text-[15px] font-semibold text-[var(--x-ink)]">
              {request.otherName}{' '}
              <span className="font-normal text-[var(--x-soft)]">{t(COPY.wantsToConnect)}</span>
            </span>
            {request.message ? (
              <span className="mt-0.5 block text-sm text-[var(--x-soft)]">“{request.message}”</span>
            ) : null}
            <span className="mt-1 block text-xs text-[var(--x-faint)]">{nameOf(request.slug)}</span>
          </span>
          <span className="flex items-center gap-2">
            <form action={respondConnectionAction}>
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="slug" value={request.slug} />
              <input type="hidden" name="connectionId" value={request.id} />
              <input type="hidden" name="response" value="accept" />
              <button type="submit" className={primary}>
                {LOUNGE_UI.accept[locale]}
              </button>
            </form>
            <form action={respondConnectionAction}>
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="slug" value={request.slug} />
              <input type="hidden" name="connectionId" value={request.id} />
              <input type="hidden" name="response" value="decline" />
              <button type="submit" className={quiet}>
                {LOUNGE_UI.decline[locale]}
              </button>
            </form>
          </span>
        </li>
      ))}
    </ul>
  );

  const meetingsNode = (
    <ul className="flex flex-col gap-2">
      {liveMeetings.map((meeting) => (
        <li
          key={meeting.id}
          className={`${row} ${meeting.status === 'confirmed' ? 'border-[var(--x-line)] bg-[var(--x-surface)]' : ''}`}
        >
          <span className="grid size-11 flex-none place-items-center rounded-full bg-[var(--x-ok-wash)] text-[var(--x-ok)]">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3.5" y="5" width="17" height="15" rx="3" />
              <path d="M3.5 10h17M8 3v4M16 3v4M9 15l2 2 4-4" />
            </svg>
          </span>
          <span className="min-w-0 flex-1 basis-48">
            <span className="block text-[15px] font-semibold text-[var(--x-ink)]">
              {LOUNGE_UI.meetingWith[locale]} {meeting.otherName}
            </span>
            <span className="mt-0.5 block text-sm text-[var(--x-soft)]">
              {formatLongDate(meeting.startsAt, locale)} · {formatTimeLabel(meeting.startsAt, locale)}–
              {formatTimeLabel(meeting.endsAt, locale)}
              {meeting.location ? ` · ${meeting.location}` : ''}
            </span>
            <span className="mt-1 block text-xs text-[var(--x-faint)]">{nameOf(meeting.slug)}</span>
          </span>
          <span className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center rounded-[var(--x-r-pill)] px-2.5 py-0.5 text-[11px] font-semibold ${
                meeting.status === 'confirmed'
                  ? 'bg-[var(--x-ok-wash)] text-[var(--x-ok)]'
                  : 'bg-[var(--x-warn-wash)] text-[var(--x-warn)]'
              }`}
            >
              {meeting.status === 'confirmed' ? t(COPY.confirmed) : t(COPY.proposed)}
            </span>
            {meeting.status === 'proposed' && meeting.role === 'guest' ? (
              <form action={confirmMeetingAction}>
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="slug" value={meeting.slug} />
                <input type="hidden" name="meetingId" value={meeting.id} />
                <button type="submit" className={primary}>
                  {LOUNGE_UI.confirm[locale]}
                </button>
              </form>
            ) : null}
            <form action={cancelMeetingAction}>
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="slug" value={meeting.slug} />
              <input type="hidden" name="meetingId" value={meeting.id} />
              <button type="submit" className={quiet}>
                {LOUNGE_UI.cancel[locale]}
              </button>
            </form>
          </span>
          {meeting.status === 'proposed' ? (
            <details className="w-full basis-full">
              <summary className="cursor-pointer text-xs font-medium text-[var(--x-primary)] underline-offset-4 hover:underline">
                {t(COPY.another)}
              </summary>
              <form action={suggestMeetingTimeAction} className="mt-3 flex flex-wrap items-end gap-3">
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="slug" value={meeting.slug} />
                <input type="hidden" name="meetingId" value={meeting.id} />
                <label className="flex flex-col gap-1 text-xs text-[var(--x-soft)]">
                  {t(COPY.start)}
                  <input
                    type="datetime-local"
                    name="startsAt"
                    required
                    className="min-h-10 rounded-[var(--x-r-field)] border border-[var(--x-line-strong)] bg-[var(--x-surface)] px-3 text-sm text-[var(--x-ink)]"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs text-[var(--x-soft)]">
                  {t(COPY.end)}
                  <input
                    type="datetime-local"
                    name="endsAt"
                    required
                    className="min-h-10 rounded-[var(--x-r-field)] border border-[var(--x-line-strong)] bg-[var(--x-surface)] px-3 text-sm text-[var(--x-ink)]"
                  />
                </label>
                <button type="submit" className={primary}>
                  {t(COPY.send)}
                </button>
              </form>
            </details>
          ) : null}
        </li>
      ))}
    </ul>
  );

  return (
    <div className="experience min-h-dvh overflow-x-clip bg-[var(--x-bg)] text-[var(--x-ink)]">
      {/*
        * The site's own navigation — the same bar every page wears, so
        * the bell that led here is still in reach. It floats fixed over
        * a light ground here, hence the solid surface from the start.
        */}
      <div className="cinematic bg-transparent [&::after]:content-none [&>header]:border-b [&>header]:border-white/10 [&>header]:bg-[#08111e]/95 [&>header]:backdrop-blur-md">
        <CinematicNav
          locale={locale}
          registerHref={`/${locale}`}
          meHref={`/${locale}/me`}
          brand={brandFor(locale)}
          viewer={{ name: account.name || account.email }}
          immediate
        />
      </div>

      <main
        id="main-content"
        className="relative mx-auto max-w-6xl px-5 pb-20 pt-[6.5rem] md:px-8 md:pt-[7.5rem]"
      >
        <Leaf />
        <header className="relative flex items-start gap-4 md:gap-5">
          <BellMark />
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--x-primary)]">
              {t(COPY.eyebrow)}
            </p>
            <h1 className="mt-1 font-display text-[2rem] font-extrabold leading-[1.1] tracking-tight text-[var(--x-ink)] md:text-[2.6rem]">
              {t(COPY.title)}
            </h1>
            <p className="mt-2 text-[15px] leading-relaxed text-[var(--x-soft)] md:text-[17px]">
              {t(COPY.intro)}
            </p>
          </div>
        </header>

        {truncated ? (
          <p className="mt-4 text-xs text-[var(--x-faint)]">{ACCOUNT_UI.fanoutNote[locale]}</p>
        ) : null}

        <div className="relative mt-8 md:mt-10">
          <NotificationCenter
            locale={locale}
            initialFilter={initialFilter}
            notices={notices}
            conversations={conversations}
            requests={{ count: requests.length, node: requestsNode }}
            meetings={{ count: liveMeetings.length, node: meetingsNode }}
          />
        </div>
      </main>
    </div>
  );
};

/*
 * The response depends on who is asking, so it is rendered per request
 * and never prerendered or shared. Declared rather than left to Next to
 * infer from a cookie read: an inferred guard disappears the moment a
 * refactor moves that read behind a helper, and the failure would be a
 * privacy leak that nothing announces.
 */
export const dynamic = 'force-dynamic';

export default MessagesPage;
