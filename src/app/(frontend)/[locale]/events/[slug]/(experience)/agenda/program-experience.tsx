'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Locale } from '@/config/locales';
import {
  ActivityDrawer,
  isDense,
  DayTabs,
  EmptyState,
  FilterChips,
  MyPlanCard,
  SearchBar,
  TimeBlock,
  ToastProvider,
  timeBlocksOf,
  type ActivityFilterVM,
  type ActivityVM,
  type DayVM,
  type ProgramInsights,
  type ScheduleItemVM,
} from '@/features/conference';
import { isPlainSession } from '@/features/program/types/session';
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
  /* The activity a press was made on: its day opens, the drawer does not. */
  focusActivityId?: string | null;
}

const COPY = {
  heading: { he: 'התוכנייה', en: 'The Programme' },
  sub: {
    he: 'הרצאות, סדנאות, מפגשים ופעילויות לאורך ימי הכנס. בנו את הלוח האישי שלכם.',
    en: 'Talks, seminars, meetings and activities across the conference days. Build your personal schedule.',
  },
  expandAll: { he: 'פתיחת כל השעות', en: 'Open every hour' },
  collapseAll: { he: 'קיפול כל השעות', en: 'Fold every hour' },
  myPlan: { he: 'הלוח שלי', en: 'My schedule' },
  oneActivity: { he: 'פעילות', en: 'activity' },
  activities: { he: 'פעילויות', en: 'activities' },
  nextAt: { he: 'הבאה ב־', en: 'next at' },
  open: { he: 'פתיחה', en: 'Open' },
  close: { he: 'סגירה', en: 'Close' },
  search: {
    he: 'חיפוש פעילות, דובר או נושא…',
    en: 'Search activities, speakers or topics…',
  },
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
  notYet: {
    he: 'ההרשמה לפעילות הזו עדיין לא נפתחה.',
    en: 'Registration for this activity has not opened yet.',
  },
  closed: {
    he: 'ההרשמה לפעילות הזו נסגרה.',
    en: 'Registration for this activity has closed.',
  },
  noCancel: {
    he: 'לא ניתן עוד לבטל את ההרשמה לפעילות הזו.',
    en: 'This registration can no longer be cancelled.',
  },
  live: { he: 'עכשיו', en: 'Now' },
};

/*
 * Which hours the reader opened or folded, remembered for the visit —
 * a reader who opened the afternoon to look finds it open when they
 * come back from the drawer. Per conference; never sent anywhere.
 */
const CHOICES_KEY = (slug: string) => `nt-programme-hours:${slug}`;

const readChoices = (slug: string): Map<string, boolean> => {
  try {
    const raw = window.sessionStorage.getItem(CHOICES_KEY(slug));
    return new Map(raw ? (JSON.parse(raw) as [string, boolean][]) : []);
  } catch {
    return new Map();
  }
};

const writeChoices = (slug: string, choices: Map<string, boolean>) => {
  try {
    window.sessionStorage.setItem(CHOICES_KEY(slug), JSON.stringify([...choices]));
  } catch {
    /* A private window, or storage refused: the choice simply lasts the page. */
  }
};


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
  focusActivityId,
}: Props) => {
  const deepLinked = initialActivityId
    ? activities.find((a) => a.id === initialActivityId)
    : undefined;
  const focusedOn = focusActivityId
    ? activities.find((a) => a.id === focusActivityId)
    : undefined;
  const [activeDay, setActiveDay] = useState(
    deepLinked?.dayKey ?? focusedOn?.dayKey ?? days[0]?.key ?? '',
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
          (a.place ?? '').toLowerCase().includes(q) ||
          a.typeLabel.toLowerCase().includes(q) ||
          a.speakers.some((s) => s.name.toLowerCase().includes(q))
        );
      });
  }, [activities, activeDay, filter, query]);

  const blocks = useMemo(() => timeBlocksOf(dayActivities), [dayActivities]);

  /* The sidebar's facts: today's held places, the next one, and whether any two collide. */
  const daySchedule = useMemo(() => {
    const today = schedule.filter((item) => item.dayKey === activeDay);
    return today.length > 0 ? today : schedule;
  }, [schedule, activeDay]);
  const nextActivity = useMemo(
    () => (insights.next ? activities.find((a) => a.id === insights.next!.id) : undefined),
    [activities, insights.next],
  );
  const conflicts = useMemo(() => {
    const held = activities
      .filter((a) => a.registration === 'registered')
      .sort((a, b) => a.startMs - b.startMs);
    let count = 0;
    for (let i = 0; i < held.length; i += 1) {
      for (let j = i + 1; j < held.length; j += 1) {
        const a = held[i]!;
        const b = held[j]!;
        if (b.startMs >= (a.endMs ?? a.startMs)) break;
        count += 1;
      }
    }
    return count;
  }, [activities]);

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
          !isPlainSession(a.type) &&
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

  /*
   * Which hours stand open. A sparse hour is always open (its header
   * is not a control). Of the dense hours, the day's first that has
   * not yet ended starts open and the rest start folded — the approved
   * design — so a busy day reads as a short list of hours with the
   * next choice already in view. The clock, ticking each minute, also
   * says which hour is under way (marked "now") and which have passed.
   * A reader's own fold or unfold wins over the default and is kept for
   * the visit; choosing another day starts that day from its default.
   */
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);
  const stateOf = useCallback(
    (block: { startMs: number; endMs: number }): 'past' | 'live' | 'upcoming' =>
      nowMs >= block.endMs ? 'past' : nowMs >= block.startMs ? 'live' : 'upcoming',
    [nowMs],
  );

  const firstDenseKey = useMemo(() => {
    const dense = blocks.filter(isDense);
    const ahead = dense.find((b) => stateOf(b) !== 'past');
    return (ahead ?? dense[0])?.key;
  }, [blocks, stateOf]);

  const [chosen, setChosen] = useState<Map<string, boolean>>(() => new Map());
  useEffect(() => {
    const kept = readChoices(slug);
    if (kept.size > 0) setChosen(kept);
  }, [slug]);
  const isOpen = (block: { key: string }): boolean => {
    const own = chosen.get(block.key);
    if (own !== undefined) return own;
    return block.key === firstDenseKey;
  };
  const remember = (next: Map<string, boolean>) => {
    writeChoices(slug, next);
    return next;
  };
  const toggle = (key: string) => {
    setChosen((prev) => {
      const block = blocks.find((b) => b.key === key);
      const next = new Map(prev);
      next.set(key, !(block ? isOpen(block) : true));
      return remember(next);
    });
  };
  const setAll = (open: boolean) =>
    setChosen((prev) => {
      const next = new Map(prev);
      blocks.filter(isDense).forEach((b) => next.set(b.key, open));
      return remember(next);
    });
  const anyFolded = blocks.some((b) => isDense(b) && !isOpen(b));
  const anyDense = blocks.some(isDense);

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
        : notice === 'notYet'
          ? COPY.notYet[locale]
          : notice === 'closed'
            ? COPY.closed[locale]
            : notice === 'noCancel'
              ? COPY.noCancel[locale]
              : null;

  return (
    /*
      * `experience--programme`: the agenda wears the organisation's
      * programme green rather than the platform's navy (globals.css). It
      * reaches everything inside, the drawer included, because the drawer
      * renders in place rather than through a portal.
      */
    <main id="main-content" className="experience experience--programme min-h-dvh bg-[var(--x-bg)] pb-20">
      <ToastProvider
        initial={noticeText ? { message: noticeText, tone: 'warn' } : undefined}
      >
      {/*
        * The head: the conference's name over "the programme". The days
        * are not up here at the far end of the row — they sit in the
        * toolbar, right above the hours they switch, where the hand
        * already is.
        */}
      <header className="px-5 pt-8 md:px-8 md:pt-10">
        <p className="text-sm font-semibold tracking-wide text-[var(--nt-orange)]">
          {title}
        </p>
        <h1 className="mt-1.5 font-display text-4xl font-extrabold tracking-tight text-[var(--x-primary)] md:text-5xl">
          {COPY.heading[locale]}
        </h1>
        <p className="mt-3 max-w-xl text-[15px] text-[var(--x-soft)] md:text-base">
          {COPY.sub[locale]}
        </p>
      </header>

      <div className="px-5 py-6 md:px-8 md:py-7">
        {days.length === 0 ? (
          <EmptyState title={COPY.soon[locale]} />
        ) : (
          <>
            {/* The toolbar: the days first, then search and the kinds — one row where it fits. */}
            <div className="flex flex-col gap-3 rounded-[var(--x-r-card)] border border-[var(--x-line)] bg-[var(--x-surface)] p-3 shadow-[var(--x-shadow)] md:flex-row md:flex-wrap md:items-center md:gap-4 md:p-3.5">
              {days.length > 1 ? (
                <div className="flex items-center gap-4 md:border-e md:border-[var(--x-line)] md:pe-4">
                  <DayTabs days={days} active={activeDay} onSelect={setActiveDay} />
                </div>
              ) : null}
              <div className="md:w-[380px] md:flex-none">
                <SearchBar
                  value={query}
                  onChange={setQuery}
                  placeholder={COPY.search[locale]}
                />
              </div>
              <FilterChips filters={filters} active={filter} onSelect={setFilter} />
            </div>

            {/*
              * On a phone the sidebar would push the whole day below
              * the fold, so there it is one line — how many places, the
              * next one — that opens into the same card.
              */}
            <details className="group mt-6 rounded-[var(--x-r-card)] border border-[var(--x-line)] bg-[var(--x-surface)] shadow-[var(--x-shadow)] lg:hidden">
              <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 text-sm [&::-webkit-details-marker]:hidden">
                <span className="font-display font-bold text-[var(--x-primary)]">{COPY.myPlan[locale]}</span>
                <span className="text-[var(--x-soft)]">
                  {insights.registeredCount} {insights.registeredCount === 1 ? COPY.oneActivity[locale] : COPY.activities[locale]}
                  {nextActivity?.time ? ` · ${COPY.nextAt[locale]} ${nextActivity.time}` : ''}
                </span>
                <span className="ms-auto text-xs font-semibold text-[var(--x-primary)] group-open:hidden">{COPY.open[locale]}</span>
                <span className="ms-auto hidden text-xs font-semibold text-[var(--x-primary)] group-open:inline">{COPY.close[locale]}</span>
              </summary>
              <div className="border-t border-[var(--x-line)]">
                <MyPlanCard
                  items={daySchedule}
                  insights={insights}
                  next={nextActivity}
                  conflicts={conflicts}
                  locale={locale}
                  slug={slug}
                  onJump={jump}
                />
              </div>
            </details>

            <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_316px]">
              {/* The day, hour by hour */}
              <div>
                {blocks.length === 0 ? (
                  <EmptyState
                    title={COPY.emptyTitle[locale]}
                    hint={COPY.emptyHint[locale]}
                  />
                ) : (
                  <>
                    {anyDense ? (
                      <div className="mb-3 flex justify-end">
                        <button
                          type="button"
                          onClick={() => setAll(anyFolded)}
                          className="text-xs font-semibold text-[var(--x-primary)] underline-offset-4 hover:underline"
                        >
                          {anyFolded ? COPY.expandAll[locale] : COPY.collapseAll[locale]}
                        </button>
                      </div>
                    ) : null}
                    <div className="flex flex-col gap-3">
                      {blocks.map((block) => (
                        <TimeBlock
                          key={block.key}
                          block={block}
                          locale={locale}
                          slug={slug}
                          open={isOpen(block)}
                          onToggle={toggle}
                          onOpen={setSelectedId}
                          registerAction={registerActivityAction}
                          leaveAction={leaveActivityAction}
                          state={stateOf(block)}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Sidebar */}
              <aside className="hidden lg:sticky lg:top-24 lg:block lg:self-start">
                <MyPlanCard
                  items={daySchedule}
                  insights={insights}
                  next={nextActivity}
                  conflicts={conflicts}
                  locale={locale}
                  slug={slug}
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
