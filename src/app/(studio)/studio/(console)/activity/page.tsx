import {
  ConsoleShell,
  CONSOLE_UI,
  getStudioCreator,
  getStudioLocale as localeOf,
} from '@/features/studio';
import { getActiveConferenceSlug } from '@/features/events';
import { listConferenceActivities } from '@/features/program';
import ActivityManager, { type ActivityRow } from './activity-manager';

/*
 * Activity Studio — the management screen for every activity of the
 * active conference. The list, its counts and its availability are all
 * derived live from the sessions domain and the Capacity Engine; nothing
 * about layout is authored. Create and edit open the five-step Activity
 * wizard.
 */
const ActivityPage = async () => {
  const locale = await localeOf();
  const creator = await getStudioCreator();
  const slug = await getActiveConferenceSlug(locale).catch(() => null);
  const activities = slug
    ? await listConferenceActivities(slug, locale).catch(() => [])
    : [];

  const rows: ActivityRow[] = activities.map(
    ({ session, capacity, status }) => ({
      id: session.id,
      title: session.title,
      type: session.sessionType,
      startsAt: session.startsAt ?? null,
      endsAt: session.endsAt ?? null,
      room: session.room ?? null,
      speakers: (session.speakers ?? []).map((sp) => ({
        name: sp.name,
        registered: sp.isRegistered,
      })),
      featured: session.featured === true,
      limit: session.capacity,
      confirmed: capacity.confirmed,
      waiting: capacity.waiting,
      available: capacity.available,
      state: capacity.state,
      status,
    }),
  );

  return (
    <ConsoleShell
      locale={locale}
      userName={creator?.name ?? ''}
      breadcrumb={
        <span className="font-medium text-[var(--c-text)]">
          {CONSOLE_UI.activityTitle[locale]}
        </span>
      }
    >
      <ActivityManager locale={locale} slug={slug} rows={rows} />
    </ConsoleShell>
  );
};

export default ActivityPage;
