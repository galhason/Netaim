import type { Locale } from '@/config/locales';
import type { MyConnection, MyMeeting } from '@/features/networking';
import type { FellowParticipant } from '@/infrastructure';
import {
  cancelMeetingAction,
  confirmMeetingAction,
  proposeMeetingAction,
} from '../actions';
import { card, personLine, primaryBtn } from './shared';
import { DEFAULT_VENUE_TIMEZONE, formatTimeLabel } from '@/shared';

/*
 * "My meetings" — the page's one deliberate change of metaphor.
 *
 * The people sections speak in circles; this one speaks in time. The
 * schedule lives on a single soft surface: days as quiet headers, each
 * meeting a row hanging off a thin timeline — the hour first and
 * largest, because a person walking a conference floor scans an agenda
 * by the clock, not by the card. Today and Tomorrow are named by the
 * venue's own clock, never the server's.
 *
 * Functionally nothing moved: only the invited side confirms, both may
 * cancel, the proposal form is the same native <details> + POST it
 * always was — three numbered questions now, but the same fields, and
 * no JavaScript required anywhere in the flow.
 */

const COPY = {
  eyebrow: { he: 'פגישות', en: 'Meetings' },
  title: { he: 'הפגישות שלי', en: 'My meetings' },
  plannedOne: { he: 'פגישה מתוכננת אחת', en: '1 planned meeting' },
  plannedMany: { he: 'פגישות מתוכננות', en: 'planned meetings' },
  today: { he: 'היום', en: 'Today' },
  tomorrow: { he: 'מחר', en: 'Tomorrow' },
  confirmed: { he: 'מאושרת', en: 'Confirmed' },
  proposed: { he: 'מוצעת', en: 'Proposed' },
  cancelled: { he: 'בוטלה', en: 'Cancelled' },
  confirm: { he: 'אישור', en: 'Accept' },
  cancel: { he: 'ביטול', en: 'Cancel' },
  minutes: { he: 'דק׳', en: 'min' },
  emptyTitle: { he: 'אין עדיין פגישות', en: 'No meetings yet' },
  emptyBody: {
    he: 'מצאתם מישהו שמעניין אתכם? פתחו שיחה והציעו זמן להיפגש.',
    en: 'Found someone interesting? Start a conversation and suggest a time to meet.',
  },
  suggest: { he: 'להציע פגישה', en: 'Suggest a meeting' },
  suggestHint: {
    he: 'מצאו זמן מתאים להיפגש.',
    en: 'Find a good time to meet.',
  },
  who: { he: 'עם מי תרצו להיפגש?', en: 'Who would you like to meet?' },
  when: { he: 'מתי?', en: 'When?' },
  start: { he: 'התחלה', en: 'Start' },
  end: { he: 'סיום', en: 'End' },
  where: { he: 'איפה?', en: 'Where?' },
  location: { he: 'מיקום (רשות)', en: 'Location (optional)' },
  locationHint: {
    he: 'לדוגמה: לאונג׳, ביתן קפה, חדר 2B',
    en: 'e.g. lounge, coffee stand, room 2B',
  },
  send: { he: 'שליחת הצעה', en: 'Send proposal' },
} as const;

const pick = (he: boolean, entry: { he: string; en: string }): string =>
  he ? entry.he : entry.en;

/* The day a meeting belongs to, by the venue's clock — for grouping. */
const dayKey = (iso: string): string =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: DEFAULT_VENUE_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso));

/* "27 באוגוסט" — the venue's day, in words. */
const dayInWords = (iso: string, locale: Locale): string =>
  new Intl.DateTimeFormat(locale === 'he' ? 'he-IL' : 'en-GB', {
    timeZone: DEFAULT_VENUE_TIMEZONE,
    day: 'numeric',
    month: 'long',
  }).format(new Date(iso));

const STATUS_PILL: Record<string, string> = {
  confirmed: 'bg-[var(--n-green)]/12 text-[var(--n-green)]',
  proposed: 'bg-[var(--n-cream)] text-[var(--n-gold)]',
  cancelled: 'bg-[var(--n-navy)]/6 text-[var(--n-faint)]',
};

const STATUS_TONE: Record<string, string> = {
  confirmed: 'var(--n-green)',
  proposed: 'var(--n-gold)',
  cancelled: 'var(--n-hair)',
};

const fieldInput =
  'min-h-11 w-full rounded-xl border border-[var(--n-hair)] bg-white px-3.5 text-sm transition-colors focus:border-[var(--n-purple)] focus:outline-none';

const stepMark =
  'grid size-6 flex-none place-items-center rounded-full bg-[var(--n-purple)] text-xs font-semibold text-white';

/* A face in a thin status-colored ring, the agenda's compact version. */
const MeetingAvatar = ({
  name,
  photoUrl,
  tone,
}: {
  name: string;
  photoUrl?: string;
  tone: string;
}) => (
  <span className="relative inline-block flex-none">
    <span
      className="block rounded-full p-[2px]"
      style={{ backgroundColor: tone }}
    >
      <span className="block rounded-full bg-[var(--n-card)] p-[2px]">
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- participant portrait from the media API
          <img
            src={photoUrl}
            alt=""
            className="size-11 rounded-full object-cover"
          />
        ) : (
          <span className="grid size-11 place-items-center rounded-full bg-[var(--n-navy)]/8 font-display text-base font-semibold text-[var(--n-navy)]">
            {name.slice(0, 1)}
          </span>
        )}
      </span>
    </span>
    <span
      aria-hidden="true"
      className="absolute bottom-0 end-0 size-3 rounded-full border-2 border-[var(--n-card)]"
      style={{ backgroundColor: tone }}
    />
  </span>
);

const MeetingsSection = ({
  locale,
  he,
  accepted,
  meetings,
  fellowById,
  banner,
}: {
  locale: Locale;
  he: boolean;
  accepted: (MyConnection & { slug: string; title: string })[];
  meetings: (MyMeeting & { slug: string })[];
  fellowById: Map<string, FellowParticipant>;
  banner: string | null;
}) => {
  if (accepted.length === 0) {
    return null;
  }

  /* Grouped by venue day, in the order the sorted list already has. */
  const days: { key: string; label: string; items: typeof meetings }[] = [];
  const todayKey = dayKey(new Date().toISOString());
  const tomorrowKey = dayKey(new Date(Date.now() + 86_400_000).toISOString());
  for (const meeting of meetings) {
    const key = dayKey(meeting.startsAt);
    const group = days.find((entry) => entry.key === key);
    if (group) {
      group.items.push(meeting);
    } else {
      const inWords = dayInWords(meeting.startsAt, locale);
      const label =
        key === todayKey
          ? `${pick(he, COPY.today)}, ${inWords}`
          : key === tomorrowKey
            ? `${pick(he, COPY.tomorrow)}, ${inWords}`
            : inWords;
      days.push({ key, label, items: [meeting] });
    }
  }

  const planned = meetings.filter(
    (meeting) => meeting.status !== 'cancelled',
  ).length;

  const minutesOf = (meeting: MyMeeting): number =>
    Math.max(
      0,
      Math.round(
        (Date.parse(meeting.endsAt) - Date.parse(meeting.startsAt)) / 60_000,
      ),
    );

  return (
    <div id="meetings" className="mt-8 scroll-mt-24">
      <div className="flex items-center gap-2.5">
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="size-6 flex-none text-[var(--n-purple)]"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
          <path d="M3.5 10h17M8 3v4M16 3v4" />
          <path d="M8.5 14.5h2.5M8.5 17.5h5" />
        </svg>
        <div className="min-w-0">
          <p
            className={`text-[11px] font-medium tracking-[0.18em] text-[var(--n-gold)] ${
              he ? '' : 'uppercase'
            }`}
          >
            {pick(he, COPY.eyebrow)}
          </p>
          <h2
            className={`font-display text-2xl font-semibold md:text-[1.7rem] ${
              he ? '' : 'tracking-wide'
            }`}
          >
            {pick(he, COPY.title)}
          </h2>
        </div>
      </div>
      {planned > 0 ? (
        <p className="mt-0.5 text-xs tabular-nums text-[var(--n-faint)]">
          {planned === 1
            ? pick(he, COPY.plannedOne)
            : `${planned.toLocaleString(he ? 'he-IL' : 'en-GB')} ${pick(he, COPY.plannedMany)}`}
        </p>
      ) : null}

      {banner ? (
        <p
          className={`${card} mt-3 flex items-center gap-3 p-4 text-sm`}
          role="status"
        >
          <span
            aria-hidden="true"
            className="size-2 flex-none rounded-full bg-[var(--n-gold)]"
          />
          {banner}
        </p>
      ) : null}

      {meetings.length === 0 ? (
        <div className="mx-auto mt-6 flex max-w-sm flex-col items-center gap-3 text-center">
          {/* A small appointment mark — a calendar holding one dot of time. */}
          <svg viewBox="0 0 96 72" aria-hidden="true" className="h-16 w-24">
            <rect
              x="18"
              y="12"
              width="60"
              height="52"
              rx="10"
              fill="none"
              stroke="var(--n-purple)"
              strokeOpacity="0.35"
              strokeWidth="2.5"
            />
            <path
              d="M18 26h60"
              stroke="var(--n-purple)"
              strokeOpacity="0.35"
              strokeWidth="2.5"
            />
            <path
              d="M34 8v8M62 8v8"
              stroke="var(--n-purple)"
              strokeOpacity="0.5"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <circle cx="48" cy="45" r="9" fill="var(--n-gold)" opacity="0.85" />
            <path
              d="M48 40.5V45l3 2.5"
              style={{ stroke: 'var(--nt-surface)' }}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <path
              d="M74 6l1.5 3.5L79 11l-3.5 1.5L74 16l-1.5-3.5L69 11l3.5-1.5z"
              fill="var(--n-purple)"
              opacity="0.45"
            />
          </svg>
          <p className="font-display text-lg font-semibold">
            {pick(he, COPY.emptyTitle)}
          </p>
          <p className="text-sm text-[var(--n-soft)]">
            {pick(he, COPY.emptyBody)}
          </p>
          {/*
            * No CTA here on purpose: the accordion below is the one and
            * only "suggest a meeting" control, and with no meetings it
            * wears the pill styling itself — one button, one behavior.
            */}
        </div>
      ) : (
        /* One quiet surface for the whole agenda. */
        <div className={`${card} mt-4 p-4 md:p-6`}>
          {days.map((day, dayIndex) => (
            <section key={day.key} className={dayIndex > 0 ? 'mt-6' : ''}>
              <h3 className="text-sm font-semibold text-[var(--n-ink)]">
                {day.label}
              </h3>
              <ol className="mt-2">
                {day.items.map((meeting, index) => {
                  const fellow = fellowById.get(meeting.otherId);
                  const line = fellow ? personLine(fellow) : '';
                  const cancelled = meeting.status === 'cancelled';
                  const minutes = minutesOf(meeting);
                  const tone = STATUS_TONE[meeting.status] ?? 'var(--n-hair)';
                  return (
                    <li key={meeting.id} className="group flex gap-3 md:gap-4">
                      {/* The timeline: a dot per meeting on one thin rail. */}
                      <div
                        aria-hidden="true"
                        className="flex w-2.5 flex-none flex-col items-center pt-6"
                      >
                        <span
                          className="size-2.5 flex-none rounded-full"
                          style={{ backgroundColor: 'var(--n-purple-soft)' }}
                        />
                        <span className="w-px flex-1 bg-[var(--n-purple)]/20 group-last:hidden" />
                      </div>

                      <div
                        className={`flex flex-1 flex-wrap items-center gap-x-3 gap-y-2 py-4 md:gap-x-4 ${
                          index > 0 ? 'border-t border-[var(--n-hair)]' : ''
                        } ${cancelled ? 'opacity-55' : ''}`}
                      >
                        {/* The hour — the anchor the eye scans by. */}
                        <p className="w-14 flex-none font-display text-xl font-semibold tabular-nums">
                          {formatTimeLabel(meeting.startsAt, locale)}
                        </p>

                        <MeetingAvatar
                          name={meeting.otherName}
                          photoUrl={fellow?.photoUrl}
                          tone={tone}
                        />

                        <span className="min-w-0 flex-1 basis-40">
                          <span className="block truncate font-display text-[15px] font-semibold">
                            {meeting.otherName}
                          </span>
                          {line ? (
                            <span className="block truncate text-xs text-[var(--n-faint)]">
                              {line}
                            </span>
                          ) : null}
                        </span>

                        {meeting.location || minutes > 0 ? (
                          <span className="flex flex-none items-center gap-1.5 text-xs text-[var(--n-soft)]">
                            {meeting.location ? (
                              <>
                                <svg
                                  viewBox="0 0 24 24"
                                  aria-hidden="true"
                                  className="size-3.5 flex-none text-[var(--n-faint)]"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="1.8"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M12 21s-6.5-5.4-6.5-10a6.5 6.5 0 0 1 13 0c0 4.6-6.5 10-6.5 10z" />
                                  <circle cx="12" cy="10.5" r="2.3" />
                                </svg>
                                <span className="max-w-36 truncate">
                                  {meeting.location}
                                </span>
                              </>
                            ) : null}
                            {meeting.location && minutes > 0 ? (
                              <span aria-hidden="true">·</span>
                            ) : null}
                            {minutes > 0 ? (
                              <span className="tabular-nums">
                                {he
                                  ? `${minutes} ${COPY.minutes.he}`
                                  : `${minutes} ${COPY.minutes.en}`}
                              </span>
                            ) : null}
                          </span>
                        ) : null}

                        <span
                          className={`inline-flex flex-none items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium ${
                            STATUS_PILL[meeting.status] ?? STATUS_PILL.proposed
                          }`}
                        >
                          <span
                            aria-hidden="true"
                            className="size-1.5 rounded-full"
                            style={{ backgroundColor: tone }}
                          />
                          {meeting.status === 'confirmed'
                            ? pick(he, COPY.confirmed)
                            : cancelled
                              ? pick(he, COPY.cancelled)
                              : pick(he, COPY.proposed)}
                        </span>

                        <span className="ms-auto flex flex-none items-center gap-2">
                          {/*
                            * Only the person who was invited confirms.
                            * The host confirming their own proposal would
                            * make the other side's agreement decorative.
                            */}
                          {meeting.status === 'proposed' &&
                          meeting.role === 'guest' ? (
                            <form action={confirmMeetingAction}>
                              <input
                                type="hidden"
                                name="locale"
                                value={locale}
                              />
                              <input
                                type="hidden"
                                name="slug"
                                value={meeting.slug}
                              />
                              <input
                                type="hidden"
                                name="meetingId"
                                value={meeting.id}
                              />
                              <button
                                type="submit"
                                className="inline-flex min-h-10 items-center rounded-xl bg-[var(--n-navy)] px-4 text-[13px] font-medium text-white transition-colors hover:bg-[var(--n-deep)]"
                              >
                                {pick(he, COPY.confirm)}
                              </button>
                            </form>
                          ) : null}
                          {cancelled ? null : (
                            <form action={cancelMeetingAction}>
                              <input
                                type="hidden"
                                name="locale"
                                value={locale}
                              />
                              <input
                                type="hidden"
                                name="slug"
                                value={meeting.slug}
                              />
                              <input
                                type="hidden"
                                name="meetingId"
                                value={meeting.id}
                              />
                              <button
                                type="submit"
                                className="inline-flex min-h-10 items-center rounded-xl border border-[var(--n-hair)] px-4 text-[13px] font-medium text-[var(--n-soft)] transition-colors hover:border-[var(--n-pink)]/50 hover:text-[var(--n-pink)]"
                              >
                                {pick(he, COPY.cancel)}
                              </button>
                            </form>
                          )}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
        </div>
      )}

      {/*
        * The proposal, folded. Same native <details> accordion, same
        * POST — the trigger just learned to introduce itself, and the
        * form asks its three questions side by side where there is room.
        */}
      <details
        id="suggest-meeting"
        className={`group/acc scroll-mt-24 ${meetings.length === 0 ? 'mt-4' : 'mt-5'}`}
      >
        {meetings.length === 0 ? (
          /*
           * With an empty agenda the trigger IS the empty state's call
           * to action: one centered purple pill, opening the same form.
           */
          <summary className="mx-auto flex min-h-11 w-fit cursor-pointer list-none items-center gap-2 rounded-full border border-[var(--n-purple)]/35 px-5 text-sm font-medium text-[var(--n-purple)] transition-colors hover:bg-[var(--n-purple)]/10 [&::-webkit-details-marker]:hidden">
            {pick(he, COPY.suggest)}
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="size-4 flex-none transition-transform group-open/acc:rotate-180"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </summary>
        ) : (
          <summary
            className={`${card} flex min-h-11 cursor-pointer list-none items-center gap-3 p-4 transition-colors hover:ring-[var(--n-purple)]/30 [&::-webkit-details-marker]:hidden`}
          >
            <span className="grid size-9 flex-none place-items-center rounded-full bg-[var(--n-purple)]/12 text-[var(--n-purple)]">
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="size-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="10" cy="8" r="3.25" />
                <path d="M4.5 19c.6-3 2.8-4.5 5.5-4.5s4.9 1.5 5.5 4.5M18 8v6M15 11h6" />
              </svg>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">
                {pick(he, COPY.suggest)}
              </span>
              <span className="block truncate text-xs text-[var(--n-faint)]">
                {pick(he, COPY.suggestHint)}
              </span>
            </span>
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="size-4 flex-none text-[var(--n-faint)] transition-transform group-open/acc:rotate-180"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </summary>
        )}

        <form
          action={proposeMeetingAction}
          className={`${card} mt-3 p-5 md:p-6`}
        >
          <input type="hidden" name="locale" value={locale} />
          {/*
            * The conference the meeting files under — the site's own,
            * a fact rather than a choice, so it travels hidden.
            */}
          <input type="hidden" name="slug" value={accepted[0]?.slug ?? ''} />

          <div className="grid gap-6 md:grid-cols-3 md:gap-8">
            <div className="flex flex-col gap-2.5">
              <p className="flex items-center gap-2 text-sm font-medium">
                <span className={stepMark}>1</span>
                {pick(he, COPY.who)}
              </p>
              <label>
                <span className="sr-only">{pick(he, COPY.who)}</span>
                <select name="guestId" required className={fieldInput}>
                  {accepted.map((connection) => (
                    <option key={connection.id} value={connection.otherId}>
                      {connection.otherName}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex flex-col gap-2.5">
              <p className="flex items-center gap-2 text-sm font-medium">
                <span className={stepMark}>2</span>
                {pick(he, COPY.when)}
              </p>
              <div className="flex flex-col gap-3">
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-xs text-[var(--n-soft)]">
                    {pick(he, COPY.start)}
                  </span>
                  <input
                    type="datetime-local"
                    name="startsAt"
                    required
                    className={fieldInput}
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-xs text-[var(--n-soft)]">
                    {pick(he, COPY.end)}
                  </span>
                  <input
                    type="datetime-local"
                    name="endsAt"
                    required
                    className={fieldInput}
                  />
                </label>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <p className="flex items-center gap-2 text-sm font-medium">
                <span className={stepMark}>3</span>
                {pick(he, COPY.where)}
              </p>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs text-[var(--n-soft)]">
                  {pick(he, COPY.location)}
                </span>
                <input
                  type="text"
                  name="location"
                  placeholder={pick(he, COPY.locationHint)}
                  className={fieldInput}
                />
              </label>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              className={`${primaryBtn} inline-flex w-full items-center justify-center gap-2 sm:w-auto`}
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="size-4 rtl:-scale-x-100"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 3 10.5 13.5M21 3l-6.8 18-3.7-7.5L3 9.8z" />
              </svg>
              {pick(he, COPY.send)}
            </button>
          </div>
        </form>
      </details>
    </div>
  );
};

export default MeetingsSection;
