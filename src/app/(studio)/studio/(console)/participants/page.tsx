import Link from 'next/link';
import { listAllGrants } from '@/features/access';
import type { AccountGrantView } from '@/features/access';
import { listEvents } from '@/features/events';
import {
  CONSOLE_UI,
  ConsoleShell,
  getParticipantsAdmin,
  getStudioCreator,
  getStudioLocale,
} from '@/features/studio';
import { ROLES, ROLE_LABELS } from '@/permission-engine';
import {
  cancelParticipantRegistrationAction,
  deleteParticipantAction,
  grantRoleAction,
  moveParticipantRegistrationAction,
  renameParticipantAction,
  revokeGrantAction,
  toggleParticipantBlockedAction,
} from '../actions';

/*
 * Accounts in the Studio (approved decision §8): every registered
 * person — their conferences, their access, and the door switch.
 * Grants, registration moves and deletion all run through capability-
 * checked actions; the panel itself decides nothing.
 */
interface ParticipantsPageProps {
  searchParams: Promise<{ grants?: string; move?: string }>;
}

const chip =
  'inline-flex items-center gap-2 rounded-full border border-[var(--c-line)] px-3 py-1 text-[11px] text-[var(--c-text-soft)]';

const quietButton =
  'rounded-lg border border-[var(--c-line-strong)] px-3 py-1 text-[11px] text-[var(--c-text-soft)] transition-colors hover:border-[var(--c-bronze)]/50 hover:text-[var(--c-bronze)]';

const dangerButton =
  'rounded-lg border border-[#B0442F]/50 px-3 py-1 text-[11px] text-[#E39A8B] transition-colors hover:bg-[#B0442F]/10';

const selectField =
  'rounded-lg border border-[var(--c-line-strong)] bg-[rgba(6,10,16,0.6)] px-2 py-1 text-[11px] text-[var(--c-text)] focus:border-[var(--c-bronze)]/60 focus:outline-none';

const ParticipantsPage = async ({ searchParams }: ParticipantsPageProps) => {
  const { grants: grantsState, move: moveState } = await searchParams;
  const locale = await getStudioLocale();
  const creator = await getStudioCreator();
  const [participants, allGrants, events] = await Promise.all([
    getParticipantsAdmin().catch(() => []),
    listAllGrants(),
    listEvents().catch(() => []),
  ]);

  const grantsByAccount = new Map<string, AccountGrantView[]>();
  for (const grant of allGrants) {
    const held = grantsByAccount.get(grant.accountId) ?? [];
    held.push(grant);
    grantsByAccount.set(grant.accountId, held);
  }

  return (
    <ConsoleShell
      locale={locale}
      userName={creator?.name ?? ''}
      breadcrumb={
        <span className="font-medium text-[var(--c-text)]">
          {CONSOLE_UI.participantsTitle[locale]}
        </span>
      }
    >
      <div className="mx-auto flex h-full max-w-4xl flex-col gap-6 overflow-y-auto px-6 py-8">
        <header>
          <h1 className="font-display text-3xl font-medium">
            {CONSOLE_UI.participantsTitle[locale]}
          </h1>
          <p className="mt-1 text-sm text-[var(--c-text-soft)]">
            {CONSOLE_UI.participantsSub[locale]}
          </p>
        </header>

        {grantsState === 'lastOwner' ? (
          <p className="rounded-xl border border-[#B0442F]/40 bg-[#B0442F]/10 px-4 py-3 text-sm text-[#E39A8B]">
            {CONSOLE_UI.lastOwnerNote[locale]}
          </p>
        ) : null}
        {moveState === 'failed' ? (
          <p className="rounded-xl border border-[#B0442F]/40 bg-[#B0442F]/10 px-4 py-3 text-sm text-[#E39A8B]">
            {CONSOLE_UI.moveFailedNote[locale]}
          </p>
        ) : null}

        <ul className="flex flex-col gap-3">
          {participants.map((participant) => {
            const held = grantsByAccount.get(participant.id) ?? [];
            return (
              <li
                key={participant.id}
                className={`rounded-xl border bg-[var(--c-panel)] px-5 py-4 ${
                  participant.blocked
                    ? 'border-[#B0442F]/40'
                    : 'border-[var(--c-line)]'
                }`}
              >
                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className={`grid size-9 flex-none place-items-center rounded-full text-sm font-medium ${
                      participant.blocked
                        ? 'bg-[#B0442F]/20 text-[#E39A8B]'
                        : 'bg-[var(--c-bronze)]/20 text-[var(--c-bronze)]'
                    }`}
                  >
                    {(participant.name || participant.email)
                      .slice(0, 1)
                      .toUpperCase()}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-medium">
                      {participant.name || participant.email}
                    </span>
                    <span className="block truncate text-xs text-[var(--c-text-soft)]">
                      {participant.email}
                      {participant.organization
                        ? ` · ${participant.organization}`
                        : ''}
                    </span>
                  </span>
                  {participant.blocked ? (
                    <span className="rounded-full border border-[#B0442F]/50 px-2.5 py-0.5 text-[10px] tracking-widest text-[#E39A8B]">
                      {CONSOLE_UI.blockedTag[locale]}
                    </span>
                  ) : null}
                  <form
                    action={renameParticipantAction}
                    className="ms-auto flex items-center gap-2"
                  >
                    <input type="hidden" name="id" value={participant.id} />
                    <input
                      name="name"
                      defaultValue={participant.name}
                      aria-label={CONSOLE_UI.renameMember[locale]}
                      className="w-36 rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm text-[var(--c-text)] transition-colors focus:border-[var(--c-bronze)]/60 focus:bg-[rgba(6,10,16,0.6)] focus:outline-none"
                    />
                    <button type="submit" className={quietButton}>
                      {CONSOLE_UI.renameMember[locale]}
                    </button>
                  </form>
                  <form action={toggleParticipantBlockedAction}>
                    <input type="hidden" name="id" value={participant.id} />
                    <input
                      type="hidden"
                      name="blocked"
                      value={participant.blocked ? '' : '1'}
                    />
                    <button
                      type="submit"
                      className={`rounded-lg border px-3 py-1 text-[11px] transition-colors ${
                        participant.blocked
                          ? 'border-[var(--c-live)]/50 text-[var(--c-live)] hover:bg-[var(--c-live)]/10'
                          : 'border-[#B0442F]/50 text-[#E39A8B] hover:bg-[#B0442F]/10'
                      }`}
                    >
                      {participant.blocked
                        ? CONSOLE_UI.unblock[locale]
                        : CONSOLE_UI.block[locale]}
                    </button>
                  </form>
                </div>

                {participant.registrations.length > 0 ? (
                  <ul className="mt-3 flex flex-col gap-2 border-t border-[var(--c-line)] pt-3">
                    {participant.registrations.map((line, index) => (
                      <li
                        key={`${line.eventSlug}-${index}`}
                        className="flex flex-wrap items-center gap-2"
                      >
                        <Link
                          href={
                            line.eventSlug
                              ? `/studio/experiences/${line.eventSlug}`
                              : '/studio'
                          }
                          className={`${chip} transition-colors hover:border-[var(--c-bronze)]/50 hover:text-[var(--c-text)]`}
                        >
                          {line.eventTitle}
                          <span className="text-[9px] tracking-widest text-[var(--c-text-faint)]">
                            {line.status.toUpperCase()}
                          </span>
                        </Link>
                        <form action={cancelParticipantRegistrationAction}>
                          <input
                            type="hidden"
                            name="participantId"
                            value={participant.id}
                          />
                          <input
                            type="hidden"
                            name="slug"
                            value={line.eventSlug}
                          />
                          <button type="submit" className={dangerButton}>
                            {CONSOLE_UI.cancelRegistration[locale]}
                          </button>
                        </form>
                        {events.length > 1 ? (
                          <form
                            action={moveParticipantRegistrationAction}
                            className="flex items-center gap-2"
                          >
                            <input
                              type="hidden"
                              name="participantId"
                              value={participant.id}
                            />
                            <input
                              type="hidden"
                              name="fromSlug"
                              value={line.eventSlug}
                            />
                            <select
                              name="toSlug"
                              aria-label={CONSOLE_UI.moveTo[locale]}
                              defaultValue=""
                              className={selectField}
                            >
                              <option value="" disabled>
                                {CONSOLE_UI.moveTo[locale]}
                              </option>
                              {events
                                .filter(
                                  (event) => event.slug !== line.eventSlug,
                                )
                                .map((event) => (
                                  <option key={event.slug} value={event.slug}>
                                    {event.title}
                                  </option>
                                ))}
                            </select>
                            <button type="submit" className={quietButton}>
                              {CONSOLE_UI.moveConfirm[locale]}
                            </button>
                          </form>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 border-t border-[var(--c-line)] pt-3 text-xs text-[var(--c-text-faint)]">
                    {CONSOLE_UI.noRegistrations[locale]}
                  </p>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[var(--c-line)] pt-3">
                  <span className="text-[10px] tracking-[0.18em] text-[var(--c-text-faint)]">
                    {CONSOLE_UI.grantsLabel[locale].toUpperCase()}
                  </span>
                  {held.map((grant) => (
                    <form key={grant.id} action={revokeGrantAction}>
                      <input type="hidden" name="grantId" value={grant.id} />
                      <button
                        type="submit"
                        className={`${chip} transition-colors hover:border-[#B0442F]/50 hover:text-[#E39A8B]`}
                        title={CONSOLE_UI.revokeGrant[locale]}
                      >
                        {ROLE_LABELS[grant.role][locale]}
                        <span className="text-[9px] text-[var(--c-text-faint)]">
                          {grant.eventTitle ?? CONSOLE_UI.platformWide[locale]}
                        </span>
                        <span aria-hidden="true">×</span>
                      </button>
                    </form>
                  ))}
                  <form
                    action={grantRoleAction}
                    className="flex items-center gap-2"
                  >
                    <input
                      type="hidden"
                      name="accountId"
                      value={participant.id}
                    />
                    <select
                      name="role"
                      aria-label={CONSOLE_UI.grantRole[locale]}
                      defaultValue="viewer"
                      className={selectField}
                    >
                      {ROLES.map((role) => (
                        <option key={role} value={role}>
                          {ROLE_LABELS[role][locale]}
                        </option>
                      ))}
                    </select>
                    <select
                      name="eventSlug"
                      aria-label={CONSOLE_UI.scopeToEvent[locale]}
                      defaultValue=""
                      className={selectField}
                    >
                      <option value="">
                        {CONSOLE_UI.platformWide[locale]}
                      </option>
                      {events.map((event) => (
                        <option key={event.slug} value={event.slug}>
                          {event.title}
                        </option>
                      ))}
                    </select>
                    <button type="submit" className={quietButton}>
                      {CONSOLE_UI.grantRole[locale]}
                    </button>
                  </form>
                  <form action={deleteParticipantAction} className="ms-auto">
                    <input type="hidden" name="id" value={participant.id} />
                    <button
                      type="submit"
                      className={dangerButton}
                      title={CONSOLE_UI.deleteAccountHint[locale]}
                    >
                      {CONSOLE_UI.deleteAccount[locale]}
                    </button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </ConsoleShell>
  );
};

export default ParticipantsPage;
