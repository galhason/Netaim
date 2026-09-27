/*
 * Which sessions the conference puts forward, and in what order.
 *
 * This is the decision alone. It knows nothing about a language, a
 * timezone, a database or a screen -- it reads three fields and returns
 * the records it chose, so the landing page, the cinematic programme and
 * (later) a public API can all ask the same question and get the same
 * answer. Whatever each of them then does with the result is its own
 * business.
 *
 * The one thing worth being precise about: every comparison here is on
 * the absolute instant that `startsAt` denotes, never on the text. Wall
 * clocks differ by venue and two strings that sort one way can denote
 * moments that sort the other, so the text is parsed once and the
 * numbers are compared.
 */

/* The manual selection leads; the fallback fills in behind it. */
export const SESSION_SELECTION_LIMIT = 6;

const BREAK: string = 'break';

/*
 * Only what the decision needs. A structural type rather than the
 * program feature's `SessionSummary`, so the rule stays in the engine
 * and carries no registration or presentation fields with it.
 */
export interface SelectableSession {
  sessionType?: string | null;
  startsAt?: string | null;
  featured?: boolean | null;
}

/*
 * The instant, or null when there is none to speak of. A `startsAt` that
 * cannot be parsed is treated as absent rather than as NaN: it used to
 * survive a truthiness check and then sort unpredictably against every
 * other session, which is a worse answer than leaving it out.
 */
const startInstant = (session: SelectableSession): number | null => {
  const parsed = Date.parse(session.startsAt ?? '');
  return Number.isNaN(parsed) ? null : parsed;
};

/*
 * A session that can appear in a programme at all: it happens at a known
 * moment, and it is not a break. Breaks are real and they belong in a
 * printed schedule, but "coffee" is not what a conference leads with and
 * it is not a thing anybody's programme scene is about.
 *
 * Shared by the marketing selection and by the full programme, so the
 * two can never drift on what counts.
 */
export const eligibleSessions = <T extends SelectableSession>(
  sessions: readonly T[],
): T[] =>
  sessions.filter(
    (session) => session.sessionType !== BREAK && startInstant(session) !== null,
  );

/*
 * The sessions a conference puts on its front page.
 *
 * An editor who marked sessions as featured has said what matters, and
 * that answer stands -- including a session that has already happened,
 * because a keynote worth showing is worth showing after it was given.
 * Only when nobody has chosen does the platform choose for itself, and
 * then it shows what is *about to happen*: the nearest sessions still
 * ahead. That is the part that changed. It used to show the earliest
 * sessions in the schedule, which meant that from the conference's
 * second morning the landing page led with yesterday.
 *
 * `now` is a parameter and not a call to the clock, so the behaviour is
 * the same in a test as it is at four in the afternoon.
 */
/*
 * A taste of one day: the same rule as `marketingSessions`, on that day's
 * sessions alone and capped at three, so a preview can show a day
 * without listing it. A day that is over and has nothing featured still
 * has a story to tell, so it falls back to how it began: its first
 * eligible sessions, in order.
 */
export const PROGRAM_PREVIEW_LIMIT = 3;

export const dayPreviewSessions = <T extends SelectableSession>(
  sessions: readonly T[],
  now: number,
): T[] => {
  const chosen = marketingSessions(sessions, now).slice(0, PROGRAM_PREVIEW_LIMIT);
  if (chosen.length > 0) {
    return chosen;
  }
  return eligibleSessions(sessions)
    .slice()
    .sort((a, b) => (startInstant(a) ?? 0) - (startInstant(b) ?? 0))
    .slice(0, PROGRAM_PREVIEW_LIMIT);
};

export const marketingSessions = <T extends SelectableSession>(
  sessions: readonly T[],
  now: number,
): T[] => {
  const eligible = eligibleSessions(sessions);
  const chosen = eligible.filter((session) => session.featured === true);
  const source =
    chosen.length > 0
      ? chosen
      : eligible.filter((session) => (startInstant(session) ?? 0) > now);

  return source
    .slice()
    .sort((a, b) => (startInstant(a) ?? 0) - (startInstant(b) ?? 0))
    .slice(0, SESSION_SELECTION_LIMIT);
};
