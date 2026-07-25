import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { isSupportedLocale } from '@/config/locales';
import { getMyAccount } from '@/features/account';
import { LOUNGE_UI } from '@/features/attendee';
import { myConnections, myMeetings } from '@/features/networking';
import { listMyAnnouncements } from '@/features/notifications';
import { formatLongDate, formatTimeLabel } from '@/shared';
import {
  cancelMeetingAction,
  confirmMeetingAction,
  respondConnectionAction,
  suggestMeetingTimeAction,
} from '../../events/[slug]/networking/actions';

/*
 * The platform messages room (one account, one home): every joined
 * conference pours its requests, meetings and updates into one calm
 * feed at /me/messages — the vision's "not a bell, a feed", platform
 * wide.
 */
interface MessagesPageProps {
  params: Promise<{ locale: string }>;
}

const card =
  'lounge-rise rounded-3xl bg-white p-5 shadow-[0_14px_44px_rgba(35,40,47,0.08)]';

const quiet =
  'inline-flex min-h-10 items-center rounded-xl border border-[var(--l-hair)] px-4 text-sm font-medium text-[var(--l-ink)] transition-colors hover:border-[var(--l-bronze)]';

const primary =
  'inline-flex min-h-10 items-center rounded-xl bg-[var(--l-navy)] px-5 text-sm font-medium text-white transition-colors hover:bg-[#16263c]';

const MessagesPage = async ({ params }: MessagesPageProps) => {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) {
    notFound();
  }
  setRequestLocale(locale);

  const account = await getMyAccount(locale);
  if (!account) {
    redirect(`/${locale}/me`);
  }

  const slugs = account.joined.map((conference) => conference.slug).slice(0, 5);
  const titleOf = new Map(
    account.joined.map((conference) => [conference.slug, conference.title]),
  );

  const perConference = await Promise.all(
    slugs.map(async (slug) => {
      const [connections, meetings, notifications] = await Promise.all([
        myConnections(slug).catch(() => []),
        myMeetings(slug).catch(() => []),
        listMyAnnouncements(slug).catch(() => []),
      ]);
      return { slug, connections, meetings, notifications };
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
  const feed = perConference
    .flatMap(({ slug, notifications }) => {
      const inLocale = notifications.filter(
        (notification) => notification.locale === locale,
      );
      return (inLocale.length > 0 ? inLocale : notifications).map(
        (notification) => ({ ...notification, slug }),
      );
    })
    .sort(
      (a, b) =>
        Date.parse(b.sentAt ?? b.createdAt ?? '') -
        Date.parse(a.sentAt ?? a.createdAt ?? ''),
    )
    .slice(0, 12);

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
              נטעים
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
                  <span className="mt-0.5 block text-xs text-[var(--l-faint)]">
                    {titleOf.get(request.slug) ?? request.slug}
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
                    <input type="hidden" name="slug" value={request.slug} />
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
                    <input type="hidden" name="slug" value={request.slug} />
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
                  <span className="mt-0.5 block text-xs text-[var(--l-faint)]">
                    {titleOf.get(meeting.slug) ?? meeting.slug}
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
                      <input type="hidden" name="slug" value={meeting.slug} />
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
                    <input type="hidden" name="slug" value={meeting.slug} />
                    <input type="hidden" name="meetingId" value={meeting.id} />
                    <button type="submit" className={quiet}>
                      {LOUNGE_UI.cancel[locale]}
                    </button>
                  </form>
                </span>
                {meeting.status === 'proposed' ? (
                  <details className="w-full basis-full">
                    <summary className="cursor-pointer text-xs text-[var(--l-bronze)] underline underline-offset-4">
                      {locale === 'he' ? 'הצעת זמן אחר' : 'Suggest another time'}
                    </summary>
                    <form
                      action={suggestMeetingTimeAction}
                      className="mt-3 flex flex-wrap items-end gap-3"
                    >
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="slug" value={meeting.slug} />
                      <input
                        type="hidden"
                        name="meetingId"
                        value={meeting.id}
                      />
                      <label className="flex flex-col gap-1 text-xs text-[var(--l-soft)]">
                        {locale === 'he' ? 'התחלה' : 'Start'}
                        <input
                          type="datetime-local"
                          name="startsAt"
                          required
                          className="min-h-10 rounded-xl border border-[var(--l-hair)] px-3 text-sm"
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-xs text-[var(--l-soft)]">
                        {locale === 'he' ? 'סיום' : 'End'}
                        <input
                          type="datetime-local"
                          name="endsAt"
                          required
                          className="min-h-10 rounded-xl border border-[var(--l-hair)] px-3 text-sm"
                        />
                      </label>
                      <button type="submit" className={primary}>
                        {locale === 'he' ? 'שליחת ההצעה' : 'Send suggestion'}
                      </button>
                    </form>
                  </details>
                ) : null}
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
                    <span className="mt-1.5 block text-[11px] text-[var(--l-faint)]">
                      {titleOf.get(notification.slug) ?? notification.slug}
                      {notification.sentAt || notification.createdAt
                        ? ` · ${formatLongDate(
                            notification.sentAt ?? notification.createdAt,
                            locale,
                          )}`
                        : ''}
                    </span>
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
