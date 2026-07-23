import { getStudioLocale } from '@/features/studio';
import { listAgenda, SESSION_TYPES, type SessionSummary } from '@/features/program';
import type { Locale } from '@/config/locales';
import { formatTimeLabel, toDateTimeInputValue } from '@/shared';
import {
  addSessionAction,
  deleteSessionAction,
  updateSessionAction,
} from '../../../actions';

interface ProgramPageProps {
  params: Promise<{ slug: string }>;
}

const COPY = {
  heading: { he: 'התוכנית', en: 'Program' },
  intro: {
    he: 'סדר היום של האירוע — סדנאות, הרצאות והפסקות.',
    en: 'The event’s agenda — workshops, talks and breaks.',
  },
  empty: {
    he: 'עדיין אין תוכנית. הוסיפו את הסדנה או ההרצאה הראשונה.',
    en: 'No program yet. Add the first session below.',
  },
  addSession: { he: 'להוסיף לתוכנית', en: 'Add to the program' },
  title: { he: 'שם', en: 'Title' },
  type: { he: 'סוג', en: 'Type' },
  starts: { he: 'התחלה', en: 'Starts' },
  ends: { he: 'סיום', en: 'Ends' },
  capacity: { he: 'מספר מקומות (רשות)', en: 'Places (optional)' },
  waitlist: { he: 'רשימת המתנה כשמלא', en: 'Waiting list when full' },
  track: { he: 'מסלול (רשות)', en: 'Track (optional)' },
  language: { he: 'שפה (רשות)', en: 'Language (optional)' },
  save: { he: 'להוסיף', en: 'Add' },
  edit: { he: 'עריכה', en: 'Edit' },
  saveChanges: { he: 'שמירת שינויים', en: 'Save changes' },
  remove: { he: 'מחיקה מהתוכנית', en: 'Remove from program' },
} as const;

const TYPE_LABEL: Record<SessionSummary['sessionType'], Record<Locale, string>> =
  {
    talk: { he: 'הרצאה', en: 'Talk' },
    workshop: { he: 'סדנה', en: 'Workshop' },
    keynote: { he: 'מליאה', en: 'Keynote' },
    tour: { he: 'סיור', en: 'Tour' },
    break: { he: 'הפסקה', en: 'Break' },
  };

const labelClass = 'text-xs tracking-widest text-text-secondary';
const fieldClass = 'border-b border-border bg-transparent py-1.5 outline-none';



const ProgramPage = async ({ params }: ProgramPageProps) => {
  const { slug } = await params;
  const locale = await getStudioLocale();

  let sessions: SessionSummary[] = [];
  try {
    sessions = await listAgenda(slug, locale);
  } catch {
    sessions = [];
  }

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-2xl font-medium">
          {COPY.heading[locale]}
        </h2>
        <p className="text-sm text-text-secondary">{COPY.intro[locale]}</p>
      </div>

      {sessions.length === 0 ? (
        <p className="max-w-md text-sm text-text-secondary">
          {COPY.empty[locale]}
        </p>
      ) : (
        <ul className="flex flex-col">
          {sessions.map((session) => (
            <li key={session.id} className="border-t border-border py-4">
              <details className="group">
                <summary className="flex cursor-pointer list-none flex-wrap items-baseline gap-x-6 gap-y-1">
                  <span className="w-24 shrink-0 text-sm tabular-nums text-text-secondary">
                    {[formatTimeLabel(session.startsAt, locale), formatTimeLabel(session.endsAt, locale)]
                      .filter(Boolean)
                      .join('–')}
                  </span>
                  <span className="min-w-40 flex-1 font-display text-lg font-medium">
                    {session.title}
                  </span>
                  <span className="text-sm text-text-secondary">
                    {TYPE_LABEL[session.sessionType][locale]}
                  </span>
                  {session.room ? (
                    <span className="text-sm text-text-secondary">
                      {session.room}
                    </span>
                  ) : null}
                  <span className="text-xs text-accent underline underline-offset-4 opacity-70 transition-opacity group-open:opacity-100">
                    {COPY.edit[locale]}
                  </span>
                </summary>

                <form
                  action={updateSessionAction}
                  className="mt-5 flex max-w-xl flex-col gap-5 rounded-xl bg-border/10 p-5"
                >
                  <input type="hidden" name="slug" value={slug} />
                  <input type="hidden" name="sessionId" value={session.id} />
                  <input type="hidden" name="contentLocale" value={locale} />
                  <label className="flex flex-col gap-1.5">
                    <span className={labelClass}>{COPY.title[locale]}</span>
                    <input
                      type="text"
                      name="title"
                      required
                      defaultValue={session.title}
                      className={fieldClass}
                    />
                  </label>
                  <div className="flex flex-wrap gap-x-8 gap-y-5">
                    <label className="flex flex-col gap-1.5">
                      <span className={labelClass}>{COPY.type[locale]}</span>
                      <select
                        name="sessionType"
                        defaultValue={session.sessionType}
                        className={fieldClass}
                      >
                        {SESSION_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {TYPE_LABEL[type][locale]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className={labelClass}>{COPY.starts[locale]}</span>
                      <input
                        type="datetime-local"
                        name="startsAt"
                        defaultValue={toDateTimeInputValue(session.startsAt)}
                        className={fieldClass}
                      />
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className={labelClass}>{COPY.ends[locale]}</span>
                      <input
                        type="datetime-local"
                        name="endsAt"
                        defaultValue={toDateTimeInputValue(session.endsAt)}
                        className={fieldClass}
                      />
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className={labelClass}>{COPY.capacity[locale]}</span>
                      <input
                        type="number"
                        name="capacity"
                        min={1}
                        defaultValue={session.capacity ?? ''}
                        className={fieldClass}
                      />
                    </label>
                  </div>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      name="waitlistEnabled"
                      defaultChecked={session.waitlistEnabled}
                      className="size-4"
                    />
                    <span>{COPY.waitlist[locale]}</span>
                  </label>
                  <div className="flex flex-wrap gap-x-8 gap-y-5">
                    <label className="flex flex-col gap-1.5">
                      <span className={labelClass}>{COPY.track[locale]}</span>
                      <input
                        type="text"
                        name="track"
                        defaultValue={session.track ?? ''}
                        className={fieldClass}
                      />
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className={labelClass}>{COPY.language[locale]}</span>
                      <input
                        type="text"
                        name="language"
                        defaultValue={session.language ?? ''}
                        className={fieldClass}
                      />
                    </label>
                  </div>
                  <div className="flex items-center gap-6">
                    <button
                      type="submit"
                      className="inline-flex min-h-11 items-center font-medium underline decoration-current/40 underline-offset-8 transition-colors hover:decoration-current"
                    >
                      {COPY.saveChanges[locale]}
                    </button>
                  </div>
                </form>
                <form action={deleteSessionAction} className="mt-3">
                  <input type="hidden" name="slug" value={slug} />
                  <input type="hidden" name="sessionId" value={session.id} />
                  <button
                    type="submit"
                    className="text-xs text-red-700/80 underline underline-offset-4 transition-colors hover:text-red-700"
                  >
                    {COPY.remove[locale]}
                  </button>
                </form>
              </details>
            </li>
          ))}
        </ul>
      )}

      <details className="flex flex-col gap-4 border-t border-border pt-6">
        <summary className="cursor-pointer text-xs font-medium tracking-widest text-text-secondary">
          {COPY.addSession[locale]}
        </summary>
        <form
          action={addSessionAction}
          className="mt-4 flex max-w-xl flex-col gap-6"
        >
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="contentLocale" value={locale} />

          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>{COPY.title[locale]}</span>
            <input type="text" name="title" required className={fieldClass} />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>{COPY.type[locale]}</span>
            <select name="sessionType" defaultValue="talk" className={fieldClass}>
              {SESSION_TYPES.map((type) => (
                <option key={type} value={type}>
                  {TYPE_LABEL[type][locale]}
                </option>
              ))}
            </select>
          </label>

          <div className="flex flex-wrap gap-x-8 gap-y-6">
            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>{COPY.starts[locale]}</span>
              <input
                type="datetime-local"
                name="startsAt"
                className={fieldClass}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>{COPY.ends[locale]}</span>
              <input
                type="datetime-local"
                name="endsAt"
                className={fieldClass}
              />
            </label>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>{COPY.capacity[locale]}</span>
            <input type="number" name="capacity" min={1} className={fieldClass} />
          </label>

          <label className="flex items-center gap-3">
            <input type="checkbox" name="waitlistEnabled" className="size-4" />
            <span>{COPY.waitlist[locale]}</span>
          </label>

          <div className="flex flex-wrap gap-x-8 gap-y-6">
            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>{COPY.track[locale]}</span>
              <input type="text" name="track" className={fieldClass} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>{COPY.language[locale]}</span>
              <input type="text" name="language" className={fieldClass} />
            </label>
          </div>

          <button
            type="submit"
            className="inline-flex min-h-11 items-center self-start font-medium underline decoration-current/40 underline-offset-8 transition-colors hover:decoration-current"
          >
            {COPY.save[locale]}
          </button>
        </form>
      </details>
    </div>
  );
};

export default ProgramPage;
