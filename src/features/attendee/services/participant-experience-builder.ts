import type { Locale } from '@/config/locales';
import type { EventSummary, PortalEvent } from '@/features/events';
import type { NetworkingProfileSummary } from '@/features/networking';
import type {
  SessionRegistrationSummary,
  SessionSummary,
} from '@/features/program';
import type { FellowParticipant } from '@/infrastructure';
import type { NotificationView } from '@/notification-engine';
import type { RegistrationStatus } from '@/registration-engine';
import { formatDayLabel, formatLongDate, formatTimeLabel } from '@/shared';
import type {
  AttendeeDayMoment,
  AttendeeExperienceContent,
  AttendeePerson,
  AttendeeUpdate,
} from '../types/attendee-experience';

const STATUS_LABEL: Record<RegistrationStatus, Record<Locale, string>> = {
  confirmed: { he: 'רשומ/ה', en: 'Registered' },
  pending: { he: 'ממתין/ה לאישור', en: 'Awaiting approval' },
  waitlisted: { he: 'ברשימת המתנה', en: 'On the waiting list' },
  attended: { he: 'נכח/ה', en: 'Attended' },
  cancelled: { he: 'בוטל', en: 'Cancelled' },
  declined: { he: 'לא אושר', en: 'Not approved' },
  expired: { he: 'פג תוקף', en: 'Expired' },
  noShow: { he: 'לא הגיע/ה', en: 'Did not attend' },
};

/*
 * A workshop place that still holds the guest's seat marks the session
 * as theirs on the timeline.
 */
const HOLDING_STATUSES: readonly RegistrationStatus[] = [
  'confirmed',
  'pending',
  'waitlisted',
];

interface BuilderInput {
  slug: string;
  locale: Locale;
  participantName: string;
  participantId?: string;
  participantEmail?: string;
  status: RegistrationStatus;
  entranceToken: string;
  event: EventSummary | null;
  portal?: PortalEvent | null;
  agenda?: SessionSummary[];
  workshops?: SessionRegistrationSummary[];
  notifications?: NotificationView[];
  directory?: NetworkingProfileSummary[];
  attendees?: FellowParticipant[];
  speakers?: { id: string; name: string; role?: string; portraitUrl?: string }[];
}

const sessionStart = (session: SessionSummary): number => {
  const parsed = Date.parse(session.startsAt ?? '');
  return Number.isNaN(parsed) ? Number.MAX_SAFE_INTEGER : parsed;
};

const toMoments = (
  agenda: SessionSummary[],
  workshops: SessionRegistrationSummary[],
  locale: Locale,
): AttendeeDayMoment[] => {
  const mine = new Set(
    workshops
      .filter((workshop) => HOLDING_STATUSES.includes(workshop.status))
      .map((workshop) => workshop.sessionId),
  );
  return [...agenda]
    .sort((a, b) => sessionStart(a) - sessionStart(b))
    .map((session) => ({
      id: session.id,
      startTime: formatTimeLabel(session.startsAt, locale),
      endTime: formatTimeLabel(session.endsAt, locale),
      title: session.title,
      description: session.description,
      room: session.room,
      saved: mine.has(session.id) ? true : undefined,
      kind: session.sessionType === 'break' ? 'break' : 'session',
      dayLabel: formatDayLabel(session.startsAt, locale),
      speaker: session.speaker,
      sessionType: session.sessionType,
    }));
};

const toUpdates = (
  notifications: NotificationView[],
  locale: Locale,
): AttendeeUpdate[] => {
  const inLocale = notifications.filter(
    (notification) => notification.locale === locale,
  );
  const feed = inLocale.length > 0 ? inLocale : notifications;
  return feed.slice(0, 3).map((notification) => ({
    id: notification.id,
    title: notification.subject,
    text: notification.body,
    dateLabel: formatLongDate(
      notification.sentAt ?? notification.createdAt,
      locale,
    ),
  }));
};

/*
 * People around the guest: opted-in networking profiles lead (they
 * asked to be met), then fellow registrants fill the room.
 */
const toPeople = (
  directory: NetworkingProfileSummary[],
  attendees: FellowParticipant[],
  participantId: string | undefined,
  participantEmail: string | undefined,
  locale: Locale,
): AttendeePerson[] => {
  const people: AttendeePerson[] = [];
  const seen = new Set<string>();
  for (const profile of directory) {
    if (profile.participantId === participantId) {
      continue;
    }
    seen.add(profile.participantId);
    people.push({
      id: profile.id,
      name: profile.participantName,
      role: profile.headline,
      reason:
        profile.interests ??
        (locale === 'he' ? 'פתוח/ה להיכרות' : 'Open to meeting'),
    });
  }
  for (const attendee of attendees) {
    if (
      attendee.participantId === participantId ||
      seen.has(attendee.participantId) ||
      (participantEmail &&
        attendee.email &&
        attendee.email.toLowerCase() === participantEmail.toLowerCase())
    ) {
      continue;
    }
    seen.add(attendee.participantId);
    people.push({
      id: attendee.participantId,
      name: attendee.name,
      role:
        [attendee.roleTitle, attendee.orgName].filter(Boolean).join(' · ') ||
        undefined,
      reason:
        attendee.interests ??
        (locale === 'he' ? 'משתתפ/ת בכנס' : 'Attending the conference'),
    });
  }
  return people.slice(0, 3);
};

/*
 * Assembles the participant's personal area from their real registration
 * (Registration-Architecture §15). The program, networking and updates
 * light up as their engines fill; the entrance code is real now.
 */
export const buildParticipantExperience = ({
  slug,
  locale,
  participantName,
  participantId,
  participantEmail,
  status,
  entranceToken,
  event,
  portal = null,
  agenda = [],
  workshops = [],
  notifications = [],
  directory = [],
  attendees = [],
  speakers = [],
}: BuilderInput): AttendeeExperienceContent => {
  const he = locale === 'he';
  const title = portal?.title ?? event?.title ?? slug;
  const statusValue = STATUS_LABEL[status][locale];
  const startsAt = portal?.startsAt ?? event?.startsAt;
  const heroImage = portal?.heroUrl ?? portal?.posterUrl;

  return {
    slug,
    brandName: title,
    speakers: speakers.map((speaker) => ({
      id: speaker.id,
      name: speaker.name,
      role: speaker.role,
      photoUrl: speaker.portraitUrl,
    })),
    navigation: [],
    welcome: {
      greeting: he ? `שלום, ${participantName}` : `Hello, ${participantName}`,
      heading: title,
      countdownTarget: startsAt ?? new Date().toISOString(),
      endsAt: portal?.endsAt ?? event?.endsAt,
      countdownLabel: he ? 'עד האירוע' : 'until the event',
      eventDateLabel: formatLongDate(startsAt, locale),
      venueLine: portal?.location ?? '',
      primaryCta: {
        label: he ? 'לקוד הכניסה שלי' : 'To my entrance code',
        href: `/${locale}/events/${slug}/me#entrance`,
      },
    },
    myEvent: {
      summary: he
        ? 'האזור האישי שלך לאירוע. כאן יופיע כל מה שחשוב לקראתו.'
        : 'Your personal area for the event. Everything you need before it appears here.',
      statusLabel: he ? 'הסטטוס שלך' : 'Your status',
      statusValue,
      image: heroImage ? { url: heroImage, alt: title } : undefined,
      updates: toUpdates(notifications, locale),
    },
    myDay: {
      savedLabel: he ? 'נשמר' : 'Saved',
      intro: he
        ? 'סדר היום שלך יופיע כאן ככל שהתוכנית תתעצב.'
        : 'Your day will appear here as the program takes shape.',
      moments: toMoments(agenda, workshops, locale),
    },
    networking: {
      people: toPeople(directory, attendees, participantId, participantEmail, locale),
    },
    entrance: {
      heading: he ? 'הכניסה שלך' : 'Your entrance',
      qrValue: entranceToken,
      qrCaption: he ? 'קוד הכניסה שלך' : 'Your entrance code',
      statusLabel: he ? 'כרטיס' : 'Ticket',
      statusValue,
      details: [],
      offlineNote: he
        ? 'הקוד זמין גם ללא חיבור לרשת.'
        : 'Your code works even without a connection.',
    },
    after: {
      resources: [],
    },
  };
};
