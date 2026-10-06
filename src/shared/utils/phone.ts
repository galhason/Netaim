import { DIAL_PLANS, MAIN_COUNTRY_OF_DIAL, dialPlanOf, type DialPlan } from '../constants/dial-codes';

/*
 * A telephone number, as a person types it and as the platform keeps it.
 *
 * The form asks for the country's calling code beside the number, so a
 * guest from London types 7700 900123 under +44 rather than guessing
 * how to write it for an Israeli system. What is stored is the number
 * in international form, +447700900123: one spelling for every country,
 * and the one a phone, a dialler or WhatsApp takes as it is.
 *
 * The number is written the way it is written at home — 050-1234567 in
 * Israel, (212) 555-0100 in New York — and the trunk prefix that local
 * writing carries (the 0, the 1) is taken off before the calling code
 * goes in front. A number typed in full with + or 00 is taken as it is,
 * whatever country is chosen beside it.
 *
 * The check is the length the country's numbering plan allows, not a
 * full parse of its plan: enough to stop a digit missing or two numbers
 * run together, without a numbering database in every browser.
 */
export type PhoneRefusal = 'missing' | 'format' | 'country' | 'length';

export type PhoneReading = { ok: true; e164: string } | { ok: false; reason: PhoneRefusal };

const ALLOWED = /^[\d\s().\-+/]+$/;

/* The plans whose calling code starts the digits, longest code first. */
const plansForInternational = (digits: string): DialPlan[] => {
  for (const length of [3, 2, 1]) {
    const dial = digits.slice(0, length);
    const plans = DIAL_PLANS.filter((plan) => plan.dial === dial);
    if (plans.length > 0) {
      return plans;
    }
  }
  return [];
};

const fits = (plans: readonly DialPlan[], national: string): boolean =>
  plans.some((plan) => national.length >= plan.minDigits && national.length <= plan.maxDigits);

export const readPhone = (country: string, typed: string): PhoneReading => {
  const raw = typed.trim();
  if (!raw) {
    return { ok: false, reason: 'missing' };
  }
  if (!ALLOWED.test(raw) || raw.indexOf('+') > 0) {
    return { ok: false, reason: 'format' };
  }
  const digits = raw.replace(/\D/g, '');

  /* Typed in full: +44 7700 900123 or 0044 7700 900123. */
  if (raw.startsWith('+') || digits.startsWith('00')) {
    const international = raw.startsWith('+') ? digits : digits.slice(2);
    const plans = plansForInternational(international);
    const dial = plans[0]?.dial;
    if (!dial) {
      return { ok: false, reason: 'country' };
    }
    const national = international.slice(dial.length);
    return fits(plans, national) ? { ok: true, e164: `+${international}` } : { ok: false, reason: 'length' };
  }

  const plan = dialPlanOf(country);
  if (!plan) {
    return { ok: false, reason: 'country' };
  }
  const national =
    plan.trunk && digits.startsWith(plan.trunk) && digits.length - plan.trunk.length >= plan.minDigits
      ? digits.slice(plan.trunk.length)
      : digits;
  return fits([plan], national) ? { ok: true, e164: `+${plan.dial}${national}` } : { ok: false, reason: 'length' };
};

/*
 * A stored number back into the two fields that wrote it. A number in
 * international form opens on its own country — the guest's own, when
 * that shares the calling code (a Canadian is not shown as American) —
 * and the rest of the digits; anything older, typed before the code was
 * asked, opens as it was, under the fallback country.
 */
export const splitPhone = (stored: string, fallbackCountry: string): { country: string; national: string } => {
  const value = stored.trim();
  const fallback = dialPlanOf(fallbackCountry) ? fallbackCountry.toUpperCase() : 'IL';
  if (!value.startsWith('+')) {
    return { country: fallback, national: value };
  }
  const digits = value.replace(/\D/g, '');
  const plans = plansForInternational(digits);
  const dial = plans[0]?.dial;
  if (!dial) {
    return { country: fallback, national: value };
  }
  const own = plans.find((plan) => plan.country === fallback);
  return {
    country: own?.country ?? MAIN_COUNTRY_OF_DIAL[dial] ?? plans[0]!.country,
    national: digits.slice(dial.length),
  };
};

/*
 * What a profile form saves: the international form when the number
 * reads, and otherwise what was typed, as the profile always kept it —
 * the profile never refused a number, and does not start now.
 */
export const phoneToStore = (country: string, typed: string): string | undefined => {
  const raw = typed.trim();
  if (!raw) {
    return undefined;
  }
  const reading = readPhone(country, raw);
  return reading.ok ? reading.e164 : raw;
};
