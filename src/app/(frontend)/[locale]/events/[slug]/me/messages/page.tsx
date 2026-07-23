import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { isSupportedLocale } from '@/config/locales';
import { LOUNGE_UI, getAttendeeExperience } from '@/features/attendee';
import { myConnections, myMeetings } from '@/features/networking';
import { listMyFeed } from '@/features/notifications';
import { formatLongDate, formatTimeLabel } from '@/shared';
import {
  cancelMeetingAction,
  confirmMeetingAction,
  respondConnectionAction,
} from '../../networking/actions';

/*
 * The Lounge's messages room (the approved vision: not a bell, not a
 * badge — a feed): connection requests waiting for a word, meetings
 * taking shape, and the conference's own updates — one calm stream in
 * the Lounge's light.
 */
interface MessagesPageProps {
  params: Promise<{ locale: string; slug: string }>;
}

const card =
  'lounge-rise rounded-3xl bg-white p-5 shadow-[0_14px_44px_rgba(35,40,47,0.08)]';

const quiet =
  'inline-flex min-h-10 items-center rounded-xl border border-[var(--l-hair)] px-4 text-sm font-medium text-[var(--l-ink)] transition-colors hover:border-[var(--l-bronze)]';

const primary =
  'inline-flex min-h-10 items-center rounded-xl bg-[var(--l-navy)] px-5 text-sm font-medium text-white transition-colors hover:bg-[#16263c]';

const MessagesPage = async ({ params }: MessagesPageProps) => {
  const { locale, slug } = await params;
  if (!isSupportedLocale(locale)) {
    notFound();
  }
  setRequestLocale(locale);

  const content = await getAttendeeExperience(slug, locale);
  if (!content) {
    redirect(`/${locale}/events/${slug}/register`);
  }

  const [connections, meetings, notifications] = await Promise.all([
    myConnections(slug).catch(() => []),
    myMeetings(slug).catch(() => []),
    listMyFeed(slug).catch(() => []),
  ]);

  const requests = connections.filter(
    (connection) =>
      connection.status === 'pending' && connection.direction === 'incoming',
  );
  const liveMeetings = meetings.filter(
    (meeting) => meeting.status === 'proposed' || meeting.status === 'confirmed',
  );
  const inLocale = notifications.filter(
    (notification) => notification.locale === locale,
  );
  const feed = (inLocale.length > 0 ? inLocale : notifications).slice(0, 12);
  const empty =
    requests.length === 0 && liveMeetings.length === 0 && feed.length === 0;

  return (
    <main
      id="main-content"
      className="lounge min-h-dvh bg-[var(--l-bg)] pb-16 font-body text-[var(--l-ink)]"
    >
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[var(--l-navy)]">
          <span
            aria-hidden="true"
            className="absolute -top-24 left-1/2 h-[22rem] w-[44rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(201,169,110,0.35),transparent_70%)]"
          />
          <span
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-b from-transparent to-[var(--l-bg)]"
          />
        </div>
        <div className="relative mx-auto max-w-3xl px-6 pb-14 pt-6 text-white">
          <div className="flex items-center justify-between text-sm text-white/85">
            <Link
              href={`/${locale}/me`}
              className="transition-opacity hover:opacity-75"
            >
              ← {LOUNGE_UI.myExperience[locale]}
            </Link>
            <span className="font-display font-semibold tracking-[0.3em]">
              {content.brandName.toUpperCase()}
            </span>
          </div>
          <h1 className="mt-8 font-display text-3xl font-semibold md:text-4xl">
            {LOUNGE_UI.messages[locale]}
          </h1>
        </div>
      </section>

      <div className="mx-auto -mt-6 flex max-w-3xl flex-col gap-8 px-6">
        {empty ? (
          <p className={`${card} text-center text-sm text-[var(--l-soft)]`}>
            {LOUNGE_UI.noMessages[locale]}
          </p>
        ) : null}

        {requests.length > 0 ? (
          <section className="flex flex-col gap-3">
            <h2 className="font-display text-xl font-semibold">
              {LOUNGE_UI.requestsTitle[locale]}
            </h2>
            {requests.map((request, index) => (
              <article
                key={request.id}
                className={`${card} flex flex-wrap items-center gap-4 ${
                  ['', '[animation-delay:60ms]', '[animation-delay:120ms]'][index % 3]
                }`}
              >
                <span className="grid size-11 flex-none place-items-center rounded-full bg-[var(--l-bronze)]/15 font-display text-lg text-[var(--l-bronze)]">
                  {request.otherName.slice(0, 1)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">
                    {request.otherName}{' '}
                    <span className="font-normal text-[var(--l-soft)]">
                      {LOUNGE_UI.wantsToConnect[locale]}
                    </span>
                  </span>
                  {request.message ? (
                    <span className="mt-0.5 block text-sm text-[var(--l-soft)]">
                      “{request.message}”
                    </span>
                  ) : null}
                </span>
                <span className="flex items-center gap-2">
                  <form action={respondConnectionAction}>
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="slug" value={slug} />
                    <input
                      type="hidden"
                      name="connectionId"
                      value={request.id}
                    />
                    <input type="hidden" name="response" value="accept" />
                    <button type="submit" className={primary}>
                      {LOUNGE_UI.accept[locale]}
                    </button>
                  </form>
                  <form action={respondConnectionAction}>
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="slug" value={slug} />
                    <input
                      type="hidden"
                      name="connectionId"
                      value={request.id}
                    />
                    <input type="hidden" name="response" value="decline" />
                    <button type="submit" className={quiet}>
                      {LOUNGE_UI.decline[locale]}
                    </button>
                  </form>
                </span>
              </article>
            ))}
          </section>
        ) : null}

        {liveMeetings.length > 0 ? (
          <section className="flex flex-col gap-3">
            <h2 className="font-display text-xl font-semibold">
              {LOUNGE_UI.meetingsTitle[locale]}
            </h2>
            {liveMeetings.map((meeting, index) => (
              <article
                key={meeting.id}
                className={`${card} flex flex-wrap items-center gap-4 ${
                  ['', '[animation-delay:60ms]', '[animation-delay:120ms]'][index % 3]
                }`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">
                    {LOUNGE_UI.meetingWith[locale]} {meeting.otherName}
                  </span>
                  <span className="mt-0.5 block text-sm text-[var(--l-soft)]">
                    {formatLongDate(meeting.startsAt, locale)} ·{' '}
                    {formatTimeLabel(meeting.startsAt, locale)}–
                    {formatTimeLabel(meeting.endsAt, locale)}
                    {meeting.location ? ` · ${meeting.location}` : ''}
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-[var(--l-bronze)]/12 px-3 py-1 text-xs font-medium text-[var(--l-bronze)]">
                    {meeting.status === 'confirmed'
                      ? locale === 'he'
                        ? 'מאושרת'
                        : 'Confirmed'
                      : locale === 'he'
                        ? 'ממתינה'
                        : 'Proposed'}
                  </span>
                  {meeting.status === 'proposed' && meeting.role === 'guest' ? (
                    <form action={confirmMeetingAction}>
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="slug" value={slug} />
                      <input
                        type="hidden"
                        name="meetingId"
                        value={meeting.id}
                      />
                      <button type="submit" className={primary}>
                        {LOUNGE_UI.confirm[locale]}
                      </button>
                    </form>
                  ) : null}
                  <form action={cancelMeetingAction}>
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="slug" value={slug} />
                    <input type="hidden" name="meetingId" value={meeting.id} />
                    <button type="submit" className={quiet}>
                      {LOUNGE_UI.cancel[locale]}
                    </button>
                  </form>
                </span>
              </article>
            ))}
          </section>
        ) : null}

        {feed.length > 0 ? (
          <section className="flex flex-col gap-3">
            <h2 className="font-display text-xl font-semibold">
              {LOUNGE_UI.feedTitle[locale]}
            </h2>
            <ol className="relative flex flex-col gap-0 before:absolute before:bottom-4 before:start-[1.375rem] before:top-4 before:w-px before:bg-[var(--l-hair)]">
              {feed.map((notification, index) => (
                <li
                  key={notification.id}
                  className={`lounge-rise relative flex gap-4 py-3 ${
                    ['', '[animation-delay:40ms]', '[animation-delay:80ms]'][index % 3]
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className="z-10 mt-1.5 grid size-[2.75rem] flex-none place-items-center rounded-2xl bg-white shadow-[0_8px_24px_rgba(35,40,47,0.08)]"
                  >
                    <span className="size-2.5 rounded-full bg-[var(--l-bronze)]" />
                  </span>
                  <span className="min-w-0 flex-1 rounded-2xl bg-white p-4 shadow-[0_8px_24px_rgba(35,40,47,0.06)]">
                    <span className="block text-sm font-medium">
                      {notification.subject}
                    </span>
                    <span className="mt-0.5 block break-words text-sm text-[var(--l-soft)]">
                      {notification.body}
                    </span>
                    {notification.sentAt || notification.createdAt ? (
                      <span className="mt-1.5 block text-[11px] text-[var(--l-faint)]">
                        {formatLongDate(
                          notification.sentAt ?? notification.createdAt,
                          locale,
                        )}
                      </span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        ) : null}
      </div>
    </main>
  );
};

export default MessagesPage;
