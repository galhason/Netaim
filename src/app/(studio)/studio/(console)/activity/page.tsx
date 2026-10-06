import {
  ConsoleDenied,
  ConsoleShell,
  CONSOLE_UI,
  getStudioAccess,
  getStudioLocale as localeOf,
} from '@/features/studio';
import { getActiveConferenceSlug } from '@/features/events';
import { listArchivedActivities, listConferenceActivities } from '@/features/program';
import { can } from '@/permission-engine';
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
  const access = await getStudioAccess();
  const slug = await getActiveConferenceSlug(locale).catch(() => null);
  if (!access || !can(access.grants, 'activities:read', slug ?? undefined)) {
    return <ConsoleDenied locale={locale} title={CONSOLE_UI.activityTitle[locale]} userName={access?.creator.name ?? ''} />;
  }
  const creator = access.creator;
  const permissions = {
    manage: can(access.grants, 'activities:manage', slug ?? undefined),
    archive: can(access.grants, 'activities:archive', slug ?? undefined),
    delete: can(access.grants, 'activities:delete', slug ?? undefined),
    /* Names, phones and emails — for the roles that may see participants. */
    roster: can(access.grants, 'participants:read', slug ?? undefined),
  };
  const [activities, shelved] = slug
    ? await Promise.all([
        listConferenceActivities(slug, locale).catch(() => []),
        listArchivedActivities(slug, locale).catch(() => []),
      ])
    : [[], []];

  const toRow = ({ session, capacity, status }: (typeof activities)[number]): ActivityRow => ({
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
  });
  const rows: ActivityRow[] = activities.map(toRow);
  const archived: ActivityRow[] = shelved.map((session) => ({
    id: session.id,
    title: session.title,
    type: session.sessionType,
    startsAt: session.startsAt ?? null,
    endsAt: session.endsAt ?? null,
    room: session.room ?? null,
    speakers: (session.speakers ?? []).map((sp) => ({ name: sp.name, registered: sp.isRegistered })),
    featured: false,
    limit: session.capacity,
    confirmed: 0,
    waiting: 0,
    available: null,
    state: 'unlimited',
    status: 'available',
  }));

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
      <ActivityManager locale={locale} slug={slug} rows={rows} archived={archived} can={permissions} />
    </ConsoleShell>
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

export default ActivityPage;
