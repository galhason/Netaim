import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { isSupportedLocale } from '@/config/locales';
import {
  LoungeCard,
  LoungeNote,
  LoungeShell,
  loungeChip,
  loungeGhost,
  loungePrimary,
  loungeQuiet,
} from '@/features/attendee';
import { currentParticipant } from '@/features/registration';
import {
  activityStatusLabel,
  getSessionSituation,
  listAgenda,
  myWorkshops,
  type SessionSituation,
} from '@/features/program';
import { leaveWorkshopAction, selectWorkshopAction } from './actions';

interface WorkshopsPageProps {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ error?: string }>;
}

const COPY = {
  heading: { he: 'סדנאות וסיורים', en: 'Workshops & tours' },
  intro: {
    he: 'בחרו את הפעילויות שלכם. הזמינות מתעדכנת בזמן אמת.',
    en: 'Choose your activities. Availability updates in real time.',
  },
  workshopsTitle: { he: 'סדנאות מקצועיות', en: 'Professional workshops' },
  toursTitle: { he: 'סיורי שטח וקהילה', en: 'Field & community tours' },
  empty: {
    he: 'עדיין אין פעילויות פתוחות לבחירה.',
    en: 'No activities are open for selection yet.',
  },
  registered: { he: 'רשומ/ה', en: 'You’re registered' },
  select: { he: 'לבחור', en: 'Select' },
  join: { he: 'להצטרף לרשימת המתנה', en: 'Join the waiting list' },
  leave: { he: 'לבטל', en: 'Leave' },
  full: { he: 'מלאה', en: 'Full' },
  signIn: {
    he: 'כדי לבחור סדנאות, היכנסו לאזור האישי דרך הקישור שקיבלתם.',
    en: 'To choose workshops, sign in to your personal area via the link you received.',
  },
  error: {
    he: 'הפעילות התמלאה. נסו פעילות אחרת.',
    en: 'That activity just filled up. Try another.',
  },
  conflict: {
    he: 'לא ניתן להירשם לשתי פעילויות המתקיימות באותו חלון זמן.',
    en: 'You cannot register for two activities in the same time window.',
  },
  backToLounge: { he: 'לאזור האישי', en: 'My space' },
  myActivities: { he: 'הפעילויות שלי', en: 'My activities' },
} as const;

const timeLabel = (iso?: string): string => {
  if (!iso) {
    return '';
  }
  const parsed = Date.parse(iso);
  return Number.isNaN(parsed) ? '' : new Date(parsed).toISOString().slice(11, 16);
};

/*
 * Status is carried by the contractual label (FR-004) and supported by a
 * marker whose form — not a traffic-light palette — encodes the state:
 * a filled bronze dot invites, a ringed dot signals urgency, a hollow dot
 * is closed, a bronze outline is the queue. Never renames the label.
 */
const STATUS_MARKER: Record<string, string> = {
  available: 'bg-[#2F9E5B]',
  almostFull: 'bg-[#E8A23D] ring-2 ring-[#E8A23D]/30',
  full: 'bg-[#C4523B]',
  waitlist: 'bg-[#C4523B] ring-2 ring-[#C4523B]/30',
};

const STATUS_TEXT: Record<string, string> = {
  available: 'text-[#2F7D46]',
  almostFull: 'text-[#B4700F]',
  full: 'text-[#B0442F]',
  waitlist: 'text-[#B0442F]',
};

const WorkshopsPage = async ({ params, searchParams }: WorkshopsPageProps) => {
  const { locale, slug } = await params;
  if (!isSupportedLocale(locale)) {
    notFound();
  }
  setRequestLocale(locale);
  const { error } = await searchParams;

  const participant = await currentParticipant().catch(() => null);
  const [sessions, selections] = await Promise.all([
    listAgenda(slug, locale).catch(() => []),
    participant ? myWorkshops(slug) : Promise.resolve([]),
  ]);

  const activities = sessions.filter(
    (session) =>
      session.sessionType === 'workshop' || session.sessionType === 'tour',
  );
  const situations = (
    await Promise.all(
      activities.map((activity) => getSessionSituation(activity.id, locale)),
    )
  ).filter((situation): situation is SessionSituation => situation !== null);
  const groups = [
    {
      title: COPY.workshopsTitle[locale],
      items: situations.filter(
        (situation) => situation.session.sessionType === 'workshop',
      ),
    },
    {
      title: COPY.toursTitle[locale],
      items: situations.filter(
        (situation) => situation.session.sessionType === 'tour',
      ),
    },
  ].filter((group) => group.items.length > 0);

  const selectedIds = new Set(
    selections
      .filter((registration) => registration.status !== 'cancelled')
      .map((registration) => registration.sessionId),
  );

  return (
    <LoungeShell
      backHref={`/${locale}/events/${slug}/me`}
      backLabel={COPY.backToLounge[locale]}
    >
      <div className="mt-6">
        <h1 className="font-display text-3xl font-semibold md:text-4xl">
          {COPY.heading[locale]}
        </h1>
        <p className="mt-3 text-[15px] text-[var(--l-soft)]">
          {COPY.intro[locale]}
        </p>
        <a
          href={`/${locale}/events/${slug}/my-activities`}
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--l-bronze)] transition-colors hover:text-[var(--l-ink)]"
        >
          {COPY.myActivities[locale]}
          <span aria-hidden="true">←</span>
        </a>
      </div>

      {error ? (
        <div className="mt-5">
          <LoungeNote tone="accent">
            {error === 'conflict' ? COPY.conflict[locale] : COPY.error[locale]}
          </LoungeNote>
        </div>
      ) : null}
      {!participant ? (
        <div className="mt-5">
          <LoungeNote>{COPY.signIn[locale]}</LoungeNote>
        </div>
      ) : null}

      {situations.length === 0 ? (
        <div className="mt-6">
          <LoungeNote>{COPY.empty[locale]}</LoungeNote>
        </div>
      ) : (
        groups.map((group) => (
        <section key={group.title} className="mt-8">
        <h2 className="font-display text-xl font-semibold">{group.title}</h2>
        <ul className="mt-4 grid gap-4 md:grid-cols-2">
          {group.items.map(({ session, status }, index) => {
            const selected = selectedIds.has(session.id);
            return (
              <li key={session.id}>
                <LoungeCard delay={Math.min(index, 3) as 0 | 1 | 2 | 3}>
                  <div className="flex items-start gap-4">
                    <span className="w-12 flex-none text-sm tabular-nums text-[var(--l-faint)]">
                      {timeLabel(session.startsAt)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-display text-lg font-semibold leading-snug">
                        {session.title}
                      </span>
                      {session.room ? (
                        <span className="mt-0.5 block text-sm text-[var(--l-soft)]">
                          {session.room}
                        </span>
                      ) : null}
                    </span>
                  </div>

                  <div className="mt-4 flex items-center gap-2.5">
                    <span
                      aria-hidden="true"
                      className={`size-2 shrink-0 rounded-full ${
                        STATUS_MARKER[status] ?? 'border border-[var(--l-hair)]'
                      }`}
                    />
                    <span
                      className={`text-sm font-medium ${
                        STATUS_TEXT[status] ?? 'text-[var(--l-soft)]'
                      }`}
                    >
                      {activityStatusLabel(session.sessionType, status, locale)}
                    </span>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center gap-4">
                    {selected ? (
                      <>
                        <span className={loungeChip}>
                          {COPY.registered[locale]}
                        </span>
                        <form action={leaveWorkshopAction}>
                          <input type="hidden" name="slug" value={slug} />
                          <input type="hidden" name="locale" value={locale} />
                          <input
                            type="hidden"
                            name="sessionId"
                            value={session.id}
                          />
                          <button type="submit" className={loungeGhost}>
                            {COPY.leave[locale]}
                          </button>
                        </form>
                      </>
                    ) : !participant || status === 'full' ? (
                      <span className="text-sm text-[var(--l-faint)]">
                        {status === 'full'
                          ? activityStatusLabel(
                              session.sessionType,
                              'full',
                              locale,
                            )
                          : null}
                      </span>
                    ) : (
                      <form action={selectWorkshopAction}>
                        <input type="hidden" name="slug" value={slug} />
                        <input type="hidden" name="locale" value={locale} />
                        <input
                          type="hidden"
                          name="sessionId"
                          value={session.id}
                        />
                        <button
                          type="submit"
                          className={
                            status === 'waitlist' ? loungeQuiet : loungePrimary
                          }
                        >
                          {status === 'waitlist'
                            ? COPY.join[locale]
                            : COPY.select[locale]}
                        </button>
                      </form>
                    )}
                  </div>
                </LoungeCard>
              </li>
            );
          })}
        </ul>
        </section>
        ))
      )}
    </LoungeShell>
  );
};

export default WorkshopsPage;
