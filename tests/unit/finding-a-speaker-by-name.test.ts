import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ACCOUNT_SUGGESTIONS, searchAccounts } from '@/features/studio/utils/account-search';

/*
 * Finding a speaker among four hundred accounts by typing a name.
 *
 * The conference's speaker list used to offer every account as one long
 * <select>; now the first letters of a name bring up the few people
 * whose name begins so, in a sensible order, and the choice travels to
 * the same server action as before.
 */
const accounts = [
  { accountId: '1', name: 'Gal Hason', company: 'Netaim' },
  { accountId: '2', name: 'Magali Hason', company: 'School' },
  { accountId: '3', name: 'Gal Or' },
  { accountId: '4', name: 'Dana Levi', company: 'Galilee Foundation' },
  { accountId: '5', name: 'Noa Galili', email: 'noa@example.org' },
  { accountId: '6', name: 'דנה לוי', company: 'נטעים' },
  { accountId: '7', name: 'Tom Reed', email: 'tom@galaxy.example' },
];

describe('searching accounts by name', () => {
  it('offers the names that begin with the letters first, then the ones that contain them, then a company or email', () => {
    expect(searchAccounts(accounts, 'gal').map((a) => a.name)).toEqual([
      'Gal Hason',
      'Gal Or',
      'Noa Galili',
      'Magali Hason',
      'Dana Levi',
      'Tom Reed',
    ]);
  });

  it('does not mind the case or the script', () => {
    expect(searchAccounts(accounts, 'GAL HA').map((a) => a.name)).toEqual(['Gal Hason']);
    expect(searchAccounts(accounts, 'דנה').map((a) => a.name)).toEqual(['דנה לוי']);
    expect(searchAccounts(accounts, 'נטע').map((a) => a.name)).toEqual(['דנה לוי']);
  });

  it('offers nothing for nothing, and never more than a few', () => {
    expect(searchAccounts(accounts, '   ')).toEqual([]);
    const many = Array.from({ length: 40 }, (_, i) => ({ accountId: String(i), name: `Gal ${i}` }));
    expect(searchAccounts(many, 'gal')).toHaveLength(ACCOUNT_SUGGESTIONS);
    expect(searchAccounts(many, 'gal', 3)).toHaveLength(3);
  });
});

describe('the speakers page', () => {
  it('asks for the account through the picker, under the field name the action reads', () => {
    const page = readFileSync('src/app/(studio)/studio/(console)/conference/[slug]/speakers/page.tsx', 'utf8');
    expect(page).toContain('<AccountCombobox');
    expect(page).toContain('name="accountId"');
    expect(page).not.toContain('<select name="accountId"');
    const action = readFileSync('src/app/(studio)/studio/(console)/conference/[slug]/speakers/actions.ts', 'utf8');
    expect(action).toContain("text(formData, 'accountId')");
  });

  it('is a real combobox: a hidden value, a listbox, the arrows and Escape', () => {
    const picker = readFileSync('src/features/studio/components/console/account-combobox.tsx', 'utf8');
    expect(picker).toContain('<input type="hidden" name={name} value={chosen?.accountId ?? \'\'} />');
    expect(picker).toContain('role="combobox"');
    expect(picker).toContain('role="listbox"');
    expect(picker).toContain("event.key === 'ArrowDown'");
    expect(picker).toContain("event.key === 'Escape'");
    expect(picker).toContain('searchAccounts(options, query)');
  });
});
