import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { isSupportedLocale } from '@/config/locales';
import { currentParticipant } from '@/features/registration';
import {
  connectionChannels,
  listDirectory,
  myProfile,
  myConnections,
  myMeetings,
  type ConnectionChannels,
  type MyConnection,
  type MyMeeting,
} from '@/features/networking';
import {
  saveProfileAction,
  manageConnectionAction,
  requestConnectionAction,
  respondConnectionAction,
  proposeMeetingAction,
  confirmMeetingAction,
  cancelMeetingAction,
} from './actions';

interface NetworkingPageProps {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ meetingError?: string }>;
}

const COPY = {
  heading: { he: 'נטוורקינג', en: 'Networking' },
  intro: {
    he: 'הכירו את המשתתפים האחרים. הפרופיל שלכם מופיע כאן רק אם תבחרו להציג אותו.',
    en: 'Meet the other participants. Your profile appears here only if you choose to show it.',
  },
  directory: { he: 'המשתתפים', en: 'Participants' },
  emptyDirectory: {
    he: 'עדיין אין פרופילים גלויים. היו הראשונים.',
    en: 'No visible profiles yet. Be the first.',
  },
  signIn: {
    he: 'כדי ליצור פרופיל, היכנסו לאזור האישי דרך הקישור שקיבלתם.',
    en: 'To create a profile, sign in to your personal area via the link you received.',
  },
  myProfile: { he: 'הפרופיל שלי', en: 'My profile' },
  headline: { he: 'כותרת (תפקיד, ארגון)', en: 'Headline (role, organization)' },
  interests: { he: 'תחומי עניין', en: 'Interests' },
  bio: { he: 'כמה מילים עליי', en: 'A few words about me' },
  link: { he: 'קישור', en: 'Link' },
  linkLabel: { he: 'שם הקישור', en: 'Link label' },
  linkUrl: { he: 'כתובת', en: 'URL' },
  visible: { he: 'להציג אותי בספריית המשתתפים', en: 'Show me in the directory' },
  available: { he: 'פתוח/ה לפגישות', en: 'Open to meetings' },
  save: { he: 'לשמור פרופיל', en: 'Save profile' },
  availableTag: { he: 'פתוח/ה לפגישות', en: 'Open to meetings' },
  requests: { he: 'בקשות התחברות', en: 'Connection requests' },
  connect: { he: 'להתחבר', en: 'Connect' },
  pending: { he: 'ממתין לאישור', en: 'Pending' },
  connected: { he: 'מחוברים', en: 'Connected' },
  accept: { he: 'לאשר', en: 'Accept' },
  decline: { he: 'לדחות', en: 'Decline' },
  meetings: { he: 'הפגישות שלי', en: 'My meetings' },
  proposeMeeting: { he: 'להציע פגישה', en: 'Propose a meeting' },
  withWhom: { he: 'עם מי', en: 'With whom' },
  start: { he: 'התחלה', en: 'Start' },
  end: { he: 'סיום', en: 'End' },
  location: { he: 'מיקום (רשות)', en: 'Location (optional)' },
  propose: { he: 'לשלוח הצעה', en: 'Send proposal' },
  confirmMeeting: { he: 'לאשר', en: 'Confirm' },
  cancelMeeting: { he: 'לבטל', en: 'Cancel' },
  proposedTag: { he: 'הוצעה', en: 'Proposed' },
  confirmedTag: { he: 'מאושרת', en: 'Confirmed' },
  conflict: {
    he: 'הפגישה מתנגשת עם פגישה מאושרת אחרת.',
    en: 'This meeting clashes with another confirmed meeting.',
  },
  needConnection: {
    he: 'אפשר להציע פגישה רק למי שכבר מחוברים אליו.',
    en: 'You can propose a meeting only to people you are already connected with.',
  },
  myConnections: { he: 'הקשרים שלי', en: 'My connections' },
  saveContact: { he: 'שמירת איש קשר', en: 'Save contact' },
  mutedTag: { he: 'מושתק', en: 'Muted' },
  mute: { he: 'השתקה', en: 'Mute' },
  unmute: { he: 'ביטול השתקה', en: 'Unmute' },
  removeConnection: { he: 'הסרת הקשר', en: 'Remove' },
  messageBtn: { he: 'הודעה', en: 'Message' },
  whatsappBtn: { he: 'WhatsApp', en: 'WhatsApp' },
  callBtn: { he: 'טלפון', en: 'Phone' },
  emailBtn: { he: 'אימייל', en: 'Email' },
  scanParticipant: { he: 'סריקת משתתף', en: 'Scan a participant' },
  myBadge: { he: 'התג שלי', en: 'My badge' },
  channelsNote: {
    he: 'כל ערוץ נפתח רק לפי מה שהצד השני אישר.',
    en: 'Each channel opens only as the other side allowed.',
  },
} as const;

const labelClass = 'text-xs tracking-widest text-text-secondary';
const fieldClass = 'border-b border-border bg-transparent py-2 outline-none';

const clock = (iso: string): string => {
  const parsed = Date.parse(iso);
  return Number.isNaN(parsed)
    ? ''
    : new Date(parsed).toISOString().slice(0, 16).replace('T', ' ');
};

const hhmm = (iso: string): string => {
  const parsed = Date.parse(iso);
  return Number.isNaN(parsed)
    ? ''
    : new Date(parsed).toISOString().slice(11, 16);
};

const NetworkingPage = async ({ params, searchParams }: NetworkingPageProps) => {
  const { locale, slug } = await params;
  const { meetingError } = await searchParams;
  if (!isSupportedLocale(locale)) {
    notFound();
  }
  setRequestLocale(locale);

  const participant = await currentParticipant().catch(() => null);
  const [directory, mine, connections, meetings] = await Promise.all([
    listDirectory(slug).catch(() => []),
    participant ? myProfile(slug) : Promise.resolve(null),
    participant ? myConnections(slug) : Promise.resolve([] as MyConnection[]),
    participant ? myMeetings(slug) : Promise.resolve([] as MyMeeting[]),
  ]);

  const accepted = connections.filter(
    (connection) => connection.status === 'accepted' || connection.muted,
  );
  /*
   * Channels per accepted connection (Connection Framework v1.0):
   * re-read on every render so a preference change applies immediately.
   */
  const channelsOf = new Map<string, ConnectionChannels>();
  await Promise.all(
    accepted.map(async (connection) => {
      const channels = await connectionChannels(connection.id).catch(
        () => null,
      );
      if (channels) {
        channelsOf.set(connection.id, channels);
      }
    }),
  );
  const meetable = accepted.filter(
    (connection) => channelsOf.get(connection.id)?.meetings !== false,
  );
  const meId = participant?.id ?? '';
  const activeByOther = new Map<string, MyConnection>();
  for (const connection of connections) {
    if (
      connection.status === 'pending' ||
      connection.status === 'accepted' ||
      connection.muted
    ) {
      activeByOther.set(connection.otherId, connection);
    }
  }
  const incoming = connections.filter(
    (connection) =>
      connection.direction === 'incoming' && connection.status === 'pending',
  );

  const firstLink = mine?.links[0];
  const secondLink = mine?.links[1];

  return (
    <main
      id="main-content"
      className="mx-auto flex w-full max-w-3xl flex-col gap-12 px-6 py-16 md:py-24"
    >
      <section className="flex flex-col gap-3">
        <span aria-hidden="true" className="block h-px w-16 bg-accent" />
        <h1 className="font-display text-4xl font-medium leading-tight">
          {COPY.heading[locale]}
        </h1>
        <p className="text-text-secondary">{COPY.intro[locale]}</p>
        {participant ? (
          <span className="flex flex-wrap gap-2">
            <a
              href={`/${locale}/me/scan`}
              className="inline-flex min-h-10 items-center rounded-full bg-accent px-5 text-sm font-medium text-brand-contrast"
            >
              {COPY.scanParticipant[locale]}
            </a>
            <a
              href={`/${locale}/me/badge`}
              className="inline-flex min-h-10 items-center rounded-full border border-border px-5 text-sm transition-colors hover:border-accent hover:text-accent"
            >
              {COPY.myBadge[locale]}
            </a>
          </span>
        ) : null}
      </section>

      {participant && incoming.length > 0 ? (
        <section className="flex flex-col gap-4">
          <h2 className="font-display text-xl font-medium">
            {COPY.requests[locale]}
          </h2>
          <ul className="flex flex-col">
            {incoming.map((connection) => (
              <li
                key={connection.id}
                className="flex flex-col gap-2 border-t border-border py-4"
              >
                <span className="font-medium">{connection.otherName}</span>
                {connection.message ? (
                  <p className="text-sm text-text-secondary">
                    {connection.message}
                  </p>
                ) : null}
                <div className="flex flex-wrap items-center gap-4">
                  <form action={respondConnectionAction}>
                    <input type="hidden" name="slug" value={slug} />
                    <input type="hidden" name="locale" value={locale} />
                    <input
                      type="hidden"
                      name="connectionId"
                      value={connection.id}
                    />
                    <input type="hidden" name="response" value="accept" />
                    <button
                      type="submit"
                      className="inline-flex min-h-10 items-center rounded-lg bg-brand px-5 text-sm font-medium text-brand-contrast"
                    >
                      {COPY.accept[locale]}
                    </button>
                  </form>
                  <form action={respondConnectionAction}>
                    <input type="hidden" name="slug" value={slug} />
                    <input type="hidden" name="locale" value={locale} />
                    <input
                      type="hidden"
                      name="connectionId"
                      value={connection.id}
                    />
                    <input type="hidden" name="response" value="decline" />
                    <button
                      type="submit"
                      className="inline-flex min-h-10 items-center text-sm text-text-secondary hover:text-text-primary"
                    >
                      {COPY.decline[locale]}
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {participant ? (
        <section className="flex flex-col gap-4">
          <h2 className="font-display text-xl font-medium">
            {COPY.meetings[locale]}
          </h2>
          {meetingError === 'conflict' ? (
            <p className="text-sm text-accent">{COPY.conflict[locale]}</p>
          ) : null}
          {meetings.length > 0 ? (
            <ul className="flex flex-col">
              {meetings.map((meeting) => (
                <li
                  key={meeting.id}
                  className="flex flex-col gap-1 border-t border-border py-4"
                >
                  <div className="flex flex-wrap items-baseline gap-x-4">
                    <span className="font-medium">{meeting.otherName}</span>
                    <span className="text-xs tracking-widest text-text-secondary">
                      {meeting.status === 'confirmed'
                        ? COPY.confirmedTag[locale]
                        : COPY.proposedTag[locale]}
                    </span>
                  </div>
                  <span className="text-sm tabular-nums text-text-secondary">
                    {clock(meeting.startsAt)}
                    {meeting.endsAt ? `–${hhmm(meeting.endsAt)}` : ''}
                  </span>
                  {meeting.location ? (
                    <span className="text-sm text-text-secondary">
                      {meeting.location}
                    </span>
                  ) : null}
                  <div className="flex flex-wrap items-center gap-4 pt-1">
                    {meeting.status === 'proposed' &&
                    meeting.role === 'guest' ? (
                      <form action={confirmMeetingAction}>
                        <input type="hidden" name="slug" value={slug} />
                        <input type="hidden" name="locale" value={locale} />
                        <input
                          type="hidden"
                          name="meetingId"
                          value={meeting.id}
                        />
                        <button
                          type="submit"
                          className="inline-flex min-h-10 items-center rounded-lg bg-brand px-5 text-sm font-medium text-brand-contrast"
                        >
                          {COPY.confirmMeeting[locale]}
                        </button>
                      </form>
                    ) : null}
                    <form action={cancelMeetingAction}>
                      <input type="hidden" name="slug" value={slug} />
                      <input type="hidden" name="locale" value={locale} />
                      <input
                        type="hidden"
                        name="meetingId"
                        value={meeting.id}
                      />
                      <button
                        type="submit"
                        className="inline-flex min-h-10 items-center text-sm text-text-secondary hover:text-text-primary"
                      >
                        {COPY.cancelMeeting[locale]}
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}

          {accepted.length > 0 ? (
            <div className="flex flex-col gap-2 border-t border-border pt-4">
              <h3 className="text-xs font-medium tracking-widest text-text-secondary">
                {COPY.myConnections[locale]}
              </h3>
              <ul className="flex flex-col gap-3">
                {accepted.map((connection) => {
                  const channels = channelsOf.get(connection.id);
                  const pill =
                    'inline-flex min-h-9 items-center rounded-full border border-border px-3.5 text-xs transition-colors hover:border-accent hover:text-accent';
                  return (
                    <li
                      key={connection.id}
                      className="flex flex-col gap-2 rounded-xl border border-border p-3.5"
                    >
                      <span className="flex flex-wrap items-center gap-3">
                        <span className="text-sm font-medium">
                          {connection.otherName}
                        </span>
                        <span className="rounded-full border border-border px-2.5 py-0.5 text-[10px] tracking-widest text-text-secondary">
                          {connection.muted
                            ? COPY.mutedTag[locale]
                            : COPY.connected[locale]}
                        </span>
                        <span className="ms-auto flex items-center gap-2">
                          <form action={manageConnectionAction}>
                            <input type="hidden" name="locale" value={locale} />
                            <input type="hidden" name="slug" value={slug} />
                            <input
                              type="hidden"
                              name="connectionId"
                              value={connection.id}
                            />
                            <input
                              type="hidden"
                              name="manage"
                              value={connection.muted ? 'unmute' : 'mute'}
                            />
                            <button
                              type="submit"
                              className="text-xs text-text-secondary underline underline-offset-4 transition-colors hover:text-accent"
                            >
                              {connection.muted
                                ? COPY.unmute[locale]
                                : COPY.mute[locale]}
                            </button>
                          </form>
                          <form action={manageConnectionAction}>
                            <input type="hidden" name="locale" value={locale} />
                            <input type="hidden" name="slug" value={slug} />
                            <input
                              type="hidden"
                              name="connectionId"
                              value={connection.id}
                            />
                            <input type="hidden" name="manage" value="remove" />
                            <button
                              type="submit"
                              className="text-xs text-text-secondary underline underline-offset-4 transition-colors hover:text-accent"
                            >
                              {COPY.removeConnection[locale]}
                            </button>
                          </form>
                        </span>
                      </span>
                      <span className="flex flex-wrap items-center gap-2">
                        <a
                          href={`/${locale}/me/chat/${connection.id}`}
                          className={pill}
                        >
                          {COPY.messageBtn[locale]}
                        </a>
                        {channels?.whatsapp ? (
                          <a
                            href={`/${locale}/me/wa/${connection.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={pill}
                          >
                            {COPY.whatsappBtn[locale]}
                          </a>
                        ) : null}
                        {channels?.phone ? (
                          <a
                            href={`tel:${channels.phone}`}
                            className={pill}
                            dir="ltr"
                          >
                            {COPY.callBtn[locale]} · {channels.phone}
                          </a>
                        ) : null}
                        {channels?.email ? (
                          <a href={`mailto:${channels.email}`} className={pill}>
                            {COPY.emailBtn[locale]}
                          </a>
                        ) : null}
                        <a
                          href={`/${locale}/me/contact/${connection.id}`}
                          download
                          className="ms-auto text-xs text-accent underline underline-offset-4 transition-opacity hover:opacity-75"
                        >
                          {COPY.saveContact[locale]} ↓
                        </a>
                      </span>
                    </li>
                  );
                })}
              </ul>
              <p className="text-xs text-text-secondary">
                {COPY.channelsNote[locale]}
              </p>
            </div>
          ) : null}

          {accepted.length > 0 ? (
            <details className="flex flex-col gap-4 border-t border-border pt-4">
              <summary className="cursor-pointer text-xs font-medium tracking-widest text-text-secondary">
                {COPY.proposeMeeting[locale]}
              </summary>
              <form
                action={proposeMeetingAction}
                className="mt-4 flex max-w-xl flex-col gap-6"
              >
                <input type="hidden" name="slug" value={slug} />
                <input type="hidden" name="locale" value={locale} />

                <label className="flex flex-col gap-1.5">
                  <span className={labelClass}>{COPY.withWhom[locale]}</span>
                  <select name="guestId" className={fieldClass}>
                    {meetable.map((connection) => (
                      <option key={connection.otherId} value={connection.otherId}>
                        {connection.otherName}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="flex flex-wrap gap-x-6 gap-y-4">
                  <label className="flex flex-1 flex-col gap-1.5">
                    <span className={labelClass}>{COPY.start[locale]}</span>
                    <input
                      type="datetime-local"
                      name="startsAt"
                      required
                      className={fieldClass}
                    />
                  </label>
                  <label className="flex flex-1 flex-col gap-1.5">
                    <span className={labelClass}>{COPY.end[locale]}</span>
                    <input
                      type="datetime-local"
                      name="endsAt"
                      required
                      className={fieldClass}
                    />
                  </label>
                </div>

                <label className="flex flex-col gap-1.5">
                  <span className={labelClass}>{COPY.location[locale]}</span>
                  <input type="text" name="location" className={fieldClass} />
                </label>

                <button
                  type="submit"
                  className="inline-flex min-h-12 items-center justify-center self-start rounded-lg bg-brand px-8 font-medium text-brand-contrast"
                >
                  {COPY.propose[locale]}
                </button>
              </form>
            </details>
          ) : (
            <p className="text-sm text-text-secondary">
              {COPY.needConnection[locale]}
            </p>
          )}
        </section>
      ) : null}

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-xl font-medium">
          {COPY.directory[locale]}
        </h2>
        {directory.length === 0 ? (
          <p className="text-sm text-text-secondary">
            {COPY.emptyDirectory[locale]}
          </p>
        ) : (
          <ul className="flex flex-col">
            {directory.map((profile) => {
              const isSelf = profile.participantId === meId;
              const conn = activeByOther.get(profile.participantId);
              return (
              <li
                key={profile.id}
                className="flex flex-col gap-1 border-t border-border py-5"
              >
                <div className="flex flex-wrap items-baseline gap-x-4">
                  <span className="font-display text-lg font-medium">
                    {profile.participantName}
                  </span>
                  {profile.availableForMeetings ? (
                    <span className="text-xs tracking-widest text-accent">
                      {COPY.availableTag[locale]}
                    </span>
                  ) : null}
                  {participant && !isSelf ? (
                    conn?.status === 'accepted' || conn?.muted ? (
                      <span className="text-xs tracking-widest text-text-secondary">
                        {COPY.connected[locale]}
                      </span>
                    ) : conn?.status === 'pending' ? (
                      <span className="text-xs tracking-widest text-text-secondary">
                        {COPY.pending[locale]}
                      </span>
                    ) : (
                      <form action={requestConnectionAction} className="inline">
                        <input type="hidden" name="slug" value={slug} />
                        <input type="hidden" name="locale" value={locale} />
                        <input
                          type="hidden"
                          name="addresseeId"
                          value={profile.participantId}
                        />
                        <button
                          type="submit"
                          className="text-xs tracking-widest text-accent hover:underline"
                        >
                          {COPY.connect[locale]}
                        </button>
                      </form>
                    )
                  ) : null}
                </div>
                {profile.headline ? (
                  <span className="text-sm">{profile.headline}</span>
                ) : null}
                {profile.interests ? (
                  <span className="text-sm text-text-secondary">
                    {profile.interests}
                  </span>
                ) : null}
                {profile.bio ? (
                  <p className="text-sm text-text-secondary">{profile.bio}</p>
                ) : null}
                {profile.links.length > 0 ? (
                  <div className="flex flex-wrap gap-x-4 text-sm">
                    {profile.links.map((link) => (
                      <span key={link.url} className="text-text-secondary">
                        {link.label || link.url}
                      </span>
                    ))}
                  </div>
                ) : null}
              </li>
              );
            })}
          </ul>
        )}
      </section>

      {participant ? (
        <section className="flex flex-col gap-4 border-t border-border pt-8">
          <h2 className="font-display text-xl font-medium">
            {COPY.myProfile[locale]}
          </h2>
          <form
            action={saveProfileAction}
            className="flex max-w-xl flex-col gap-6"
          >
            <input type="hidden" name="slug" value={slug} />
            <input type="hidden" name="locale" value={locale} />

            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>{COPY.headline[locale]}</span>
              <input
                type="text"
                name="headline"
                defaultValue={mine?.headline ?? ''}
                className={fieldClass}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>{COPY.interests[locale]}</span>
              <input
                type="text"
                name="interests"
                defaultValue={mine?.interests ?? ''}
                className={fieldClass}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>{COPY.bio[locale]}</span>
              <textarea
                name="bio"
                rows={3}
                defaultValue={mine?.bio ?? ''}
                className={`${fieldClass} resize-none`}
              />
            </label>

            <div className="flex flex-wrap gap-x-6 gap-y-4">
              <label className="flex flex-1 flex-col gap-1.5">
                <span className={labelClass}>{COPY.linkLabel[locale]}</span>
                <input
                  type="text"
                  name="linkLabel1"
                  defaultValue={firstLink?.label ?? ''}
                  className={fieldClass}
                />
              </label>
              <label className="flex flex-1 flex-col gap-1.5">
                <span className={labelClass}>
                  {COPY.linkUrl[locale]} 1
                </span>
                <input
                  type="url"
                  name="linkUrl1"
                  defaultValue={firstLink?.url ?? ''}
                  className={fieldClass}
                />
              </label>
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-4">
              <label className="flex flex-1 flex-col gap-1.5">
                <span className={labelClass}>{COPY.linkLabel[locale]}</span>
                <input
                  type="text"
                  name="linkLabel2"
                  defaultValue={secondLink?.label ?? ''}
                  className={fieldClass}
                />
              </label>
              <label className="flex flex-1 flex-col gap-1.5">
                <span className={labelClass}>
                  {COPY.linkUrl[locale]} 2
                </span>
                <input
                  type="url"
                  name="linkUrl2"
                  defaultValue={secondLink?.url ?? ''}
                  className={fieldClass}
                />
              </label>
            </div>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                name="visible"
                defaultChecked={mine?.visible ?? false}
                className="size-4"
              />
              <span>{COPY.visible[locale]}</span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                name="availableForMeetings"
                defaultChecked={mine?.availableForMeetings ?? false}
                className="size-4"
              />
              <span>{COPY.available[locale]}</span>
            </label>

            <button
              type="submit"
              className="inline-flex min-h-12 items-center justify-center self-start rounded-lg bg-brand px-8 font-medium text-brand-contrast"
            >
              {COPY.save[locale]}
            </button>
          </form>
        </section>
      ) : (
        <section className="border-t border-border pt-8">
          <p className="text-sm text-text-secondary">{COPY.signIn[locale]}</p>
        </section>
      )}
    </main>
  );
};

export default NetworkingPage;
