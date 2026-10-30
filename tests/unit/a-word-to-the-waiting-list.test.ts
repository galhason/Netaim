import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/*
 * A word to the waiting list.
 *
 * Tours and seminars filled up, and more than thirty people are waiting.
 * The organisers asked to tell exactly them — "come to the meeting point
 * at the gate" — as a pop-up on the site, by email, or both, from the
 * Studio. The audience is read from the places as they stand, so the
 * people already waiting are the people who hear.
 */
const read = (file: string): string => readFileSync(file, 'utf8');

const asked: { eventSlug: string; sessionId?: string; statuses: string[] }[] = [];
const outbox: { participantId?: string; type: string; locale: string }[] = [];
const mailed: { participantId: string; locale: string; subject: string; body: string; cta?: { href: string } }[] = [];

vi.mock('@/infrastructure', () => ({
  sessionRegistrationRepository: {
    participantsByPlace: async (input: { eventSlug: string; sessionId?: string; statuses: string[] }) => {
      asked.push(input);
      return input.statuses.length === 1 && input.statuses[0] === 'waitlisted' ? ['3', '4', '5'] : ['1', '2', '3', '4', '5'];
    },
    participantsBySession: async () => ['1', '2'],
  },
  participantSessionRepository: {
    noticePreferencesByIds: async (ids: string[]) =>
      ids.filter((id) => id !== '5').map((id) => ({ id, locale: id === '4' ? 'en' : 'he', scheduleEmails: id !== '3' })),
  },
  notificationOutbox: {
    enqueue: async (message: { participantId?: string; type: string; locale: string }) => {
      outbox.push(message);
    },
  },
  sendNotification: async (message: (typeof mailed)[number]) => {
    mailed.push(message);
    return 'sent';
  },
}));
vi.mock('@/features/registration', () => ({ currentParticipant: async () => null }));

const { broadcastAnnouncement, emailParticipants, peopleByPlace } = await import(
  '@/features/notifications/services/notifications-service'
);

const versions = [
  { locale: 'he', subject: 'נקודת מפגש', body: 'מגיעים לשער B' },
  { locale: 'en', subject: 'Meeting point', body: 'Come to gate B' },
];

beforeEach(() => {
  asked.length = 0;
  outbox.length = 0;
  mailed.length = 0;
  process.env.NEXT_PUBLIC_SERVER_URL = 'https://netaimolami.org';
});

describe('who is on the waiting list', () => {
  it('is read from the places as they stand — one activity, or every activity of the conference', async () => {
    expect(await peopleByPlace({ eventSlug: 'summit', sessionId: '7', segment: 'waitlisted' })).toEqual(['3', '4', '5']);
    expect(await peopleByPlace({ eventSlug: 'summit', segment: 'waitlisted' })).toEqual(['3', '4', '5']);
    expect(asked).toEqual([
      { eventSlug: 'summit', sessionId: '7', statuses: ['waitlisted'] },
      { eventSlug: 'summit', sessionId: undefined, statuses: ['waitlisted'] },
    ]);
  });

  it('"registered only" and "everyone" ask for the matching places', async () => {
    await peopleByPlace({ eventSlug: 'summit', segment: 'confirmed' });
    await peopleByPlace({ eventSlug: 'summit', segment: 'all' });
    expect(asked.map((entry) => entry.statuses)).toEqual([['confirmed'], ['confirmed', 'pending', 'waitlisted']]);
  });
});

describe('on the site', () => {
  it('a pop-up to the waiting list is written for each of them, and no one else', async () => {
    expect(await broadcastAnnouncement({ eventSlug: 'summit', versions, kind: 'popup', recipientIds: ['3', '4', '3'] })).toBe(true);
    expect(outbox.map((row) => `${row.participantId}:${row.locale}:${row.type}`)).toEqual([
      '3:he:announcement.popup',
      '3:en:announcement.popup',
      '4:he:announcement.popup',
      '4:en:announcement.popup',
    ]);
  });

  it('an empty audience sends nothing', async () => {
    expect(await broadcastAnnouncement({ eventSlug: 'summit', versions, kind: 'popup', recipientIds: [] })).toBe(false);
    expect(outbox).toEqual([]);
  });
});

describe('by email', () => {
  it('each person in their language, with the way to their activities, even if they turned off schedule mails', async () => {
    expect(await emailParticipants({ eventSlug: 'summit', participantIds: ['3', '4', '5'], versions, ctaPath: (l) => `/${l}/events/summit/my-activities` })).toBe(2);
    expect(mailed.map((m) => `${m.participantId}:${m.locale}:${m.subject}`)).toEqual(['3:he:נקודת מפגש', '4:en:Meeting point']);
    expect(mailed[0]?.body).toContain('מגיעים לשער B');
    expect(mailed[0]?.body).toContain('המייל נשלח אליכם מצוות נטעים');
    expect(mailed[1]?.cta?.href).toBe('https://netaimolami.org/en/events/summit/my-activities');
  });

  it('kept out of the on-site feed, so a message sent both ways is read once', async () => {
    const { isNewsworthy } = await import('@/features/notifications/services/feed-links');
    expect(isNewsworthy('organizer.email')).toBe(false);
  });
});

describe('the Studio composer', () => {
  const action = read('src/app/(studio)/studio/(console)/actions.ts');
  const page = read('src/app/(studio)/studio/(console)/communications/page.tsx');

  it('offers the waiting list and the three channels', () => {
    expect(page).toContain('name="segment"');
    expect(page).toContain("{ value: 'waitlisted', label: COPY.segmentWaitlisted[locale] }");
    expect(page).toContain('name="channel"');
    expect(page).toContain("{ value: 'both', label: COPY.channelBoth[locale] }");
  });

  it('never emails the whole conference from here, and says when the audience is empty', () => {
    expect(action).toContain("redirect('/studio/communications?broadcast=emailEveryone');");
    expect(action).toContain("redirect('/studio/communications?broadcast=nobody');");
  });

  it('shows each activity with how many wait, read live', () => {
    expect(page).toContain('COPY.counts[locale](counts.confirmed, counts.waitlisted)');
  });
});
