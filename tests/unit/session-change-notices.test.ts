import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  cancelVersions,
  changeVersions,
  sessionDelta,
} from '@/features/program/services/session-change-notices';

const read = (file: string): string =>
  readFileSync(resolve(process.cwd(), file), 'utf8');

/*
 * PRD §4: a person holding a place in an activity is told when it
 * moves, changes its hour or is cancelled.
 */
describe('what counts as a change worth telling', () => {
  const base = { startsAt: '2026-10-20T09:00:00.000Z', endsAt: '2026-10-20T10:00:00.000Z', room: 'אולם א', floor: '2' };

  it('sees a new hour', () => {
    expect(sessionDelta(base, { ...base, startsAt: '2026-10-20T11:00:00.000Z' })).toEqual({ time: true, place: false });
  });

  it('sees a new room or floor', () => {
    expect(sessionDelta(base, { ...base, room: 'אולם ד' })).toEqual({ time: false, place: true });
    expect(sessionDelta(base, { ...base, floor: '3' })).toEqual({ time: false, place: true });
  });

  it('ignores the same instant written differently, and whitespace', () => {
    expect(sessionDelta(base, { ...base, startsAt: '2026-10-20T12:00:00+03:00', room: ' אולם א ' })).toEqual({ time: false, place: false });
  });

  it('says nothing when only the description changed', () => {
    expect(sessionDelta(base, { ...base })).toEqual({ time: false, place: false });
  });
});

describe('the words the registrant reads', () => {
  const titles = { he: 'סדנת AI בחינוך', en: 'AI in education' };
  const after = { startsAt: '2026-10-20T08:00:00.000Z', endsAt: '2026-10-20T09:00:00.000Z', room: 'אולם ד', floor: '' };

  it('speak both languages and name the activity', () => {
    const versions = changeVersions(titles, after, { time: true, place: true });
    expect(versions.map((v) => v.locale)).toEqual(['he', 'en']);
    expect(versions[0]?.subject).toContain('סדנת AI בחינוך');
    expect(versions[0]?.body).toContain('אולם ד');
    expect(versions[1]?.subject).toContain('AI in education');
  });

  it('say only what changed', () => {
    expect(changeVersions(titles, after, { time: true, place: false })[0]?.subject.startsWith('שינוי בשעה')).toBe(true);
    expect(changeVersions(titles, after, { time: false, place: true })[0]?.subject.startsWith('שינוי מיקום')).toBe(true);
  });

  it('cancel in both languages', () => {
    const versions = cancelVersions(titles);
    expect(versions[0]?.subject).toBe('הפעילות בוטלה: סדנת AI בחינוך');
    expect(versions[1]?.subject).toBe('Activity cancelled: AI in education');
  });
});

describe('every Studio path passes through the notice', () => {
  const service = read('src/features/program/services/program-service.ts');

  it('compares stored state before and after an update', () => {
    expect(service.includes('announceSessionChange(titles.eventSlug, sessionId, titles, before, after)')).toBe(true);
  });

  it('tells registrants before an activity is removed', () => {
    const del = service.slice(service.indexOf('export const deleteSession'));
    expect(del.indexOf('announceSessionCancelled')).toBeLessThan(del.indexOf('sessionRepository.remove'));
  });

  it('is targeted, and asks for a click', () => {
    const notices = read('src/features/program/services/session-change-notices.ts');
    expect(notices.split("kind: 'popup'").length - 1).toBe(2);
    expect(notices.split('targetSessionId: sessionId').length - 1).toBe(2);
    expect(notices.split("topic: 'activity'").length - 1).toBe(2);
  });

  it('lands the reader on their own schedule', () => {
    const links = read('src/features/notifications/services/feed-links.ts');
    expect(links.includes("type.endsWith('.activity')")).toBe(true);
    expect(links.includes('/my-activities')).toBe(true);
    const inbox = read('src/app/(frontend)/[locale]/me/messages/page.tsx');
    expect(inbox.includes('getActiveConferenceSlug(locale)'), 'the inbox reads the live conference like the bell does').toBe(true);
  });
});
