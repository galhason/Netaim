import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/*
 * A person given a role whose address carries a capital letter.
 *
 * The users collection keeps every address in lower case; an account
 * keeps the spelling the person typed. The technical principal was
 * looked up by the typed spelling, found nothing, and the Studio opened
 * on an Owner who could see no conference and edit nothing. Both
 * lookups — and the write that creates the principal — now use one
 * spelling.
 */
const read = (file: string): string => readFileSync(file, 'utf8');

describe('the principal is found by one spelling of the address', () => {
  it('is lowercased and trimmed', async () => {
    const { principalEmail } = await import('@/infrastructure/payload/payload-context');
    expect(principalEmail('  Gal.Hason@Example.ORG ')).toBe('gal.hason@example.org');
  });

  it('is used by the door and by the grant sync, read and write', () => {
    const context = read('src/infrastructure/payload/payload-context.ts');
    expect(context).toContain("where: { email: { equals: principalEmail(account.email) } }");
    expect(context).not.toContain('where: { email: { equals: account.email } }');
    const grants = read('src/infrastructure/payload/payload-grant.ts');
    expect(grants).toContain("where: { email: { equals: principalEmail(account.email) } }");
    expect(grants).toContain('email: principalEmail(account.email),');
    expect(grants).not.toContain('where: { email: { equals: account.email } }');
  });
});
