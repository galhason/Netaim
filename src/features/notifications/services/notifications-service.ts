import {
  notificationOutbox,
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

/*
 * The broadcast composer (PRD §4): a message from the production —
 * global to every guest, or targeted to the registrants of one
 * activity. Presentation kinds: the quiet feed, the ticker banner at
 * the top of every conference page, or the pop-up that asks for a
 * click. Email delivery joins when a real provider is wired.
 */
export const BROADCAST_TYPE = 'announcement';

export type BroadcastKind = 'feed' | 'banner' | 'popup';

export const broadcastTypeOf = (kind: BroadcastKind): string =>
  kind === 'feed' ? BROADCAST_TYPE : `${BROADCAST_TYPE}.${kind}`;

const MAX_SUBJECT = 140;
const MAX_BODY = 2000;

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
  const type = broadcastTypeOf(input.kind ?? 'feed');
  let recipients: string[] = [''];
  if (input.targetSessionId) {
    recipients = await sessionRegistrationRepository
      .participantsBySession(input.targetSessionId)
      .catch(() => [] as string[]);
    if (recipients.length === 0) {
      return false;
    }
  }
  for (const participantId of recipients) {
    for (const version of versions) {
      await notificationOutbox.enqueue({
        eventSlug: input.eventSlug,
        type,
        locale: version.locale,
        subject: version.subject,
        body: version.body,
        status: 'sent',
        participantId,
      });
    }
  }
  return true;
};

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
  feed.find((entry) => entry.type === type && entry.locale === locale) ??
  feed.find((entry) => entry.type === type) ??
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
