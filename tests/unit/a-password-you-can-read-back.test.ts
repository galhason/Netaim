import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/*
 * A password typed behind dots cannot be checked, and a typo in it
 * locks the person out of the account they just made. Every password
 * field on the platform now carries a switch — an eye and a word —
 * that shows the characters; the form sees the same input either way.
 */
const read = (file: string): string => readFileSync(file, 'utf8');

describe('a password you can read back', () => {
  it('is one field, switched between hidden and shown, read left to right', () => {
    const field = read('src/features/registration/components/password-field.tsx');
    expect(field).toContain("type={shown ? 'text' : 'password'}");
    expect(field).toContain('aria-pressed={shown}');
    expect(field).toContain("show: { he: 'הצגה', en: 'Show' }");
    expect(field).toContain('<input dir="ltr" {...input}');
    expect(field).toContain("const room = locale === 'he' ? 'pl-24' : 'pr-24';");
  });

  it('stands wherever a password is typed: registration (twice), sign-in, the profile', () => {
    const register = read('src/app/(frontend)/[locale]/events/[slug]/register/register-form.tsx');
    expect(register.match(/<PasswordField/g)).toHaveLength(2);
    expect(register).not.toContain('type="password"');
    const signIn = read('src/app/(frontend)/[locale]/me/sign-in-screen.tsx');
    expect(signIn).toContain('<PasswordField');
    expect(signIn).not.toContain('type="password"');
    const profile = read('src/app/(frontend)/[locale]/me/profile/page.tsx');
    expect(profile).toContain('<PasswordField');
    expect(profile).not.toContain('type="password"');
  });

  it('leaves the conference bar without the retired info page', () => {
    const bar = read('src/features/conference/components/conference-bar.tsx');
    expect(bar).not.toContain("key: 'info'");
  });
});
