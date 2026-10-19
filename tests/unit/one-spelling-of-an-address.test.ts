import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { oneSpellingOfAnAddress } from '@/cms/hooks/one-spelling-of-an-address';

/*
 * One spelling of an address.
 *
 * A participant could not get a sign-in link while everyone else could.
 * Their account had been saved with a capital letter in the address;
 * the recovery form lower-cased what they typed, looked for an exact
 * match, found nothing — and said a link was on its way. The spelling
 * is now settled on the way into the row, every lookup asks with the
 * same spelling, and a migration settles the rows already there.
 */
const read = (file: string): string => readFileSync(file, 'utf8');

describe('the row keeps one spelling', () => {
  const hook = (data: Record<string, unknown>) =>
    oneSpellingOfAnAddress({ data, operation: 'create' } as never) as Record<string, unknown>;

  it('lower-cases and trims the address whoever writes it', () => {
    expect(hook({ email: '  Yossi@Gmail.com ' }).email).toBe('yossi@gmail.com');
    expect(hook({ name: 'Dana', email: 'Dana@Example.ORG' })).toEqual({ name: 'Dana', email: 'dana@example.org' });
  });

  it('leaves a write without an address alone', () => {
    expect(hook({ name: 'Only a name' })).toEqual({ name: 'Only a name' });
    expect(oneSpellingOfAnAddress({ data: undefined, operation: 'update' } as never)).toBeUndefined();
  });

  it('is attached to the participants collection', () => {
    const collection = read('src/cms/collections/participants.ts');
    expect(collection).toContain('beforeValidate: [oneSpellingOfAnAddress]');
  });
});

describe('every lookup asks with the same spelling', () => {
  const sessions = read('src/infrastructure/payload/payload-participant-session.ts');
  const registration = read('src/infrastructure/payload/payload-registration.ts');

  it('at the door, by the recovery link, by the conference link and when an account is opened', () => {
    expect(sessions).toContain("where: { email: { equals: principalEmail(email) } }");
    expect(sessions.match(/const email = principalEmail\(typed\);/g)?.length).toBe(3);
    expect(sessions).not.toMatch(/\{ email: \{ equals: typed \} \}/);
  });

  it('when a registration creates the account', () => {
    expect(registration).toContain('const email = principalEmail(participant.email);');
    expect(registration).not.toContain('{ email: { equals: participant.email } }');
    expect(registration).not.toContain('email: participant.email,');
  });
});

describe('the rows already there', () => {
  const migration = read('src/migrations/20261019_090000_one_spelling_of_an_address.ts');

  it('are lower-cased and trimmed, except a pair one spelling apart', () => {
    expect(migration).toContain(`WHERE p."email" <> lower(btrim(p."email"))`);
    expect(migration).toContain(`AND lower(btrim(q."email")) = lower(btrim(p."email"))`);
    expect(migration).toContain(`AND q."organization_id" IS NOT DISTINCT FROM p."organization_id"`);
  });

  it('keep their old spelling for the way back, and the way back respects a later edit', () => {
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS "participants_email_case_state"');
    expect(migration).toContain(`AND p."email" = lower(btrim(s."email_before"));`);
    expect(migration).toContain('DROP TABLE IF EXISTS "participants_email_case_state"');
  });

  it('are on the list of migrations', () => {
    expect(read('src/migrations/index.ts')).toContain("name: '20261019_090000_one_spelling_of_an_address'");
  });
});
