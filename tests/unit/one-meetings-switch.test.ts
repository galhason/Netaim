import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/*
 * One switch for meetings.
 *
 * There were two. `networking-profiles.availableForMeetings` sat on the
 * conference profile form, and `participants.contactPrefs.meetings` sat
 * in the privacy settings. Both claimed to answer the same question,
 * neither read the other, and the guest had no way to know which one
 * the platform would obey — so a person who had turned meetings off in
 * their privacy settings could still be sent a meeting proposal.
 *
 * The privacy setting won, because it is the one that travels with the
 * person rather than with a single conference. What the directory shows
 * is now derived from it and nothing else.
 */
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) return walk(full);
    return /\.tsx?$/.test(entry) ? [full] : [];
  });

const SOURCES = walk('src').map((file) => ({
  file: file.replace(/\\/g, '/'),
  text: readFileSync(file, 'utf8'),
}));

describe('meetings are governed by one setting', () => {
  it('has no second meetings field left anywhere in the source', () => {
    const offenders = SOURCES.filter(({ text }) =>
      /availableForMeetings/.test(text),
    ).map(({ file }) => file);

    expect(
      offenders,
      'the conference profile no longer stores its own answer; the privacy setting is the only one',
    ).toEqual([]);
  });

  it('derives what the directory shows from the privacy setting', () => {
    const adapter = SOURCES.find(({ file }) =>
      file.endsWith('payload/payload-registration.ts'),
    );
    expect(adapter, 'the registration adapter should exist').toBeDefined();
    const body = adapter?.text ?? '';

    expect(body.includes('contactPrefs')).toBe(true);
    expect(body.includes('openToMeetings')).toBe(true);
    /*
     * Absent means yes. An account saved before the setting existed, or
     * a relationship returned as a bare id, must not read as a refusal
     * — that would silently close a door the guest never shut.
     */
    expect(body.includes('contactPrefs?.meetings !== false')).toBe(true);
  });

  it('shows the tag the meeting gate actually enforces', () => {
    /*
     * The tag and the gate read the same field. When they were two
     * fields, the directory advertised someone as open to meetings
     * while `proposeMeeting` turned every proposal down.
     */
    const page = SOURCES.find(({ file }) =>
      file.endsWith('me/networking/page.tsx'),
    );
    expect(page?.text.includes('person.openToMeetings')).toBe(true);

    const gate = SOURCES.find(({ file }) =>
      file.endsWith('services/meeting-service.ts'),
    );
    expect(gate?.text.includes('guest.prefs.meetings')).toBe(true);
  });

  it('asks nowhere else — there is no second form to disagree with', () => {
    const offenders = SOURCES.filter(
      ({ text }) =>
        /name="meetings"/.test(text) || /name="visible"/.test(text),
    ).map(({ file }) => file);

    /*
     * Exactly one: the privacy section of the account profile. A second
     * checkbox anywhere is the failure this whole change removed.
     */
    expect(offenders).toHaveLength(1);
    expect(offenders[0]?.endsWith('me/profile/page.tsx')).toBe(true);
  });
});
