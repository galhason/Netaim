import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import type { Locale } from '@/config/locales';
import { isSupportedLocale } from '@/config/locales';
import {
  LoungeCard,
  LoungeHeading,
  LoungeNote,
  LoungeSection,
  LoungeShell,
  loungeChip,
  loungeGhost,
} from '@/features/attendee';
import { currentParticipant } from '@/features/registration';
import { myActivities, type MyActivity } from '@/features/program';
import { formatLongDate, formatTimeLabel } from '@/shared';
import { leaveActivityAction } from './actions';

interface MyActivitiesPageProps {
  params: Promise<{ locale: string; slug: string }>;
}

const COPY = {
  eyebrow: { he: 'האזור האישי', en: 'Personal area' },
  title: { he: 'הפעילויות שלי', en: 'My activities' },
  sub: {
    he: 'כל ההרשמות שלכם במקום אחד — הקרובות, אלו שבהמתנה, ומה שכבר היה.',
    en: 'Every registration in one place — what’s ahead, what’s waiting, and what has passed.',
  },
  upcoming: { he: 'הקרובות', en: 'Upcoming' },
  waiting: { he: 'ברשימת המתנה', en: 'On the waiting list' },
  completed: { he: 'שהושלמו', en: 'Completed' },
  cancelled: { he: 'שבוטלו', en: 'Cancelled' },
  empty: {
    he: 'עדיין לא נרשמתם לפעילויות. בקרו בעמוד הסדנאות והסיורים כדי לבחור.',
    en: 'You haven’t registered for any activities yet. Visit the workshops & tours page to choose.',
  },
  leave: { he: 'לבטל הרשמה', en: 'Cancel' },
  browse: { he: 'לסדנאות ולסיורים', en: 'Workshops & tours' },
  back: { he: 'לאזור האישי', en: 'My space' },
  position: { he: 'מקום', en: 'Position' },
  inLine: { he: 'בתור', en: 'in line' },
} as const;

const STATUS_LABEL: Record<string, { he: string; en: string }> = {
  confirmed: { he: 'מקומך שמור', en: 'Seat confirmed' },
  attended: { he: 'נכחת', en: 'Attended' },
  waitlisted: { he: 'ברשימת המתנה', en: 'On the waiting list' },
  pending: { he: 'ממתין לאישור', en: 'Awaiting approval' },
  cancelled: { he: 'בוטל', en: 'Cancelled' },
  declined: { he: 'לא אושר', en: 'Not approved' },
  expired: { he: 'פג תוקף', en: 'Expired' },
  noShow: { he: 'לא הגעת', en: 'Missed' },
};

const whenLabel = (activity: MyActivity, locale: Locale): string => {
  const date = formatLongDate(activity.session.startsAt, locale);
  const time = formatTimeLabel(activity.session.startsAt, locale);
  if (date && time) return `${date} · ${time}`;
  return date || time;
};

const ActivityItem = ({
  activity,
  locale,
  slug,
  index,
  canLeave,
  muted,
}: {
  activity: MyActivity;
  locale: Locale;
  slug: string;
  index: number;
  canLeave?: boolean;
  muted?: boolean;
}) => {
  const when = whenLabel(activity, locale);
  const status = STATUS_LABEL[activity.status]?.[locale] ?? '';
  return (
    <LoungeCard delay={Math.min(index, 3) as 0 | 1 | 2 | 3}>
      <div className={`flex items-start gap-4 ${muted ? 'opacity-70' : ''}`}>
        <span className="min-w-0 flex-1">
          <span className="block font-display text-lg font-semibold leading-snug">
            {activity.session.title}
          </span>
          {when ? (
            <span className="mt-1 block text-sm tabular-nums text-[var(--l-soft)]">
              {when}
            </span>
          ) : null}
          {activity.session.room ? (
            <span className="block text-sm text-[var(--l-soft)]">
              {activity.session.room}
            </span>
          ) : null}
          <span className="mt-2.5 flex flex-wrap items-center gap-2">
            <span className={loungeChip}>{status}</span>
            {activity.category === 'waiting' && activity.waitlistPosition ? (
              <span className="text-xs tabular-nums text-[var(--l-soft)]">
                {COPY.position[locale]} {activity.waitlistPosition}{' '}
                {COPY.inLine[locale]}
              </span>
            ) : null}
          </span>
        </span>
        {canLeave ? (
          <form action={leaveActivityAction} className="flex-none">
            <input type="hidden" name="slug" value={slug} />
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="sessionId" value={activity.session.id} />
            <button type="submit" className={loungeGhost}>
              {COPY.leave[locale]}
            </button>
          </form>
        ) : null}
      </div>
    </LoungeCard>
  );
};

/*
 * The guest's own activities, sorted into what's ahead, what they're
 * waiting for, and what has passed — one calm list, drawn live from the
 * Registration Engine. Upcoming seats and waiting places can be released
 * here; the freed seat promotes the next guest in line automatically.
 */
const MyActivitiesPage = async ({ params }: MyActivitiesPageProps) => {
  const { locale, slug } = await params;
  if (!isSupportedLocale(locale)) {
    notFound();
  }
  setRequestLocale(locale);

  const participant = await currentParticipant().catch(() => null);
  const activities = participant
    ? await myActivities(slug, locale).catch(() => null)
    : null;

  const total = activities
    ? activities.upcoming.length +
      activities.waiting.length +
      activities.completed.length +
      activities.cancelled.length
    : 0;

  const sections: {
    key: 'upcoming' | 'waiting' | 'completed' | 'cancelled';
    items: MyActivity[];
    canLeave?: boolean;
    muted?: boolean;
  }[] = activities
    ? [
        { key: 'upcoming', items: activities.upcoming, canLeave: true },
        { key: 'waiting', items: activities.waiting, canLeave: true },
        { key: 'completed', items: activities.completed, muted: true },
        { key: 'cancelled', items: activities.cancelled, muted: true },
      ]
    : [];

  return (
    <LoungeShell
      backHref={`/${locale}/events/${slug}/me`}
      backLabel={COPY.back[locale]}
    >
      <div className="mt-6">
        <LoungeHeading
          eyebrow={COPY.eyebrow[locale]}
          title={COPY.title[locale]}
          sub={COPY.sub[locale]}
        />
      </div>

      {total === 0 ? (
        <div className="mt-8 flex flex-col items-start gap-4">
          <LoungeNote>{COPY.empty[locale]}</LoungeNote>
          <a
            href={`/${locale}/events/${slug}/workshops`}
            className={loungeGhost}
          >
            {COPY.browse[locale]} →
          </a>
        </div>
      ) : (
        sections
          .filter((section) => section.items.length > 0)
          .map((section) => (
            <LoungeSection key={section.key} title={COPY[section.key][locale]}>
              <ul className="grid gap-4 md:grid-cols-2">
                {section.items.map((activity, index) => (
                  <li key={activity.registrationId}>
                    <ActivityItem
                      activity={activity}
                      locale={locale}
                      slug={slug}
                      index={index}
                      canLeave={section.canLeave}
                      muted={section.muted}
                    />
                  </li>
                ))}
              </ul>
            </LoungeSection>
          ))
      )}
    </LoungeShell>
  );
};

export default MyActivitiesPage;
