import type { Locale } from '@/config/locales';
import type { SheetData } from '@/features/program';
import { activityRosterSource } from '@/infrastructure';
import { formatTimeLabel } from '@/shared/utils/format-date';
import { CONSOLE_UI } from '../constants/console';
import type {
  ActivityRoster,
  ConferenceRosters,
  RosterStatus,
} from '../types/activity-roster';

/*
 * Who signed up for the activities, as a workbook a manager can open.
 *
 * One activity: one sheet — name, phone, email, and where each person
 * stands. Every activity: a first sheet with everyone, one row per
 * sign-up and the activity, date and time beside it, so it can be
 * sorted and filtered as one list; then a sheet per activity, each the
 * same as the single-activity file. A person signed up for three
 * activities is three rows on the first sheet, because that is three
 * places.
 *
 * Dates and times are the conference's own clock, not the server's.
 * Every cell is text — a phone number keeps its leading zero.
 */
export const getActivityRosters = (
  slug: string,
  locale: Locale,
  sessionId?: string,
): Promise<ConferenceRosters> => activityRosterSource(slug, locale, sessionId);

const STATUS_LABEL: Record<RosterStatus, Record<Locale, string>> = {
  confirmed: CONSOLE_UI.rosterStatusConfirmed,
  attended: CONSOLE_UI.rosterStatusAttended,
  pending: CONSOLE_UI.rosterStatusPending,
  waitlisted: CONSOLE_UI.rosterStatusWaitlisted,
};

const dateOf = (iso: string | undefined, locale: Locale, timeZone: string | undefined): string => {
  if (!iso || Number.isNaN(Date.parse(iso))) {
    return '';
  }
  return new Intl.DateTimeFormat(locale === 'he' ? 'he-IL' : 'en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...(timeZone ? { timeZone } : {}),
  }).format(new Date(iso));
};

const timeOf = (activity: ActivityRoster, locale: Locale, timeZone: string | undefined): string => {
  const from = formatTimeLabel(activity.startsAt, locale, timeZone);
  const to = formatTimeLabel(activity.endsAt, locale, timeZone);
  return from && to ? `${from}–${to}` : from;
};

/*
 * A sheet name Excel accepts: at most 31 characters, none of : \ / ? * [ ],
 * not starting or ending with an apostrophe, never "History", and unique
 * in the workbook — two activities with one title get "(2)".
 */
const SHEET_NAME_MAX = 31;

const sheetNamer = (fallback: string) => {
  const taken = new Set<string>();
  return (title: string): string => {
    const clean =
      title
        .replace(/[:\\/?*[\]]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/^'+|'+$/g, '') || fallback;
    const base = clean.toLowerCase() === 'history' ? `${clean} 1` : clean;
    let name = base.slice(0, SHEET_NAME_MAX).trim();
    for (let n = 2; taken.has(name.toLowerCase()); n += 1) {
      const suffix = ` (${n})`;
      name = `${base.slice(0, SHEET_NAME_MAX - suffix.length).trim()}${suffix}`;
    }
    taken.add(name.toLowerCase());
    return name;
  };
};

const PEOPLE_WIDTHS = [28, 18, 34, 18];

const peopleSheet = (
  activity: ActivityRoster,
  name: string,
  locale: Locale,
): SheetData => {
  const ui = CONSOLE_UI;
  return {
    name,
    rightToLeft: locale === 'he',
    widths: PEOPLE_WIDTHS,
    rows: [
      [ui.rosterColName[locale], ui.rosterColPhone[locale], ui.rosterColEmail[locale], ui.rosterColStatus[locale]],
      ...activity.people.map((person) => [
        person.name,
        person.phone,
        person.email,
        STATUS_LABEL[person.status][locale],
      ]),
    ],
  };
};

export const activityRosterSheets = (
  rosters: ConferenceRosters,
  locale: Locale,
  scope: 'one' | 'all',
): SheetData[] => {
  const ui = CONSOLE_UI;
  const name = sheetNamer(ui.rosterSheetUntitled[locale]);

  if (scope === 'one') {
    const activity = rosters.activities[0];
    return activity ? [peopleSheet(activity, name(activity.title), locale)] : [];
  }

  const { timeZone } = rosters;
  const everyone: SheetData = {
    name: name(ui.rosterSheetAll[locale]),
    rightToLeft: locale === 'he',
    widths: [34, 12, 13, ...PEOPLE_WIDTHS],
    rows: [
      [
        ui.rosterColActivity[locale],
        ui.rosterColDate[locale],
        ui.rosterColTime[locale],
        ui.rosterColName[locale],
        ui.rosterColPhone[locale],
        ui.rosterColEmail[locale],
        ui.rosterColStatus[locale],
      ],
      ...rosters.activities.flatMap((activity) => {
        const date = dateOf(activity.startsAt, locale, timeZone);
        const time = timeOf(activity, locale, timeZone);
        return activity.people.map((person) => [
          activity.title,
          date,
          time,
          person.name,
          person.phone,
          person.email,
          STATUS_LABEL[person.status][locale],
        ]);
      }),
    ],
  };

  return [everyone, ...rosters.activities.map((activity) => peopleSheet(activity, name(activity.title), locale))];
};

/* How many sign-ups the file holds — for the audit trail. */
export const rosterSize = (rosters: ConferenceRosters): number =>
  rosters.activities.reduce((sum, activity) => sum + activity.people.length, 0);
