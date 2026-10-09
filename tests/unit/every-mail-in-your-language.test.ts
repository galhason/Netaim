import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createRegistrationNotifier } from '@/notification-engine/notification-service';
import type { OutboxMessage } from '@/notification-engine';

/*
 * A person who registered on the English site is written to in English
 * — the confirmation, the waiting list, the promotion, the cancellation.
 * Every registration notice used to go out in Hebrew whatever the
 * person had chosen, because the notifier never asked.
 */
const sent: OutboxMessage[] = [];
const recorded: (OutboxMessage & { status: string })[] = [];
const outbox = {
  enqueue: async (message: OutboxMessage & { status: string }) => {
    recorded.push(message);
  },
} as never;
const channel = {
  deliver: async (message: OutboxMessage) => {
    sent.push(message);
    return 'sent' as const;
  },
};

const event = (participantId: string) => ({
  type: 'registration.confirmed' as const,
  registrationId: 'r1',
  participantId,
  eventSlug: 'summit',
  occurredAt: '2026-10-08T10:00:00.000Z',
});

describe('the registration notifier', () => {
  it('speaks the language the participant chose, button included', async () => {
    process.env.NEXT_PUBLIC_SERVER_URL = 'https://netaimolami.org';
    const notify = createRegistrationNotifier(outbox, channel, undefined, undefined, async (id) =>
      id === 'english' ? 'en' : 'he',
    );
    sent.length = 0;
    await notify(event('english'));
    await notify(event('hebrew'));
    expect(sent[0]?.locale).toBe('en');
    expect(sent[0]?.subject).toBe('Your registration is confirmed');
    expect(sent[0]?.cta).toEqual({ label: 'Go to my space', href: 'https://netaimolami.org/en/me' });
    expect(sent[1]?.locale).toBe('he');
    expect(sent[1]?.subject).toBe('אישור הרשמה לכנס');
    expect(sent[1]?.cta?.href).toBe('https://netaimolami.org/he/me');
    /* The record keeps the language it was sent in. */
    expect(recorded.map((row) => row.locale)).toEqual(['en', 'he']);
  });

  it('falls back to Hebrew when nothing was chosen or the lookup fails', async () => {
    sent.length = 0;
    const quiet = createRegistrationNotifier(outbox, channel, undefined, undefined, async () => null);
    const broken = createRegistrationNotifier(outbox, channel, undefined, undefined, async () => {
      throw new Error('db down');
    });
    await quiet(event('x'));
    await broken(event('y'));
    expect(sent.map((message) => message.locale)).toEqual(['he', 'he']);
  });

  it('asks the conference for its own wording in that language', async () => {
    sent.length = 0;
    const asked: string[] = [];
    const notify = createRegistrationNotifier(
      outbox,
      channel,
      async (slug, locale) => {
        asked.push(`${slug}:${locale}`);
        return undefined;
      },
      undefined,
      async () => 'en',
    );
    await notify(event('english'));
    expect(asked).toEqual(['summit:en']);
  });
});

describe('the language is remembered at registration', () => {
  it('is written onto the account when a person registers for a conference', () => {
    const service = readFileSync('src/features/registration/services/registration-service.ts', 'utf8');
    expect(service).toContain('{ ...input, locale }');
    const repository = readFileSync('src/infrastructure/payload/payload-registration.ts', 'utf8');
    expect(repository).toContain("...(participant.locale ? { preferredLocale: participant.locale } : {})");
    const wiring = readFileSync('src/infrastructure/index.ts', 'utf8');
    expect(wiring).toContain('payloadParticipantSessionRepository.localePreference(participantId)');
  });
});
