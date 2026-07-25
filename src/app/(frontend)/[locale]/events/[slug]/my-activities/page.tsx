import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { isSupportedLocale, type Locale } from '@/config/locales';
import { findPortalEvent } from '@/features/events';
import { buildProgramModel } from '@/features/program';
import { currentParticipant } from '@/features/registration';
import AutoRefresh from './auto-refresh';
import MyScheduleDashboard from './my-schedule-dashboard';

interface Props {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ notice?: string; activity?: string }>;
}

const SIGN_IN = {
  title: { he: 'הלוח האישי מחכה לך', en: 'Your schedule is waiting' },
  hint: {
    he: 'התחברו כדי לראות את הפעילויות שנרשמתם אליהן, את הבאה בתור ואת הדרך לחדר.',
    en: 'Sign in to see the activities you registered for, what’s next and how to get there.',
  },
  cta: { he: 'כניסה לכנס', en: 'Enter the conference' },
};

/*
 * My Schedule is not a second program — it is the program, filtered to one
 * person. The page builds the very same model the Program page builds, then
 * hands it to the dashboard together with the list of registrations that
 * decides what belongs on this participant's timeline. One source, two
 * lenses; nothing here can drift out of step with the program.
 */
const MySchedulePage = async ({ params, searchParams }: Props) => {
  const { locale, slug } = await params;
  if (!isSupportedLocale(locale)) {
    notFound();
  }
  setRequestLocale(locale);
  const lang = locale as Locale;
  const { notice, activity } = await searchParams;

  const participant = await currentParticipant().catch(() => null);

  if (!participant) {
    return (
      <main className="mx-auto flex max-w-lg flex-col items-center gap-4 px-6 py-24 text-center">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-[var(--x-ink)]">
          {SIGN_IN.title[lang]}
        </h1>
        <p className="text-[15px] text-[var(--x-soft)]">{SIGN_IN.hint[lang]}</p>
        <a
          href={`/${lang}/events/${slug}/register`}
          className="mt-2 inline-flex min-h-[48px] items-center rounded-[var(--x-r-pill)] bg-[var(--x-primary)] px-6 text-sm font-semibold text-[var(--x-primary-ink)] shadow-[var(--x-shadow)] transition-colors hover:bg-[var(--x-primary-strong)]"
        >
          {SIGN_IN.cta[lang]}
        </a>
      </main>
    );
  }

  const [event, model] = await Promise.all([
    findPortalEvent(slug, lang).catch(() => null),
    buildProgramModel(slug, lang),
  ]);

  const title = event?.title ?? (lang === 'he' ? 'הכנס' : 'The conference');
  const todayKey = new Date().toISOString().slice(0, 10);

  return (
    <>
      <AutoRefresh />
      <MyScheduleDashboard
        locale={lang}
        slug={slug}
        eventTitle={title}
        activities={model.activities}
        days={model.days}
        mine={model.mine}
        todayKey={todayKey}
        notice={notice ?? null}
        initialActivityId={activity ?? null}
        {...(event?.location ? { venue: event.location } : {})}
      />
    </>
  );
};

export default MySchedulePage;
