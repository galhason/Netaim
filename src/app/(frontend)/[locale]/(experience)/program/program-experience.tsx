'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import type { Locale } from '@/config/locales';
import {
  ActivityCard,
  ActivityDrawer,
  DayTabs,
  EmptyState,
  FilterChips,
  InsightsCard,
  MyScheduleWidget,
  SearchBar,
  ToastProvider,
  type ActivityFilterVM,
  type ActivityVM,
  type DayVM,
  type ProgramInsights,
  type ScheduleItemVM,
} from '@/features/conference';
import { registerActivityAction, leaveActivityAction } from './actions';

interface Props {
  locale: Locale;
  slug: string;
  title: string;
  activities: ActivityVM[];
  days: DayVM[];
  filters: ActivityFilterVM[];
  schedule: ScheduleItemVM[];
  insights: ProgramInsights;
  notice: string | null;
  initialActivityId?: string | null;
}

const COPY = {
  eyebrow: { he: 'התוכנית', en: 'The program' },
  sub: {
    he: 'כל ההרצאות, הסדנאות, המליאות והסיורים. בנו את הלוח האישי שלכם.',
    en: 'Every lecture, workshop, keynote and tour. Build your personal schedule.',
  },
  search: {
    he: 'חיפוש פעילות, דובר או נושא…',
    en: 'Search activities, speakers or topics…',
  },
  mySchedule: { he: 'הלוח שלי', en: 'My schedule' },
  emptyTitle: { he: 'אין פעילויות תואמות', en: 'No matching activities' },
  emptyHint: {
    he: 'נסו לשנות את היום, המסננים או מונח החיפוש.',
    en: 'Try another day, filter or search term.',
  },
  soon: {
    he: 'התוכנית תתעדכן בקרוב.',
    en: 'The program will be published soon.',
  },
  conflict: {
    he: 'כבר נרשמת לפעילות אחרת באותו זמן.',
    en: 'You’re already registered for another activity at this time.',
  },
  full: {
    he: 'הפעילות התמלאה. נסו פעילות אחרת או הצטרפו לרשימת המתנה.',
    en: 'That activity just filled up. Try another or join the waiting list.',
  },
  live: { he: 'עכשיו', en: 'Now' },
};

const LiveMarker = ({ he }: { he: boolean }) => (
  <li className="relative grid grid-cols-[46px_18px_1fr] items-center gap-2 sm:grid-cols-[54px_18px_1fr] sm:gap-3">
    <span className="text-end text-[11px] font-bold uppercase tracking-wide text-[var(--x-live)]">
      {he ? 'עכשיו' : 'Now'}
    </span>
    <span className="relative flex justify-center">
      <span className="x-live-dot size-3 rounded-full bg-[var(--x-live)] ring-4 ring-[var(--x-bg)]" />
    </span>
    <span className="h-px w-full bg-[color-mix(in_srgb,var(--x-live)_55%,transparent)]" />
  </li>
);

const ProgramExperience = ({
  locale,
  slug,
  title,
  activities,
  days,
  filters,
  schedule,
  insights,
  notice,
  initialActivityId,
}: Props) => {
  const he = locale === 'he';
  const deepLinked = initialActivityId
    ? activities.find((a) => a.id === initialActivityId)
    : undefined;
  const [activeDay, setActiveDay] = useState(
    deepLinked?.dayKey ?? days[0]?.key ?? '',
  );
  const [filter, setFilter] = useState<string>('all');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(
    initialActivityId ?? null,
  );

  const dayActivities = useMemo(() => {
    const q = query.trim().toLowerCase();
    return activities
      .filter((a) => a.dayKey === activeDay)
      .filter((a) => filter === 'all' || a.type === filter)
      .filter((a) => {
        if (q === '') return true;
        return (
          a.title.toLowerCase().includes(q) ||
          (a.description ?? '').toLowerCase().includes(q) ||
          (a.room ?? '').toLowerCase().includes(q) ||
          a.typeLabel.toLowerCase().includes(q) ||
          a.speakers.some((s) => s.name.toLowerCase().includes(q))
        );
      });
  }, [activities, activeDay, filter, query]);

  const selected = useMemo(
    () => activities.find((a) => a.id === selectedId) ?? null,
    [activities, selectedId],
  );

  /* Related: same day, sharing a type or a speaker, nearest in time. */
  const related = useMemo(() => {
    if (!selected) return [];
    const speakerIds = new Set(selected.speakers.map((s) => s.id));
    return activities
      .filter(
        (a) =>
          a.id !== selected.id &&
          a.type !== 'break' &&
          (a.type === selected.type ||
            a.speakers.some((s) => speakerIds.has(s.id))),
      )
      .sort(
        (a, b) =>
          Math.abs(a.startMs - selected.startMs) -
          Math.abs(b.startMs - selected.startMs),
      )
      .slice(0, 3);
  }, [activities, selected]);

  /* The live marker — future-ready: glides to the current time when the
   * day being browsed is under way. Ticks each minute; still under
   * reduced motion (only the dot's pulse is animated, guarded in CSS). */
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);
  const liveBefore = useMemo(() => {
    if (dayActivities.length === 0) return -2;
    const first = dayActivities[0]!.startMs;
    const last = Math.max(...dayActivities.map((a) => a.endMs ?? a.startMs));
    if (nowMs < first - 1800000 || nowMs > last + 1800000) return -2;
    const idx = dayActivities.findIndex((a) => a.startMs > nowMs);
    return idx; // -1 → after all starts (still live), else before idx
  }, [dayActivities, nowMs]);

  const jump = (dayKey: string, id: string) => {
    setActiveDay(dayKey);
    setQuery('');
    setFilter('all');
    setSelectedId(id);
  };

  const noticeText =
    notice === 'conflict'
      ? COPY.conflict[locale]
      : notice === 'full'
        ? COPY.full[locale]
        : null;

  return (
    <main className="experience min-h-dvh bg-[var(--x-bg)]">
      <ToastProvider
        initial={noticeText ? { message: noticeText, tone: 'warn' } : undefined}
      >
      {/* Compact hero — navigation, not marketing */}
      <header className="relative overflow-hidden border-b border-[var(--x-line)]">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(120%_120%_at_50%_-20%,#eeeffb_0%,#f6f7fb_55%,var(--x-bg)_100%)]"
        />
        <div className="relative mx-auto max-w-6xl px-6 pb-7 pt-10 text-center md:px-10 md:pt-12">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--x-primary)]">
            {COPY.eyebrow[locale]}
          </p>
          <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight text-[var(--x-ink)] md:text-5xl">
            {title}
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-[15px] text-[var(--x-soft)] md:text-base">
            {COPY.sub[locale]}
          </p>
          <div className="mx-auto mt-6 flex max-w-2xl flex-col items-stretch gap-3 sm:flex-row">
            <div className="flex-1">
              <SearchBar
                value={query}
                onChange={setQuery}
                placeholder={COPY.search[locale]}
              />
            </div>
            <a
              href={`/${locale}/events/${slug}/my-activities`}
              className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-[var(--x-r-pill)] border border-[var(--x-line)] bg-[var(--x-surface)] px-6 text-sm font-medium text-[var(--x-primary)] shadow-[var(--x-shadow)] transition-colors hover:bg-[var(--x-primary-wash)]"
            >
              {COPY.mySchedule[locale]}
            </a>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-8 md:px-10 md:py-10">
        {days.length === 0 ? (
          <EmptyState title={COPY.soon[locale]} />
        ) : (
          <>
            {/* Day + filter controls */}
            <div className="flex flex-col gap-4">
              {days.length > 1 ? (
                <DayTabs
                  days={days}
                  active={activeDay}
                  onSelect={setActiveDay}
                  dayWord={he ? 'יום' : 'Day'}
                />
              ) : null}
              <FilterChips filters={filters} active={filter} onSelect={setFilter} />
            </div>

            <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_336px]">
              {/* Timeline */}
              <div>
                {dayActivities.length === 0 ? (
                  <EmptyState
                    title={COPY.emptyTitle[locale]}
                    hint={COPY.emptyHint[locale]}
                  />
                ) : (
                  <ol className="relative flex flex-col gap-4">
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute bottom-3 top-3 start-[54px] w-px bg-[var(--x-line-strong)] sm:start-[62px]"
                    />
                    {dayActivities.map((activity, i) => (
                      <Fragment key={activity.id}>
                        {i === liveBefore ? <LiveMarker he={he} /> : null}
                      <li
                        className="relative grid grid-cols-[46px_18px_1fr] items-start gap-2 sm:grid-cols-[54px_18px_1fr] sm:gap-3"
                      >
                        <span className="pt-4 text-end text-sm font-semibold tabular-nums text-[var(--x-ink)]">
                          {activity.time}
                        </span>
                        <span className="relative flex justify-center pt-[22px]">
                          <span
                            className={`size-2.5 rounded-full ring-4 ring-[var(--x-bg)] ${
                              activity.registration === 'registered'
                                ? 'bg-[var(--x-ok)]'
                                : 'bg-[var(--x-primary)]'
                            }`}
                          />
                        </span>
                        <ActivityCard
                          activity={activity}
                          locale={locale}
                          slug={slug}
                          onOpen={setSelectedId}
                          registerAction={registerActivityAction}
                          leaveAction={leaveActivityAction}
                          index={i}
                        />
                      </li>
                      </Fragment>
                    ))}
                    {liveBefore === -1 ? <LiveMarker he={he} /> : null}
                  </ol>
                )}
              </div>

              {/* Sidebar */}
              <aside className="flex flex-col gap-5 lg:sticky lg:top-24 lg:self-start">
                <InsightsCard insights={insights} locale={locale} />
                <MyScheduleWidget
                  items={schedule}
                  insights={insights}
                  locale={locale}
                  onJump={jump}
                />
              </aside>
            </div>
          </>
        )}
      </div>

      <ActivityDrawer
        activity={selected}
        related={related}
        onOpenRelated={setSelectedId}
        locale={locale}
        slug={slug}
        onClose={() => setSelectedId(null)}
        registerAction={registerActivityAction}
        leaveAction={leaveActivityAction}
      />
      </ToastProvider>
    </main>
  );
};

export default ProgramExperience;
