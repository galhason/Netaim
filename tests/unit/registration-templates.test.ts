import { describe, expect, it } from 'vitest';
import {
  defaultRegistrationTemplate,
  renderRegistrationNotification,
  type RegistrationTemplateOverrides,
} from '@/notification-engine';
import type { RegistrationEventType } from '@/registration-engine';

const MOMENTS: RegistrationEventType[] = [
  'registration.confirmed',
  'registration.pending',
  'registration.waitlisted',
  'registration.approved',
  'registration.declined',
  'registration.promoted',
  'registration.cancelled',
];

/*
 * A conference may rewrite what it says. The risk in letting it is that
 * a half-filled form quietly sends an empty email, so every case here
 * is about what happens when the organizer wrote nothing.
 */
describe('registration email templates', () => {
  it('says something in both locales for every moment, with no override', () => {
    for (const moment of MOMENTS) {
      for (const locale of ['he', 'en'] as const) {
        const rendered = renderRegistrationNotification(moment, locale);
        expect(rendered.subject.trim(), `${moment}/${locale} subject`).not.toBe(
          '',
        );
        expect(rendered.body.trim(), `${moment}/${locale} body`).not.toBe('');
      }
    }
  });

  it('is unchanged when a conference has customised nothing', () => {
    for (const moment of MOMENTS) {
      expect(renderRegistrationNotification(moment, 'he', {})).toEqual(
        defaultRegistrationTemplate(moment, 'he'),
      );
      expect(renderRegistrationNotification(moment, 'he', undefined)).toEqual(
        defaultRegistrationTemplate(moment, 'he'),
      );
    }
  });

  it('uses what the organizer wrote', () => {
    const overrides: RegistrationTemplateOverrides = {
      'registration.confirmed': { subject: 'ברוכים הבאים', body: 'נתראה שם.' },
    };
    const rendered = renderRegistrationNotification(
      'registration.confirmed',
      'he',
      overrides,
    );
    expect(rendered).toEqual({ subject: 'ברוכים הבאים', body: 'נתראה שם.' });
  });

  it('falls back per field, not per message', () => {
    /* A subject rewritten alone must not blank the body. */
    const rendered = renderRegistrationNotification(
      'registration.confirmed',
      'he',
      { 'registration.confirmed': { subject: 'רק נושא' } },
    );
    const platform = defaultRegistrationTemplate('registration.confirmed', 'he');
    expect(rendered.subject).toBe('רק נושא');
    expect(rendered.body).toBe(platform.body);
  });

  it('treats blank and whitespace as "not written"', () => {
    const platform = defaultRegistrationTemplate('registration.pending', 'he');
    for (const written of ['', '   ', '\n\t']) {
      const rendered = renderRegistrationNotification(
        'registration.pending',
        'he',
        { 'registration.pending': { subject: written, body: written } },
      );
      expect(rendered, `blank "${written}" must not send an empty email`).toEqual(
        platform,
      );
    }
  });

  it('leaves other moments alone when one is customised', () => {
    const overrides: RegistrationTemplateOverrides = {
      'registration.declined': { body: 'ניסוח משלנו.' },
    };
    for (const moment of MOMENTS.filter((m) => m !== 'registration.declined')) {
      expect(renderRegistrationNotification(moment, 'he', overrides)).toEqual(
        defaultRegistrationTemplate(moment, 'he'),
      );
    }
  });

  it('keeps the platform wording reachable for a form to show', () => {
    const platform = defaultRegistrationTemplate('registration.confirmed', 'en');
    expect(platform.subject).toBe('You are registered');
    /* An override must not mutate the source it fell back to. */
    renderRegistrationNotification('registration.confirmed', 'en', {
      'registration.confirmed': { subject: 'Changed' },
    });
    expect(defaultRegistrationTemplate('registration.confirmed', 'en')).toEqual(
      platform,
    );
  });
});
