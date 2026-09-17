import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { isSupportedLocale, type Locale } from '@/config/locales';
import { findPortalEvent } from '@/features/events';
import { myMeetings } from '@/features/networking';
import { buildProgramModel } from '@/features/program';
import { currentParticipant } from '@/features/registration';
import AutoRefresh from './auto-refresh';
import { toMeetingVMs } from './meetings';
import MyScheduleDashboard from './my-schedule-dashboard';
import SignInPreview from './sign-in-preview';

interface Props {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ notice?: string; activity?: string }>;
}

/*
 * My Schedule is not a second program — it is the program, filtered to one
 * person. The page builds the very same model the Program page builds, then
 * hands it to the dashboard together with the list of registrations that
 * decides what belongs on this participant's timeline. One source, two
 * lenses; nothing here can drift out of step with the program.
 *
 * The one thing added beside it is the participant's confirmed networking
 * meetings: a commitment with a time and a place belongs on the same day
 * as the workshops, and nobody should keep two schedules to know where
 * they are at half past one.
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
      <SignInPreview
        locale={lang}
        enterHref={`/${lang}/events/${slug}/register`}
        signInHref={`/${lang}/me`}
      />
    );
  }

  const [event, model, meetings] = await Promise.all([
    findPortalEvent(slug, lang).catch(() => null),
    buildProgramModel(slug, lang),
    myMeetings(slug).catch(() => []),
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
        meetings={toMeetingVMs(meetings, lang)}
        todayKey={todayKey}
        {...(event?.startsAt ? { startsAt: event.startsAt } : {})}
        {...(event?.endsAt ? { endsAt: event.endsAt } : {})}
        notice={notice ?? null}
        initialActivityId={activity ?? null}
        {...(event?.location ? { venue: event.location } : {})}
      />
    </>
  );
};

/*
 * The response depends on who is asking, so it is rendered per request
 * and never prerendered or shared. Declared rather than left to Next to
 * infer from a cookie read: an inferred guard disappears the moment a
 * refactor moves that read behind a helper, and the failure would be a
 * privacy leak that nothing announces.
 */
export const dynamic = 'force-dynamic';

export default MySchedulePage;
