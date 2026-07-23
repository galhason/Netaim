import Link from 'next/link';
import { listAllGrants } from '@/features/access';
import type { AccountGrantView } from '@/features/access';
import { listEvents } from '@/features/events';
import {
  CONSOLE_UI,
  CSelectField,
  ConsoleShell,
  ROLE_LABELS,
  getStudioCreator,
  getStudioLocale,
  requireCapability,
  searchAccounts,
} from '@/features/studio';
import type { AccountSearchView } from '@/features/studio';
import { grantRoleAction, revokeGrantAction } from '../actions';

/*
 * The access surface (Identity Build Brief WP6, evolved): nobody is
 * created here. Every person opens their own account on the platform;
 * this screen finds any account by name or email and hands it a role —
 * platform-wide or scoped to one conference. Requires platform:manage.
 */
interface AccessPageProps {
  searchParams: Promise<{ q?: string; grants?: string }>;
}

const initialOf = (account: { name: string; email: string }): string =>
  (account.name || account.email).slice(0, 1).toUpperCase();

const ConsoleAccessPage = async ({ searchParams }: AccessPageProps) => {
  const locale = await getStudioLocale();
  const creator = await getStudioCreator();
  const access = await requireCapability('platform:manage');
  const { q, grants: grantsState } = await searchParams;
  const query = (q ?? '').trim();

  const [allGrants, events, results] = access
    ? await Promise.all([
        listAllGrants().catch(() => [] as AccountGrantView[]),
        listEvents().catch(() => []),
        query
          ? searchAccounts(query).catch(() => [] as AccountSearchView[])
          : Promise.resolve([] as AccountSearchView[]),
      ])
    : [[] as AccountGrantView[], [], [] as AccountSearchView[]];

  const grantsByAccount = new Map<string, AccountGrantView[]>();
  for (const grant of allGrants) {
    const list = grantsByAccount.get(grant.accountId) ?? [];
    list.push(grant);
    grantsByAccount.set(grant.accountId, list);
  }

  /*
   * The default view is the current team — every account holding a
   * grant; a search widens the lens to the whole platform.
   */
  const accounts: AccountSearchView[] = query
    ? results
    : [...grantsByAccount.entries()].map(([accountId, list]) => ({
        id: accountId,
        name: list[0]?.accountName ?? '',
        email: list[0]?.accountEmail ?? '',
        blocked: false,
      }));

  const roleOptions = Object.entries(ROLE_LABELS).map(([value, label]) => ({
    value,
    label: label[locale],
  }));
  const eventOptions = events.map((event) => ({
    value: event.slug,
    label: event.title,
  }));

  return (
    <ConsoleShell
      locale={locale}
      userName={creator?.name ?? ''}
      breadcrumb={
        <span className="font-medium text-[var(--c-text)]">
          {CONSOLE_UI.accessTitle[locale]}
        </span>
      }
    >
      <div className="mx-auto flex h-full max-w-3xl flex-col gap-6 overflow-y-auto px-6 py-8">
        <header>
          <h1 className="font-display text-3xl font-medium">
            {CONSOLE_UI.accessTitle[locale]}
          </h1>
          <p className="mt-1 text-sm text-[var(--c-text-soft)]">
            {CONSOLE_UI.accessSub[locale]}
          </p>
        </header>

        {!access ? (
          <p className="rounded-xl border border-[var(--c-line)] bg-[var(--c-panel)] px-4 py-3 text-sm text-[var(--c-text-soft)]">
            {CONSOLE_UI.inspectorEmpty[locale]}
          </p>
        ) : (
          <>
            {grantsState === 'lastOwner' ? (
              <p className="rounded-xl border border-[#B0442F]/40 bg-[#B0442F]/10 px-4 py-2.5 text-sm text-[#E39A8B]">
                {CONSOLE_UI.lastOwnerNote[locale]}
              </p>
            ) : null}

            <form method="get" className="flex items-end gap-2">
              <label className="min-w-0 flex-1">
                <span className="mb-1.5 block text-[10px] font-medium tracking-[0.16em] text-[var(--c-text-faint)]">
                  {CONSOLE_UI.searchAccounts[locale]}
                </span>
                <input
                  name="q"
                  defaultValue={query}
                  className="w-full rounded-lg border border-[var(--c-line-strong)] bg-[rgba(6,10,16,0.6)] px-3 py-2 text-sm text-[var(--c-text)] focus:border-[var(--c-bronze)]/60 focus:outline-none"
                />
              </label>
              <button
                type="submit"
                className="min-h-10 rounded-lg bg-[var(--c-bronze)] px-5 text-xs font-medium text-[#161006] transition-colors hover:bg-[#dcbe84]"
              >
                {CONSOLE_UI.searchAction[locale]}
              </button>
              {query ? (
                <Link
                  href="/studio/people"
                  className="min-h-10 rounded-lg border border-[var(--c-line-strong)] px-4 py-2.5 text-xs text-[var(--c-text-soft)] transition-colors hover:border-[var(--c-bronze)]/50 hover:text-[var(--c-bronze)]"
                >
                  {CONSOLE_UI.clearSearch[locale]}
                </Link>
              ) : null}
            </form>

            <section>
              <h2 className="mb-3 text-[11px] font-medium tracking-[0.2em] text-[var(--c-text-faint)]">
                {(query
                  ? CONSOLE_UI.searchResults[locale]
                  : CONSOLE_UI.accessHolders[locale]
                ).toUpperCase()}
              </h2>
              {accounts.length === 0 ? (
                <p className="text-sm text-[var(--c-text-faint)]">
                  {query
                    ? CONSOLE_UI.noAccountsFound[locale]
                    : CONSOLE_UI.noAccessYet[locale]}
                </p>
              ) : (
                <ul className="flex flex-col gap-2.5">
                  {accounts.map((account) => {
                    const held = grantsByAccount.get(account.id) ?? [];
                    return (
                      <li
                        key={account.id}
                        className="rounded-xl border border-[var(--c-line)] bg-[var(--c-panel)] px-5 py-4"
                      >
                        <div className="flex items-center gap-4">
                          <span className="grid size-9 flex-none place-items-center rounded-full bg-[var(--c-bronze)]/20 text-sm font-medium text-[var(--c-bronze)]">
                            {initialOf(account)}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate font-medium">
                              {account.name || account.email}
                            </span>
                            <span className="block truncate text-xs text-[var(--c-text-soft)]">
                              {account.email}
                            </span>
                          </span>
                          {account.blocked ? (
                            <span className="ms-auto rounded-full border border-[#B0442F]/50 px-3 py-1 text-[10px] tracking-widest text-[#E39A8B]">
                              {CONSOLE_UI.blockedTag[locale]}
                            </span>
                          ) : null}
                        </div>

                        {held.length > 0 ? (
                          <ul className="mt-3 flex flex-wrap gap-2">
                            {held.map((grant) => (
                              <li
                                key={grant.id}
                                className="flex items-center gap-2 rounded-full border border-[var(--c-line-strong)] px-3 py-1 text-[11px] text-[var(--c-text-soft)]"
                              >
                                <span>
                                  {ROLE_LABELS[grant.role]?.[locale] ??
                                    grant.role}
                                  {' · '}
                                  {grant.eventTitle ??
                                    CONSOLE_UI.platformWide[locale]}
                                </span>
                                <form action={revokeGrantAction}>
                                  <input
                                    type="hidden"
                                    name="grantId"
                                    value={grant.id}
                                  />
                                  <input
                                    type="hidden"
                                    name="from"
                                    value="people"
                                  />
                                  <button
                                    type="submit"
                                    className="text-[10px] text-[#E39A8B] underline underline-offset-2"
                                  >
                                    {CONSOLE_UI.revokeGrant[locale]}
                                  </button>
                                </form>
                              </li>
                            ))}
                          </ul>
                        ) : null}

                        <form
                          action={grantRoleAction}
                          className="mt-3 flex flex-wrap items-end gap-2"
                        >
                          <input
                            type="hidden"
                            name="accountId"
                            value={account.id}
                          />
                          <div className="w-40">
                            <CSelectField
                              name="role"
                              label={CONSOLE_UI.memberRole[locale]}
                              options={roleOptions}
                            />
                          </div>
                          <div className="w-52">
                            <CSelectField
                              name="eventSlug"
                              label={CONSOLE_UI.scopeToEvent[locale]}
                              emptyLabel={CONSOLE_UI.platformWide[locale]}
                              options={eventOptions}
                            />
                          </div>
                          <button
                            type="submit"
                            className="min-h-10 rounded-lg border border-[var(--c-line-strong)] px-4 text-xs text-[var(--c-text-soft)] transition-colors hover:border-[var(--c-bronze)]/50 hover:text-[var(--c-bronze)]"
                          >
                            {CONSOLE_UI.grantRole[locale]}
                          </button>
                        </form>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <p className="text-[11px] leading-relaxed text-[var(--c-text-faint)]">
              {CONSOLE_UI.accessHint[locale]}
            </p>
          </>
        )}
      </div>
    </ConsoleShell>
  );
};

export default ConsoleAccessPage;
