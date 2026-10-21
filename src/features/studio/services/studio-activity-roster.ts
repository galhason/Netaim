import type { Locale } from '@/config/locales';
import { isPlainSession, isSessionType, TYPE_LABELS, type SheetData } from '@/features/program';
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
 * language, how the vote stands.
 *
 * Every activity: still one sheet, read top to bottom like a printed
 * list. Only the activities a person registers for — workshops,
 * lectures, keynotes, tours; a panel or a break holds no places and has
 * nobody to list. Each is a block: its title and hour, its people, its
 * summary. The sheet closes on the conference as a whole: who is
 * registered to it, how many of them chose an activity and how many did
 * not, the places taken across the programme, and each kind of
 * activity with its count.
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

/* The activities a person registers for: not a panel, not a break. */
const takesRegistrations = (activity: ActivityRoster): boolean => !isPlainSession(activity.type);

const KIND_ORDER = ['workshop', 'talk', 'keynote', 'tour'] as const;

/*
 * The closing summary of the whole report, as rows: the conference,
 * the people in the activities, the places across the programme, and
 * each kind of activity. Returns the rows and which are headings.
 */
const overallRows = (
  rosters: ConferenceRosters,
  activities: ActivityRoster[],
  locale: Locale,
): { rows: string[][]; bold: number[] } => {
  const ui = CONSOLE_UI;
  const rows: string[][] = [];
  const bold: number[] = [];
  const heading = (text: string) => {
    bold.push(rows.length);
    rows.push([text]);
  };
  const line = (label: string, value: string | number, note = '') => {
    rows.push(note ? [label, String(value), note] : [label, String(value)]);
  };

  const tallies = activities.map((activity) => ({ activity, tally: tallyOf(activity, locale) }));
  const inActivities = new Set(activities.flatMap((activity) => activity.people.map((person) => person.participantId)));
  const conference = new Set(rosters.conferenceRegistrants ?? []);
  const everyone = new Set([...conference, ...inActivities]);
  const withoutActivity = [...conference].filter((id) => !inActivities.has(id)).length;
  const places = tallies.reduce((sum, { tally }) => sum + tally.total, 0);
  const byStatus = STATUS_ORDER.map((status) => ({
    status,
    count: tallies.reduce((sum, { tally }) => sum + tally.byStatus[status], 0),
  }));
  const limited = tallies.filter(({ activity }) => activity.capacity);
  const seats = limited.reduce((sum, { activity }) => sum + (activity.capacity ?? 0), 0);
  const taken = limited.reduce((sum, { tally }) => sum + tally.places, 0);
  const full = limited.filter(({ activity, tally }) => tally.places >= (activity.capacity ?? 0)).length;
  const empty = tallies.filter(({ tally }) => tally.total === 0).length;
  const average = inActivities.size > 0 ? (places / inActivities.size).toFixed(1) : '0';

  heading(ui.rosterOverallHeading[locale]);
  line(ui.rosterOverallPeople[locale], everyone.size);
  line(ui.rosterOverallConference[locale], conference.size);
  line(ui.rosterOverallInActivities[locale], inActivities.size);
  line(ui.rosterOverallNoActivity[locale], withoutActivity);

  rows.push([]);
  heading(ui.rosterOverallPlacesHeading[locale]);
  line(ui.rosterOverallRegistrations[locale], places);
  for (const { status, count } of byStatus) {
    if (count > 0) {
      line(STATUS_LABEL[status][locale], count);
    }
  }
  line(ui.rosterOverallAverage[locale], average);
  if (limited.length > 0) {
    line(ui.rosterOverallSeats[locale], `${taken} ${ui.rosterSummaryOutOf[locale]} ${seats}`);
  }
  line(ui.rosterOverallFull[locale], full);
  line(ui.rosterOverallEmpty[locale], empty);

  rows.push([]);
  heading(ui.rosterOverallKindsHeading[locale]);
  rows.push([ui.rosterOverallKind[locale], ui.rosterOverallKindActivities[locale], ui.rosterOverallKindRegistrations[locale]]);
  bold.push(rows.length - 1);
  for (const kind of KIND_ORDER) {
    const ofKind = tallies.filter(({ activity }) => activity.type === kind);
    if (ofKind.length > 0) {
      rows.push([
        TYPE_LABELS[kind][locale],
        String(ofKind.length),
        String(ofKind.reduce((sum, { tally }) => sum + tally.total, 0)),
      ]);
    }
  }
  const unnamed = tallies.filter(({ activity }) => !activity.type || !isSessionType(activity.type));
  if (unnamed.length > 0) {
    rows.push([
      ui.rosterSheetUntitled[locale],
      String(unnamed.length),
      String(unnamed.reduce((sum, { tally }) => sum + tally.total, 0)),
    ]);
  }
  rows.push([
    ui.rosterColTotal[locale],
    String(tallies.length),
    String(places),
  ]);
  bold.push(rows.length - 1);
  return { rows, bold };
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

  const activities = rosters.activities.filter(takesRegistrations);
  const sheet = blocksSheet({ ...rosters, activities }, name(ui.rosterSheetAll[locale]), locale);
  const overall = overallRows(rosters, activities, locale);
  const offset = sheet.rows.length + (sheet.rows.length > 0 ? 3 : 0);
  return [
    {
      ...sheet,
      rows: [...sheet.rows, ...(sheet.rows.length > 0 ? [[], [], []] : []), ...overall.rows],
      boldRows: [...(sheet.boldRows ?? []), ...overall.bold.map((row) => row + offset)],
    },
  ];
};

/* How many sign-ups the file holds — for the audit trail. */
export const rosterSize = (rosters: ConferenceRosters): number =>
  rosters.activities.reduce((sum, activity) => sum + activity.people.length, 0);
