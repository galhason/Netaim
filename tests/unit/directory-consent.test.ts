import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/*
 * Who a guest is shown to.
 *
 * The people directory once read the `participants` collection directly
 * for everyone who was not blocked — no consent check, and no
 * organization filter. A guest's name, employer, role, interests and
 * photograph were listed to strangers from other public bodies, while
 * the page told them their profile appeared "only if you choose to show
 * it". The checkbox existed and governed a different page.
 *
 * The rule now: a directory is built from `networking-profiles` rows
 * with `visible` ticked, in conferences the viewer is part of. These
 * cases fail if a surface goes back to reading participants wholesale.
 */
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) return walk(full);
    return /\.tsx?$/.test(entry) ? [full] : [];
  });

const SOURCES = walk('src').map((file) => ({
  file,
  text: readFileSync(file, 'utf8'),
}));

describe('the people directory shows only those who asked to be in it', () => {
  it('has no unscoped platform-wide participant read left', () => {
    const offenders = SOURCES.filter(({ text }) =>
      /listPlatformParticipants|payloadListPlatformParticipants/.test(text),
    ).map(({ file }) => file);

    expect(
      offenders,
      'this read returned every participant on the platform, across organizations and regardless of consent',
    ).toEqual([]);
  });

  it('builds the directory from visible networking profiles', () => {
    const adapter = SOURCES.find(({ file }) =>
      file.replace(/\\/g, '/').endsWith('payload/payload-registration.ts'),
    );
    expect(adapter, 'the registration adapter should exist').toBeDefined();

    const body = adapter?.text ?? '';
    const directory = body.slice(body.indexOf('payloadListDirectoryParticipants'));

    expect(
      directory.includes("collection: 'networking-profiles'"),
      'the directory must read profiles, not the participants collection',
    ).toBe(true);
    expect(
      directory.includes("visible: { equals: true }"),
      'the directory must require the visibility a guest opted into',
    ).toBe(true);
    /*
     * Consent is not the only gate: an account that was blocked or
     * anonymised must leave the directory even though its profile row
     * survives.
     */
    expect(directory.includes('row.blocked === true')).toBe(true);
    expect(directory.includes('row.anonymizedAt')).toBe(true);
  });

  it('takes the conferences from the account, never from the request', () => {
    const page = SOURCES.find(({ file }) =>
      file.replace(/\\/g, '/').endsWith('me/networking/page.tsx'),
    );
    expect(page, 'the networking page should exist').toBeDefined();

    const text = page?.text ?? '';
    /*
     * A slug read from the query string would let a visitor name a
     * conference they have nothing to do with and read its directory.
     * The chosen conference is looked up inside `account.joined`.
     */
    expect(
      text.includes('account.joined.find('),
      'the chosen conference must be found within the account, not trusted from the URL',
    ).toBe(true);
    expect(text.includes('listDirectoryParticipants(directorySlugs)')).toBe(
      true,
    );
  });
});
