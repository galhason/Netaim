import {
  notificationOutbox,
  participantSessionRepository,
  sendNotification,
  sessionRegistrationRepository,
} from '@/infrastructure';
import { currentParticipant } from '@/features/registration';
import type { NotificationView } from '@/notification-engine';

/*
 * The Studio outbox view. Notifications are produced by domain events at
 * the seam — plus one authored kind: the broadcast announcement below.
 * Delivery is a channel concern.
 */
export const listNotifications = (slug: string): Promise<NotificationView[]> =>
  notificationOutbox.listByEvent(slug);

/*
 * The guest's own feed (PRD §4): broadcasts to everyone, plus messages
 * addressed to this participant alone — never anyone else's.
 */
export const listMyFeed = async (
  slug: string,
): Promise<NotificationView[]> => {
  const me = await currentParticipant().catch(() => null);
  if (!me) {
    return [];
  }
  return notificationOutbox.listFeedFor(slug, me.id);
};

export const BROADCAST_TYPE = 'announcement';

/*
 * Only what the production actually said. The outbox also carries the
 * platform's own bookkeeping — a registration receipt, a sign-in note —
 * and those are records, not news. The Updates card in the personal
 * area and the messages room both speak for the Studio composer alone.
 */
export const isAnnouncement = (type: string): boolean =>
  type === BROADCAST_TYPE || type.startsWith(`${BROADCAST_TYPE}.`);

export const listMyAnnouncements = async (
  slug: string,
): Promise<NotificationView[]> => {
  const feed = await listMyFeed(slug).catch(() => [] as NotificationView[]);
  return feed.filter((entry) => isAnnouncement(entry.type));
};

/*
 * The broadcast composer (PRD §4): a message from the production —
 * global to every guest, or targeted to the registrants of one
 * activity. Presentation kinds: the quiet feed, the ticker banner at
 * the top of every conference page, or the pop-up that asks for a
 * click. Email delivery joins when a real provider is wired.
 */
export type BroadcastKind = 'feed' | 'banner' | 'popup';

export const broadcastTypeOf = (kind: BroadcastKind): string =>
  kind === 'feed' ? BROADCAST_TYPE : `${BROADCAST_TYPE}.${kind}`;

const MAX_SUBJECT = 140;
const MAX_BODY = 2000;

/*
 * How many outbox rows are written concurrently. Wide enough that a
 * large announcement is not serial, narrow enough that it cannot drain
 * the connection pool out from under every other request.
 */
const ENQUEUE_BATCH = 25;

/*
 * One announcement, spoken in every language the platform speaks
 * (Constitution: he/en are equals): each completed version becomes its
 * own outbox row carrying its locale, and every reader surface serves
 * the row matching the guest's chosen language.
 */
export interface BroadcastVersion {
  locale: string;
  subject: string;
  body: string;
}

export interface BroadcastInput {
  eventSlug: string;
  versions: BroadcastVersion[];
  kind?: BroadcastKind;
  /* when set, only the registrants of this activity receive it */
  targetSessionId?: string;
  targetParticipantId?: string;
  /*
   * What the note is about, when a click on it should land somewhere
   * more exact than the conference page: `activity` sends the reader
   * to their own schedule, where the moved or cancelled activity is.
   */
  topic?: 'activity';
}

export const broadcastAnnouncement = async (
  input: BroadcastInput,
): Promise<boolean> => {
  const versions = input.versions
    .map((version) => ({
      locale: version.locale === 'en' ? 'en' : 'he',
      subject: version.subject.trim().slice(0, MAX_SUBJECT),
      body: version.body.trim().slice(0, MAX_BODY),
    }))
    .filter((version) => version.subject !== '' && version.body !== '');
  if (!input.eventSlug || versions.length === 0) {
    return false;
  }
  const base = broadcastTypeOf(input.kind ?? 'feed');
  const type = input.topic ? `${base}.${input.topic}` : base;
  let recipients: string[] = [''];
  if (input.targetParticipantId) {
    recipients = [input.targetParticipantId];
  } else if (input.targetSessionId) {
    recipients = await sessionRegistrationRepository
      .participantsBySession(input.targetSessionId)
      .catch(() => [] as string[]);
    if (recipients.length === 0) {
      return false;
    }
  }
  /*
   * A nested await used to issue one insert per recipient per locale,
   * in sequence: announcing to a 600-person workshop in two languages
   * meant 1,200 serial round trips, with the organizer's request open
   * for all of them. The messages are independent, so they are built
   * first and written in bounded parallel batches — bounded because
   * releasing 1,200 at once would exhaust the connection pool and take
   * the rest of the platform down with it.
   */
  const messages = recipients.flatMap((participantId) =>
    versions.map((version) => ({
      eventSlug: input.eventSlug,
      type,
      locale: version.locale,
      subject: version.subject,
      body: version.body,
      status: 'sent' as const,
      participantId,
    })),
  );

  for (let index = 0; index < messages.length; index += ENQUEUE_BATCH) {
    await Promise.all(
      messages
        .slice(index, index + ENQUEUE_BATCH)
        .map((message) =>
          notificationOutbox.enqueue(message).catch(() => undefined),
        ),
    );
  }
  return true;
};

/*
 * A note addressed to one person, from the platform rather than the
 * production.
 *
 * `broadcastAnnouncement` is the organizer's voice: it always writes the
 * `announcement` type, and every announcement surface — the ticker, the
 * pop-up, the Updates card — reads that type on purpose. A connection
 * request is not news from the production, and dressing it as one would
 * put "someone wants to connect" in the same banner as a room change.
 *
 * So these carry their own type and land in the personal feed only. The
 * enqueue mechanics are shared, and there is no batching here because
 * the audience is exactly one.
 */
export const notifyParticipant = async (input: {
  eventSlug: string;
  participantId: string;
  type: string;
  versions: BroadcastVersion[];
}): Promise<boolean> => {
  const versions = input.versions
    .map((version) => ({
      locale: version.locale === 'en' ? 'en' : 'he',
      subject: version.subject.trim().slice(0, MAX_SUBJECT),
      body: version.body.trim().slice(0, MAX_BODY),
    }))
    .filter((version) => version.subject !== '' && version.body !== '');
  if (!input.eventSlug || !input.participantId || versions.length === 0) {
    return false;
  }
  await Promise.all(
    versions.map((version) =>
      notificationOutbox
        .enqueue({
          eventSlug: input.eventSlug,
          type: input.type,
          locale: version.locale,
          subject: version.subject,
          body: version.body,
          status: 'sent' as const,
          participantId: input.participantId,
        })
        .catch(() => undefined),
    ),
  );
  return true;
};

/*
 * The same news, by email, to the people holding a place in one
 * activity — each in their own language, and only those who have not
 * switched these mails off in their profile (`contactPrefs.scheduleEmails`).
 *
 * The in-app announcement is the record and always goes out; this is
 * the copy that reaches a person who is not looking at the platform
 * when their 14:00 becomes 16:00. It is written to the outbox under its
 * own type, which no reader surface lists — the bell already shows the
 * announcement, and showing the mail beside it would say the same
 * thing twice.
 *
 * Delivered in bounded batches: the SMTP pool holds three connections,
 * and a hall of six hundred released at once would queue in memory and
 * time the organiser's request out. The organiser's save never waits
 * on a mail server — a failure is recorded as `failed` and retried by
 * the dispatcher, and the edit stands either way.
 */
const MAIL_BATCH = 10;

export const emailSessionRegistrants = async (input: {
  eventSlug: string;
  sessionId: string;
  type: string;
  versions: BroadcastVersion[];
  /* Where the button in the mail lands, by language. */
  ctaPath: (locale: 'he' | 'en') => string;
}): Promise<number> => {
  const versions = new Map(
    input.versions
      .map((version) => ({
        locale: version.locale === 'en' ? ('en' as const) : ('he' as const),
        subject: version.subject.trim().slice(0, MAX_SUBJECT),
        body: version.body.trim().slice(0, MAX_BODY),
      }))
      .filter((version) => version.subject !== '' && version.body !== '')
      .map((version) => [version.locale, version] as const),
  );
  if (!input.eventSlug || !input.sessionId || versions.size === 0) {
    return 0;
  }
  const ids = await sessionRegistrationRepository
    .participantsBySession(input.sessionId)
    .catch(() => [] as string[]);
  if (ids.length === 0) {
    return 0;
  }
  const preferences = await participantSessionRepository
    .noticePreferencesByIds(ids)
    .catch(() => []);
  const base = process.env.NEXT_PUBLIC_SERVER_URL?.replace(/\/$/, '') ?? '';
  const messages = preferences.flatMap((person) => {
    if (!person.scheduleEmails) {
      return [];
    }
    const version = versions.get(person.locale) ?? versions.get('he') ?? versions.get('en');
    if (!version) {
      return [];
    }
    return [
      {
        participantId: person.id,
        eventSlug: input.eventSlug,
        type: input.type,
        locale: version.locale,
        subject: version.subject,
        body: `${version.body}\n\n${MAIL_FOOTER[version.locale]}`,
        ...(base
          ? {
              cta: {
                label: version.locale === 'he' ? 'לפעילויות שלי' : 'My activities',
                href: `${base}${input.ctaPath(version.locale)}`,
              },
            }
          : {}),
      },
    ];
  });
  let sent = 0;
  for (let index = 0; index < messages.length; index += MAIL_BATCH) {
    const outcomes = await Promise.all(
      messages
        .slice(index, index + MAIL_BATCH)
        .map((message) => sendNotification(message).catch(() => 'failed' as const)),
    );
    sent += outcomes.filter((status) => status === 'sent').length;
  }
  return sent;
};

/* How to stop these mails — said in every one of them. */
const MAIL_FOOTER = {
  he: 'קיבלתם את המייל הזה כי אתם רשומים לפעילות הזו. אפשר לבטל מיילים על שינויים בפעילויות דרך האזור האישי, בעמוד הפרופיל, תחת "פרטיות ויצירת קשר".',
  en: 'You received this email because you are registered for this activity. You can turn off emails about activity changes in your personal area, on the profile page, under "Privacy & contact".',
} as const;

/*
 * The conference's live spotlight: the latest banner for the ticker,
 * the latest pop-up for the overlay. Personal targeting respected —
 * each guest sees only what was meant for them.
 */
export interface Spotlight {
  banner: NotificationView | null;
  popup: NotificationView | null;
}

const inLocale = (
  feed: NotificationView[],
  type: string,
  locale: string,
): NotificationView | null =>
  /* A topic suffix (`announcement.popup.activity`) is still that kind of note. */
  feed.find((entry) => entry.type.startsWith(type) && entry.locale === locale) ??
  feed.find((entry) => entry.type.startsWith(type)) ??
  null;

export const mySpotlight = async (
  slug: string,
  locale: string,
): Promise<Spotlight> => {
  const feed = await listMyFeed(slug).catch(() => [] as NotificationView[]);
  return {
    banner: inLocale(feed, 'announcement.banner', locale),
    popup: inLocale(feed, 'announcement.popup', locale),
  };
};
