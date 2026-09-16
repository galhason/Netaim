import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderEmailHtml } from '@/notification-engine';

const read = (file: string): string =>
  readFileSync(resolve(process.cwd(), file), 'utf8');

/*
 * The emails are the one part of the platform a person reads outside
 * it, in software nobody controls. These lock the two things that
 * break silently: content that exists only in the HTML, and a layout
 * that needs a stylesheet or an image to be legible.
 */
describe('every email carries its content in words as well as in HTML', () => {
  const code = '481902';
  const body = ['שלום,', 'הזינו את הקוד:', code, 'בברכה'].join('\n\n');

  it('renders the code where the sentence points to it, exactly once', () => {
    const html = renderEmailHtml({
      locale: 'he',
      subject: 'קוד אימות',
      body,
      highlight: { label: 'קוד האימות', value: code },
    });
    expect(html.split(code).length - 1, 'the code appears once, not twice').toBe(1);
    /* And it sits after the sentence that introduces it. */
    expect(html.indexOf('הזינו את הקוד')).toBeLessThan(html.indexOf(code));
  });

  it('turns a bare link into the button, in place', () => {
    const href = 'https://netaim26.org/he/enter?token=abc';
    const html = renderEmailHtml({
      locale: 'he',
      subject: 'כניסה',
      body: ['שלום,', 'הקישור:', href, 'בברכה'].join('\n\n'),
      cta: { label: 'כניסה', href },
    });
    expect(html.split('href=').length - 1).toBe(1);
    expect(html.includes('<a href="https://netaim26.org/he/enter?token=abc"')).toBe(true);
  });

  it('appends a button that the words do not already carry', () => {
    const html = renderEmailHtml({
      locale: 'he',
      subject: 'אישור',
      body: 'שלום,\n\nמקומך שמור.',
      cta: { label: 'לאזור האישי שלי', href: 'https://netaim26.org/he/me' },
    });
    expect(html.includes('לאזור האישי שלי')).toBe(true);
  });

  it('never needs a stylesheet, a font or an image to be read', () => {
    const html = renderEmailHtml({ locale: 'he', subject: 'x', body: 'y' });
    expect(/<link|<style|<img|@media|background-image/.test(html)).toBe(false);
  });

  it('reads right to left in Hebrew and left to right in English', () => {
    expect(renderEmailHtml({ locale: 'he', subject: 'x', body: 'y' }).includes('dir="rtl"')).toBe(true);
    const en = renderEmailHtml({ locale: 'en', subject: 'x', body: 'y' });
    expect(en.includes('dir="ltr"')).toBe(true);
    expect(en.includes('Netaim')).toBe(true);
  });

  it('escapes what a person wrote', () => {
    const html = renderEmailHtml({
      locale: 'he',
      subject: '<script>x</script>',
      body: 'a & b <b>c</b>',
    });
    expect(html.includes('<script>x</script>')).toBe(false);
    expect(html.includes('a &amp; b &lt;b&gt;c&lt;/b&gt;')).toBe(true);
  });
});

describe('the SMTP channel sends both parts', () => {
  it('always attaches the HTML beside the text', () => {
    const channel = read('src/infrastructure/email/smtp-channel.ts');
    expect(channel.includes('text: message.body')).toBe(true);
    expect(channel.includes('html: htmlFor(message,')).toBe(true);
  });

  it('keeps presentation out of what the outbox stores', () => {
    const outbox = read('src/notification-engine/outbox/outbox.ts');
    expect(outbox.includes('highlight')).toBe(false);
    expect(outbox.includes('cta')).toBe(false);
  });
});

describe('recovery answers inside the recovery flow', () => {
  const actions = read('src/app/(frontend)/[locale]/me/actions.ts');
  const screen = read('src/app/(frontend)/[locale]/me/sign-in-screen.tsx');

  /* Just this action's body — the joins and sign-ins after it answer elsewhere. */
  const recovery = actions.slice(
    actions.indexOf('requestAccountLinkAction'),
    actions.indexOf('export const joinConferenceAction'),
  );

  it('never drops the person back on the sign-in form to read the answer', () => {
    const redirects = recovery.match(/\/me\?[^`]*state=/g) ?? [];
    expect(redirects.length).toBeGreaterThan(0);
    for (const target of redirects) {
      expect(target.includes('view=reset'), `${target} keeps the recovery context`).toBe(true);
    }
  });

  it('answers a sent link with its own screen, not a note', () => {
    expect(screen.includes("if (state === 'sent')")).toBe(true);
    expect(screen.includes('COPY.sentSpam')).toBe(true);
    expect(screen.includes('COPY.sentRetry')).toBe(true);
  });

  it('says the same thing whether or not the address has an account', () => {
    expect(recovery.includes("result.reason === 'needName'")).toBe(true);
    expect(
      recovery.slice(recovery.indexOf("result.reason === 'needName'")).includes('state=sent'),
      'an unknown address gets the same answer as a known one',
    ).toBe(true);
  });
});
