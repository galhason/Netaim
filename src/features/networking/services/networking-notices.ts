import { notifyParticipant } from '@/features/notifications';

/*
 * What the platform tells someone about their connections.
 *
 * The request banner has promised "we will let you know when it is
 * accepted" since the feature was written, and nothing was ever sent —
 * no email, no record, nothing in the feed. The only way to learn that
 * someone wanted to meet you was to open the page and look.
 *
 * These notices close that. Three rules hold them together:
 *
 * **Recording never blocks the act.** A connection is made or accepted
 * whether or not the note is written; every call site swallows failure.
 * The same reasoning as the audit trail — a bookkeeping error must not
 * undo something that already happened between two people.
 *
 * **They are not announcements.** A note about one person's request has
 * its own type, so it reaches the personal feed and never the ticker
 * that carries room changes and production news.
 *
 * **Both languages, always.** The reader's locale is not known when the
 * note is written — they may read it tomorrow, in the other language —
 * so each is written twice and the feed serves the matching one.
 */
export const CONNECTION_REQUESTED = 'networking.connectionRequested';
export const CONNECTION_ACCEPTED = 'networking.connectionAccepted';
export const MEETING_PROPOSED = 'networking.meetingProposed';

export const noticeConnectionRequested = (
  eventSlug: string,
  addresseeId: string,
  requesterName: string,
): Promise<boolean> =>
  notifyParticipant({
    eventSlug,
    participantId: addresseeId,
    type: CONNECTION_REQUESTED,
    versions: [
      {
        locale: 'he',
        subject: 'בקשת התחברות חדשה',
        body: `${requesterName} מבקש/ת להתחבר אתכם. אפשר לאשר או לדחות באזור הקהילה.`,
      },
      {
        locale: 'en',
        subject: 'A new connection request',
        body: `${requesterName} would like to connect with you. Accept or decline from your community page.`,
      },
    ],
  }).catch(() => false);

export const noticeConnectionAccepted = (
  eventSlug: string,
  requesterId: string,
  addresseeName: string,
): Promise<boolean> =>
  notifyParticipant({
    eventSlug,
    participantId: requesterId,
    type: CONNECTION_ACCEPTED,
    versions: [
      {
        locale: 'he',
        subject: 'הבקשה שלכם אושרה',
        body: `${addresseeName} אישר/ה את בקשת ההתחברות. אפשר להתחיל לשוחח.`,
      },
      {
        locale: 'en',
        subject: 'Your request was accepted',
        body: `${addresseeName} accepted your connection request. You can start a conversation.`,
      },
    ],
  }).catch(() => false);

export const noticeMeetingProposed = (
  eventSlug: string,
  guestId: string,
  hostName: string,
): Promise<boolean> =>
  notifyParticipant({
    eventSlug,
    participantId: guestId,
    type: MEETING_PROPOSED,
    versions: [
      {
        locale: 'he',
        subject: 'הוצעה לכם פגישה',
        body: `${hostName} הציע/ה להיפגש. אפשר לאשר, להציע מועד אחר או לבטל.`,
      },
      {
        locale: 'en',
        subject: 'A meeting was proposed',
        body: `${hostName} suggested a meeting. You can confirm, suggest another time, or cancel.`,
      },
    ],
  }).catch(() => false);
