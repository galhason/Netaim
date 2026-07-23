import { z } from 'zod';
import type { Locale } from '@/config/locales';

/*
 * The platform's password policy: at least eight characters with an
 * uppercase letter, a lowercase letter and a symbol. Checked wherever a
 * password is set — opening an account, changing it, resetting it.
 */
export const passwordSchema = z
  .string()
  .min(8)
  .regex(/[A-Z]/)
  .regex(/[a-z]/)
  .regex(/[^A-Za-z0-9]/);

export const PASSWORD_POLICY_TEXT: Record<Locale, string> = {
  he: 'לפחות 8 תווים, עם אות גדולה, אות קטנה וסימן (למשל ! או #).',
  en: 'At least 8 characters, with an uppercase letter, a lowercase letter and a symbol (e.g. ! or #).',
};

export const isStrongPassword = (value: string): boolean =>
  passwordSchema.safeParse(value).success;
