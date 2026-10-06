import Link from 'next/link';
import type { Locale } from '@/config/locales';
import { listAllGrants, queryAudit } from '@/features/access';
import type { AuditEntry } from '@/features/access';
import {
  CONSOLE_UI,
  ConsoleDenied,
  ConsoleShell,
  auditLabel,
  getStudioAccess,
  getStudioLocale,
} from '@/features/studio';
import { ROLE_CAPABILITIES, ROLE_LABELS, can, type Capability, type Role } from '@/permission-engine';

/*
 * The team: everyone who holds a Studio role, and what each of them has
 * been doing. Not a separate list to maintain — a person is on the team
 * because a role was granted, and leaves it when the role is revoked.
 * The roles are given on the Access screen; the log lives on its own
 * screen; this page is where the two meet, per person.
 */
const t = (he: string, en: string): Record<Locale, string> => ({ he, en });
const UI = {
  sub: t(
    'כל מי שמחזיק תפקיד בסטודיו — מתכנת, מנהל, מפקח או צוות — ומה כל אחד עשה לאחרונה. תפקידים ניתנים ומוסרים במסך "אנשים".',
    'Everyone holding a Studio role — developer, admin, supervisor or staff — and what each has done lately. Roles are given and taken on the Access screen.',
  ),
  roles: t('תפקידים', 'Roles'),
  scope: t('היקף', 'Scope'),
  platform: t('כל הפלטפורמה', 'Whole platform'),
  lastSeen: t('פעולה אחרונה', 'Last action'),
  never: t('—', '—'),
  actions: t('פעולות', 'Actions'),
  manageAccess: t('ניהול הרשאות', 'Manage access'),
  personLog: t('היומן של האדם', 'This person’s log'),
  recent: t('פעילות אחרונה בסטודיו', 'Recent Studio activity'),
  fullLog: t('ליומן המלא', 'Open the full log'),
  empty: t('עדיין אין מחזיקי תפקיד.', 'No one holds a role yet.'),
  logDenied: t('יומן הפעולות פתוח למנהל Netaim בלבד.', 'The audit log is open to the Netaim Admin only.'),
  developers: t('מתכנתים', 'Developers'),
  admins: t('מנהלים', 'Admins'),
  supervisors: t('מפקחים', 'Supervisors'),
  staff: t('צוות', 'Staff'),
  legacy: t('תפקידים ישנים', 'Legacy roles'),
};

const CARD = 'rounded-lg border border-[var(--c-line)] bg-[var(--c-panel)]';
const BTN = 'inline-flex min-h-8 items-center rounded-md border border-[var(--c-line-strong)] px-3 text-xs text-[var(--c-text)] hover:border-[var(--c-bronze)] hover:text-[var(--c-bronze)]';

const when = (iso: string | null | undefined, locale: Locale): string => {
  if (!iso) return '';
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) return '';
  return new Intl.DateTimeFormat(locale === 'he' ? 'he-IL' : 'en-GB', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(parsed));
};

const TIER: Record<Role, keyof typeof UI> = {
  developer: 'developers',
  owner: 'admins',
  producer: 'supervisors',
  editor: 'staff',
  door: 'legacy',
  viewer: 'legacy',
};

interface Person {
  accountId: string;
  name: string;
  email: string;
  grants: { role: Role; scope: string | null; since: string | null }[];
  tier: keyof typeof UI;
  capabilities: Set<Capability>;
}

const TeamPage = async () => {
  const locale = await getStudioLocale();
  const access = await getStudioAccess();
  if (!access || !(can(access.grants, 'access:manage') || can(access.grants, 'events:manage'))) {
    return <ConsoleDenied locale={locale} title={CONSOLE_UI.teams[locale]} userName={access?.creator.name ?? ''} />;
  }
  const seesLog = can(access.grants, 'audit:read');
  const [grants, recent] = await Promise.all([
    listAllGrants(),
    seesLog ? queryAudit({ limit: 200 }) : Promise.resolve({ entries: [] as AuditEntry[], total: 0, page: 1, pages: 0 }),
  ]);

  const people = new Map<string, Person>();
  for (const grant of grants) {
    const person = people.get(grant.accountId) ?? {
      accountId: grant.accountId,
      name: grant.accountName,
      email: grant.accountEmail,
      grants: [],
      tier: 'legacy' as keyof typeof UI,
      capabilities: new Set<Capability>(),
    };
    const scope = grant.eventTitle ?? grant.eventSlug;
    /* The same role given twice (an old duplicate grant row) is one line, not two. */
    if (!person.grants.some((g) => g.role === grant.role && g.scope === scope)) {
      person.grants.push({ role: grant.role, scope, since: grant.grantedAt });
    }
    for (const capability of ROLE_CAPABILITIES[grant.role] ?? []) person.capabilities.add(capability);
    people.set(grant.accountId, person);
  }
  const rank: Record<keyof typeof UI, number> = { developers: 0, admins: 1, supervisors: 2, staff: 3, legacy: 4 } as Record<keyof typeof UI, number>;
  for (const person of people.values()) {
    person.tier = person.grants.map((g) => TIER[g.role]).sort((a, b) => (rank[a] ?? 9) - (rank[b] ?? 9))[0] ?? 'legacy';
  }
  const lastByEmail = new Map<string, AuditEntry>();
  for (const entry of recent.entries) {
    if (entry.actorEmail && !lastByEmail.has(entry.actorEmail)) lastByEmail.set(entry.actorEmail, entry);
  }
  const tiers: (keyof typeof UI)[] = ['developers', 'admins', 'supervisors', 'staff', 'legacy'];

  return (
    <ConsoleShell locale={locale} userName={access.creator.name} breadcrumb={<span className="font-medium text-[var(--c-text)]">{CONSOLE_UI.teams[locale]}</span>}>
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-6">
        <header className="flex flex-wrap items-start gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold text-[var(--c-text)]">{CONSOLE_UI.teams[locale]}</h1>
            <p className="mt-1 max-w-2xl text-sm text-[var(--c-text-soft)]">{UI.sub[locale]}</p>
          </div>
          {can(access.grants, 'access:manage') ? (
            <Link href="/studio/people" className={BTN}>{UI.manageAccess[locale]}</Link>
          ) : null}
        </header>

        {people.size === 0 ? (
          <p className="text-sm text-[var(--c-text-soft)]">{UI.empty[locale]}</p>
        ) : (
          tiers.map((tier) => {
            const members = [...people.values()].filter((person) => person.tier === tier);
            if (members.length === 0) return null;
            return (
              <section key={tier} className={CARD}>
                <h2 className="border-b border-[var(--c-line)] px-5 py-3 text-sm font-semibold text-[var(--c-text)]">
                  {UI[tier][locale]} <span className="text-[var(--c-text-faint)]">({members.length})</span>
                </h2>
                <ul>
                  {members.map((person) => {
                    const last = lastByEmail.get(person.email);
                    return (
                      <li key={person.accountId} className="flex flex-wrap items-center gap-3 border-b border-[var(--c-line)] px-5 py-3 last:border-b-0">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-[var(--c-text)]">{person.name || person.email}</p>
                          <p className="truncate text-xs text-[var(--c-text-faint)]" dir="ltr">{person.email}</p>
                        </div>
                        <div className="text-xs text-[var(--c-text-soft)]">
                          <span className="block text-[10px] tracking-[0.08em] text-[var(--c-text-faint)]">{UI.roles[locale]}</span>
                          {person.grants.map((grant, index) => (
                            <span key={index} className="block">
                              {ROLE_LABELS[grant.role][locale]}
                              <span className="text-[var(--c-text-faint)]"> · {grant.scope ?? UI.platform[locale]}</span>
                            </span>
                          ))}
                        </div>
                        {seesLog ? (
                          <div className="w-44 text-xs text-[var(--c-text-soft)]">
                            <span className="block text-[10px] tracking-[0.08em] text-[var(--c-text-faint)]">{UI.lastSeen[locale]}</span>
                            {last ? (
                              <>
                                <span className="block">{auditLabel(last.action, locale)}</span>
                                <span className="block text-[var(--c-text-faint)]" dir="ltr">{when(last.at, locale)}</span>
                              </>
                            ) : (
                              UI.never[locale]
                            )}
                          </div>
                        ) : null}
                        {seesLog ? (
                          <Link href={`/studio/history?actor=${encodeURIComponent(person.email)}`} className={BTN}>
                            {UI.personLog[locale]}
                          </Link>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })
        )}

        <section className={CARD}>
          <div className="flex items-center gap-3 border-b border-[var(--c-line)] px-5 py-3">
            <h2 className="text-sm font-semibold text-[var(--c-text)]">{UI.recent[locale]}</h2>
            {seesLog ? <Link href="/studio/history" className={`${BTN} ms-auto`}>{UI.fullLog[locale]}</Link> : null}
          </div>
          {!seesLog ? (
            <p className="px-5 py-4 text-sm text-[var(--c-text-soft)]">{UI.logDenied[locale]}</p>
          ) : recent.entries.length === 0 ? (
            <p className="px-5 py-4 text-sm text-[var(--c-text-soft)]">{CONSOLE_UI.historyEmpty[locale]}</p>
          ) : (
            <ul>
              {recent.entries.slice(0, 30).map((entry) => (
                <li key={entry.id} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-[var(--c-line)] px-5 py-2.5 text-sm last:border-b-0">
                  <span className="w-32 shrink-0 text-xs tabular-nums text-[var(--c-text-faint)]" dir="ltr">{when(entry.at, locale)}</span>
                  <span className="w-40 shrink-0 truncate text-xs text-[var(--c-text-soft)]">{entry.actorName || entry.actorEmail}</span>
                  <span className="text-[var(--c-text)]">{auditLabel(entry.action, locale)}</span>
                  {entry.subjectLabel || entry.subject ? <span className="text-xs text-[var(--c-text-soft)]">· {entry.subjectLabel || entry.subject}</span> : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </ConsoleShell>
  );
};

export const dynamic = 'force-dynamic';

export default TeamPage;
