import { setRequestLocale } from 'next-intl/server';
import { isSupportedLocale, type Locale } from '@/config/locales';
import { findPortalEvent, getActiveConferenceSlug } from '@/features/events';
import {
  listConferenceActivities,
  myActivities,
  myWorkshops,
  type SessionType,
} from '@/features/program';
import { formatLongDate, formatTimeLabel } from '@/shared';
import type {
  ActivityFilterVM,
  ActivityVM,
  DayVM,
  ProgramInsights,
  RegistrationState,
  ScheduleItemVM,
  SpeakerVM,
} from '@/features/conference';
import ProgramExperience from './program-experience';

interface ProgramPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ notice?: string; activity?: string }>;
}

const TYPE_LABELS: Record<SessionType, Record<Locale, string>> = {
  talk: { he: 'הרצאה', en: 'Lecture' },
  workshop: { he: 'סדנה', en: 'Workshop' },
  keynote: { he: 'מליאה', en: 'Keynote' },
  tour: { he: 'סיור', en: 'Tour' },
  break: { he: 'הפסקה', en: 'Break' },
};

const FILTER_ORDER: SessionType[] = ['keynote', 'talk', 'workshop', 'tour'];

const dayKeyOf = (iso?: string): string => {
  if (!iso) return '';
  const t = Date.parse(iso);
  return Number.isNaN(t) ? '' : new Date(t).toISOString().slice(0, 10);
};

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

const overlaps = (
  aS: number,
  aE: number,
  bS: number,
  bE: number,
): boolean => aS < bE && bS < aE;

const ProgramPage = async ({ params, searchParams }: ProgramPageProps) => {
  const { locale } = await params;
  const lang = (isSupportedLocale(locale) ? locale : 'he') as Locale;
  setRequestLocale(lang);
  const { notice, activity } = await searchParams;

  const slug = await getActiveConferenceSlug(lang).catch(() => null);
  const [event, activities, registrations, mine] = await Promise.all([
    slug ? findPortalEvent(slug, lang).catch(() => null) : Promise.resolve(null),
    slug ? listConferenceActivities(slug, lang).catch(() => []) : Promise.resolve([]),
    slug ? myWorkshops(slug).catch(() => []) : Promise.resolve([]),
    slug ? myActivities(slug, lang).catch(() => null) : Promise.resolve(null),
  ]);

  const now = Date.now();
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
        Date.parse(a.session.startsAt ?? '') + 3600000,
      id: a.session.id,
    }));

  const toSpeakerVM = (list: (typeof activities)[number]['session']['speakers']): SpeakerVM[] =>
    (list ?? []).map((sp) => ({
      id: sp.id,
      name: sp.name,
      role: sp.jobTitle,
      company: sp.company,
      photoUrl: sp.photoUrl,
      bio: sp.bio,
      registered: sp.isRegistered,
      links: sp.socialLinks,
    }));

  const activityVMs: ActivityVM[] = activities
    .filter((a) => a.session.startsAt)
    .map(({ session, capacity, status }) => {
      const startMs = Date.parse(session.startsAt ?? '');
      const endMs = session.endsAt
        ? Date.parse(session.endsAt)
        : startMs + 3600000;
      const st = myStatus.get(session.id);
      const past = endMs < now;
      let registration: RegistrationState;
      if (st === 'confirmed' || st === 'waitlisted' || st === 'pending') {
        registration = 'registered';
      } else if (past) {
        registration = 'completed';
      } else if (status === 'full') {
        registration = session.waitlistEnabled ? 'waitlist' : 'full';
      } else if (
        held.some((h) => h.id !== session.id && overlaps(startMs, endMs, h.start, h.end))
      ) {
        registration = 'conflict';
      } else {
        registration = 'available';
      }
      return {
        id: session.id,
        type: session.sessionType,
        typeLabel: TYPE_LABELS[session.sessionType]?.[lang] ?? '',
        title: session.title,
        description: session.description,
        room: session.room,
        floor: session.floor,
        time: formatTimeLabel(session.startsAt, lang) || undefined,
        endTime: session.endsAt
          ? formatTimeLabel(session.endsAt, lang) || undefined
          : undefined,
        duration: durationLabel(session.startsAt, session.endsAt, lang),
        language: session.language,
        dayKey: dayKeyOf(session.startsAt),
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
        image: session.image,
        featured: session.featured,
      };
    })
    .sort((a, b) => a.startMs - b.startMs);

  // Days
  const dayKeys = [...new Set(activityVMs.map((a) => a.dayKey))].sort();
  const days: DayVM[] = dayKeys.map((key, i) => {
    const d = new Date(`${key}T00:00:00`);
    const fmt = (opts: Intl.DateTimeFormatOptions) =>
      new Intl.DateTimeFormat(lang === 'he' ? 'he-IL' : 'en-GB', opts).format(d);
    return {
      key,
      index: i + 1,
      weekday: fmt({ weekday: 'short' }),
      dateNum: fmt({ day: 'numeric', month: 'numeric' }),
      month: fmt({ month: 'long' }),
      full: formatLongDate(`${key}T00:00:00`, lang),
    };
  });

  // Filters — only types present
  const present = new Set(activityVMs.map((a) => a.type));
  const filters: ActivityFilterVM[] = [
    { key: 'all', label: lang === 'he' ? 'הכול' : 'All' },
    ...FILTER_ORDER.filter((t) => present.has(t)).map((t) => ({
      key: t,
      label: TYPE_LABELS[t][lang],
    })),
  ];

  // My schedule (upcoming confirmed)
  const schedule: ScheduleItemVM[] = (mine?.upcoming ?? []).map((item) => ({
    id: item.session.id,
    time: formatTimeLabel(item.session.startsAt, lang) || '',
    title: item.session.title,
    room: item.session.room,
    dayKey: dayKeyOf(item.session.startsAt),
  }));

  // Conference insights — the sidebar dashboard
  const todayKey = new Date().toISOString().slice(0, 10);
  const statuses = [...myStatus.values()];
  const registeredIds = new Set(
    registrations
      .filter((r) => r.status === 'confirmed' || r.status === 'waitlisted')
      .map((r) => r.sessionId),
  );
  const registeredHours = activityVMs
    .filter((a) => registeredIds.has(a.id))
    .reduce((sum, a) => sum + (a.endMs ? (a.endMs - a.startMs) / 3600000 : 0), 0);
  const spanStart = activityVMs.length
    ? Math.min(...activityVMs.map((a) => a.startMs))
    : 0;
  const spanEnd = activityVMs.length
    ? Math.max(...activityVMs.map((a) => a.endMs ?? a.startMs))
    : 0;
  const next = activityVMs
    .filter((a) => registeredIds.has(a.id) && a.startMs > now)
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
        ? Math.max(0, Math.min(100, Math.round(((now - spanStart) / (spanEnd - spanStart)) * 100)))
        : 0,
    hoursRegistered: Math.round(registeredHours * 10) / 10,
    next: next
      ? {
          id: next.id,
          title: next.title,
          time: next.time ?? '',
          room: next.room,
          dayKey: next.dayKey,
        }
      : undefined,
  };

  return (
    <ProgramExperience
      locale={lang}
      slug={slug ?? ''}
      title={event?.title ?? (lang === 'he' ? 'תוכנית הכנס' : 'Conference program')}
      activities={activityVMs}
      days={days}
      filters={filters}
      schedule={schedule}
      insights={insights}
      notice={notice ?? null}
      initialActivityId={activity ?? null}
    />
  );
};

export default ProgramPage;
