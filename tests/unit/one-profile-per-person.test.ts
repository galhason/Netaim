import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/*
 * One profile per person.
 *
 * A guest used to have a `networking-profiles` row per conference —
 * headline, a few lines, interests, links — filled in on a form that
 * only existed inside one conference. Attend two and you had two
 * half-written introductions, no way to know which a stranger was
 * reading, and no way to fix both at once. Meanwhile the fields beside
 * them (role, organisation, interests) were already answered once, on
 * the account.
 *
 * So the layer is gone rather than tidied. The profile is the account's;
 * the conference decides only whether you are in its room.
 *
 * These cases fail if the second layer grows back — a collection, a
 * repository, a per-conference form, or a page that owns any of it.
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

describe('a person has one profile, on their account', () => {
  it('has no per-conference profile collection left', () => {
    for (const gone of [
      'src/cms/collections/networking-profiles.ts',
      'src/infrastructure/payload/payload-networking.ts',
      'src/features/networking/services/networking-service.ts',
      'src/features/networking/types/networking.ts',
    ]) {
      expect(existsSync(gone), `${gone} was retired`).toBe(false);
    }

    /*
     * Code, not prose: the participants collection explains in a comment
     * why the old row is gone, and saying so is the opposite of the
     * regression this guards against.
     */
    const offenders = SOURCES.filter(({ text }) =>
      /collection: 'networking-profiles'|networkingProfileRepository|NetworkingProfileSummary/.test(
        text,
      ),
    )
      .map(({ file }) => file);

    expect(offenders).toEqual([]);
  });

  it('reads a speaker\u2019s default bio from the account', () => {
    /*
     * It read the speaker's profile for one conference, so the same
     * person could have a bio on one event's page and none on another's.
     */
    const speakers = SOURCES.find(({ file }) =>
      file.endsWith('payload/payload-speaker.ts'),
    );
    expect(speakers?.text.includes("collection: 'participants'")).toBe(true);
  });

  it('keeps the introduction on the account, beside the rest of it', () => {
    const participants = SOURCES.find(({ file }) =>
      file.endsWith('cms/collections/participants.ts'),
    );
    const body = participants?.text ?? '';
    for (const field of ["name: 'headline'", "name: 'bio'", "name: 'links'"]) {
      expect(body.includes(field), `${field} belongs on the account`).toBe(
        true,
      );
    }
  });

  it('edits it in exactly one place', () => {
    const forms = SOURCES.filter(({ text }) =>
      /name="headline"/.test(text),
    ).map(({ file }) => file);

    expect(forms).toHaveLength(1);
    expect(forms[0]?.endsWith('me/profile/page.tsx')).toBe(true);
  });

  it('leaves the retired conference page as a redirect, not a 404', () => {
    const page = SOURCES.find(({ file }) =>
      file.endsWith('events/[slug]/networking/page.tsx'),
    );
    expect(page, 'the address must keep working').toBeDefined();
    expect(page?.text.includes('redirect(')).toBe(true);
    expect(page?.text.includes('/me/networking')).toBe(true);

    /*
     * And nothing should still be sending people there. The lounge did,
     * which would have cost every guest a redirect on the way to the
     * community.
     */
    const senders = SOURCES.filter(
      ({ file, text }) =>
        !file.endsWith('events/[slug]/networking/page.tsx') &&
        /\$\{base\}\/networking|events\/\$\{[a-zA-Z.]+\}\/networking/.test(text),
    ).map(({ file }) => file);
    expect(senders).toEqual([]);
  });

  it('carries what people already wrote, rather than dropping it', () => {
    /*
     * The old rows are deleted by the migration. A schema change that
     * silently discards what guests wrote about themselves is not a
     * refactor, so the content is lifted out first and put back after.
     */
    expect(existsSync('scripts/carry-profiles-to-accounts.mjs')).toBe(true);
    const script = readFileSync(
      'scripts/carry-profiles-to-accounts.mjs',
      'utf8',
    );
    expect(script.includes('--stash')).toBe(true);
    expect(script.includes('--apply')).toBe(true);
    expect(
      script.includes("coalesce(nullif(headline, ''), $2)"),
      'and must never overwrite something newer on the account',
    ).toBe(true);
  });
});
