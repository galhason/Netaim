import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  DIETARY_KEYS,
  DIETARY_LABELS,
  dietaryKeyOf,
  dietaryOptionsFor,
} from '@/features/registration';
import { logisticsCsv } from '@/features/studio';
import type { EventLogistics, LogisticsRow } from '@/features/studio';

/*
 * The catering count, and the thing that used to break it.
 *
 * The registration form stores the label the guest saw, so a Hebrew
 * registrant wrote "צמחוני" and an English one "Vegetarian". Counted as
 * raw strings, one preference became two lines and the kitchen was told
 * to cook half of each. These cases hold the normaliser to recognising
 * both spellings, the page to counting on the key, and the export to
 * opening correctly in the one program a caterer will use.
 */
const row = (patch: Partial<LogisticsRow>): LogisticsRow => ({
  participantId: '1',
  name: 'A',
  email: 'a@example.com',
  phone: '050',
  dietary: '',
  dietaryKey: null,
  accessibility: '',
  organization: '',
  registrationStatus: 'confirmed',
  activities: 0,
  ...patch,
});

describe('one preference, however it was spelled', () => {
  it('reads both languages of every option as the same key', () => {
    for (const key of DIETARY_KEYS) {
      expect(dietaryKeyOf(DIETARY_LABELS[key].he)).toBe(key);
      expect(dietaryKeyOf(DIETARY_LABELS[key].en)).toBe(key);
    }
  });

  it('is not thrown by case, spacing or punctuation', () => {
    expect(dietaryKeyOf('  Gluten-Free ')).toBe('glutenFree');
    expect(dietaryKeyOf('gluten free')).toBe('glutenFree');
    expect(dietaryKeyOf('כשרות מהודרת ')).toBe('kosherMehadrin');
  });

  it('answers null rather than inventing a preference', () => {
    expect(dietaryKeyOf('')).toBeNull();
    expect(dietaryKeyOf(undefined)).toBeNull();
    expect(dietaryKeyOf('חלבי בלבד')).toBeNull();
  });

  it('offers the same five choices the form always offered', () => {
    expect(dietaryOptionsFor('he')).toEqual([
      'רגיל',
      'צמחוני',
      'טבעוני',
      'ללא גלוטן',
      'כשרות מהודרת',
    ]);
    expect(dietaryOptionsFor('en')).toHaveLength(DIETARY_KEYS.length);
  });
});

describe('the registration form no longer keeps its own list', () => {
  it('takes the options from the shared catalogue', () => {
    const page = readFileSync(
      'src/app/(frontend)/[locale]/events/[slug]/register/page.tsx',
      'utf8',
    );
    expect(
      page.includes('dietaryOptionsFor(lang)'),
      'a second copy of the list is how the two spellings appeared',
    ).toBe(true);
    expect(page.includes('const DIETARY_OPTIONS')).toBe(false);
  });

  it('asks the same question on the profile screens', () => {
    for (const file of [
      'src/app/(frontend)/[locale]/me/profile/page.tsx',
      'src/app/(frontend)/[locale]/events/[slug]/me/profile/page.tsx',
    ]) {
      const text = readFileSync(file, 'utf8');
      expect(text.includes('<DietarySelect'), `${file} still free-texts it`).toBe(
        true,
      );
    }
  });
});

describe('the logistics export', () => {
  const logistics: EventLogistics = {
    slug: 'netaim-26',
    rows: [
      row({ name: 'דנה', dietary: 'צמחוני', dietaryKey: 'vegetarian' }),
      row({
        participantId: '2',
        name: 'Sam, Jr',
        dietary: 'Vegetarian',
        dietaryKey: 'vegetarian',
        accessibility: 'He said "step-free"',
      }),
    ],
    tally: [],
    total: 2,
    accessibilityCount: 1,
  };
  const csv = logisticsCsv(logistics, ['שם', 'אימייל', 'טלפון', 'מזון', 'ארגון', 'נגישות'], (line) =>
    line.dietaryKey ? DIETARY_LABELS[line.dietaryKey].he : line.dietary,
  );

  it('opens as Hebrew in a spreadsheet rather than as mojibake', () => {
    expect(csv.startsWith('﻿')).toBe(true);
    expect(csv.includes('\r\n')).toBe(true);
  });

  it('cannot be shifted a column by a comma or a quote in a note', () => {
    expect(csv.includes('"Sam, Jr"')).toBe(true);
    expect(csv.includes('"He said ""step-free"""')).toBe(true);
  });

  it('writes both guests under one preference', () => {
    const lines = csv.trimEnd().split('\r\n');
    expect(lines).toHaveLength(3);
    expect(lines.filter((line) => line.includes('צמחוני'))).toHaveLength(2);
  });
});

describe('the logistics screen is gated and read-only', () => {
  const page = readFileSync(
    'src/app/(studio)/studio/(console)/logistics/page.tsx',
    'utf8',
  );
  const route = readFileSync(
    'src/app/(studio)/studio/(console)/logistics/export/route.ts',
    'utf8',
  );

  it('asks for the capability itself rather than trusting the layout', () => {
    expect(page.includes("requireCapability('registrations:manage')")).toBe(true);
    expect(
      route.includes("requireCapability('registrations:manage')"),
      'a download URL is shareable; it has to ask again',
    ).toBe(true);
  });

  it('is never prerendered or cached', () => {
    expect(page.includes("export const dynamic = 'force-dynamic'")).toBe(true);
    expect(route.includes("'Cache-Control': 'no-store'")).toBe(true);
  });

  it('changes nothing about anybody', () => {
    for (const text of [page, route]) {
      expect(text.includes('use server')).toBe(false);
      expect(/\bpayload\.update\b|\bpayload\.delete\b/.test(text)).toBe(false);
    }
  });
});
