import type { Locale } from '@/config/locales';
import type { SheetData } from '@/features/program';
import { activityRosterSource } from '@/infrastructure';
import { formatTimeLabel } from '@/shared/utils/format-date';
import { ACTIVITY_LANGUAGE_LABELS, activityLanguagesOf } from '@/shared/constants/activity-facets';
import { CONSOLE_UI } from '../constants/console';
import type {
  ActivityRoster,
  ConferenceRosters,
  RosterStatus,
} from '../types/activity-roster';

/*
 * Who signed up for the activities, as a workbook a manager can open.
 *
 * One activity: one sheet — name, phone, email, where each person
 * stands — and a summary under it: how many, by standing, how many of
 * the places are taken, and where the activity holds a vote on its
 * language, how the vote stands. Every activity: a first sheet that
 * reads like a printed list, one block per activity (its title and
 * hour, its people, its summary); a summary sheet, one row per
 * activity, for the totals at a glance; then a sheet per activity,
 * each the same as the single-activity file.
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

const PEOPLE_WIDTHS = [28, 18, 34, 18, 16];

/* The language a person asked for, in the organiser's words; blank where the activity held no vote. */
const languageOf = (code: string | undefined, locale: Locale): string => {
  const known = activityLanguagesOf(code ? [code] : [])[0];
  return known ? ACTIVITY_LANGUAGE_LABELS[known][locale] : '';
};

/* What one activity adds up to: the counts the summary block and the summary sheet both print. */
interface ActivityTally {
  total: number;
  byStatus: Record<RosterStatus, number>;
  /* Everyone holding a place — what counts against the limit; the waiting list does not. */
  places: number;
  /* Per language offered or chosen: those holding a place, and those waiting. */
  votes: { label: string; seated: number; waiting: number }[];
  /* Holding a place or waiting, without a language chosen. */
  undecided: number;
}

const STATUS_ORDER: RosterStatus[] = ['confirmed', 'attended', 'pending', 'waitlisted'];

const tallyOf = (activity: ActivityRoster, locale: Locale): ActivityTally => {
  const byStatus: Record<RosterStatus, number> = { confirmed: 0, attended: 0, pending: 0, waitlisted: 0 };
  for (const person of activity.people) {
    byStatus[person.status] += 1;
  }
  const votes: ActivityTally['votes'] = [];
  let undecided = 0;
  if (activity.languageVote) {
    /* The languages offered, and any chosen that is no longer offered — each once. */
    const offered = [
      ...new Set(
        activityLanguagesOf([
          ...(activity.languages ?? []),
          ...activity.people.flatMap((person) => (person.language ? [person.language] : [])),
        ]),
      ),
    ];
    for (const language of offered) {
      const choosing = activity.people.filter((person) => person.language === language);
      votes.push({
        label: ACTIVITY_LANGUAGE_LABELS[language][locale],
        seated: choosing.filter((person) => person.status !== 'waitlisted').length,
        waiting: choosing.filter((person) => person.status === 'waitlisted').length,
      });
    }
    votes.sort((a, b) => b.seated - a.seated || b.waiting - a.waiting);
    undecided = activity.people.filter((person) => !activityLanguagesOf(person.language ? [person.language] : []).length).length;
  }
  return {
    total: activity.people.length,
    byStatus,
    places: byStatus.confirmed + byStatus.attended + byStatus.pending,
    votes,
    undecided,
  };
};

/* "12 מתוך 20" · "12 of 20" — or "12 (ללא הגבלה)" where nothing limits it. */
const placesText = (activity: ActivityRoster, tally: ActivityTally, locale: Locale): string => {
  const ui = CONSOLE_UI;
  return activity.capacity
    ? `${tally.places} ${ui.rosterSummaryOutOf[locale]} ${activity.capacity}`
    : `${tally.places} (${ui.rosterSummaryUnlimited[locale]})`;
};

/* "עברית 12 (+2) · אנגלית 5" — the vote on one line, for the summary sheet. */
const voteText = (activity: ActivityRoster, tally: ActivityTally, locale: Locale): string => {
  if (!activity.languageVote) {
    return '';
  }
  const ui = CONSOLE_UI;
  const decided = languageOf(activity.decidedLanguage, locale);
  const line = tally.votes
    .map((vote) => `${vote.label} ${vote.seated}${vote.waiting > 0 ? ` (+${vote.waiting})` : ''}`)
    .join(' · ');
  return decided ? `${ui.rosterSummaryDecided[locale]}: ${decided}${line ? ` — ${line}` : ''}` : line;
};

/*
 * The summary block under an activity's people, as rows of the sheet:
 * a heading, the total, each standing that has anyone in it, the
 * places taken against the limit, and the vote. Returns the rows and
 * which of them (counted from the first) are headings, to be bold.
 */
const summaryRows = (activity: ActivityRoster, locale: Locale): { rows: string[][]; bold: number[] } => {
  const ui = CONSOLE_UI;
  const tally = tallyOf(activity, locale);
  const rows: string[][] = [[ui.rosterSummaryHeading[locale]]];
  const bold = [0];
  rows.push([ui.rosterSummaryTotal[locale], tally.total === 0 ? ui.rosterSummaryNobody[locale] : String(tally.total)]);
  for (const status of STATUS_ORDER) {
    if (tally.byStatus[status] > 0) {
      rows.push([STATUS_LABEL[status][locale], String(tally.byStatus[status])]);
    }
  }
  rows.push([ui.rosterSummaryPlaces[locale], placesText(activity, tally, locale)]);
  if (activity.languageVote) {
    const decided = languageOf(activity.decidedLanguage, locale);
    bold.push(rows.length);
    rows.push([decided ? `${ui.rosterSummaryVote[locale]} — ${ui.rosterSummaryDecided[locale]}: ${decided}` : ui.rosterSummaryVote[locale]]);
    for (const vote of tally.votes) {
      rows.push([
        vote.label,
        String(vote.seated),
        vote.waiting > 0 ? `+${vote.waiting} ${ui.rosterSummaryWaitingShort[locale]}` : '',
      ]);
    }
    if (tally.undecided > 0) {
      rows.push([ui.rosterSummaryNoChoice[locale], String(tally.undecided)]);
    }
  }
  return { rows, bold };
};

const headerRow = (locale: Locale): string[] => {
  const ui = CONSOLE_UI;
  return [ui.rosterColName[locale], ui.rosterColPhone[locale], ui.rosterColEmail[locale], ui.rosterColStatus[locale], ui.rosterColLanguage[locale]];
};

const personRow = (person: ActivityRoster['people'][number], locale: Locale): string[] => [
  person.name,
  person.phone,
  person.email,
  STATUS_LABEL[person.status][locale],
  languageOf(person.language, locale),
];

/* One activity's sheet: its people, a blank row, its summary. */
const peopleSheet = (
  activity: ActivityRoster,
  name: string,
  locale: Locale,
): SheetData => {
  const people = activity.people.map((person) => personRow(person, locale));
  const summary = summaryRows(activity, locale);
  const offset = 1 + people.length + 1;
  return {
    name,
    rightToLeft: locale === 'he',
    widths: PEOPLE_WIDTHS,
    rows: [headerRow(locale), ...people, [], ...summary.rows],
    boldRows: summary.bold.map((row) => row + offset),
  };
};

/* "סדנת הוראה חדשנית · 12/11/2026 · 09:00–10:30" — a block's title. */
const blockTitle = (activity: ActivityRoster, locale: Locale, timeZone: string | undefined): string =>
  [activity.title, dateOf(activity.startsAt, locale, timeZone), timeOf(activity, locale, timeZone)]
    .filter(Boolean)
    .join(' · ');

/* The first sheet: every activity as a block — its title, its people, its summary — like a printed list. */
const blocksSheet = (rosters: ConferenceRosters, name: string, locale: Locale): SheetData => {
  const rows: string[][] = [];
  const bold: number[] = [];
  rosters.activities.forEach((activity, index) => {
    if (index > 0) {
      rows.push([], []);
    }
    bold.push(rows.length);
    rows.push([blockTitle(activity, locale, rosters.timeZone)]);
    bold.push(rows.length);
    rows.push(headerRow(locale));
    rows.push(...activity.people.map((person) => personRow(person, locale)));
    rows.push([]);
    const summary = summaryRows(activity, locale);
    bold.push(...summary.bold.map((row) => row + rows.length));
    rows.push(...summary.rows);
  });
  return { name, rightToLeft: locale === 'he', widths: PEOPLE_WIDTHS, rows, boldRows: bold };
};

/* The summary sheet: one row per activity, the totals at a glance. */
const summarySheet = (rosters: ConferenceRosters, name: string, locale: Locale): SheetData => {
  const ui = CONSOLE_UI;
  const { timeZone } = rosters;
  return {
    name,
    rightToLeft: locale === 'he',
    widths: [34, 12, 13, 9, 11, 11, 13, 13, 16, 40],
    rows: [
      [
        ui.rosterColActivity[locale],
        ui.rosterColDate[locale],
        ui.rosterColTime[locale],
        ui.rosterColTotal[locale],
        STATUS_LABEL.confirmed[locale],
        STATUS_LABEL.attended[locale],
        STATUS_LABEL.pending[locale],
        STATUS_LABEL.waitlisted[locale],
        ui.rosterColPlaces[locale],
        ui.rosterColVote[locale],
      ],
      ...rosters.activities.map((activity) => {
        const tally = tallyOf(activity, locale);
        return [
          activity.title,
          dateOf(activity.startsAt, locale, timeZone),
          timeOf(activity, locale, timeZone),
          String(tally.total),
          String(tally.byStatus.confirmed),
          String(tally.byStatus.attended),
          String(tally.byStatus.pending),
          String(tally.byStatus.waitlisted),
          placesText(activity, tally, locale),
          voteText(activity, tally, locale),
        ];
      }),
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

  return [
    blocksSheet(rosters, name(ui.rosterSheetAll[locale]), locale),
    summarySheet(rosters, name(ui.rosterSheetSummary[locale]), locale),
    ...rosters.activities.map((activity) => peopleSheet(activity, name(activity.title), locale)),
  ];
};

/* How many sign-ups the file holds — for the audit trail. */
export const rosterSize = (rosters: ConferenceRosters): number =>
  rosters.activities.reduce((sum, activity) => sum + activity.people.length, 0);
