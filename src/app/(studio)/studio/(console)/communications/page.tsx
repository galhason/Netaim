import { listEvents } from '@/features/events';
import { listAgenda } from '@/features/program';
import {
  DELIVERY_STATUS_LABELS,
  NOTIFICATION_TYPE_LABELS,
  listNotifications,
} from '@/features/notifications';
import {
  CONSOLE_UI,
  CSaveButton,
  CSelectField,
  CTextAreaField,
  CTextField,
  ConsoleShell,
  getStudioCreator,
  getStudioLocale,
} from '@/features/studio';
import { broadcastAnnouncementAction } from '../actions';

/*
 * Communications: the outbox as the team sees it — every message the
 * platform sent per conference, with its channel and delivery status.
 * Broadcast announcements (PRD §4) join with the participant profile
 * system; the note below says so honestly.
 */
const timeLabel = (iso: string | undefined, localeTag: string): string => {
  if (!iso) {
    return '';
  }
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) {
    return '';
  }
  return new Intl.DateTimeFormat(localeTag, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed);
};

interface CommunicationsPageProps {
  searchParams: Promise<{ broadcast?: string }>;
}

const CommunicationsPage = async ({
  searchParams,
}: CommunicationsPageProps) => {
  const { broadcast } = await searchParams;
  const locale = await getStudioLocale();
  const creator = await getStudioCreator();
  const events = await listEvents().catch(() => []);

  const groups = await Promise.all(
    events.map(async (event) => ({
      event,
      messages: await listNotifications(event.slug).catch(() => []),
    })),
  );

  /* targeted audiences (PRD §4.2): every registrable activity, by name */
  const activityOptions = (
    await Promise.all(
      events.map(async (event) => {
        const agenda = await listAgenda(event.slug, locale).catch(() => []);
        return agenda
          .filter(
            (session) =>
              session.sessionType === 'workshop' ||
              session.sessionType === 'tour',
          )
          .map((session) => ({
            value: `${event.slug}::${session.id}`,
            label: `${event.title} — ${session.title}`,
          }));
      }),
    )
  ).flat();

  return (
    <ConsoleShell
      locale={locale}
      userName={creator?.name ?? ''}
      breadcrumb={
        <span className="font-medium text-[var(--c-text)]">
          {CONSOLE_UI.commsTitle[locale]}
        </span>
      }
    >
      <div className="mx-auto flex h-full max-w-3xl flex-col gap-6 overflow-y-auto px-6 py-8">
        <header>
          <h1 className="font-display text-3xl font-medium">
            {CONSOLE_UI.commsTitle[locale]}
          </h1>
          <p className="mt-1 text-sm text-[var(--c-text-soft)]">
            {CONSOLE_UI.commsSub[locale]}
          </p>
        </header>

        {broadcast === 'sent' ? (
          <p className="rounded-xl border border-[var(--c-live)]/35 bg-[var(--c-live)]/10 px-4 py-3 text-[12px] leading-relaxed text-[var(--c-text)]">
            {CONSOLE_UI.broadcastSent[locale]}
          </p>
        ) : null}

        <section className="rounded-xl border border-[var(--c-line)] bg-[var(--c-panel)] p-5">
          <h2 className="mb-4 text-[11px] font-medium tracking-[0.2em] text-[var(--c-text-faint)]">
            {CONSOLE_UI.broadcastCompose[locale].toUpperCase()}
          </h2>
          <form action={broadcastAnnouncementAction} className="flex flex-col gap-4">
            <CSelectField
              name="slug"
              label={CONSOLE_UI.broadcastConference[locale]}
              options={events.map((event) => ({
                value: event.slug,
                label: event.title,
              }))}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <CSelectField
                name="kind"
                label={CONSOLE_UI.broadcastKind[locale]}
                defaultValue="feed"
                options={[
                  { value: 'feed', label: CONSOLE_UI.broadcastKindFeed[locale] },
                  {
                    value: 'banner',
                    label: CONSOLE_UI.broadcastKindBanner[locale],
                  },
                  {
                    value: 'popup',
                    label: CONSOLE_UI.broadcastKindPopup[locale],
                  },
                ]}
              />
              <CSelectField
                name="target"
                label={CONSOLE_UI.broadcastAudience[locale]}
                emptyLabel={CONSOLE_UI.broadcastAudienceAll[locale]}
                options={activityOptions}
              />
            </div>
            <div className="grid gap-5 lg:grid-cols-2">
              <fieldset className="flex flex-col gap-3 rounded-xl border border-[var(--c-line)] p-4">
                <legend className="px-1 text-[10px] font-medium tracking-[0.16em] text-[var(--c-text-faint)]">
                  {CONSOLE_UI.broadcastHeSection[locale]}
                </legend>
                <CTextField
                  name="subjectHe"
                  label={CONSOLE_UI.broadcastSubject[locale]}
                />
                <CTextAreaField
                  name="bodyHe"
                  label={CONSOLE_UI.broadcastBody[locale]}
                />
              </fieldset>
              <fieldset className="flex flex-col gap-3 rounded-xl border border-[var(--c-line)] p-4">
                <legend className="px-1 text-[10px] font-medium tracking-[0.16em] text-[var(--c-text-faint)]">
                  {CONSOLE_UI.broadcastEnSection[locale]}
                </legend>
                <CTextField
                  name="subjectEn"
                  label={CONSOLE_UI.broadcastSubject[locale]}
                />
                <CTextAreaField
                  name="bodyEn"
                  label={CONSOLE_UI.broadcastBody[locale]}
                />
              </fieldset>
            </div>
            <CSaveButton label={CONSOLE_UI.broadcastSend[locale]} />
            <p className="text-[11px] leading-relaxed text-[var(--c-text-faint)]">
              {CONSOLE_UI.broadcastBilingualNote[locale]}{' '}
              {CONSOLE_UI.broadcastFeedNote[locale]}
            </p>
          </form>
        </section>

        {groups.map(({ event, messages }) => (
          <section key={event.id}>
            <h2 className="mb-3 text-[11px] font-medium tracking-[0.2em] text-[var(--c-text-faint)]">
              {event.title.toUpperCase()}
            </h2>
            {messages.length === 0 ? (
              <p className="text-sm text-[var(--c-text-faint)]">
                {CONSOLE_UI.commsEmpty[locale]}
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {messages.map((message) => (
                  <li
                    key={message.id}
                    className="flex items-center gap-4 rounded-xl border border-[var(--c-line)] bg-[var(--c-panel)] px-4 py-3"
                  >
                    <span className="w-24 flex-none text-[11px] tabular-nums text-[var(--c-text-faint)]">
                      {timeLabel(
                        message.sentAt ?? message.createdAt,
                        locale === 'he' ? 'he-IL' : 'en-GB',
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">
                        {message.subject}
                      </span>
                      <span className="block truncate text-xs text-[var(--c-text-soft)]">
                        {NOTIFICATION_TYPE_LABELS[message.type]?.[locale] ??
                          message.type}
                        {message.recipient ? ` · ${message.recipient}` : ''}
                      </span>
                    </span>
                    <span className="ms-auto flex-none rounded-full border border-[var(--c-line-strong)] px-2.5 py-0.5 text-[10px] tracking-widest text-[var(--c-text-soft)]">
                      {DELIVERY_STATUS_LABELS[message.status]?.[locale] ??
                        message.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </ConsoleShell>
  );
};

export default CommunicationsPage;
