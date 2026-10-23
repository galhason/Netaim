import Link from 'next/link';
import { listAllGrants, rolesGrantableBy } from '@/features/access';
import type { AccountGrantView } from '@/features/access';
import { listEvents } from '@/features/events';
import {
  CONSOLE_UI,
  ConsoleShell,
  getParticipantsAdmin,
  getStudioAccess,
  getStudioCreator,
  getStudioLocale,
  requireCapability,
} from '@/features/studio';
import { countOpenReports } from '@/features/networking';
import { PASSWORD_POLICY_TEXT } from '@/features/registration';
import { ROLE_LABELS, can, mayRevokeRole } from '@/permission-engine';
import {
  cancelParticipantRegistrationAction,
  deleteParticipantAction,
  grantRoleAction,
  moveParticipantRegistrationAction,
  renameParticipantAction,
  revokeGrantAction,
  toggleParticipantBlockedAction,
  updateParticipantAccountAction,
} from '../actions';
import { chip, dangerButton, fieldLabel, quietButton, selectField, textField } from './ui';
import PeopleSearch, { SEARCH_COPY } from './people-search';
import PersonDetails from './person-details';
import {
  activityChoices,
  filterParticipants,
  isFiltered,
  readCriteria,
} from '@/features/studio/services/participant-search';

/*
 * Accounts in the Studio (approved decision §8): every registered
 * person — their conferences, their access, and the door switch.
 * Grants, registration moves and deletion all run through capability-
 * checked actions; the panel itself decides nothing.
 */
interface ParticipantsPageProps {
  searchParams: Promise<{
    grants?: string;
    move?: string;
    delete?: string;
    account?: string;
    for?: string;
    q?: string;
    conference?: string;
    place?: string;
    activity?: string;
    who?: string;
  }>;
}

/*
 * What the account form has to say back, in the words of what happened.
 * A weak password is a half-success: the details were saved and the
 * policy is quoted, so the Admin knows what to type next.
 */
const ACCOUNT_NOTES = {
  saved: { tone: 'ok', text: CONSOLE_UI.accountSavedNote },
  password: { tone: 'ok', text: CONSOLE_UI.accountPasswordNote },
  taken: { tone: 'danger', text: CONSOLE_UI.accountTakenNote },
  invalid: { tone: 'danger', text: CONSOLE_UI.accountInvalidNote },
  weak: { tone: 'danger', text: CONSOLE_UI.accountWeakNote },
  failed: { tone: 'danger', text: CONSOLE_UI.accountFailedNote },
  protected: { tone: 'danger', text: CONSOLE_UI.accountProtectedNote },
} as const;

const accountNote = (state: string | undefined) =>
  state && state in ACCOUNT_NOTES ? ACCOUNT_NOTES[state as keyof typeof ACCOUNT_NOTES] : null;

/* A refused grant change, said in the words of the rule that refused it. */
const GRANT_NOTES = {
  lastOwner: CONSOLE_UI.lastOwnerNote,
  lastDeveloper: CONSOLE_UI.lastDeveloperNote,
  forbidden: CONSOLE_UI.developerOnlyNote,
  protected: CONSOLE_UI.protectedAccountNote,
  blockProtected: CONSOLE_UI.blockProtectedNote,
} as const;

const grantNote = (state: string | undefined) =>
  state && state in GRANT_NOTES ? GRANT_NOTES[state as keyof typeof GRANT_NOTES] : null;

const ParticipantsPage = async ({ searchParams }: ParticipantsPageProps) => {
  const params = await searchParams;
  const { grants: grantsState, move: moveState, delete: deleteState, account: accountState, for: accountFor } = params;
  const criteria = readCriteria(params);
  const locale = await getStudioLocale();
  const creator = await getStudioCreator();
  const access = await getStudioAccess();
  const actorGrants = access?.grants ?? [];
  /* The keys to an account — the Admin's alone. */
  const holdsKeys = can(actorGrants, 'participants:credentials');
  const note = accountNote(accountState);
  const [participants, allGrants, events, openReports, grantable] = await Promise.all([
    getParticipantsAdmin().catch(() => []),
    listAllGrants(),
    listEvents().catch(() => []),
    requireCapability('participants:manage')
      .then((reader) => (reader ? countOpenReports() : 0))
      .catch(() => 0),
    rolesGrantableBy(actorGrants, can(actorGrants, 'access:manage')),
  ]);

  const grantsByAccount = new Map<string, AccountGrantView[]>();
  for (const grant of allGrants) {
    const held = grantsByAccount.get(grant.accountId) ?? [];
    held.push(grant);
    grantsByAccount.set(grant.accountId, held);
  }
  const shown = filterParticipants(participants, criteria, new Set(grantsByAccount.keys()));

  return (
    <ConsoleShell
      locale={locale}
      userName={creator?.name ?? ''}
      openReports={openReports}
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

        {grantNote(grantsState) ? (
          <p className="rounded-xl border border-[var(--c-danger)]/40 bg-[var(--c-danger)]/10 px-4 py-3 text-sm text-[var(--c-danger-text)]">
            {grantNote(grantsState)?.[locale]}
          </p>
        ) : null}
        {moveState === 'failed' ? (
          <p className="rounded-xl border border-[var(--c-danger)]/40 bg-[var(--c-danger)]/10 px-4 py-3 text-sm text-[var(--c-danger-text)]">
            {CONSOLE_UI.moveFailedNote[locale]}
          </p>
        ) : null}
        {deleteState === 'failed' ? (
          <p className="rounded-xl border border-[var(--c-danger)]/40 bg-[var(--c-danger)]/10 px-4 py-3 text-sm text-[var(--c-danger-text)]">
            {CONSOLE_UI.deleteFailedNote[locale]}
          </p>
        ) : null}

        <PeopleSearch
          locale={locale}
          criteria={criteria}
          conferences={events.map((event) => ({ slug: event.slug, title: event.title }))}
          activities={activityChoices(participants)}
          shown={shown.length}
          total={participants.length}
          filtered={isFiltered(criteria)}
        />
        {shown.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[var(--c-line)] px-4 py-6 text-center text-sm text-[var(--c-text-faint)]">
            {SEARCH_COPY.nothing[locale]}
          </p>
        ) : null}

        <ul className="flex flex-col gap-3">
          {shown.map((participant) => {
            const held = grantsByAccount.get(participant.id) ?? [];
            return (
              <li
                key={participant.id}
                className={`rounded-xl border bg-[var(--c-panel)] px-5 py-4 ${
                  participant.blocked
                    ? 'border-[var(--c-danger)]/40'
                    : 'border-[var(--c-line)]'
                }`}
              >
                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className={`grid size-9 flex-none place-items-center rounded-full text-sm font-medium ${
                      participant.blocked
                        ? 'bg-[var(--c-danger)]/20 text-[var(--c-danger-text)]'
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
                      {participant.role ? ` · ${participant.role}` : ''}
                    </span>
                  </span>
                  {participant.blocked ? (
                    <span className="rounded-full border border-[var(--c-danger)]/50 px-2.5 py-0.5 text-[10px] tracking-widest text-[var(--c-danger-text)]">
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
                      className="w-36 rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm text-[var(--c-text)] transition-colors focus:border-[var(--c-bronze)]/60 focus:bg-[rgba(7,19,36,0.6)] focus:outline-none"
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
                          : 'border-[var(--c-danger)]/50 text-[var(--c-danger-text)] hover:bg-[var(--c-danger)]/10'
                      }`}
                    >
                      {participant.blocked
                        ? CONSOLE_UI.unblock[locale]
                        : CONSOLE_UI.block[locale]}
                    </button>
                  </form>
                </div>

                <PersonDetails person={participant} locale={locale} />

                {holdsKeys ? (
                  <details
                    id={`keys-${participant.id}`}
                    open={accountFor === participant.id}
                    className="mt-3 rounded-lg border border-[var(--c-line)] bg-[rgba(7,19,36,0.35)]"
                  >
                    <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-[var(--c-text-soft)] hover:text-[var(--c-text)]">
                      {CONSOLE_UI.accountEdit[locale]}
                      <span className="ms-2 text-[10px] font-normal text-[var(--c-text-faint)]">
                        {participant.hasPassword
                          ? CONSOLE_UI.accountHasPassword[locale]
                          : CONSOLE_UI.accountNoPassword[locale]}
                      </span>
                    </summary>
                    <form action={updateParticipantAccountAction} className="flex flex-col gap-3 border-t border-[var(--c-line)] px-3 py-3">
                      <input type="hidden" name="id" value={participant.id} />
                      <p className="text-xs text-[var(--c-text-faint)]">{CONSOLE_UI.accountEditHint[locale]}</p>
                      {note && accountFor === participant.id ? (
                        <p
                          role="status"
                          className={`rounded-lg border px-3 py-2 text-xs ${
                            note.tone === 'ok'
                              ? 'border-[var(--c-live)]/40 bg-[var(--c-live)]/10 text-[var(--c-live)]'
                              : 'border-[var(--c-danger)]/40 bg-[var(--c-danger)]/10 text-[var(--c-danger-text)]'
                          }`}
                        >
                          {note.text[locale]}
                          {accountState === 'weak' ? PASSWORD_POLICY_TEXT[locale] : ''}
                        </p>
                      ) : null}
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label>
                          <span className={fieldLabel}>{CONSOLE_UI.accountEmail[locale]}</span>
                          <input
                            name="email"
                            type="email"
                            required
                            dir="ltr"
                            autoComplete="off"
                            defaultValue={participant.email}
                            className={`${textField} mt-1`}
                          />
                        </label>
                        <label>
                          <span className={fieldLabel}>{CONSOLE_UI.accountPhone[locale]}</span>
                          <input
                            name="phone"
                            type="tel"
                            dir="ltr"
                            autoComplete="off"
                            defaultValue={participant.phone}
                            className={`${textField} mt-1`}
                          />
                        </label>
                        <label className="sm:col-span-2">
                          <span className={fieldLabel}>{CONSOLE_UI.accountPassword[locale]}</span>
                          <input
                            name="password"
                            type="text"
                            dir="ltr"
                            autoComplete="off"
                            spellCheck={false}
                            minLength={8}
                            className={`${textField} mt-1 font-mono`}
                          />
                          <span className="mt-1 block text-[11px] text-[var(--c-text-faint)]">
                            {CONSOLE_UI.accountPasswordHint[locale]}
                          </span>
                        </label>
                      </div>
                      <div>
                        <button type="submit" className={quietButton}>
                          {CONSOLE_UI.accountSave[locale]}
                        </button>
                      </div>
                    </form>
                  </details>
                ) : null}

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
                              ? `/studio/conference/${line.eventSlug}/content`
                              : '/studio'
                          }
                          className={`${chip} transition-colors hover:border-[var(--c-bronze)]/50 hover:text-[var(--c-text)]`}
                        >
                          {line.eventTitle}
                          <span className="text-[9px] tracking-widest text-[var(--c-text-faint)]">
                            {line.status.toUpperCase()}
                          </span>
                        </Link>
                        {/* Asked twice: one press used to release a guest's place. */}
                        <details className="group">
                          <summary className={`${dangerButton} cursor-pointer list-none`}>
                            {CONSOLE_UI.cancelRegistration[locale]}
                          </summary>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className="text-[11px] text-[var(--c-text-soft)]">
                              {CONSOLE_UI.confirmCancelRegistrationNote[locale]}
                            </span>
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
                              {CONSOLE_UI.confirmCancelRegistration[locale]}
                            </button>
                          </form>
                          </div>
                        </details>
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
                  {held.map((grant) =>
                    mayRevokeRole(actorGrants, grant.role) ? (
                    <form key={grant.id} action={revokeGrantAction}>
                      <input type="hidden" name="grantId" value={grant.id} />
                      <button
                        type="submit"
                        className={`${chip} transition-colors hover:border-[var(--c-danger)]/50 hover:text-[var(--c-danger-text)]`}
                        title={CONSOLE_UI.revokeGrant[locale]}
                      >
                        {ROLE_LABELS[grant.role][locale]}
                        <span className="text-[9px] text-[var(--c-text-faint)]">
                          {grant.eventTitle ?? CONSOLE_UI.platformWide[locale]}
                        </span>
                        <span aria-hidden="true">×</span>
                      </button>
                    </form>
                    ) : (
                      <span key={grant.id} className={chip}>
                        {ROLE_LABELS[grant.role][locale]}
                        <span className="text-[9px] text-[var(--c-text-faint)]">
                          {grant.eventTitle ?? CONSOLE_UI.platformWide[locale]}
                        </span>
                      </span>
                    ),
                  )}
                  {grantable.length > 0 ? (
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
                      defaultValue="editor"
                      className={selectField}
                    >
                      {grantable.map((role) => (
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
                  ) : null}
                  {/*
                    * Deleting an account is permanent and asked twice: the
                    * button sat beside the grant chips, and one press used
                    * to remove a person and everything they had.
                    */}
                  <details className="ms-auto">
                    <summary
                      className={`${dangerButton} cursor-pointer list-none`}
                      title={CONSOLE_UI.deleteAccountHint[locale]}
                    >
                      {CONSOLE_UI.deleteAccount[locale]}
                    </summary>
                    <form action={deleteParticipantAction} className="mt-2 flex flex-col items-end gap-2">
                      <input type="hidden" name="id" value={participant.id} />
                      <span className="max-w-xs text-end text-[11px] text-[var(--c-text-soft)]">
                        {CONSOLE_UI.confirmDeleteAccountNote[locale]} <strong>{participant.name || participant.email}</strong>
                      </span>
                      <button type="submit" className={dangerButton}>
                        {CONSOLE_UI.confirmDeleteAccount[locale]}
                      </button>
                    </form>
                  </details>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
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

export default ParticipantsPage;
