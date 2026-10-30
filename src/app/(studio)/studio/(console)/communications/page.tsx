import { listEvents } from '@/features/events';
import { listConferenceActivities } from '@/features/program';
import type { Locale } from '@/config/locales';
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
  getParticipantsAdmin,
  ConsoleDenied,
  getStudioCreator,
  requireCapability,
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

const t = (he: string, en: string): Record<Locale, string> => ({ he, en });

const COPY = {
  counts: {
    he: (seats: number, waiting: number) => `${seats} רשומים · ${waiting} ברשימת המתנה`,
    en: (seats: number, waiting: number) => `${seats} registered · ${waiting} waiting`,
  } as Record<Locale, (seats: number, waiting: number) => string>,
  segment: t('מי מקבל', 'Who receives it'),
  segmentAll: t('כל הנרשמים (רשומים וממתינים)', 'Everyone with a place (registered and waiting)'),
  segmentConfirmed: t('רק הרשומים', 'Registered only'),
  segmentWaitlisted: t('רק מי שברשימת ההמתנה', 'Waiting list only'),
  segmentNote: t(
    'בלי פעילות נבחרת, "רק מי שברשימת ההמתנה" פונה לכל מי שממתין בפעילות כלשהי בכנס.',
    'With no activity chosen, "waiting list only" reaches everyone waiting for any activity of the conference.',
  ),
  channel: t('ערוץ', 'Channel'),
  channelSite: t('באתר בלבד', 'On the site only'),
  channelEmail: t('במייל בלבד', 'By email only'),
  channelBoth: t('באתר ובמייל', 'On the site and by email'),
  channelNote: t(
    'מייל נשלח רק לקהל מוגדר: פעילות, רשימת המתנה או משתתף אחד. "אופן הצגה" חל על ההודעה באתר.',
    'Email goes to a defined audience only: an activity, a waiting list or one guest. "Presentation" applies to the on-site message.',
  ),
  sentTo: {
    he: (people: string, emails: string) =>
      `ההודעה נשלחה${people ? ` ל-${people} משתתפים` : ''}.${emails ? ` ${emails} מיילים נמסרו לשליחה.` : ''}`,
    en: (people: string, emails: string) =>
      `The message was sent${people ? ` to ${people} guests` : ''}.${emails ? ` ${emails} emails handed to the mail server.` : ''}`,
  } as Record<Locale, (people: string, emails: string) => string>,
  emailEveryone: t(
    'מייל לכל משתתפי הכנס לא נשלח מכאן. בחרו פעילות, רשימת המתנה או משתתף אחד — או שלחו את ההודעה באתר בלבד.',
    'An email to every guest of the conference is not sent from here. Choose an activity, a waiting list or one guest — or send the message on the site only.',
  ),
  nobody: t('אין אף אחד בקהל שנבחר — לא נשלח דבר.', 'No one is in the chosen audience — nothing was sent.'),
  failed: t('ההודעה לא נשלחה. ודאו שמילאתם נושא ותוכן לפחות בשפה אחת.', 'The message was not sent. Make sure a subject and a body are filled in at least one language.'),
};

interface CommunicationsPageProps {
  searchParams: Promise<{ broadcast?: string; people?: string; emails?: string }>;
}

const CommunicationsPage = async ({
  searchParams,
}: CommunicationsPageProps) => {
  const { broadcast, people, emails } = await searchParams;
  const digits = (value: string | undefined): string => (value && /^\d{1,6}$/.test(value) ? value : '');
  const locale = await getStudioLocale();
  const creator = await getStudioCreator();
  if (!(await requireCapability('communications:manage'))) {
    return <ConsoleDenied locale={locale} title={CONSOLE_UI.communications[locale]} userName={creator?.name ?? ''} />;
  }
  const events = await listEvents().catch(() => []);

  const groups = await Promise.all(
    events.map(async (event) => ({
      event,
      messages: await listNotifications(event.slug).catch(() => []),
    })),
  );

  /*
   * Targeted audiences (PRD §4.2): every registrable activity, by name,
   * with how many hold a seat and how many wait — the waiting list is
   * read from the places as they stand, so the count is the audience.
   */
  const activityOptions = (
    await Promise.all(
      events.map(async (event) => {
        const activities = await listConferenceActivities(event.slug, locale).catch(() => []);
        return activities
          .filter(({ session }) => session.sessionType === 'workshop' || session.sessionType === 'tour')
          .map(({ session, counts }) => ({
            value: `${event.slug}::${session.id}`,
            label: `${event.title} — ${session.title} (${COPY.counts[locale](counts.confirmed, counts.waitlisted)})`,
          }));
      }),
    )
  ).flat();

  /* a private message: one named guest, per conference they belong to */
  const eventTitles = new Map(events.map((event) => [event.slug, event.title]));
  const personOptions = (await getParticipantsAdmin().catch(() => []))
    .flatMap((participant) =>
      participant.registrations
        .filter((line) => eventTitles.has(line.eventSlug))
        .map((line) => ({
          value: `${line.eventSlug}::${participant.id}`,
          label: `${participant.name} — ${line.eventTitle}`,
        })),
    )
    .filter(
      (option, index, all) =>
        all.findIndex((other) => other.value === option.value) === index,
    );

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
          <p role="status" className="rounded-xl border border-[var(--c-live)]/35 bg-[var(--c-live)]/10 px-4 py-3 text-[12px] leading-relaxed text-[var(--c-text)]">
            {people || emails !== undefined
              ? COPY.sentTo[locale](digits(people), digits(emails))
              : CONSOLE_UI.broadcastSent[locale]}
          </p>
        ) : null}
        {broadcast === 'emailEveryone' || broadcast === 'nobody' || broadcast === 'failed' ? (
          <p role="alert" className="rounded-xl border border-amber-400/35 bg-amber-400/10 px-4 py-3 text-[12px] leading-relaxed text-[var(--c-text)]">
            {COPY[broadcast][locale]}
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
            <div className="grid gap-4 sm:grid-cols-2">
              <CSelectField
                name="segment"
                label={COPY.segment[locale]}
                emptyLabel={COPY.segmentAll[locale]}
                options={[
                  { value: 'confirmed', label: COPY.segmentConfirmed[locale] },
                  { value: 'waitlisted', label: COPY.segmentWaitlisted[locale] },
                ]}
              />
              <CSelectField
                name="channel"
                label={COPY.channel[locale]}
                emptyLabel={COPY.channelSite[locale]}
                options={[
                  { value: 'email', label: COPY.channelEmail[locale] },
                  { value: 'both', label: COPY.channelBoth[locale] },
                ]}
              />
            </div>
            <p className="-mt-2 text-[11px] leading-relaxed text-[var(--c-text-faint)]">
              {COPY.segmentNote[locale]} {COPY.channelNote[locale]}
            </p>
            <CSelectField
              name="person"
              label={CONSOLE_UI.broadcastPerson[locale]}
              emptyLabel={CONSOLE_UI.broadcastPersonAll[locale]}
              options={personOptions}
            />
            <p className="-mt-2 text-[11px] leading-relaxed text-[var(--c-text-faint)]">
              {CONSOLE_UI.broadcastPersonNote[locale]}
            </p>
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

/*
 * The response depends on who is asking, so it is rendered per request
 * and never prerendered or shared. Declared rather than left to Next to
 * infer from a cookie read: an inferred guard disappears the moment a
 * refactor moves that read behind a helper, and the failure would be a
 * privacy leak that nothing announces.
 */
export const dynamic = 'force-dynamic';

export default CommunicationsPage;
