import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DIAL_PLANS, dialPlanOf } from '@/shared/constants/dial-codes';
import { COUNTRIES } from '@/shared/constants/countries';
import { phoneToStore, readPhone, splitPhone } from '@/shared/utils/phone';

/*
 * A telephone number from any country.
 *
 * Guests come from abroad, so the registration form asks for the
 * country's calling code beside the number, and the number is written
 * the way it is written at home. What is kept is the international
 * form — +972501234567 — one spelling for every country, and the one a
 * dialler and WhatsApp take as it is. The server reads the number the
 * same way the form does, and a number it cannot read is refused before
 * any code is sent, with everything else that was typed kept.
 */
describe('the calling codes', () => {
  it('has a code for every country with a telephone service, and only countries the list knows', () => {
    const known = new Set(COUNTRIES.map((country) => country.code));
    expect(DIAL_PLANS.length).toBe(242);
    for (const plan of DIAL_PLANS) {
      expect(known.has(plan.country), plan.country).toBe(true);
      expect(plan.dial).toMatch(/^\d{1,3}$/);
      expect(plan.minDigits).toBeLessThanOrEqual(plan.maxDigits);
    }
    expect(dialPlanOf('il')?.dial).toBe('972');
    expect(dialPlanOf('GB')?.dial).toBe('44');
    expect(dialPlanOf('AQ')).toBeUndefined();
  });
});

describe('reading a number', () => {
  it('takes an Israeli number as it is written at home and drops the 0', () => {
    expect(readPhone('IL', '050-1234567')).toEqual({ ok: true, e164: '+972501234567' });
    expect(readPhone('IL', '03 123 4567')).toEqual({ ok: true, e164: '+97231234567' });
  });

  it('takes a number from abroad under its own code', () => {
    expect(readPhone('GB', '07700 900123')).toEqual({ ok: true, e164: '+447700900123' });
    expect(readPhone('US', '(212) 555-0100')).toEqual({ ok: true, e164: '+12125550100' });
    expect(readPhone('US', '1 212 555 0100')).toEqual({ ok: true, e164: '+12125550100' });
    expect(readPhone('FR', '06 12 34 56 78')).toEqual({ ok: true, e164: '+33612345678' });
  });

  it('keeps a leading 0 where it is part of the number, and drops a longer trunk prefix', () => {
    expect(readPhone('IT', '06 1234 5678')).toEqual({ ok: true, e164: '+390612345678' });
    expect(readPhone('HU', '06 30 123 4567')).toEqual({ ok: true, e164: '+36301234567' });
  });

  it('takes a number typed in full as it is, whatever code is chosen beside it', () => {
    expect(readPhone('IL', '+44 7700 900123')).toEqual({ ok: true, e164: '+447700900123' });
    expect(readPhone('IL', '0044 7700 900123')).toEqual({ ok: true, e164: '+447700900123' });
  });

  it('refuses a missing number, letters, a digit short and two numbers run together', () => {
    expect(readPhone('IL', '  ')).toEqual({ ok: false, reason: 'missing' });
    expect(readPhone('IL', '050-CALL-ME')).toEqual({ ok: false, reason: 'format' });
    expect(readPhone('IL', '05012')).toEqual({ ok: false, reason: 'length' });
    expect(readPhone('US', '212555010012125550100')).toEqual({ ok: false, reason: 'length' });
    expect(readPhone('XX', '050-1234567')).toEqual({ ok: false, reason: 'country' });
    expect(readPhone('IL', '05+01234567')).toEqual({ ok: false, reason: 'format' });
  });
});

describe('reading it back', () => {
  it('opens a stored number on its own country and its own digits', () => {
    expect(splitPhone('+447700900123', 'IL')).toEqual({ country: 'GB', national: '7700900123' });
    expect(splitPhone('+972501234567', 'IL')).toEqual({ country: 'IL', national: '501234567' });
  });

  it('prefers the guest’s own country when it shares the code — a Canadian is not shown as American', () => {
    expect(splitPhone('+14165550100', 'CA')).toEqual({ country: 'CA', national: '4165550100' });
    expect(splitPhone('+14165550100', 'IL')).toEqual({ country: 'US', national: '4165550100' });
  });

  it('opens a number written before the code was asked as it was', () => {
    expect(splitPhone('050-1234567', 'IL')).toEqual({ country: 'IL', national: '050-1234567' });
  });

  it('lets a profile save what it cannot read, as it always did', () => {
    expect(phoneToStore('IL', '050-1234567')).toBe('+972501234567');
    expect(phoneToStore('IL', 'ext. 12')).toBe('ext. 12');
    expect(phoneToStore('IL', '')).toBeUndefined();
  });
});

const redirects: string[] = [];
const sent = vi.fn();

vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    redirects.push(url);
    throw new Error(`NEXT_REDIRECT ${url}`);
  },
}));
vi.mock('@/features/access', () => ({ checkRateLimit: async () => ({ ok: true }) }));
vi.mock('@/features/account', () => ({ scheduleConflictFor: async () => null }));
vi.mock('@/features/conference/services/conference-door', () => ({ mayEnterConference: async () => true }));
vi.mock('@/shared/cache/publish', () => ({ publishedDirectory: () => undefined }));
vi.mock('@/features/registration', async () => {
  const { isLatinName } = await import('@/features/registration/schemas/latin-name');
  const { isStrongPassword } = await import('@/features/registration/schemas/password');
  const { parseRegisterForm } = await import('@/features/registration/schemas/register-form');
  return {
    isLatinName,
    isStrongPassword,
    parseRegisterForm,
    emailHasAccount: async () => false,
    passwordHashFor: () => 'hashed',
    beginEmailVerification: async (...args: unknown[]) => {
      sent(...args);
      return { ok: true, delivered: true };
    },
    confirmEmailVerification: async () => ({ ok: false, reason: 'wrong' }),
    registerForEvent: async () => ({ outcome: 'confirmed', participantId: '1', registrationId: '1' }),
    establishSession: async () => undefined,
    applyPasswordHash: async () => undefined,
    reissueEmailVerification: async () => ({ ok: true, delivered: true }),
    signInWithPassword: async () => ({ ok: false }),
  };
});

const { requestCodeAction } = await import('@/app/(frontend)/[locale]/events/[slug]/register/actions');

const filled = (phone: string, phoneCountry: string) => {
  const data = new FormData();
  for (const [key, value] of Object.entries({
    slug: 'ntaym-2026',
    locale: 'en',
    firstName: 'Ann',
    lastName: 'Smith',
    email: 'ann@example.co.uk',
    phone,
    phoneCountry,
    password: 'Strong-Passw0rd!',
    passwordConfirm: 'Strong-Passw0rd!',
    organization: 'School',
    role: 'Teacher',
    country: 'GB',
    dietary: 'none',
    mediaConsent: 'on',
  })) {
    data.set(key, value);
  }
  return data;
};

describe('the registration form', () => {
  beforeEach(() => {
    redirects.length = 0;
    sent.mockClear();
  });

  it('keeps the number in international form', async () => {
    await expect(requestCodeAction({ error: null }, filled('07700 900123', 'GB'))).rejects.toThrow('NEXT_REDIRECT');
    const details = (sent.mock.calls[0]?.[3] as { details: { phone: string } }).details;
    expect(details.phone).toBe('+447700900123');
  });

  it('refuses a number it cannot read, before a code is sent, and keeps what was typed', async () => {
    const state = await requestCodeAction({ error: null }, filled('7700', 'GB'));
    expect(state.error).toBe('phone');
    expect(state.values).toMatchObject({ phone: '7700', phoneCountry: 'GB', email: 'ann@example.co.uk' });
    expect(sent).not.toHaveBeenCalled();
  });

  it('asks for the code beside the number, carries both between the steps, and checks with the same reading', () => {
    const form = readFileSync('src/app/(frontend)/[locale]/events/[slug]/register/register-form.tsx', 'utf8');
    expect(form).toContain('<PhoneField');
    expect(form).toContain('<input type="hidden" name="phoneCountry" value={values.phoneCountry} />');
    expect(form).toContain('const phone = readPhone(values.phoneCountry, values.phone);');
    expect(form).toContain("phone: { step: 1, field: 'phone' }");
  });

  it('opens on Israel and draws the code as a real, named list', () => {
    const field = readFileSync('src/features/registration/components/phone-field.tsx', 'utf8');
    expect(readFileSync('src/app/(frontend)/[locale]/events/[slug]/register/register-form.tsx', 'utf8')).toContain("phoneCountry: 'IL'");
    expect(field).toContain('aria-label={CODE_LABEL[locale]}');
    expect(field).toContain('<select');
    expect(field).toContain('dir="ltr"');
  });
});
