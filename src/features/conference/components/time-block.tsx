'use client';

import type { Locale } from '@/config/locales';
import type { SessionType } from '@/features/program';
import type { TimeBlockVM } from '../types';
import { surface } from '../ui/kit';
import { IconChevronDown, IconClock, IconPin, IconUsers } from '../ui/icons';
import ActivityCard from './activity-card';
import ActivityTile from './activity-tile';
import { BandHosts, BandIcon } from './activity-band';

/*
 * From this many activities at once, an hour is "dense": it gets a
 * header that folds, and only the day's first dense hour starts open.
 * Fewer stand in the open with a plain header — no click for a choice
 * of two. One number, here and nowhere else.
 */
export const DENSE_SLOT_THRESHOLD = 4;

/*
 * Tours fold sooner: three tours leaving at the same hour are already a
 * choice between routes, and read better side by side than as three
 * long rows. Counted on the tours alone, so two tours and a seminar
 * stay a plain list.
 */
export const TOUR_GROUP_THRESHOLD = 3;

export const isDense = (block: TimeBlockVM): boolean =>
  !block.isPlain &&
  (block.activities.length >= DENSE_SLOT_THRESHOLD ||
    block.activities.filter((activity) => activity.type === 'tour').length >= TOUR_GROUP_THRESHOLD);

interface Props {
  block: TimeBlockVM;
  locale: Locale;
  slug: string;
  open: boolean;
  onToggle: (key: string) => void;
  onOpen: (id: string) => void;
  registerAction: (formData: FormData) => void | Promise<void>;
  leaveAction: (formData: FormData) => void | Promise<void>;
  /* The hour under way, or just passed, as the clock says. */
  state?: 'past' | 'live' | 'upcoming';
}

const COPY = {
  activities: { he: 'פעילויות', en: 'activities' },
  one: { he: 'פעילות אחת', en: 'One activity' },
  choose: { he: 'לבחירה', en: 'to choose from' },
  chooseOne: { he: 'בחרו פעילות אחת לשעה זו', en: 'Choose one for this hour' },
  heldOne: { he: 'נרשמת לפעילות אחת בשעה זו', en: 'You hold one place this hour' },
  heldMany: { he: 'נרשמת ל־{n} פעילויות בשעה זו', en: 'You hold {n} places this hour' },
  live: { he: 'עכשיו', en: 'Now' },
  past: { he: 'הסתיים', en: 'Ended' },
  show: { he: 'הצגת הפעילויות', en: 'Show the activities' },
  hide: { he: 'הסתרת הפעילויות', en: 'Hide the activities' },
};

/* The kinds in the plural — "הרצאות, סדנאות וסיורים", "Talks, seminars and tours". */
const PLURAL: Record<SessionType, Record<Locale, string>> = {
  keynote: { he: 'מליאות', en: 'keynotes' },
  talk: { he: 'הרצאות', en: 'talks' },
  workshop: { he: 'סדנאות', en: 'seminars' },
  tour: { he: 'סיורים', en: 'tours' },
  break: { he: 'הפסקות', en: 'breaks' },
  gathering: { he: 'פאנלים', en: 'panels' },
};

/*
 * "הרצאות, סדנאות וסיורים לבחירה" — the kinds in the hour, joined the
 * way the language joins a short list.
 */
const kindsLine = (kinds: SessionType[], locale: Locale): string => {
  const words = kinds.map((kind) => PLURAL[kind]?.[locale] ?? kind);
  if (words.length === 0) return '';
  const line =
    words.length === 1
      ? words[0]!
      : `${words.slice(0, -1).join(', ')}${locale === 'he' ? ' ו' : ' and '}${words[words.length - 1]}`;
  return locale === 'he' ? line : line.charAt(0).toUpperCase() + line.slice(1);
};

/*
 * One hour of the programme, as the approved design draws it: a header
 * that says the time and how many choices there are, and under it the
 * activities side by side. The header folds the hour away and back; it
 * starts open — a programme that hides its activities is not a
 * programme — and the page decides, by the clock, which hours start
 * folded because they have already passed.
 */
const TimeBlock = ({ block, locale, slug, open, onToggle, onOpen, registerAction, leaveAction, state = 'upcoming' }: Props) => {
  const count = block.activities.length;
  const range = block.endTime ? `${block.time} – ${block.endTime}` : block.time;
  const panelId = `block-${block.key.replace(/[^a-z0-9]/gi, '-')}`;

  /*
   * A band: a break, or a gathering the whole conference attends. One
   * line across the hour — the time, the name, where — with nothing to
   * press, because there is nothing to choose and no seat to take.
   */
  if (block.isPlain) {
    const first = block.activities[0]!;
    const gathering = first.type === 'gathering';
    const speakers = block.activities.flatMap((a) => a.speakers);
    return (
      <section
        className={`${surface} flex flex-wrap items-center gap-x-4 gap-y-2 border px-4 py-4 sm:flex-nowrap sm:px-5 ${
          gathering
            ? 'border-[var(--x-primary)]/30 bg-[var(--x-primary-wash)]/40'
            : 'border-[var(--x-line)] bg-[var(--x-raise)]'
        }`}
        aria-label={`${range} · ${first.title}`}
      >
        <span className="grid size-9 flex-none place-items-center rounded-full bg-[var(--x-primary-wash)] text-[var(--x-primary)]">
          <BandIcon type={first.type} className="size-4" />
        </span>
        <span className="flex-none text-start">
          <span className="block whitespace-nowrap font-display text-base font-bold tabular-nums text-[var(--x-ink)]" dir="ltr">
            {range}
          </span>
          <span className="block text-[11px] text-[var(--x-soft)]">{first.dateShort}</span>
        </span>
        <span className="min-w-0 basis-full sm:basis-0 sm:flex-1">
          <span className={`line-clamp-3 break-words text-[var(--x-ink)] sm:line-clamp-2 ${gathering ? 'font-display text-base font-bold leading-snug' : 'text-sm font-medium'}`}>
            {block.activities.map((a) => a.title).join(' · ')}
          </span>
          {first.description ? (
            <span className="line-clamp-2 break-words text-xs text-[var(--x-soft)]">{first.description}</span>
          ) : null}
          {/* Who leads it and where — one quiet line, like the date beside the hour. */}
          {speakers.length > 0 || first.place ? (
            <span className="mt-1 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-[var(--x-soft)]">
              <BandHosts speakers={speakers} />
              {first.place ? (
                <span className="inline-flex min-w-0 items-center gap-1.5">
                  <IconPin className="size-3.5 flex-none text-[var(--x-faint)]" />
                  <span className="truncate">{first.place}</span>
                </span>
              ) : null}
            </span>
          ) : null}
        </span>
      </section>
    );
  }

  const dense = isDense(block);

  /*
   * A sparse hour — one to three choices — is simply part of the list,
   * drawn as the agenda always drew it: the time at the side, a dot on
   * the day's line, and one wide card per activity, one under the
   * other. No container, no control. Two at the same hour share the
   * same time label, so a reader still sees they are a choice.
   */
  if (!dense) {
    return (
      <ol className="relative flex flex-col gap-4" aria-label={range}>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-3 top-3 start-[54px] w-px bg-[var(--x-line-strong)] sm:start-[62px]"
        />
        {block.activities.map((activity, index) => (
          <li
            key={activity.id}
            className="relative grid grid-cols-[46px_18px_minmax(0,1fr)] items-start gap-2 sm:grid-cols-[54px_18px_minmax(0,1fr)] sm:gap-3"
          >
            <span className="pt-4 text-end text-sm font-semibold tabular-nums text-[var(--x-ink)]">
              {index === 0 ? <span dir="ltr">{activity.time}</span> : ''}
              {index === 0 ? (
                <span className="mt-0.5 block text-[11px] font-medium text-[var(--x-soft)]">{activity.dateShort}</span>
              ) : null}
              {index === 0 && state === 'live' ? (
                <span className="mt-1 block text-[10px] font-bold uppercase tracking-wide text-[var(--x-live)]">
                  {COPY.live[locale]}
                </span>
              ) : null}
            </span>
            <span className="relative flex justify-center pt-[22px]">
              <span
                className={`size-2.5 rounded-full ring-4 ring-[var(--x-bg)] ${
                  activity.registration === 'registered' ? 'bg-[var(--x-ok)]' : 'bg-[var(--x-primary)]'
                }`}
              />
            </span>
            <ActivityCard
              activity={activity}
              locale={locale}
              slug={slug}
              onOpen={onOpen}
              registerAction={registerAction}
              leaveAction={leaveAction}
              index={index}
              rich
            />
          </li>
        ))}
      </ol>
    );
  }

  const shown = open;
  /*
   * "6 סדנאות" when the hour is all of one kind, "6 פעילויות" when it
   * mixes; the line under it names the mix, or asks for one choice.
   */
  const headline =
    count === 1
      ? COPY.one[locale]
      : `${count} ${block.kinds.length === 1 ? PLURAL[block.kinds[0]!]?.[locale] ?? COPY.activities[locale] : COPY.activities[locale]}`;
  const subline =
    block.kinds.length > 1 ? `${kindsLine(block.kinds, locale)} ${COPY.choose[locale]}` : COPY.chooseOne[locale];
  const held =
    block.registeredCount === 0
      ? ''
      : block.registeredCount === 1
        ? COPY.heldOne[locale]
        : COPY.heldMany[locale].replace('{n}', String(block.registeredCount));

  return (
    <section
      className={`${surface} border transition-colors ${
        state === 'live' ? 'border-[var(--x-live)]/50' : 'border-[var(--x-line)]'
      } ${open ? '' : 'bg-[var(--x-surface)]'}`}
      aria-label={range}
    >
      <h2 className="m-0">
        <button
          type="button"
          onClick={() => onToggle(block.key)}
          aria-expanded={shown}
          aria-controls={panelId}
          aria-label={shown ? COPY.hide[locale] : COPY.show[locale]}
          className={`flex w-full flex-wrap items-center gap-x-4 gap-y-2 rounded-[var(--x-r-card)] px-4 py-4 text-start outline-none focus-visible:ring-2 focus-visible:ring-[var(--x-primary)] sm:flex-nowrap sm:px-5 ${
            shown ? 'rounded-b-none border-b border-[var(--x-line)] bg-[var(--x-primary-wash)]/50' : 'bg-[var(--x-surface)]'
          }`}
        >
          {/* The same line as a band: the icon, the hour and its day at the start, then the words, then the control. */}
          <span className="grid size-9 flex-none place-items-center rounded-full bg-[var(--x-primary-wash)] text-[var(--x-primary)]">
            {held ? <IconUsers className="size-4 text-[var(--x-ok)]" /> : <IconClock className="size-4" />}
          </span>
          <span className="flex-none text-start">
            <span className="block whitespace-nowrap font-display text-base font-bold tabular-nums text-[var(--x-ink)]" dir="ltr">
              {range}
            </span>
            <span className="block text-[11px] text-[var(--x-soft)]">{block.activities[0]?.dateShort}</span>
          </span>
          {/* On a phone the words take a line of their own under the hour; wider, they sit beside it. */}
          <span className="order-last min-w-0 basis-full sm:order-none sm:basis-0 sm:flex-1">
            <span className="line-clamp-2 font-display text-base font-bold leading-snug text-[var(--x-ink)]">
              {headline}
            </span>
            <span className="line-clamp-2 text-xs text-[var(--x-soft)]">
              {held || subline}
            </span>
          </span>
          {state === 'live' ? (
            <span className="inline-flex flex-none items-center gap-1.5 rounded-[var(--x-r-pill)] bg-[var(--x-live)]/12 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-[var(--x-live)]">
              <span className="x-live-dot size-2 rounded-full bg-[var(--x-live)]" />
              {COPY.live[locale]}
            </span>
          ) : state === 'past' ? (
            <span className="flex-none rounded-[var(--x-r-pill)] bg-[var(--x-raise)] px-2.5 py-1 text-[11px] font-semibold text-[var(--x-faint)]">
              {COPY.past[locale]}
            </span>
          ) : null}
          <span className="ms-auto grid size-9 flex-none place-items-center rounded-xl bg-[var(--x-surface)] text-[var(--x-primary)] shadow-[var(--x-shadow)] sm:ms-0">
            <IconChevronDown
              className={`size-4 transition-transform duration-300 ${shown ? 'rotate-180' : ''}`}
            />
          </span>
        </button>
      </h2>
      <div id={panelId} hidden={!shown} className="p-4 md:p-5">
        <ul className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {block.activities.map((activity, index) => (
            <li key={activity.id} className="min-w-0">
              <ActivityTile
                activity={activity}
                locale={locale}
                slug={slug}
                onOpen={onOpen}
                registerAction={registerAction}
                leaveAction={leaveAction}
                index={index}
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

export default TimeBlock;
