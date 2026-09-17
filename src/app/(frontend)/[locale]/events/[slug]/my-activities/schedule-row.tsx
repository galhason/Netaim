'use client';

import type { ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import type { Locale } from '@/config/locales';
import {
  IconArrow,
  IconBulb,
  IconCalendar,
  IconCoffee,
  IconCompass,
  IconMic,
  IconPin,
  IconUsers,
  IconWait,
  IconWarn,
} from '@/features/conference';
import type { SessionType } from '@/features/program';
import { t } from './copy';
import type { TimelineItem } from './timeline';

interface Props {
  item: TimelineItem;
  locale: Locale;
  slug: string;
  /* Where this row stands against the clock. */
  live: boolean;
  past: boolean;
  conflict: boolean;
  /*
   * Whether the participant holds a waiting-list place rather than a
   * seat. The activity's own `registration` cannot say this — it
   * describes the button the Program would offer, and a held place of
   * either kind reads as "registered" there.
   */
  waiting: boolean;
  onOpen: (id: string) => void;
  leaveAction: (formData: FormData) => void | Promise<void>;
  networkingHref: string;
}

/*
 * Each kind of activity has a shape of its own, so the timeline reads
 * at a glance and never by colour alone. The tile's tone follows the
 * pill the Program uses for the same type.
 */
const TYPE_ICON: Record<SessionType | 'networking', (cls: string) => ReactNode> = {
  keynote: (cls) => <IconCalendar className={cls} />,
  talk: (cls) => <IconMic className={cls} />,
  workshop: (cls) => <IconBulb className={cls} />,
  tour: (cls) => <IconCompass className={cls} />,
  break: (cls) => <IconCoffee className={cls} />,
  networking: (cls) => <IconUsers className={cls} />,
};

const TYPE_TONE: Record<SessionType | 'networking', string> = {
  keynote: 'bg-[var(--x-ok-wash)] text-[var(--x-ok)]',
  talk: 'bg-[var(--x-primary-wash)] text-[var(--x-primary-strong)]',
  workshop: 'bg-[var(--x-warn-wash)] text-[var(--x-warn)]',
  tour: 'bg-[var(--x-interactive-wash)] text-[var(--x-interactive)]',
  break: 'bg-[var(--x-mute-wash)] text-[var(--x-soft)]',
  networking: 'bg-[var(--x-interactive-wash)] text-[var(--x-interactive)]',
};

const Pill = ({ tone, children }: { tone: string; children: ReactNode }) => (
  <span
    className={`inline-flex shrink-0 items-center rounded-[var(--x-r-pill)] px-2.5 py-1 text-[11px] font-semibold ${tone}`}
  >
    {children}
  </span>
);

/*
 * The button that leaves. It is a form — the same server action the
 * Program uses — so the seat given up here is the seat the Program sees
 * given up. The label changes while the request is out, because a
 * button that looks idle while it is working gets pressed twice.
 */
const RemoveButton = ({ locale }: { locale: Locale }) => {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-[40px] items-center whitespace-nowrap rounded-[var(--x-r-pill)] px-3 text-[13px] font-medium text-[var(--x-soft)] transition-colors hover:bg-[var(--x-full-wash)] hover:text-[var(--x-full)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--x-ring)] disabled:opacity-60"
    >
      {pending ? t(locale, 'removing') : t(locale, 'remove')}
    </button>
  );
};

const detailsBtn =
  'inline-flex min-h-[40px] items-center gap-1.5 whitespace-nowrap rounded-[var(--x-r-pill)] border border-[var(--x-line)] bg-[var(--x-surface)] px-3 text-[13px] font-semibold sm:px-3.5 text-[var(--x-primary)] transition-colors hover:border-[var(--x-primary)]/40 hover:bg-[var(--x-primary-wash)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--x-ring)]';

/*
 * One row of the day.
 *
 * Compact on purpose: a participant scans a whole day standing in a
 * corridor, so each row says what, where and who in two lines, and keeps
 * its two actions at the foot. The row is not itself a button — the
 * details button is, which keeps the remove form and the link out of
 * each other's way for a screen reader and a thumb alike.
 */
const ScheduleRow = ({
  item,
  locale,
  slug,
  live,
  past,
  conflict,
  waiting,
  onOpen,
  leaveAction,
  networkingHref,
}: Props) => {
  const frame = `relative rounded-[var(--x-r-card)] border bg-[var(--x-surface)] transition-[box-shadow,border-color] ${
    live
      ? 'border-[var(--x-primary)]/50 shadow-[0_0_0_3px_var(--x-primary-wash),var(--x-shadow)]'
      : conflict
        ? 'border-[var(--x-warn)]/50 shadow-[var(--x-shadow)]'
        : 'border-[var(--x-line)] shadow-[var(--x-shadow)] hover:border-[var(--x-line-strong)]'
  } ${past ? 'opacity-70' : ''}`;

  const chips = (
    <>
      {live ? (
        <Pill tone="bg-[var(--x-primary)] text-white">
          <span aria-hidden="true" className="me-1.5 size-1.5 rounded-full bg-white x-live-dot" />
          {t(locale, 'live')}
        </Pill>
      ) : null}
      {past && !live ? (
        <Pill tone="bg-[var(--x-mute-wash)] text-[var(--x-soft)]">{t(locale, 'ended')}</Pill>
      ) : null}
      {conflict ? (
        <Pill tone="bg-[var(--x-warn-wash)] text-[var(--x-warn)]">
          <IconWarn className="me-1 size-3.5" />
          {t(locale, 'conflictTitle')}
        </Pill>
      ) : null}
    </>
  );

  /* ---- a meeting ---- */
  if (item.kind === 'meeting') {
    const { meeting } = item;
    return (
      <article className={frame} aria-label={meeting.title}>
        <div className="flex items-start gap-3 p-3.5 sm:gap-3.5 sm:p-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="text-[13px] font-semibold tabular-nums text-[var(--x-soft)]" dir="ltr">
                {meeting.time}–{meeting.endTime}
              </span>
              <Pill tone={TYPE_TONE.networking}>{t(locale, 'networking')}</Pill>
              {chips}
            </div>
            <h3 className="mt-1 font-display text-[16px] font-bold leading-snug tracking-tight text-[var(--x-ink)]">
              {meeting.title}
            </h3>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[13px] text-[var(--x-soft)]">
              <span className="inline-flex items-center gap-1.5">
                <IconUsers className="size-3.5 text-[var(--x-faint)]" />
                {meeting.withName}
              </span>
              {meeting.location ? (
                <span className="inline-flex items-center gap-1.5">
                  <IconPin className="size-3.5 text-[var(--x-faint)]" />
                  {meeting.location}
                </span>
              ) : null}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <a href={networkingHref} className={detailsBtn}>
                {t(locale, 'toNetworking')}
                <IconArrow className="size-4 rtl:rotate-180" />
              </a>
            </div>
          </div>
          <span className={`grid size-9 shrink-0 place-items-center rounded-[10px] sm:size-11 sm:rounded-[12px] ${TYPE_TONE.networking}`}>
            {TYPE_ICON.networking('size-5')}
          </span>
        </div>
      </article>
    );
  }

  const { activity } = item;

  /* ---- a break: a quiet line, not a card ---- */
  if (activity.type === 'break') {
    return (
      <div className="flex items-center gap-3 rounded-[var(--x-r-card)] border border-dashed border-[var(--x-line-strong)] bg-[var(--x-raise)] px-4 py-3">
        <span className={`grid size-9 shrink-0 place-items-center rounded-[10px] ${TYPE_TONE.break}`}>
          {TYPE_ICON.break('size-4')}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-medium text-[var(--x-ink)]">
            {activity.title}
          </span>
          <span className="block text-[12px] text-[var(--x-soft)]">
            <span dir="ltr">
              {activity.time}
              {activity.endTime ? `–${activity.endTime}` : ''}
            </span>
            {activity.room ? ` · ${activity.room}` : ''}
          </span>
        </span>
      </div>
    );
  }

  const speakers = activity.speakers.map((s) => s.name).join(', ');
  const place = [activity.room, activity.floor].filter(Boolean).join(' · ');
  const held = activity.registration === 'registered';

  return (
    <article className={frame} aria-label={activity.title}>
      <div className="flex items-start gap-3 p-3.5 sm:gap-3.5 sm:p-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-[13px] font-semibold tabular-nums text-[var(--x-soft)]" dir="ltr">
              {activity.time}
              {activity.endTime ? `–${activity.endTime}` : ''}
            </span>
            <Pill tone={TYPE_TONE[activity.type]}>{activity.typeLabel}</Pill>
            {waiting ? (
              <Pill tone="bg-[var(--x-wait-wash)] text-[var(--x-wait)]">
                <IconWait className="me-1 size-3.5" />
                {t(locale, 'onWaitlist')}
              </Pill>
            ) : null}
            {chips}
          </div>
          <h3 className="mt-1 font-display text-[16px] font-bold leading-snug tracking-tight text-[var(--x-ink)]">
            {activity.title}
          </h3>
          {place || speakers ? (
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[13px] text-[var(--x-soft)]">
              {place ? (
                <span className="inline-flex items-center gap-1.5">
                  <IconPin className="size-3.5 text-[var(--x-faint)]" />
                  {place}
                </span>
              ) : null}
              {speakers ? (
                <span className="inline-flex min-w-0 items-center gap-1.5">
                  <IconUsers className="size-3.5 shrink-0 text-[var(--x-faint)]" />
                  <span className="truncate">{speakers}</span>
                </span>
              ) : null}
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => onOpen(activity.id)} className={detailsBtn}>
              {t(locale, 'viewActivity')}
              <IconArrow className="size-4 rtl:rotate-180" />
            </button>
            {held && !past ? (
              <form action={leaveAction}>
                <input type="hidden" name="slug" value={slug} />
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="sessionId" value={activity.id} />
                <RemoveButton locale={locale} />
              </form>
            ) : null}
          </div>
        </div>
        <span className={`grid size-9 shrink-0 place-items-center rounded-[10px] sm:size-11 sm:rounded-[12px] ${TYPE_TONE[activity.type]}`}>
          {TYPE_ICON[activity.type]('size-5')}
        </span>
      </div>
    </article>
  );
};

export default ScheduleRow;
