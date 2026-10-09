import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/*
 * When an activity changes its hour or room, or is cancelled, the people
 * holding a place in it hear it twice: in the lounge, as before, and now
 * by email — each in their own language, unless they switched these
 * mails off in their profile.
 */
const state = {
  registrants: [] as string[],
  people: [] as { id: string; locale: 'he' | 'en'; scheduleEmails: boolean }[],
  sent: [] as { participantId: string; type: string; locale: string; subject: string; body: string; cta?: { label: string; href: string } }[],
  outbox: [] as { participantId: string; type: string; locale: string }[],
};

vi.mock('@/infrastructure', () => ({
  notificationOutbox: {
    enqueue: async (message: { participantId: string; type: string; locale: string }) => {
      state.outbox.push(message);
    },
  },
  sessionRegistrationRepository: {
    participantsBySession: async () => state.registrants,
  },
  participantSessionRepository: {
    noticePreferencesByIds: async (ids: string[]) => state.people.filter((person) => ids.includes(person.id)),
  },
  sendNotification: async (message: (typeof state.sent)[number]) => {
    state.sent.push(message);
    return 'sent';
  },
}));
vi.mock('@/features/registration', () => ({
  currentParticipant: async () => null,
}));

const notices = () => import('@/features/program/services/session-change-notices');
const service = () => import('@/features/notifications/services/notifications-service');

const before = { startsAt: '2026-10-20T09:00:00.000Z', endsAt: '2026-10-20T10:00:00.000Z', room: 'אולם א', floor: '' };
const titles = { he: 'סדנת AI', en: 'AI workshop' };

describe('an email when the activity moves', () => {
  beforeEach(() => {
    state.registrants = ['p1', 'p2', 'p3', 'p4'];
    state.people = [
      { id: 'p1', locale: 'he', scheduleEmails: true },
      { id: 'p2', locale: 'en', scheduleEmails: true },
      { id: 'p3', locale: 'he', scheduleEmails: false },
    ];
    state.sent = [];
    state.outbox = [];
    process.env.NEXT_PUBLIC_SERVER_URL = 'https://netaim26.org/';
  });

  it('goes to the registrants who take it, in their language, beside the in-app notice', async () => {
    const { announceSessionChange } = await notices();
    await announceSessionChange('summit', 's1', titles, before, { ...before, startsAt: '2026-10-20T11:00:00.000Z', endsAt: '2026-10-20T12:00:00.000Z' });

    /* The lounge notice, as before: one row per registrant per language. */
    expect(state.outbox.filter((row) => row.type === 'announcement.popup.activity')).toHaveLength(8);

    /* The email: one per person who takes it, in the language they chose. */
    expect(state.sent.map((mail) => `${mail.participantId}:${mail.locale}`)).toEqual(['p1:he', 'p2:en']);
    expect(state.sent[0]?.type).toBe('activity.changed');
    expect(state.sent[0]?.subject).toBe('שינוי בשעה: סדנת AI');
    expect(state.sent[1]?.subject).toBe('Time changed: AI workshop');
    /* The mail says from what to what — the pop-up says only the new. */
    expect(state.sent[1]?.body).toContain('• Time: 20 October 2026: from 12:00–13:00 to 14:00–15:00');
    expect(state.sent[0]?.body).toContain('• השעה: 20 באוקטובר 2026: מ־12:00–13:00 ל־14:00–15:00');
    expect(state.outbox[0]?.type).toBe('announcement.popup.activity');
  });

  it('says in every mail how to stop them, and leads to the reader’s schedule', async () => {
    const { announceSessionChange } = await notices();
    await announceSessionChange('summit', 's1', titles, before, { ...before, room: 'אולם ד' });
    expect(state.sent[0]?.body).toContain('אפשר לבטל מיילים על שינויים בפעילויות דרך האזור האישי');
    expect(state.sent[1]?.body).toContain('You can turn off emails about activity changes');
    expect(state.sent[0]?.cta).toEqual({ label: 'לפעילויות שלי', href: 'https://netaim26.org/he/events/summit/my-activities' });
    expect(state.sent[1]?.cta?.href).toBe('https://netaim26.org/en/events/summit/my-activities');
  });

  it('is sent for a cancellation too, naming the slot that is gone', async () => {
    const { announceSessionCancelled } = await notices();
    await announceSessionCancelled('summit', 's1', titles, before);
    expect(state.sent.map((mail) => mail.type)).toEqual(['activity.cancelled', 'activity.cancelled']);
    expect(state.sent[0]?.subject).toBe('הפעילות בוטלה: סדנת AI');
    expect(state.sent[0]?.body).toContain('לצערנו, הפעילות "סדנת AI" שנרשמתם אליה בוטלה.');
    expect(state.sent[0]?.body).toContain('• מועד שתוכנן: 20 באוקטובר 2026, 12:00–13:00');
    expect(state.sent[1]?.body).toContain('• Planned for: 20 October 2026, 12:00–13:00');
  });

  it('writes both moments out when the day itself moved, and the room when it did', async () => {
    const { announceSessionChange } = await notices();
    await announceSessionChange('summit', 's1', titles, before, { ...before, startsAt: '2026-10-21T09:00:00.000Z', endsAt: '2026-10-21T10:00:00.000Z', room: 'אולם ד' });
    expect(state.sent[1]?.body).toContain('• Time: from 20 October 2026, 12:00–13:00 to 21 October 2026, 12:00–13:00');
    expect(state.sent[1]?.body).toContain('• Location: from אולם א to אולם ד');
    expect(state.sent[1]?.body).toContain('• When: 21 October 2026, 12:00–13:00');
  });

  it('is not sent when nothing worth a word changed', async () => {
    const { announceSessionChange } = await notices();
    await announceSessionChange('summit', 's1', titles, before, { ...before });
    expect(state.sent).toEqual([]);
    expect(state.outbox).toEqual([]);
  });

  it('sends nothing without a button when the deployment has no address, and nothing to an empty hall', async () => {
    delete process.env.NEXT_PUBLIC_SERVER_URL;
    const { emailSessionRegistrants } = await service();
    const versions = [{ locale: 'he', subject: 'נושא', body: 'גוף' }];
    expect(await emailSessionRegistrants({ eventSlug: 'summit', sessionId: 's1', type: 'activity.changed', versions, ctaPath: (locale) => `/${locale}/x` })).toBe(2);
    expect(state.sent[0]?.cta).toBeUndefined();
    /* No English version: the English reader gets the Hebrew one rather than nothing. */
    expect(state.sent[1]?.locale).toBe('he');
    state.registrants = [];
    state.sent = [];
    expect(await emailSessionRegistrants({ eventSlug: 'summit', sessionId: 's1', type: 'activity.changed', versions, ctaPath: (locale) => `/${locale}/x` })).toBe(0);
    expect(state.sent).toEqual([]);
  });
});

describe('the choice lives in the profile', () => {
  const read = (file: string): string => readFileSync(file, 'utf8');

  it('is a checkbox the save action reads, on by default', () => {
    const page = read('src/app/(frontend)/[locale]/me/profile/page.tsx');
    expect(page).toContain('name="scheduleEmails"');
    expect(page).toContain('defaultChecked={contact?.prefs.scheduleEmails !== false}');
    /* The directory toggle posts the same action, so it must carry the answer too. */
    expect(page).toContain('<input type="hidden" name="scheduleEmails" value="on" />');
    const actions = read('src/app/(frontend)/[locale]/me/profile/actions.ts');
    expect(actions).toContain("scheduleEmails: formData.get('scheduleEmails') === 'on'");
    const schema = read('src/cms/collections/participants.ts');
    expect(schema).toContain("{ name: 'scheduleEmails', type: 'checkbox', defaultValue: true }");
  });

  it('is read as yes until someone says no', () => {
    const repo = read('src/infrastructure/payload/payload-participant-session.ts');
    expect(repo).toContain('scheduleEmails: row.contactPrefs?.scheduleEmails !== false');
    expect(repo).toContain('scheduleEmails: doc.contactPrefs?.scheduleEmails !== false');
    const migration = read('src/migrations/20261007_150000_schedule_emails.ts');
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS "contact_prefs_schedule_emails" boolean DEFAULT true');
  });

  it('keeps the mail out of the bell — the announcement is already there', async () => {
    const { isNewsworthy } = await import('@/features/notifications/services/feed-links');
    expect(isNewsworthy('activity.changed')).toBe(false);
    expect(isNewsworthy('activity.cancelled')).toBe(false);
    expect(isNewsworthy('announcement.popup.activity')).toBe(true);
  });
});
