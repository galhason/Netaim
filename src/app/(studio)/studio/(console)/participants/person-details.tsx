import type { Locale } from '@/config/locales';
import { TYPE_LABELS } from '@/features/program';
import { ACTIVITY_LANGUAGE_LABELS, type ActivityLanguage } from '@/shared/constants/activity-facets';
import { countryName } from '@/shared/constants/countries';
import { dietaryKeyOf, dietaryLabel } from '@/features/registration/constants/dietary';
import { DEFAULT_VENUE_TIMEZONE, formatDayLabel, formatTimeLabel } from '@/shared';
import type { SessionType } from '@/features/program/types/session';
import type { ParticipantAdminView } from '@/features/studio/types/participants';
import { chip } from './ui';

/*
 * Everything the platform holds about one person, opened on request:
 * what they told us at registration, each conference place, and every
 * activity place — workshops, tours, and the language they voted for.
 * Read only; the actions stay where they were, on the card itself.
 */
const t = (he: string, en: string): Record<Locale, string> => ({ he, en });

const COPY = {
  open: t('פרטים ופעילויות', 'Details & activities'),
  activitiesCount: t('פעילויות', 'activities'),
  profile: t('פרטי ההרשמה', 'Registration details'),
  phone: t('טלפון', 'Phone'),
  organization: t('ארגון', 'Organization'),
  role: t('תפקיד', 'Role'),
  country: t('מדינה', 'Country'),
  dietary: t('תזונה', 'Dietary'),
  accessibility: t('נגישות', 'Accessibility'),
  language: t('שפת האתר', 'Site language'),
  joined: t('נוצר', 'Created'),
  listed: t('מופיע במדריך המשתתפים', 'Listed in the directory'),
  yes: t('כן', 'Yes'),
  no: t('לא', 'No'),
  conferences: t('כנסים', 'Conferences'),
  activities: t('פעילויות וסדנאות', 'Activities & workshops'),
  noActivities: t('לא נרשם/ה לאף פעילות.', 'No activity places.'),
  noConferences: t('לא נרשם/ה לאף כנס.', 'No conference places.'),
  voted: t('הצביע/ה ל', 'Voted '),
};

export const STATUS_WORDS: Record<string, Record<Locale, string>> = {
  confirmed: t('רשום/ה', 'Registered'),
  pending: t('ממתין/ה לאישור', 'Awaiting approval'),
  waitlisted: t('רשימת המתנה', 'Waiting list'),
  cancelled: t('בוטל', 'Cancelled'),
  declined: t('נדחה', 'Declined'),
  attended: t('נכח/ה', 'Attended'),
  expired: t('פג', 'Expired'),
  noShow: t('לא הגיע/ה', 'No show'),
};

const LIVE = new Set(['confirmed', 'pending', 'waitlisted', 'attended']);

const statusTone = (status: string): string =>
  LIVE.has(status) ? 'text-[var(--c-live)]' : 'text-[var(--c-text-faint)]';

const when = (iso: string | undefined, locale: Locale): string =>
  iso ? `${formatDayLabel(iso, locale, DEFAULT_VENUE_TIMEZONE)} · ${formatTimeLabel(iso, locale, DEFAULT_VENUE_TIMEZONE)}` : '';

const Fact = ({ label, value, ltr = false }: { label: string; value?: string; ltr?: boolean }) =>
  value ? (
    <div className="min-w-0">
      <dt className="text-[10px] tracking-[0.14em] text-[var(--c-text-faint)]">{label}</dt>
      <dd className="break-words text-xs text-[var(--c-text)]">
        {ltr ? <span dir="ltr">{value}</span> : value}
      </dd>
    </div>
  ) : null;

const PersonDetails = ({ person, locale }: { person: ParticipantAdminView; locale: Locale }) => {
  const live = person.activities.filter((line) => LIVE.has(line.status)).length;
  const dietaryKey = dietaryKeyOf(person.dietary);
  return (
    <details className="mt-3 rounded-lg border border-[var(--c-line)] bg-[rgba(7,19,36,0.35)]">
      <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-[var(--c-text-soft)] hover:text-[var(--c-text)]">
        {COPY.open[locale]}
        <span className="ms-2 text-[10px] font-normal text-[var(--c-text-faint)]">
          {live} {COPY.activitiesCount[locale]}
        </span>
      </summary>
      <div className="flex flex-col gap-4 border-t border-[var(--c-line)] px-3 py-3">
        <section>
          <h3 className="mb-2 text-[11px] font-semibold text-[var(--c-text-soft)]">{COPY.profile[locale]}</h3>
          <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
            <Fact label={COPY.phone[locale]} value={person.phone} ltr />
            <Fact label={COPY.organization[locale]} value={person.organization} />
            <Fact label={COPY.role[locale]} value={person.role} />
            <Fact label={COPY.country[locale]} value={countryName(person.country, locale) ?? person.country} />
            <Fact
              label={COPY.dietary[locale]}
              value={dietaryKey ? dietaryLabel(dietaryKey, locale) : person.dietary}
            />
            <Fact label={COPY.accessibility[locale]} value={person.accessibility} />
            <Fact label={COPY.language[locale]} value={person.locale === 'en' ? 'English' : person.locale === 'he' ? 'עברית' : undefined} />
            <Fact label={COPY.joined[locale]} value={when(person.createdAt, locale)} />
            <Fact label={COPY.listed[locale]} value={person.listed ? COPY.yes[locale] : COPY.no[locale]} />
          </dl>
        </section>

        <section>
          <h3 className="mb-2 text-[11px] font-semibold text-[var(--c-text-soft)]">{COPY.conferences[locale]}</h3>
          {person.registrations.length === 0 ? (
            <p className="text-xs text-[var(--c-text-faint)]">{COPY.noConferences[locale]}</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {person.registrations.map((line, index) => (
                <li key={`${line.eventSlug}-${index}`} className={chip}>
                  {line.eventTitle}
                  <span className={`text-[10px] ${statusTone(line.status)}`}>
                    {STATUS_WORDS[line.status]?.[locale] ?? line.status}
                  </span>
                  {line.submittedAt ? (
                    <span className="text-[10px] text-[var(--c-text-faint)]">{when(line.submittedAt, locale)}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h3 className="mb-2 text-[11px] font-semibold text-[var(--c-text-soft)]">{COPY.activities[locale]}</h3>
          {person.activities.length === 0 ? (
            <p className="text-xs text-[var(--c-text-faint)]">{COPY.noActivities[locale]}</p>
          ) : (
            <ul className="flex flex-col divide-y divide-[var(--c-line)]">
              {person.activities.map((line, index) => (
                <li key={`${line.sessionId}-${index}`} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 py-1.5">
                  <span className="min-w-0 flex-1 text-xs text-[var(--c-text)]">{line.title}</span>
                  <span className="text-[10px] text-[var(--c-text-faint)]">
                    {TYPE_LABELS[line.sessionType as SessionType]?.[locale] ?? line.sessionType}
                  </span>
                  {line.startsAt ? (
                    <span className="text-[10px] tabular-nums text-[var(--c-text-faint)]" dir="ltr">
                      {when(line.startsAt, locale)}
                    </span>
                  ) : null}
                  {line.language ? (
                    <span className="text-[10px] text-[var(--c-text-soft)]">
                      {COPY.voted[locale]}
                      {ACTIVITY_LANGUAGE_LABELS[line.language as ActivityLanguage]?.[locale] ?? line.language}
                    </span>
                  ) : null}
                  <span className={`text-[10px] font-medium ${statusTone(line.status)}`}>
                    {STATUS_WORDS[line.status]?.[locale] ?? line.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </details>
  );
};

export default PersonDetails;
