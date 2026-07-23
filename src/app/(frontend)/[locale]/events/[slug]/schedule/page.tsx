import Link from 'next/link';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { isSupportedLocale } from '@/config/locales';
import {
  LoungeCard,
  LoungeNote,
  LoungeShell,
  loungeChip,
  loungePrimary,
} from '@/features/attendee';
import { currentParticipant } from '@/features/registration';
import {
  listAgenda,
  myWorkshops,
  WORKSHOP_STATUS_LABELS,
  type SessionSummary,
} from '@/features/program';

interface SchedulePageProps {
  params: Promise<{ locale: string; slug: string }>;
}

const COPY = {
  heading: { he: 'הלו"ז שלי', en: 'My schedule' },
  intro: {
    he: 'הסדנאות שבחרתם, לפי סדר הזמן.',
    en: 'The workshops you chose, in time order.',
  },
  empty: {
    he: 'עדיין לא בחרתם סדנאות.',
    en: 'You haven’t chosen any workshops yet.',
  },
  choose: { he: 'לבחירת סדנאות', en: 'Choose workshops' },
  signIn: {
    he: 'כדי לראות את הלו"ז שלכם, היכנסו לאזור האישי דרך הקישור שקיבלתם.',
    en: 'To see your schedule, sign in to your personal area via the link you received.',
  },
  registered: { he: 'רשומ/ה', en: 'Registered' },
  conflict: { he: 'חופף בזמן', en: 'Time clash' },
  backToLounge: { he: 'לאזור האישי', en: 'My space' },
} as const;

const timeLabel = (iso?: string): string => {
  if (!iso) {
    return '';
  }
  const parsed = Date.parse(iso);
  return Number.isNaN(parsed) ? '' : new Date(parsed).toISOString().slice(11, 16);
};

const overlaps = (a: SessionSummary, b: SessionSummary): boolean => {
  if (!a.startsAt || !a.endsAt || !b.startsAt || !b.endsAt) {
    return false;
  }
  return (
    Date.parse(a.startsAt) < Date.parse(b.endsAt) &&
    Date.parse(b.startsAt) < Date.parse(a.endsAt)
  );
};

const SchedulePage = async ({ params }: SchedulePageProps) => {
  const { locale, slug } = await params;
  if (!isSupportedLocale(locale)) {
    notFound();
  }
  setRequestLocale(locale);

  const participant = await currentParticipant().catch(() => null);

  if (!participant) {
    return (
      <LoungeShell
        width="narrow"
        backHref={`/${locale}/events/${slug}/me`}
        backLabel={COPY.backToLounge[locale]}
      >
        <h1 className="mt-6 font-display text-3xl font-semibold">
          {COPY.heading[locale]}
        </h1>
        <div className="mt-5">
          <LoungeNote>{COPY.signIn[locale]}</LoungeNote>
        </div>
      </LoungeShell>
    );
  }

  const [sessions, registrations] = await Promise.all([
    listAgenda(slug, locale).catch(() => []),
    myWorkshops(slug),
  ]);

  const byId = new Map(sessions.map((session) => [session.id, session]));
  const mine = registrations
    .filter(
      (registration) =>
        registration.status !== 'cancelled' &&
        registration.status !== 'declined',
    )
    .flatMap((registration) => {
      const session = byId.get(registration.sessionId);
      return session ? [{ status: registration.status, session }] : [];
    })
    .sort(
      (a, b) =>
        Date.parse(a.session.startsAt ?? '') -
        Date.parse(b.session.startsAt ?? ''),
    );

  const confirmed = mine.filter((item) => item.status === 'confirmed');
  const conflictIds = new Set<string>();
  for (let i = 0; i < confirmed.length; i += 1) {
    for (let j = i + 1; j < confirmed.length; j += 1) {
      const a = confirmed[i];
      const b = confirmed[j];
      if (a && b && overlaps(a.session, b.session)) {
        conflictIds.add(a.session.id);
        conflictIds.add(b.session.id);
      }
    }
  }

  return (
    <LoungeShell
      backHref={`/${locale}/events/${slug}/me`}
      backLabel={COPY.backToLounge[locale]}
    >
      <div className="mt-6 flex flex-wrap items-end gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold md:text-4xl">
            {COPY.heading[locale]}
          </h1>
          <p className="mt-3 text-[15px] text-[var(--l-soft)]">
            {COPY.intro[locale]}
          </p>
        </div>
        <Link
          href={`/${locale}/events/${slug}/workshops`}
          className={`${loungePrimary} ms-auto`}
        >
          {COPY.choose[locale]}
        </Link>
      </div>

      {mine.length === 0 ? (
        <div className="mt-7">
          <LoungeNote>{COPY.empty[locale]}</LoungeNote>
        </div>
      ) : (
        <ol className="mt-7 flex flex-col gap-4">
          {mine.map(({ session, status }, index) => (
            <li key={session.id}>
              <LoungeCard delay={Math.min(index, 3) as 0 | 1 | 2 | 3}>
                <div className="flex flex-wrap items-center gap-4">
                  <span className="w-14 flex-none font-display text-lg tabular-nums text-[var(--l-bronze)]">
                    {timeLabel(session.startsAt)}
                  </span>
                  <span className="min-w-40 flex-1">
                    <span className="block font-display text-lg font-semibold leading-snug">
                      {session.title}
                    </span>
                    {session.room ? (
                      <span className="mt-0.5 block text-sm text-[var(--l-soft)]">
                        {session.room}
                      </span>
                    ) : null}
                  </span>
                  <span className="flex items-center gap-3">
                    {conflictIds.has(session.id) ? (
                      <span className="rounded-full bg-[var(--l-bronze)]/12 px-3 py-1 text-xs font-medium text-[var(--l-bronze)]">
                        {COPY.conflict[locale]}
                      </span>
                    ) : null}
                    <span className={loungeChip}>
                      {status === 'waitlisted'
                        ? WORKSHOP_STATUS_LABELS.waitlist[locale]
                        : COPY.registered[locale]}
                    </span>
                  </span>
                </div>
              </LoungeCard>
            </li>
          ))}
        </ol>
      )}
    </LoungeShell>
  );
};

export default SchedulePage;
