import { describe, expect, it } from 'vitest';
import { Events } from '@/cms/collections/events';
import {
  DEFAULT_VENUE_TIMEZONE,
  formatDayLabel,
  formatLongDate,
  formatTimeLabel,
  fromDateTimeInputValue,
  toDateTimeInputValue,
  venueDayKey,
} from '@/shared';

/*
 * The conference's clock, in both directions.
 *
 * The rule is one sentence: a producer typing 14:00 means 14:00 at the
 * venue, and a guest reading the programme sees 14:00 -- wherever the
 * server runs and wherever the guest is. What is stored in between is an
 * absolute instant, and that never changes.
 *
 * Every case below names its timezone explicitly. A test that relied on
 * the machine's zone would pass on one developer's laptop and fail on the
 * next, and would say nothing at all about a conference in Prague.
 */

const HE = 'he';
const EN = 'en';

describe('a time entered at the venue comes back as the same time', () => {
  /* 1. Israel, summer: Asia/Jerusalem is UTC+3 under IDT. */
  it('holds in Israel in summer', () => {
    const stored = fromDateTimeInputValue('2026-07-22T14:00', 'Asia/Jerusalem');
    expect(stored).toBe('2026-07-22T11:00:00.000Z');
    expect(formatTimeLabel(stored, HE, 'Asia/Jerusalem')).toBe('14:00');
    expect(toDateTimeInputValue(stored, 'Asia/Jerusalem')).toBe(
      '2026-07-22T14:00',
    );
  });

  /* Israel, winter: UTC+2 under IST. The offset differs, the rule does not. */
  it('holds in Israel in winter', () => {
    const stored = fromDateTimeInputValue('2026-01-14T14:00', 'Asia/Jerusalem');
    expect(stored).toBe('2026-01-14T12:00:00.000Z');
    expect(formatTimeLabel(stored, HE, 'Asia/Jerusalem')).toBe('14:00');
  });

  /* 2. Prague, summer: CEST, UTC+2. */
  it('holds in Prague in summer', () => {
    const stored = fromDateTimeInputValue('2026-07-22T14:00', 'Europe/Prague');
    expect(stored).toBe('2026-07-22T12:00:00.000Z');
    expect(formatTimeLabel(stored, EN, 'Europe/Prague')).toBe('14:00');
  });

  /* 3. Prague, winter: CET, UTC+1. */
  it('holds in Prague in winter', () => {
    const stored = fromDateTimeInputValue('2026-01-14T14:00', 'Europe/Prague');
    expect(stored).toBe('2026-01-14T13:00:00.000Z');
    expect(formatTimeLabel(stored, EN, 'Europe/Prague')).toBe('14:00');
  });

  /*
   * 4. A zone whose DST runs the other way round. In July Sydney is in
   * winter, and a rule written around the northern hemisphere gets this
   * one wrong.
   */
  it('holds in Sydney, whose seasons are inverted', () => {
    const july = fromDateTimeInputValue('2026-07-22T14:00', 'Australia/Sydney');
    expect(july).toBe('2026-07-22T04:00:00.000Z');
    expect(formatTimeLabel(july, EN, 'Australia/Sydney')).toBe('14:00');

    const january = fromDateTimeInputValue(
      '2026-01-14T14:00',
      'Australia/Sydney',
    );
    expect(january).toBe('2026-01-14T03:00:00.000Z');
    expect(formatTimeLabel(january, EN, 'Australia/Sydney')).toBe('14:00');
  });

  /* And a zone with no DST at all, where both halves of the year agree. */
  it('holds where there is no DST to speak of', () => {
    for (const day of ['2026-07-22', '2026-01-14']) {
      const stored = fromDateTimeInputValue(`${day}T14:00`, 'Asia/Dubai');
      expect(stored).toBe(`${day}T10:00:00.000Z`);
      expect(formatTimeLabel(stored, EN, 'Asia/Dubai')).toBe('14:00');
    }
  });

  /*
   * The same instant, read in three conferences' zones, is three different
   * wall clocks -- which is the whole reason the zone has to be carried
   * rather than assumed.
   */
  it('reads one instant differently in each venue', () => {
    const instant = '2026-07-22T12:00:00.000Z';
    expect(formatTimeLabel(instant, EN, 'Europe/Prague')).toBe('14:00');
    expect(formatTimeLabel(instant, EN, 'Asia/Jerusalem')).toBe('15:00');
    expect(formatTimeLabel(instant, EN, 'Europe/London')).toBe('13:00');
    expect(formatTimeLabel(instant, EN, 'America/New_York')).toBe('08:00');
    expect(formatTimeLabel(instant, EN, 'UTC')).toBe('12:00');
  });

  it('falls back to the venue default when no zone is named', () => {
    const instant = '2026-07-22T11:00:00.000Z';
    expect(DEFAULT_VENUE_TIMEZONE).toBe('Asia/Jerusalem');
    expect(formatTimeLabel(instant, HE)).toBe(
      formatTimeLabel(instant, HE, DEFAULT_VENUE_TIMEZONE),
    );
  });
});

/* ------------------------------------------------------------------ */

describe('the day a session belongs to', () => {
  /*
   * The case the UTC day got wrong. A session at 01:30 in Israel is still
   * the 23rd at the venue, but 22:30 on the 22nd in UTC -- so a programme
   * grouped by the UTC day filed it under the wrong morning.
   */
  it('is the venue day, not the UTC day, after midnight', () => {
    const instant = '2026-07-22T22:30:00.000Z';
    expect(venueDayKey(instant, 'Asia/Jerusalem')).toBe('2026-07-23');
    expect(new Date(instant).toISOString().slice(0, 10)).toBe('2026-07-22');
  });

  /* And the mirror case: an evening session in New York. */
  it('is the venue day, not the UTC day, in the evening', () => {
    const instant = '2026-07-23T01:30:00.000Z';
    expect(venueDayKey(instant, 'America/New_York')).toBe('2026-07-22');
    expect(new Date(instant).toISOString().slice(0, 10)).toBe('2026-07-23');
  });

  it('agrees with the clock label on the same session', () => {
    /* 23:30 at the venue on the 22nd: same day, late in the evening. */
    const stored = fromDateTimeInputValue('2026-07-22T23:30', 'Asia/Jerusalem');
    expect(venueDayKey(stored, 'Asia/Jerusalem')).toBe('2026-07-22');
    expect(formatTimeLabel(stored, HE, 'Asia/Jerusalem')).toBe('23:30');
  });

  it('is empty for a missing or unparseable instant', () => {
    expect(venueDayKey(undefined)).toBe('');
    expect(venueDayKey('not a date')).toBe('');
  });
});

describe('the long date and the day label read the venue clock too', () => {
  /*
   * `formatLongDate` had no timezone at all, so it printed in whatever
   * zone the code happened to be running in -- the server's on a server
   * component, the visitor's in a client one. The same instant could
   * appear as two different dates on two surfaces of one conference.
   */
  it('prints the venue date, not the runtime date', () => {
    const instant = '2026-07-22T22:30:00.000Z';
    expect(formatLongDate(instant, EN, 'Asia/Jerusalem')).toContain('23');
    expect(formatLongDate(instant, EN, 'UTC')).toContain('22');
  });

  it('labels the day in the venue zone', () => {
    const instant = '2026-07-22T22:30:00.000Z';
    expect(formatDayLabel(instant, EN, 'Asia/Jerusalem')).not.toBe(
      formatDayLabel(instant, EN, 'UTC'),
    );
  });
});

/* ------------------------------------------------------------------ */

/*
 * Which clocks a producer may actually choose.
 *
 * Everything above proves the arithmetic works for any IANA zone handed
 * to it. That is not the same as a zone being *offerable*: the field is a
 * Payload `select`, so the option list is the whole allow-list -- and over
 * a Postgres adapter it is also an enum type, which is why adding one
 * needs a migration. These cases read the collection definition itself,
 * because a list asserted from memory keeps passing after the list
 * changes underneath it.
 */

type SelectOption = { readonly label: string; readonly value: string };

const timezoneOptions = (): readonly SelectOption[] => {
  const field = Events.fields.find(
    (candidate) => 'name' in candidate && candidate.name === 'timezone',
  );

  if (!field || field.type !== 'select') {
    throw new Error('events.timezone is no longer a select field');
  }

  return field.options.map((option) => {
    if (typeof option === 'string') {
      return { label: option, value: option };
    }
    return { label: String(option.label), value: option.value };
  });
};

const timezoneValues = (): readonly string[] =>
  timezoneOptions().map((option) => option.value);

describe('the venue timezones on offer', () => {
  it('includes Europe/Prague', () => {
    expect(timezoneValues()).toContain('Europe/Prague');
  });

  /*
   * The exact list, in order. Deliberately exhaustive: this is the test
   * that fails if a later change drops a zone a live conference is already
   * stored with, which the database would then refuse to read back into
   * the admin dropdown. The order matters only in that the migration
   * places the new enum value to match it.
   */
  it('is the eight that were already there, plus Prague, unchanged otherwise', () => {
    expect(timezoneValues()).toEqual([
      'Asia/Jerusalem',
      'Europe/Berlin',
      'Europe/Prague',
      'Europe/London',
      'America/New_York',
      'America/Chicago',
      'America/Los_Angeles',
      'Asia/Dubai',
      'UTC',
    ]);
  });

  it('still defaults to Israel', () => {
    const field = Events.fields.find(
      (candidate) => 'name' in candidate && candidate.name === 'timezone',
    );
    expect(field && 'defaultValue' in field ? field.defaultValue : null).toBe(
      'Asia/Jerusalem',
    );
    expect(DEFAULT_VENUE_TIMEZONE).toBe('Asia/Jerusalem');
  });

  /*
   * Every value has to be a zone the runtime recognises. `Intl` throws a
   * RangeError on an unknown identifier, so a typo -- 'Europe/Praha',
   * 'Europe/Prage' -- fails here rather than at 02:00 on the morning of a
   * conference. This is also the only check that would have caught the
   * label and the value disagreeing.
   */
  it('offers only zones the runtime can read a clock in', () => {
    const instant = '2026-07-22T12:00:00.000Z';

    for (const zone of timezoneValues()) {
      expect(() => formatTimeLabel(instant, EN, zone)).not.toThrow();
      expect(formatTimeLabel(instant, EN, zone)).toMatch(/^\d{2}:\d{2}$/);
    }
  });

  /*
   * And the honest note about what this option buys. Prague and Berlin
   * keep the same clock today -- same offsets, same EU changeover dates --
   * so no arithmetic changed and none needed to. What the option buys is
   * that a conference in Prague is *recorded* as being in Prague: if
   * Czechia ever stops changing its clocks with Germany (the EU has voted
   * to allow exactly that), the stored zone is already right and nothing
   * has to be found and corrected.
   */
  it('reads Prague and Berlin alike today, and records them apart', () => {
    for (const day of ['2026-07-22', '2026-01-14']) {
      expect(fromDateTimeInputValue(`${day}T14:00`, 'Europe/Prague')).toBe(
        fromDateTimeInputValue(`${day}T14:00`, 'Europe/Berlin'),
      );
    }

    const values = timezoneValues();
    expect(values).toContain('Europe/Prague');
    expect(values).toContain('Europe/Berlin');
    expect(timezoneOptions().find((o) => o.value === 'Europe/Berlin')?.label)
      .not.toContain('Prague');
  });

  /*
   * The stored value is still an instant, not a local string. Written out
   * because the one thing this change must not do is move the storage
   * format: 14:00 in Prague is a Z-suffixed UTC timestamp, exactly as
   * 14:00 in Jerusalem is.
   */
  it('stores a Prague time as an absolute instant', () => {
    const stored = fromDateTimeInputValue('2026-07-22T14:00', 'Europe/Prague');
    expect(stored).toBe('2026-07-22T12:00:00.000Z');
    expect(new Date(stored ?? '').toISOString()).toBe(stored);
    expect(toDateTimeInputValue(stored, 'Europe/Prague')).toBe(
      '2026-07-22T14:00',
    );
  });
});
