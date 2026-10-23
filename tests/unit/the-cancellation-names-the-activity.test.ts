import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createRegistrationNotifier } from '@/notification-engine/notification-service';
import { renderActivityCancellation, type OutboxMessage } from '@/notification-engine';

/*
 * The cancellation names the activity.
 *
 * A guest who let go of a tour received "Your registration is canceled"
 * — the conference's words, with nothing to say which of their places
 * this was, so a person holding three of them could only guess. The
 * organisers asked that the email name the tour or seminar that was let
 * go, in the reader's language.
 */
const read = (file: string): string => readFileSync(file, 'utf8');

const sent: OutboxMessage[] = [];
const outbox = { enqueue: async () => undefined } as never;
const channel = {
  deliver: async (message: OutboxMessage) => {
    sent.push(message);
    return 'sent' as const;
  },
};

const cancelled = (sessionId?: string) => ({
  type: 'registration.cancelled' as const,
  registrationId: 'r1',
  participantId: 'p1',
  eventSlug: 'summit',
  occurredAt: '2026-10-23T10:00:00.000Z',
  ...(sessionId ? { sessionId } : {}),
});

const TITLES: Record<string, Record<'he' | 'en', string>> = {
  s7: { he: 'סיור בגן הבוטני', en: 'Botanical garden tour' },
};

const notifier = (locale: 'he' | 'en', titles = async (id: string, lang: 'he' | 'en') => TITLES[id]?.[lang] ?? null) =>
  createRegistrationNotifier(outbox, channel, async () => ({ 'registration.cancelled': { subject: 'הכנס בוטל לך', body: 'נוסח הכנס' } }), undefined, async () => locale, titles);

describe('a place let go in an activity', () => {
  it('is named in the subject and the body, in Hebrew', async () => {
    sent.length = 0;
    await notifier('he')(cancelled('s7'));
    expect(sent[0]?.subject).toBe('ההרשמה בוטלה: סיור בגן הבוטני');
    expect(sent[0]?.body).toContain('הרשמתכם לפעילות "סיור בגן הבוטני" בוטלה.');
    expect(sent[0]?.body).toContain('צוות נטעים');
  });

  it('and in English, by its English name', async () => {
    sent.length = 0;
    await notifier('en')(cancelled('s7'));
    expect(sent[0]?.subject).toBe('Registration canceled: Botanical garden tour');
    expect(sent[0]?.body).toContain('Your registration for "Botanical garden tour" has been canceled.');
  });

  it('a name the lookup cannot find, or a failing lookup, keeps the general wording rather than naming nothing', async () => {
    sent.length = 0;
    await notifier('he')(cancelled('missing'));
    await notifier('he', async () => {
      throw new Error('db down');
    })(cancelled('s7'));
    expect(sent.map((message) => message.subject)).toEqual(['הכנס בוטל לך', 'הכנס בוטל לך']);
  });

  it('a conference cancellation is untouched: the conference’s own words still apply', async () => {
    sent.length = 0;
    await notifier('he')(cancelled());
    expect(sent[0]).toMatchObject({ subject: 'הכנס בוטל לך', body: 'נוסח הכנס' });
  });

  it('a name with a dollar sign is written as it is', () => {
    expect(renderActivityCancellation('en', 'Tour $& more').subject).toBe('Registration canceled: Tour $& more');
  });
});

describe('every place let go in an activity carries it', () => {
  it('the guest’s own cancellation and the organiser’s release both say which activity', () => {
    const service = read('src/features/program/services/program-service.ts');
    expect(service.match(/type: 'registration\.cancelled',[\s\S]{0,200}?sessionId,\n/g)?.length).toBe(2);
  });

  it('the name is read in the reader’s language at the composition root', () => {
    expect(read('src/infrastructure/index.ts')).toContain(
      'async (sessionId, locale) => (await sessionRepository.getById(sessionId, locale))?.title ?? null,',
    );
  });
});
