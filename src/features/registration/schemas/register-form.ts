import { z } from 'zod';
import { isCountryCode } from '@/shared/constants/countries';
import { PROFILE_LIMITS } from '../constants/profile-limits';
import { oneLine, paragraph } from '../utils/profile-text';

/* Within the profile's own limits (see profile-limits); one-line fields on one line. */
const line = (max: number) => z.string().trim().min(1).max(max).transform((value) => oneLine(value, max));
const text = (max: number) => z.string().trim().min(1).max(max).transform((value) => paragraph(value, max));

export const registerFormSchema = z.object({
  name: line(PROFILE_LIMITS.name),
  email: z.string().trim().max(PROFILE_LIMITS.email).email(),
  phone: line(PROFILE_LIMITS.phone).optional(),
  accessibility: text(PROFILE_LIMITS.accessibility).optional(),
  dietary: text(PROFILE_LIMITS.dietary).optional(),
  organization: line(PROFILE_LIMITS.organization).optional(),
  role: line(PROFILE_LIMITS.role).optional(),
  /*
   * A code from the list or nothing at all. Checked against the list
   * rather than against a shape, because "ZZ" is two upper-case
   * letters and not a country, and a stored code no list recognises
   * is a row that can never be counted or translated.
   */
  country: z
    .string()
    .trim()
    .toUpperCase()
    .refine(isCountryCode, { message: 'unknown country' })
    .optional(),
  /* PRD §5.1 — the directory question, answered at registration. */
  directory: z.boolean(),
  /*
   * Consent to being photographed and to the use of the media — asked
   * at registration and required by it, so only an explicit yes parses.
   */
  mediaConsent: z.literal(true),
});

export type RegisterFormValues = z.infer<typeof registerFormSchema>;

const optional = (value: FormDataEntryValue | null): string | undefined => {
  const text = typeof value === 'string' ? value.trim() : '';
  return text.length > 0 ? text : undefined;
};

export const parseRegisterForm = (data: FormData) =>
  registerFormSchema.safeParse({
    name: String(data.get('name') ?? ''),
    email: String(data.get('email') ?? ''),
    phone: optional(data.get('phone')),
    organization: optional(data.get('organization')),
    role: optional(data.get('role')),
    country: optional(data.get('country')),
    accessibility: optional(data.get('accessibility')),
    dietary: optional(data.get('dietary')),
    directory: data.get('directory') === 'on',
    mediaConsent: data.get('mediaConsent') === 'on',
  });
