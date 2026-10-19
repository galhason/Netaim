import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { mayBeListed } from '@/infrastructure/payload/payload-participation';

/*
 * Everyone is in the room.
 *
 * A participant chose to be listed, was, and a few days and fifty
 * registrations later was not — seen from another account too. Two
 * things were wrong. The directory was opt-in, so most of the fifty
 * were never there; and a registration that did not ask the question
 * (joining a conference from the personal area, a move by the Studio)
 * wrote "no" over the answer of a person who had said yes. The rule is
 * now listed-unless-no, and a registration writes the answer only when
 * the form asked for one.
 */
const read = (file: string): string => readFileSync(file, 'utf8');

describe('who is listed', () => {
  it('everyone taking part, unless they said no', () => {
    expect(mayBeListed({ contactPrefs: { directory: true } })).toBe(true);
    expect(mayBeListed({ contactPrefs: { directory: null } })).toBe(true);
    expect(mayBeListed({ contactPrefs: {} })).toBe(true);
    expect(mayBeListed({})).toBe(true);
    expect(mayBeListed({ contactPrefs: { directory: false } })).toBe(false);
  });

  it('never a blocked or anonymised account, and nobody from a missing row', () => {
    expect(mayBeListed({ contactPrefs: { directory: true }, blocked: true })).toBe(false);
    expect(mayBeListed({ contactPrefs: { directory: true }, anonymizedAt: '2026-10-01T00:00:00.000Z' })).toBe(false);
    expect(mayBeListed(null)).toBe(false);
    expect(mayBeListed(undefined)).toBe(false);
  });

  it('is the collection’s default and the form’s', () => {
    expect(read('src/cms/collections/participants.ts')).toContain("{ name: 'directory', type: 'checkbox', defaultValue: true }");
    expect(read('src/app/(frontend)/[locale]/events/[slug]/register/register-form.tsx')).toContain('  directory: true,');
  });
});

describe('a registration keeps the answer it was not asked', () => {
  const adapter = read('src/infrastructure/payload/payload-registration.ts');

  it('writes the directory answer only when the form gave one', () => {
    expect(adapter).toContain("...(participant.directory !== undefined ? { directory: participant.directory } : {}),");
    expect(adapter).not.toContain('directory: participant.directory === true,');
  });

  it('so joining from the personal area, or a move by the Studio, leaves it alone', () => {
    const join = read('src/features/account/services/account-service.ts');
    const move = read('src/features/studio/services/studio-participants.ts');
    for (const source of [join, move]) {
      const call = source.slice(source.indexOf('registerForEvent('), source.indexOf('registerForEvent(') + 160);
      expect(call).not.toContain('directory');
    }
  });
});

describe('the rows already there', () => {
  const migration = read('src/migrations/20261019_150000_everyone_is_in_the_room.ts');

  it('are listed, keep their previous answer for the way back, and the column default follows', () => {
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS "participants_directory_state"');
    expect(migration).toContain(`WHERE p."contact_prefs_directory" IS DISTINCT FROM true`);
    expect(migration).toContain(`SET "contact_prefs_directory" = true`);
    expect(migration).toContain(`ALTER COLUMN "contact_prefs_directory" SET DEFAULT true`);
    expect(migration).toContain(`SET "contact_prefs_directory" = s."directory_before"`);
  });

  it('are on the list of migrations, last', () => {
    const index = read('src/migrations/index.ts');
    expect(index.trimEnd().endsWith("name: '20261019_150000_everyone_is_in_the_room',\n  },\n];")).toBe(true);
  });
});
