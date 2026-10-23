import Link from 'next/link';
import type { Locale } from '@/config/locales';
import { DEFAULT_VENUE_TIMEZONE, formatDayLabel } from '@/shared';
import type { ParticipantCriteria } from '@/features/studio/services/participant-search';
import { fieldLabel, quietButton, selectField, textField } from './ui';

/*
 * The search over the participants: a plain GET form, so a search is an
 * address — it survives every action on the page, the back button, and
 * can be sent to a colleague.
 */
const t = (he: string, en: string): Record<Locale, string> => ({ he, en });

export const SEARCH_COPY = {
  query: t('חיפוש', 'Search'),
  queryPlaceholder: t('שם, אימייל, טלפון, ארגון, תפקיד או מדינה', 'Name, email, phone, organization, role or country'),
  conference: t('כנס', 'Conference'),
  anyConference: t('כל הכנסים', 'Every conference'),
  place: t('הרשמה', 'Registration'),
  anyPlace: t('כל המצבים', 'Any state'),
  registered: t('רשומים', 'Registered'),
  cancelled: t('ביטלו', 'Cancelled'),
  none: t('לא רשומים', 'Not registered'),
  activity: t('פעילות', 'Activity'),
  anyActivity: t('כל הפעילויות', 'Every activity'),
  who: t('חשבון', 'Account'),
  anyone: t('כל החשבונות', 'Every account'),
  guest: t('משתתפים', 'Participants'),
  staff: t('צוות', 'Staff'),
  blocked: t('חסומים', 'Blocked'),
  nopassword: t('בלי סיסמה', 'No password'),
  submit: t('חיפוש', 'Search'),
  clear: t('ניקוי', 'Clear'),
  found: t('נמצאו', 'Found'),
  of: t('מתוך', 'of'),
  people: t('משתמשים', 'accounts'),
  nothing: t('לא נמצאו משתמשים שמתאימים לחיפוש.', 'No account matches this search.'),
};

interface Props {
  locale: Locale;
  criteria: ParticipantCriteria;
  conferences: { slug: string; title: string }[];
  activities: { id: string; title: string; startsAt?: string }[];
  shown: number;
  total: number;
  filtered: boolean;
}

const PeopleSearch = ({ locale, criteria, conferences, activities, shown, total, filtered }: Props) => {
  const c = SEARCH_COPY;
  return (
    <section className="rounded-xl border border-[var(--c-line)] bg-[var(--c-panel)] px-5 py-4" aria-label={c.query[locale]}>
      <form method="get" action="/studio/participants" role="search" className="flex flex-col gap-3">
        <label className="block">
          <span className={fieldLabel}>{c.query[locale]}</span>
          <input
            type="search"
            name="q"
            defaultValue={criteria.q}
            maxLength={120}
            placeholder={c.queryPlaceholder[locale]}
            className={`${textField} mt-1`}
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block">
            <span className={fieldLabel}>{c.conference[locale]}</span>
            <select name="conference" defaultValue={criteria.conference} className={`${selectField} mt-1 w-full`}>
              <option value="">{c.anyConference[locale]}</option>
              {conferences.map((conference) => (
                <option key={conference.slug} value={conference.slug}>
                  {conference.title}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={fieldLabel}>{c.place[locale]}</span>
            <select name="place" defaultValue={criteria.place} className={`${selectField} mt-1 w-full`}>
              <option value="">{c.anyPlace[locale]}</option>
              <option value="registered">{c.registered[locale]}</option>
              <option value="cancelled">{c.cancelled[locale]}</option>
              <option value="none">{c.none[locale]}</option>
            </select>
          </label>
          <label className="block">
            <span className={fieldLabel}>{c.activity[locale]}</span>
            <select name="activity" defaultValue={criteria.activity} className={`${selectField} mt-1 w-full`}>
              <option value="">{c.anyActivity[locale]}</option>
              {activities.map((activity) => (
                <option key={activity.id} value={activity.id}>
                  {activity.startsAt
                    ? `${formatDayLabel(activity.startsAt, locale, DEFAULT_VENUE_TIMEZONE)} · ${activity.title}`
                    : activity.title}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={fieldLabel}>{c.who[locale]}</span>
            <select name="who" defaultValue={criteria.who} className={`${selectField} mt-1 w-full`}>
              <option value="">{c.anyone[locale]}</option>
              <option value="guest">{c.guest[locale]}</option>
              <option value="staff">{c.staff[locale]}</option>
              <option value="blocked">{c.blocked[locale]}</option>
              <option value="nopassword">{c.nopassword[locale]}</option>
            </select>
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className={quietButton}>
            {c.submit[locale]}
          </button>
          {filtered ? (
            <Link href="/studio/participants" className="text-[11px] text-[var(--c-text-soft)] underline-offset-4 hover:underline">
              {c.clear[locale]}
            </Link>
          ) : null}
          <p className="ms-auto text-xs text-[var(--c-text-soft)]" role="status">
            {c.found[locale]} <strong className="text-[var(--c-text)]">{shown}</strong> {c.of[locale]} {total} {c.people[locale]}
          </p>
        </div>
      </form>
    </section>
  );
};

export default PeopleSearch;
