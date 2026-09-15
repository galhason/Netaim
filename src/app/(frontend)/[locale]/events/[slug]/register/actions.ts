'use server';

import { redirect } from 'next/navigation';
import { checkRateLimit } from '@/features/access';
import { FALLBACK_LOCALE, isSupportedLocale, type Locale } from '@/config/locales';
import { publishedDirectory } from '@/shared/cache/publish';
import {
  emailHasAccount,
  applyPasswordHash,
  beginEmailVerification,
  confirmEmailVerification,
  establishSession,
  isStrongPassword,
  parseRegisterForm,
  passwordHashFor,
  registerForEvent,
  reissueEmailVerification,
  signInWithPassword,
} from '@/features/registration';
import { scheduleConflictFor } from '@/features/account';

const localeOf = (value: string): Locale =>
  isSupportedLocale(value) ? value : FALLBACK_LOCALE;

/*
 * Registration, in two halves.
 *
 * The first half takes the form and proves the address: everything is
 * validated here — the schedule rule, the password, the shape of the
 * fields — so that a person is never sent a code only to be told
 * afterwards that something else was wrong. What survives is a pending
 * record keyed by a hash of the address, holding the details and the
 * hashed password for fifteen minutes.
 *
 * The second half takes the code and creates the account. Nothing is
 * written to the participants table in between, so an address with a
 * typo in it costs fifteen minutes of nothing rather than a registration
 * that can never be reached.
 */
/*
 * What the form gets back when it is refused.
 *
 * `values` is everything typed except the two password fields, so a
 * refusal costs one field rather than the whole form. The passwords are
 * deliberately absent: echoing one back writes it into the page source,
 * the back/forward cache and anything that saves the page — and it is
 * the one field a person can retype from memory in a second.
 */
export interface RegisterKeptValues {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  organization: string;
  role: string;
  dietary: string;
  accessibility: string;
  directory: boolean;
}

export interface RegisterFormState {
  error: string | null;
  conflictWith?: string;
  values?: RegisterKeptValues;
  /*
   * Counts refusals, and exists only so the form can key a `<select>`
   * and a checkbox on it. React applies `defaultValue` when an element
   * mounts and not again, so on a re-render without a reload those two
   * silently fall back to their first value while text inputs keep
   * theirs — which showed up as a dietary choice quietly clearing
   * itself every time something else was wrong.
   */
  attempt?: number;
}

const keptFrom = (formData: FormData): RegisterKeptValues => {
  const text = (key: string) => String(formData.get(key) ?? '').trim();
  return {
    firstName: text('firstName'),
    lastName: text('lastName'),
    email: text('email'),
    phone: text('phone'),
    organization: text('organization'),
    role: text('role'),
    dietary: text('dietary'),
    accessibility: text('accessibility'),
    directory: formData.get('directory') === 'on',
  };
};

export const requestCodeAction = async (
  _previous: RegisterFormState,
  formData: FormData,
): Promise<RegisterFormState> => {
  const slug = String(formData.get('slug') ?? '');
  const locale = localeOf(String(formData.get('locale') ?? ''));
  const base = `/${locale}/events/${slug}/register`;
  if (!slug) {
    redirect(base);
  }

  /*
   * Every refusal below returns rather than redirects, and carries the
   * form back with it. A redirect is a new page, and a new page is an
   * empty form — which is how a password one character short used to
   * cost somebody the six fields above it.
   */
  const kept = keptFrom(formData);
  const refuse = (error: string, extra?: Partial<RegisterFormState>) => ({
    error,
    values: kept,
    attempt: (_previous.attempt ?? 0) + 1,
    ...extra,
  });

  /*
   * The schedule rule holds on every door (Identity Build Brief WP5):
   * a signed-in guest may not hold two overlapping conferences.
   */
  const conflictWith = await scheduleConflictFor(slug, locale).catch(() => null);
  if (conflictWith) {
    return refuse('conflict', { conflictWith });
  }

  const password = String(formData.get('password') ?? '');
  const confirmation = String(formData.get('passwordConfirm') ?? '');
  if (!isStrongPassword(password)) {
    return refuse('weakPassword');
  }
  /*
   * Checked after the policy, so someone who typed the same weak
   * password twice is told what is actually wrong with it rather than
   * being sent to fix a mismatch that does not exist.
   */
  if (password !== confirmation) {
    return refuse('passwordMismatch');
  }

  /*
   * The form asks for a first and a last name — two boxes read as a
   * shorter task than one, and the two halves are what a badge and a
   * greeting actually need. The account, the schema and every reader
   * of it know a single `name`, so the two are joined here, at the edge,
   * and nothing downstream learns that the form changed shape.
   */
  const fullName = [kept.firstName, kept.lastName]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(' ');
  if (fullName && !String(formData.get('name') ?? '').trim()) {
    formData.set('name', fullName);
  }

  const parsed = parseRegisterForm(formData);
  if (!parsed.success) {
    return refuse('invalid');
  }

  const details = parsed.data;

  /*
   * An address becomes an account once.
   *
   * Asked here, before a code is sent, rather than after it is typed:
   * sending a code to an address that cannot produce an account is a
   * dead end with a fifteen-minute timer on it. Without this, a second
   * registration with the same address overwrote the first person's
   * name, phone and contact preferences, filed a duplicate place
   * against the conference's capacity, and replaced their password.
   */
  if (await emailHasAccount(details.email).catch(() => false)) {
    return refuse('exists');
  }

  const issued = await beginEmailVerification(details.email, slug, locale, {
    slug,
    locale,
    /*
     * Hashed here, at the edge of the request that received it. The
     * plain password never reaches the store and never returns to the
     * browser in a hidden field.
     */
    passwordHash: passwordHashFor(password),
    details,
  });

  if (!issued.ok) {
    return refuse('tooManyCodes');
  }

  const params = new URLSearchParams({ verify: details.email });
  if (!issued.delivered) {
    /*
     * The mail relay took it but could not confirm delivery, or there is
     * no relay configured. The person is still shown the code form —
     * the code may yet arrive — but they are told plainly, because a
     * screen that waits silently for an email that will never come is
     * the worst of the possible outcomes.
     */
    params.set('undelivered', '1');
  }
  if (issued.devCode) {
    params.set('devCode', issued.devCode);
  }
  redirect(`${base}?${params.toString()}`);
};

export const resendCodeAction = async (formData: FormData) => {
  const slug = String(formData.get('slug') ?? '');
  const locale = localeOf(String(formData.get('locale') ?? ''));
  const base = `/${locale}/events/${slug}/register`;
  const from = String(formData.get('email') ?? '').trim();
  const to = String(formData.get('newEmail') ?? '').trim() || from;
  if (!slug || !from) {
    redirect(base);
  }

  const issued = await reissueEmailVerification(from, to, slug, locale);
  if (!issued.ok) {
    /*
     * Nothing left to resend: the deadline passed while the page sat
     * open. The form is the honest place to land, not a code box with
     * no code behind it.
     */
    redirect(`${base}?error=${issued.reason === 'expired' ? 'expired' : 'tooManyCodes'}`);
  }

  const params = new URLSearchParams({ verify: to, resent: '1' });
  if (!issued.delivered) {
    params.set('undelivered', '1');
  }
  if (issued.devCode) {
    params.set('devCode', issued.devCode);
  }
  redirect(`${base}?${params.toString()}`);
};

export const confirmCodeAction = async (formData: FormData) => {
  const slug = String(formData.get('slug') ?? '');
  const locale = localeOf(String(formData.get('locale') ?? ''));
  const base = `/${locale}/events/${slug}/register`;
  const email = String(formData.get('email') ?? '').trim();
  /*
   * One `code` field, assembled by the six-box input as it is typed. If
   * that assembly ever did not run, the six boxes still post their own
   * digits, and those are read instead — the screen degrades to six
   * plain inputs rather than to a form that cannot be completed.
   */
  const code =
    String(formData.get('code') ?? '').trim() ||
    [1, 2, 3, 4, 5, 6]
      .map((n) => String(formData.get(`d${n}`) ?? '').trim())
      .join('');
  const back = (extra: string) =>
    `${base}?verify=${encodeURIComponent(email)}&${extra}`;

  if (!slug || !email) {
    redirect(base);
  }

  const checked = await confirmEmailVerification(email, code);
  if (!checked.ok) {
    /*
     * A spent or expired verification sends the person back to the form
     * rather than to the code box: there is nothing left to type a code
     * against, and a box that can no longer succeed is a trap.
     */
    if (checked.reason === 'spent' || checked.reason === 'expired') {
      redirect(`${base}?error=${checked.reason}`);
    }
    redirect(back(`error=${checked.reason}`));
  }

  let target = base;
  try {
    const { details, passwordHash } = checked.pending;
    const result = await registerForEvent(slug, locale, details);
    await establishSession(result.participantId);
    /* The account is signed in — restore the password chosen at the form. */
    await applyPasswordHash(result.participantId, passwordHash);
    /*
     * No profile row is written here. Being listed follows from
     * taking part and is governed by the account's own preference;
     * creating an empty row just to say "yes" would put a second
     * answer beside the real one. The role the guest typed is already
     * on their account, and the listing reads it from there.
     */
    /* A new person in the room: the shared directory must be reassembled. */
    publishedDirectory(slug);
    target = `${base}?outcome=${result.outcome}`;
  } catch {
    target = `${base}?error=closed`;
  }

  redirect(target);
};

/*
 * Returning guests sign in with email + password (2FA stays optional and
 * is only asked when the account itself enabled it).
 */
export const passwordSignInAction = async (formData: FormData) => {
  const slug = String(formData.get('slug') ?? '');
  const locale = localeOf(String(formData.get('locale') ?? ''));
  const base = `/${locale}/events/${slug}/register`;
  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase();
  const password = String(formData.get('password') ?? '');

  if (!email || !password) {
    redirect(`${base}?signinError=missing`);
  }

  const result = await signInWithPassword(email, password);
  if (!result.ok) {
    if (result.reason === 'totp') {
      redirect(
        `/${locale}/me?state=totp&ticket=${encodeURIComponent(result.ticket)}`,
      );
    }
    redirect(`${base}?signinError=${result.reason}`);
  }

  redirect(`/${locale}/me`);
};

/*
 * Is this address free to register with?
 *
 * Asked by the form when the person presses "continue" at the end of
 * step one, so a taken address is answered beside the field they just
 * filled — not three fields and a submit later. Called straight from
 * the client rather than through a form, so it returns an answer
 * instead of redirecting.
 *
 * `unknown` is a real answer and the form treats it as "carry on": a
 * store that is briefly unreachable must not stop a stranger from
 * registering. The same question is asked again before a code is sent,
 * where refusing is safe because nothing has been promised yet.
 */
export type EmailAvailability = 'free' | 'taken' | 'unknown';

export const checkEmailAvailableAction = async (
  raw: string,
): Promise<EmailAvailability> => {
  const email = raw.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return 'unknown';
  }
  /*
   * Throttled per address. It bounds what one form can ask about one
   * person, which is what this endpoint is for; it is not a defence
   * against someone walking a list, and the platform's honest position
   * is that a registration form tells you an address is taken.
   */
  const pace = await checkRateLimit('email-check', email).catch(() => null);
  if (pace && !pace.allowed) {
    return 'unknown';
  }
  const taken = await emailHasAccount(email).catch(() => null);
  if (taken === null) {
    return 'unknown';
  }
  return taken ? 'taken' : 'free';
};
