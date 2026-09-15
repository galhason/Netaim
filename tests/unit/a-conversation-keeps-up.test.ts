import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/*
 * A conversation that keeps up with itself.
 *
 * The thread used to re-render the whole page every twelve seconds and
 * hope. Two people testing it side by side both reached for reload,
 * which is the moment a chat stops being a chat — and because each tick
 * re-read the thread through `myChatThread`, which stamps the thread as
 * read, an idle tab wrote to the database all afternoon.
 *
 * The rules these cases hold, all of them things that must NOT happen:
 *
 *  1. An idle thread does not write. Read is stamped when something
 *     arrived, never on the clock.
 *  2. Polling asks for what it does not have. A cursor, not the whole
 *     history, or the cost of asking forces the interval back up.
 *  3. The live door enforces the same law as the page. Both go through
 *     the chat service, so membership, an accepted connection and the
 *     block rule cannot differ between them.
 *  4. A thread left open after a block goes quiet by itself.
 */
const source = (file: string): string => readFileSync(file, 'utf8');

const SERVICE = 'src/features/networking/services/chat-service.ts';
const ROUTE =
  'src/app/(frontend)/[locale]/me/chat/[connectionId]/messages/route.ts';
const CLIENT = 'src/app/(frontend)/[locale]/me/chat/[connectionId]/chat-live.tsx';

describe('an open thread keeps up without reloading the page', () => {
  it('stamps read only when something arrived', () => {
    const text = source(SERVICE);
    const fn = text.slice(text.indexOf('export const chatSince'));
    const body = fn.slice(0, fn.indexOf('\nexport const '));

    expect(
      body.includes('messages.some((message) => message.senderId !== me.id)'),
      'an idle poll must not write to the database',
    ).toBe(true);
    expect(body.includes('markRead')).toBe(true);
  });

  it('asks with a cursor rather than re-reading the history', () => {
    expect(source(SERVICE).includes('listSince(')).toBe(true);
    expect(
      source(CLIENT).includes('?after='),
      'the client must say what it already has',
    ).toBe(true);
  });

  it('sends and polls through the same service the page uses', () => {
    const route = source(ROUTE);
    expect(route.includes("from '@/features/networking'")).toBe(true);
    expect(route.includes('chatSince(')).toBe(true);
    expect(route.includes('sendChatMessageReturning(')).toBe(true);
    /*
     * No repository, no Payload, no second copy of the membership rule.
     * A door that reached past the service could open a thread the page
     * would refuse.
     */
    expect(route.includes('chatRepository')).toBe(false);
    expect(route.includes('getSystemPayload')).toBe(false);
  });

  it('goes quiet when the conversation ends', () => {
    const service = source(SERVICE);
    const fn = service.slice(service.indexOf('const livingConnectionFor'));
    expect(
      fn.slice(0, fn.indexOf('\nexport const ')).includes('blockedBetween'),
      'a thread open in a tab must stop answering after a block',
    ).toBe(true);

    expect(source(ROUTE).includes('410')).toBe(true);
    expect(
      source(CLIENT).includes('setClosed(true)'),
      'and the client must stop asking rather than retry',
    ).toBe(true);
  });

  it('never leaves a message showing as sent when it was not', () => {
    const client = source(CLIENT);
    const send = client.slice(client.indexOf('const send = async'));
    const body = send.slice(0, send.indexOf('\n  return ('));

    expect(
      body.includes('current.filter((line) => line.id !== temporary)'),
      'a failed send must take its own bubble back',
    ).toBe(true);
    expect(
      body.includes('setDraft(body)'),
      'and hand the words back to the box',
    ).toBe(true);
  });

  it('backs off instead of hammering a broken connection', () => {
    const client = source(CLIENT);
    expect(client.includes('MAX_BACKOFF_MS')).toBe(true);
    expect(client.includes('backoff * 2')).toBe(true);
    expect(
      client.includes("document.visibilityState !== 'visible'"),
      'a hidden tab asks nothing',
    ).toBe(true);
  });

  it('still sends when the browser runs no JavaScript', () => {
    const client = source(CLIENT);
    expect(
      client.includes('action={fallback}'),
      'the form keeps its plain post as the path that always works',
    ).toBe(true);
  });
});
