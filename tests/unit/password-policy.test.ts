import { describe, expect, it } from 'vitest';
import { isStrongPassword } from '@/features/registration/schemas/password';

/*
 * The platform password policy (approved decision §7): at least eight
 * characters with an uppercase letter, a lowercase letter and a symbol.
 */
describe('password policy', () => {
  it('accepts a password meeting the policy', () => {
    expect(isStrongPassword('Hason!2026')).toBe(true);
    expect(isStrongPassword('aB#defgh')).toBe(true);
  });

  it('refuses short passwords', () => {
    expect(isStrongPassword('aB!x')).toBe(false);
  });

  it('refuses passwords without an uppercase letter', () => {
    expect(isStrongPassword('abcdefg!')).toBe(false);
  });

  it('refuses passwords without a lowercase letter', () => {
    expect(isStrongPassword('ABCDEFG!')).toBe(false);
  });

  it('refuses passwords without a symbol', () => {
    expect(isStrongPassword('Abcdefgh1')).toBe(false);
  });
});
