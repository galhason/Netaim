import type { Locale } from '@/config/locales';
import {
  DEFAULT_VENUE_TIMEZONE,
  formatLongDate,
  formatTimeLabel,
  venueDayKey,
} from '@/shared';
import type {
  ActivityFilterVM,
  ActivityVM,
  DayVM,
  MyRegistrationsVM,
  ProgramInsights,
  RegistrationState,
  ScheduleItemVM,
  SpeakerVM,
} from '@/features/conference';
import { cancellationAllowed, registrationWindow } from '@/registration-engine';
import { audienceLabels, languageLine, placeOf, topicLabels } from '@/shared/constants/activity-facets';
import type { SessionType } from '../types/session';
import {
  listConferenceActivities,
  myActivities,
  myWorkshops,
} from './program-service';

/*
 * One conference, one model. The program page and the participant's
 * personal dashboard are two readings of the same list: the dashboard is
 * the program filtered to the activities the guest holds. Building it in
 * one place is what keeps that promise honest — there is no second
 * schedule to drift out of step.
 */

export const TYPE_LABELS: Record<SessionType, Record<Locale, string>> = {
  talk: { he: 'הרצאה', en: 'Lecture' },
  workshop: { he: 'סדנה', en: 'Seminar' },
  keynote: { he: 'מליאה', en: 'Keynote' },
  tour: { he: 'סיור', en: 'Tour' },
  break: { he: 'הפסקה', en: 'Break' },
};

const FILTER_ORDER: SessionType[] = ['keynote', 'talk', 'workshop', 'tour'];

const HOUR_MS = 3600000;

/*
 * The line under a button that cannot be pressed yet: when registration
 * opens, or that it has closed — in the guest's language, on the venue
 * clock, so "opens on 12 October at 09:00" means the venue's morning.
 */
const windowNote = (
  state: 'notYet' | 'closed',
  opensAt: string | undefined,
  locale: Locale,
  timeZone: string,
): string => {
  if (state === 'closed') {
    return locale === 'he' ? 'ההרשמה לפעילות זו נסגרה.' : 'Registration for this activity has closed.';
  }
  const day = formatLongDate(opensAt, locale, timeZone);
  const clock = formatTimeLabel(opensAt, locale, timeZone);
  const when = day && clock ? `${day} ${clock}` : day || clock;
  if (!when) return locale === 'he' ? 'ההרשמה טרם נפתחה.' : 'Registration has not opened yet.';
  return locale === 'he' ? `ההרשמה נפתחת ב-${when}.` : `Registration opens on ${when}.`;
};

/*
 * The day an activity belongs to, in the conference's own calendar.
 *
 * This took the UTC day, which put every session before 02:00 or 03:00
 * Israel time on the day before -- while the time printed beside it came
 * from the venue clock. A programme cannot group by one clock and label
 * by another, so both now use the same one.
 */
export const dayKeyOf = (
  iso?: string,
  timeZone: string = DEFAULT_VENUE_TIMEZONE,
): string => venueDayKey(iso, timeZone);

const durationLabel = (
  start?: string,
  end?: string,
  locale: Locale = 'he',
): string | undefined => {
  if (!start || !end) return undefined;
  const s = Date.parse(start);
  const e = Date.parse(end);
  if (Number.isNaN(s) || Number.isNaN(e) || e <= s) return undefined;
  const min = Math.round((e - s) / 60000);
  const h = Math.floor(min / 60);
  const r = min % 60;
  if (h === 0) return locale === 'he' ? `${r} דק׳` : `${r} min`;
  const hp = locale === 'he' ? `${h} ש׳` : `${h}h`;
  const rp = r > 0 ? (locale === 'he' ? ` ${r} דק׳` : ` ${r}m`) : '';
  return `${hp}${rp}`;
};

const overlaps = (aS: number, aE: number, bS: number, bE: number): boolean =>
  aS < bE && bS < aE;

export interface ProgramModel {
  activities: ActivityVM[];
  days: DayVM[];
  filters: ActivityFilterVM[];
  schedule: ScheduleItemVM[];
  insights: ProgramInsights;
  mine: MyRegistrationsVM;
}

const EMPTY: ProgramModel = {
  activities: [],
  days: [],
  filters: [],
  schedule: [],
  insights: {
    todayCount: 0,
    registeredCount: 0,
    waitingCount: 0,
    remainingSeats: 0,
    totalActivities: 0,
    progressPct: 0,
    hoursRegistered: 0,
  },
  mine: { registeredIds: [], waitingIds: [], cancelledIds: [] },
};

export const buildProgramModel = async (
  slug: string | null,
  locale: Locale,
  now: number = Date.now(),
  /*
   * The conference's zone, passed in by the page that already loaded the
   * event. Absent on a legacy row, and then the shared default applies.
   */
  timeZone: string = DEFAULT_VENUE_TIMEZONE,
): Promise<ProgramModel> => {
  if (!slug) return EMPTY;

  const [activities, registrations, mineLists] = await Promise.all([
    listConferenceActivities(slug, locale).catch(() => []),
    myWorkshops(slug).catch(() => []),
    myActivities(slug, locale).catch(() => null),
  ]);

  const myStatus = new Map(
    registrations
      .filter((r) => r.status !== 'cancelled')
      .map((r) => [r.sessionId, r.status]),
  );

  const held = activities
    .filter((a) => {
      const st = myStatus.get(a.session.id);
      return st === 'confirmed' || st === 'waitlisted' || st === 'pending';
    })
    .map((a) => ({
      start: Date.parse(a.session.startsAt ?? ''),
      end:
        Date.parse(a.session.endsAt ?? '') ||
        Date.parse(a.session.startsAt ?? '') + HOUR_MS,
      id: a.session.id,
    }));

  const toSpeakerVM = (
    list: (typeof activities)[number]['session']['speakers'],
  ): SpeakerVM[] => {
    // A speaker belongs to an activity once, however many rows the
    // relationship happens to carry.
    const seen = new Set<string>();
    const out: SpeakerVM[] = [];
    (list ?? []).forEach((sp) => {
      if (seen.has(sp.id)) return;
      seen.add(sp.id);
      out.push({
        id: sp.id,
        name: sp.name,
        role: sp.jobTitle,
        company: sp.company,
        photoUrl: sp.photoUrl,
        bio: sp.bio,
        registered: sp.isRegistered,
        links: sp.socialLinks,
      });
    });
    return out;
  };

  const activityVMs: ActivityVM[] = activities
    .filter((a) => a.session.startsAt)
    .map(({ session, capacity, status }) => {
      const startMs = Date.parse(session.startsAt ?? '');
      const endMs = session.endsAt
        ? Date.parse(session.endsAt)
        : startMs + HOUR_MS;
      const st = myStatus.get(session.id);
      const past = endMs < now;
      const gate = registrationWindow(session, now);
      let registration: RegistrationState;
      let registrationNote: string | undefined;
      if (st === 'confirmed' || st === 'waitlisted' || st === 'pending') {
        registration = 'registered';
      } else if (past) {
        registration = 'completed';
      } else if (gate !== 'open') {
        registration = gate === 'notYet' ? 'opensLater' : 'closed';
        registrationNote = windowNote(gate, session.registrationOpensAt, locale, timeZone);
      } else if (status === 'full') {
        registration = session.waitlistEnabled ? 'waitlist' : 'full';
      } else if (
        held.some(
          (h) => h.id !== session.id && overlaps(startMs, endMs, h.start, h.end),
        )
      ) {
        registration = 'conflict';
      } else {
        registration = 'available';
      }
      return {
        id: session.id,
        type: session.sessionType,
        typeLabel: TYPE_LABELS[session.sessionType]?.[locale] ?? '',
        title: session.title,
        description: session.description,
        room: session.room,
        floor: session.floor,
        place: placeOf(session) || undefined,
        time: formatTimeLabel(session.startsAt, locale, timeZone) || undefined,
        endTime: session.endsAt
          ? formatTimeLabel(session.endsAt, locale, timeZone) || undefined
          : undefined,
        duration: durationLabel(session.startsAt, session.endsAt, locale),
        language: languageLine(session, locale) || undefined,
        audiences: audienceLabels(session.audiences, locale),
        topics: topicLabels(session.topics, locale),
        dayKey: dayKeyOf(session.startsAt, timeZone),
        startMs,
        endMs,
        speakers: toSpeakerVM(session.speakers),
        capacity: {
          confirmed: capacity.confirmed,
          waiting: capacity.waiting,
          limit: capacity.limit,
          available: capacity.available,
          state: capacity.state,
        },
        status,
        registration,
        /* A waiting-list place may always be given up; a seat, by the rule. */
        canCancel: st !== 'confirmed' || cancellationAllowed(session, now),
        registrationNote,
        image: session.image,
        featured: session.featured,
      };
    })
    .sort((a, b) => a.startMs - b.startMs);

  // Days — every date the conference actually occupies.
  const dayKeys = [...new Set(activityVMs.map((a) => a.dayKey))].sort();
  const days: DayVM[] = dayKeys.map((key, i) => {
    const d = new Date(`${key}T00:00:00`);
    const fmt = (opts: Intl.DateTimeFormatOptions) =>
      new Intl.DateTimeFormat(locale === 'he' ? 'he-IL' : 'en-GB', opts).format(d);
    return {
      key,
      index: i + 1,
      weekday: fmt({ weekday: 'short' }),
      dateNum: fmt({ day: 'numeric', month: 'numeric' }),
      month: fmt({ month: 'long' }),
      full: formatLongDate(`${key}T00:00:00`, locale, timeZone),
    };
  });

  // Filters — only the types this conference actually holds.
  const present = new Set(activityVMs.map((a) => a.type));
  const filters: ActivityFilterVM[] = [
    { key: 'all', label: locale === 'he' ? 'הכול' : 'All' },
    ...FILTER_ORDER.filter((t) => present.has(t)).map((t) => ({
      key: t,
      label: TYPE_LABELS[t][locale],
    })),
  ];

  const schedule: ScheduleItemVM[] = (mineLists?.upcoming ?? []).map((item) => ({
    id: item.session.id,
    time: formatTimeLabel(item.session.startsAt, locale, timeZone) || '',
    title: item.session.title,
    room: placeOf(item.session) || undefined,
    dayKey: dayKeyOf(item.session.startsAt, timeZone),
  }));

  /* Today at the venue, so "today's activities" means the venue's today. */
  const todayKey = venueDayKey(new Date(now).toISOString(), timeZone);
  const statuses = [...myStatus.values()];
  const registeredIds = [...myStatus.entries()]
    .filter(([, s]) => s === 'confirmed' || s === 'pending')
    .map(([id]) => id);
  const waitingIds = [...myStatus.entries()]
    .filter(([, s]) => s === 'waitlisted')
    .map(([id]) => id);
  // One activity, one entry: a guest who signed up and cancelled twice
  // still has a single cancelled activity to show for it.
  const cancelledIds = [
    ...new Set(
      registrations
        .filter((r) => r.status === 'cancelled' && !myStatus.has(r.sessionId))
        .map((r) => r.sessionId),
    ),
  ];

  const holdingIds = new Set([...registeredIds, ...waitingIds]);
  const registeredHours = activityVMs
    .filter((a) => holdingIds.has(a.id))
    .reduce((sum, a) => sum + (a.endMs ? (a.endMs - a.startMs) / HOUR_MS : 0), 0);
  const spanStart = activityVMs.length
    ? Math.min(...activityVMs.map((a) => a.startMs))
    : 0;
  const spanEnd = activityVMs.length
    ? Math.max(...activityVMs.map((a) => a.endMs ?? a.startMs))
    : 0;
  const next = activityVMs
    .filter((a) => holdingIds.has(a.id) && a.startMs > now)
    .sort((a, b) => a.startMs - b.startMs)[0];

  const insights: ProgramInsights = {
    todayCount: activityVMs.filter((a) => a.dayKey === todayKey).length,
    registeredCount: statuses.filter((s) => s === 'confirmed').length,
    waitingCount: statuses.filter((s) => s === 'waitlisted').length,
    remainingSeats: activityVMs.reduce(
      (sum, a) => sum + (a.capacity.available ?? 0),
      0,
    ),
    totalActivities: activityVMs.length,
    progressPct:
      spanEnd > spanStart
        ? Math.max(
            0,
            Math.min(
              100,
              Math.round(((now - spanStart) / (spanEnd - spanStart)) * 100),
            ),
          )
        : 0,
    hoursRegistered: Math.round(registeredHours * 10) / 10,
    ...(next
      ? {
          next: {
            id: next.id,
            title: next.title,
            time: next.time ?? '',
            room: next.place,
            dayKey: next.dayKey,
          },
        }
      : {}),
  };

  return {
    activities: activityVMs,
    days,
    filters,
    schedule,
    insights,
    mine: { registeredIds, waitingIds, cancelledIds },
  };
};
