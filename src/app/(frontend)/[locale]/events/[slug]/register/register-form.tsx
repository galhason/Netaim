'use client';

import {
  useActionState,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type MouseEvent,
} from 'react';
import Link from 'next/link';
import type { Locale } from '@/config/locales';
import { isStrongPassword } from '@/features/registration/schemas/password';
import {
  checkEmailAvailableAction,
  requestCodeAction,
  type RegisterFormState,
} from './actions';
import StepProgress from './ui/step-progress';

/*
 * The registration form, in two steps that are one submission.
 *
 * Ten fields in one column read as an administrative task. Split into
 * "who you are" and "where you're from", each screen asks for about
 * five things and the person can see the end of it — which is most of
 * what makes a form get finished.
 *
 * The split is entirely on the client and entirely inside one <form>.
 * Every value lives in React state; the step that is showing renders
 * its fields as ordinary inputs, and the step that is not renders its
 * values as hidden inputs. So the single submission — at the end of
 * step two — carries every field, the server action receives exactly
 * what it always received, and nothing about validation, hashing or
 * verification behind it changes. "Continue" is not a submit; it is a
 * client-side check of the fields on screen followed by a change of
 * step.
 *
 * The server stays the authority. It re-checks everything, and when it
 * refuses something from step one — a password that fails the policy —
 * the form goes back to step one and puts the message under the field,
 * because a refusal a person cannot see is a form that seems broken.
 *
 * `useActionState` is kept from the previous version: the action
 * returns the refusal and what was typed rather than redirecting, so a
 * refusal costs one field and not the form. The passwords are never
 * echoed back by the server — they live only in this component's state
 * for as long as the tab is open.
 */

export interface RegisterFormLabels {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  passwordConfirm: string;
  passwordHint: string;
  organization: string;
  role: string;
  dietary: string;
  dietaryPlaceholder: string;
  accessibility: string;
  accessibilityHint: string;
  directoryQuestion: string;
  directoryHint: string;
  stepOneTitle: string;
  stepOneIntro: string;
  stepTwoTitle: string;
  stepTwoIntro: string;
  continue: string;
  back: string;
  submit: string;
  submitting: string;
  submitHint: string;
  trust: string;
  noticeBefore: string;
  noticeTerms: string;
  noticeBetween: string;
  noticePrivacy: string;
  noticeAfter: string;
  errors: Record<string, string>;
  fieldErrors: {
    required: string;
    email: string;
    emailTaken: string;
    phone: string;
    password: string;
    passwordMismatch: string;
  };
  conflictBefore: string;
  conflictAfter: string;
  existsSignIn: string;
  existsReset: string;
  checking: string;
}

interface RegisterFormProps {
  locale: Locale;
  slug: string;
  collectAccessibility: boolean;
  dietaryOptions: string[];
  labels: RegisterFormLabels;
  /* A refusal carried back from the code step, which redirects. */
  initialError?: string;
  initialConflictWith?: string;
}

type Values = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  organization: string;
  role: string;
  dietary: string;
  accessibility: string;
  directory: boolean;
};

const EMPTY: Values = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  organization: '',
  role: '',
  dietary: '',
  accessibility: '',
  directory: false,
};

/*
 * Which step a server refusal belongs to, and under which field. A
 * refusal with no field is shown above the button of the step it
 * belongs to.
 */
const REFUSAL_FIELD: Record<string, { step: 1 | 2; field?: string }> = {
  weakPassword: { step: 1, field: 'password' },
  /*
   * No `field`: a taken address is not a typo to correct in place, it
   * is a fork in the road. It gets the notice with both ways out.
   */
  exists: { step: 1 },
  passwordMismatch: { step: 1, field: 'passwordConfirm' },
  invalid: { step: 1 },
  conflict: { step: 2 },
  tooManyCodes: { step: 2 },
  expired: { step: 1 },
  spent: { step: 1 },
  closed: { step: 2 },
};

/* Experience form primitives — the same ones the rest of the page uses. */
const fieldBase =
  'w-full rounded-[var(--x-r-field)] border bg-[var(--x-surface)] px-4 py-3 text-[15px] text-[var(--x-ink)] outline-none transition-[box-shadow,border-color] duration-200 placeholder:text-[var(--x-faint)] focus:border-[var(--x-primary)] focus:ring-4 focus:ring-[var(--x-ring)] disabled:opacity-60';
const fieldOk = `${fieldBase} border-[var(--x-line-strong)]`;
const fieldBad = `${fieldBase} border-[var(--x-full)] focus:border-[var(--x-full)] focus:ring-[var(--x-full-wash)]`;
const labelCls = 'mb-1.5 block text-sm font-medium text-[var(--x-ink)]';
const primaryCls =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-[var(--x-r-field)] bg-[var(--x-primary)] px-6 text-[15px] font-semibold text-white shadow-[0_10px_30px_rgba(110,86,207,0.28)] transition-[transform,background-color,box-shadow] hover:-translate-y-0.5 hover:bg-[var(--x-primary-strong)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--x-ring)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 motion-reduce:transition-none motion-reduce:hover:translate-y-0';
const ghostCls =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-[var(--x-r-field)] border border-[var(--x-line-strong)] bg-[var(--x-surface)] px-5 text-[15px] font-medium text-[var(--x-ink)] transition-colors hover:border-[var(--x-primary)] hover:text-[var(--x-primary)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--x-ring)]';

const Arrow = () => (
  <svg
    viewBox="0 0 20 20"
    aria-hidden="true"
    className="size-4 rtl:-scale-x-100"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 10h12M11 5l5 5-5 5" />
  </svg>
);

const Lock = () => (
  <svg
    viewBox="0 0 20 20"
    aria-hidden="true"
    className="size-3.5"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="4" y="9" width="12" height="8" rx="2" />
    <path d="M7 9V6.5a3 3 0 0 1 6 0V9" />
  </svg>
);

const Warn = () => (
  <svg
    viewBox="0 0 20 20"
    aria-hidden="true"
    className="size-3.5 flex-none"
    fill="currentColor"
  >
    <path d="M10 2.5 18.2 17H1.8L10 2.5Zm0 4.2a.9.9 0 0 0-.9.9V12a.9.9 0 1 0 1.8 0V7.6a.9.9 0 0 0-.9-.9Zm0 6.6a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z" />
  </svg>
);

const FieldError = ({ id, text }: { id: string; text: string | undefined }) =>
  text ? (
    <p
      id={id}
      className="mt-1.5 flex items-start gap-1.5 text-[13px] leading-snug text-[var(--x-full)]"
    >
      <Warn />
      <span>{text}</span>
    </p>
  ) : null;

const RegisterForm = ({
  locale,
  slug,
  collectAccessibility,
  dietaryOptions,
  labels,
  initialError,
  initialConflictWith,
}: RegisterFormProps) => {
  const [state, action, pending] = useActionState<
    RegisterFormState,
    FormData
  >(requestCodeAction, {
    error: initialError ?? null,
    conflictWith: initialConflictWith,
  });

  /*
   * Seeded from what the server handed back, if anything — the no-script
   * path, where the whole page re-renders. With the script running the
   * component never remounts and this state simply persists.
   */
  const [values, setValues] = useState<Values>(() => ({
    ...EMPTY,
    ...(state.values ?? {}),
  }));
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [step, setStep] = useState<1 | 2>(1);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  /* The address the server said already has an account, and the wait. */
  const [takenEmail, setTakenEmail] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const lastRefusal = useRef<number>(state.attempt ?? 0);

  /*
   * A refusal from the server lands on the step and the field it names.
   * Keyed on the attempt counter so the same refusal twice in a row is
   * still noticed.
   */
  useEffect(() => {
    const attempt = state.attempt ?? 0;
    if (!state.error || attempt === lastRefusal.current) {
      return;
    }
    lastRefusal.current = attempt;
    const target = REFUSAL_FIELD[state.error];
    if (!target) {
      return;
    }
    setStep(target.step);
    if (target.field) {
      setFieldErrors({ [target.field]: labels.errors[state.error] ?? '' });
    }
    panelRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, [state.error, state.attempt, labels.errors]);

  const set =
    (key: keyof Values) =>
    (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const target = event.target;
      const next =
        target instanceof HTMLInputElement && target.type === 'checkbox'
          ? target.checked
          : target.value;
      setValues((current) => ({ ...current, [key]: next }));
      clearError(key);
    };

  const clearError = (key: string) =>
    setFieldErrors((current) => {
      if (!current[key]) return current;
      const rest = { ...current };
      delete rest[key];
      return rest;
    });

  /*
   * Client-side checks for the fields on screen, so "continue" can say
   * what is missing under the field rather than bouncing to the browser's
   * own bubble. The same rules the server applies, applied early.
   */
  const checkStepOne = (): Record<string, string> => {
    const errors: Record<string, string> = {};
    const f = labels.fieldErrors;
    if (!values.firstName.trim()) errors.firstName = f.required;
    if (!values.lastName.trim()) errors.lastName = f.required;
    if (!values.email.trim()) errors.email = f.required;
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim()))
      errors.email = f.email;
    if (!values.phone.trim()) errors.phone = f.required;
    else if (!/^[+\d][\d\s\-()]{6,}$/.test(values.phone.trim()))
      errors.phone = f.phone;
    if (!password) errors.password = f.required;
    else if (!isStrongPassword(password)) errors.password = f.password;
    if (!passwordConfirm) errors.passwordConfirm = f.required;
    else if (password !== passwordConfirm)
      errors.passwordConfirm = f.passwordMismatch;
    return errors;
  };

  const checkStepTwo = (): Record<string, string> => {
    const errors: Record<string, string> = {};
    const f = labels.fieldErrors;
    if (!values.organization.trim()) errors.organization = f.required;
    if (!values.role.trim()) errors.role = f.required;
    if (!values.dietary) errors.dietary = f.required;
    return errors;
  };

  const focusFirst = (errors: Record<string, string>) => {
    const first = Object.keys(errors)[0];
    if (!first) return;
    const element = document.getElementById(`reg-${first}`);
    element?.focus();
  };

  /*
   * "Continue" is where a taken address is caught.
   *
   * The local rules run first — an address that is not an address is
   * not worth asking the server about — and only then does the form
   * ask whether this one is free. A person learns it beside the field
   * they just filled, rather than after choosing a password, filling
   * their organisation and pressing submit.
   *
   * If the answer cannot be had, the form moves on: the same question
   * is asked again before a code is sent, and a store that blinked
   * must not be what stops a stranger from registering.
   */
  const goForward = async () => {
    const errors = checkStepOne();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      focusFirst(errors);
      return;
    }
    const address = values.email.trim();
    setChecking(true);
    const answer = await checkEmailAvailableAction(address).catch(
      () => 'unknown' as const,
    );
    setChecking(false);
    if (answer === 'taken') {
      setTakenEmail(address);
      setFieldErrors({ email: labels.fieldErrors.emailTaken });
      focusFirst({ email: '' });
      panelRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
      return;
    }
    setTakenEmail(null);
    setStep(2);
    panelRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  };

  const goBack = () => {
    setStep(1);
    setFieldErrors({});
    panelRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  };

  /*
   * Not a submit handler — the form still posts natively. This only
   * stands in the way when a field on screen is empty, so the message
   * can sit under the field instead of in the browser's bubble.
   */
  const guardSubmit = (event: MouseEvent<HTMLButtonElement>) => {
    const errors = checkStepTwo();
    if (Object.keys(errors).length > 0) {
      event.preventDefault();
      setFieldErrors(errors);
      focusFirst(errors);
    }
  };

  const generalError =
    state.error && !REFUSAL_FIELD[state.error]?.field
      ? labels.errors[state.error]
      : null;
  const showGeneral =
    generalError && (REFUSAL_FIELD[state.error ?? '']?.step ?? 1) === step;
  /* The same notice, whether the answer came on continue or on submit. */
  const showTaken = takenEmail !== null && takenEmail === values.email.trim() && step === 1;
  const conflictWith = state.conflictWith ?? initialConflictWith;

  const describe = (key: string, hint?: string) =>
    [fieldErrors[key] ? `err-${key}` : null, hint ?? null]
      .filter(Boolean)
      .join(' ') || undefined;

  const cls = (key: string) => (fieldErrors[key] ? fieldBad : fieldOk);

  return (
    /*
     * `noValidate`: the messages live under the fields, in both
     * languages, and the browser's own bubble beside them would say the
     * same thing twice in a different voice. The checks are the same
     * ones the browser would run, plus the password policy — and the
     * server re-runs all of them regardless.
     */
    <form action={action} className="flex flex-col gap-7" noValidate>
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="locale" value={locale} />

      <StepProgress locale={locale} current={step} />

      <div ref={panelRef} className="scroll-mt-28 flex flex-col gap-5">
        <div className="text-center">
          <h2 className="font-display text-xl font-bold text-[var(--x-ink)] md:text-2xl">
            {step === 1 ? labels.stepOneTitle : labels.stepTwoTitle}
          </h2>
          <p className="mt-1 text-sm text-[var(--x-soft)]">
            {step === 1 ? labels.stepOneIntro : labels.stepTwoIntro}
          </p>
        </div>

        {step === 1 ? (
          <>
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="reg-firstName" className={labelCls}>
                  {labels.firstName} <span aria-hidden="true">*</span>
                </label>
                <input
                  id="reg-firstName"
                  name="firstName"
                  type="text"
                  required
                  autoComplete="given-name"
                  value={values.firstName}
                  onChange={set('firstName')}
                  aria-invalid={Boolean(fieldErrors.firstName)}
                  aria-describedby={describe('firstName')}
                  className={cls('firstName')}
                />
                <FieldError id="err-firstName" text={fieldErrors.firstName} />
              </div>
              <div>
                <label htmlFor="reg-lastName" className={labelCls}>
                  {labels.lastName} <span aria-hidden="true">*</span>
                </label>
                <input
                  id="reg-lastName"
                  name="lastName"
                  type="text"
                  required
                  autoComplete="family-name"
                  value={values.lastName}
                  onChange={set('lastName')}
                  aria-invalid={Boolean(fieldErrors.lastName)}
                  aria-describedby={describe('lastName')}
                  className={cls('lastName')}
                />
                <FieldError id="err-lastName" text={fieldErrors.lastName} />
              </div>
            </div>

            <div>
              <label htmlFor="reg-email" className={labelCls}>
                {labels.email} <span aria-hidden="true">*</span>
              </label>
              <input
                id="reg-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                inputMode="email"
                dir="ltr"
                placeholder="name@example.com"
                value={values.email}
                onChange={set('email')}
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={describe('email')}
                className={`${cls('email')} text-start`}
              />
              <FieldError id="err-email" text={fieldErrors.email} />
            </div>

            <div>
              <label htmlFor="reg-phone" className={labelCls}>
                {labels.phone} <span aria-hidden="true">*</span>
              </label>
              <input
                id="reg-phone"
                name="phone"
                type="tel"
                required
                autoComplete="tel"
                inputMode="tel"
                dir="ltr"
                placeholder="050-1234567"
                value={values.phone}
                onChange={set('phone')}
                aria-invalid={Boolean(fieldErrors.phone)}
                aria-describedby={describe('phone')}
                className={`${cls('phone')} text-start`}
              />
              <FieldError id="err-phone" text={fieldErrors.phone} />
            </div>

            {/*
              * Chosen twice, because it is the one field with no way to
              * check itself: a typo in an address bounces, a typo in a
              * password simply locks the person out of the account they
              * just made.
              */}
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="reg-password" className={labelCls}>
                  {labels.password} <span aria-hidden="true">*</span>
                </label>
                <input
                  id="reg-password"
                  name="password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    clearError('password');
                  }}
                  aria-invalid={Boolean(fieldErrors.password)}
                  aria-describedby={describe('password', 'reg-password-hint')}
                  className={cls('password')}
                />
                <FieldError id="err-password" text={fieldErrors.password} />
              </div>
              <div>
                <label htmlFor="reg-passwordConfirm" className={labelCls}>
                  {labels.passwordConfirm} <span aria-hidden="true">*</span>
                </label>
                <input
                  id="reg-passwordConfirm"
                  name="passwordConfirm"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={passwordConfirm}
                  onChange={(event) => {
                    setPasswordConfirm(event.target.value);
                    clearError('passwordConfirm');
                  }}
                  aria-invalid={Boolean(fieldErrors.passwordConfirm)}
                  aria-describedby={describe('passwordConfirm')}
                  className={cls('passwordConfirm')}
                />
                <FieldError
                  id="err-passwordConfirm"
                  text={fieldErrors.passwordConfirm}
                />
              </div>
            </div>
            <p
              id="reg-password-hint"
              className="-mt-2 flex items-start gap-2 rounded-[var(--x-r-field)] bg-[var(--x-raise)] px-3.5 py-2.5 text-[13px] leading-relaxed text-[var(--x-soft)] ring-1 ring-[var(--x-line)]"
            >
              <Lock />
              <span>{labels.passwordHint}</span>
            </p>

            {/* Step two's values travel along, unseen. */}
            <input type="hidden" name="organization" value={values.organization} />
            <input type="hidden" name="role" value={values.role} />
            <input type="hidden" name="dietary" value={values.dietary} />
            <input type="hidden" name="accessibility" value={values.accessibility} />
            {values.directory ? (
              <input type="hidden" name="directory" value="on" />
            ) : null}
          </>
        ) : (
          <>
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="reg-organization" className={labelCls}>
                  {labels.organization} <span aria-hidden="true">*</span>
                </label>
                <input
                  id="reg-organization"
                  name="organization"
                  type="text"
                  required
                  autoComplete="organization"
                  value={values.organization}
                  onChange={set('organization')}
                  aria-invalid={Boolean(fieldErrors.organization)}
                  aria-describedby={describe('organization')}
                  className={cls('organization')}
                />
                <FieldError id="err-organization" text={fieldErrors.organization} />
              </div>
              <div>
                <label htmlFor="reg-role" className={labelCls}>
                  {labels.role} <span aria-hidden="true">*</span>
                </label>
                <input
                  id="reg-role"
                  name="role"
                  type="text"
                  required
                  autoComplete="organization-title"
                  value={values.role}
                  onChange={set('role')}
                  aria-invalid={Boolean(fieldErrors.role)}
                  aria-describedby={describe('role')}
                  className={cls('role')}
                />
                <FieldError id="err-role" text={fieldErrors.role} />
              </div>
            </div>

            <div>
              <label htmlFor="reg-dietary" className={labelCls}>
                {labels.dietary} <span aria-hidden="true">*</span>
              </label>
              <select
                id="reg-dietary"
                name="dietary"
                required
                value={values.dietary}
                onChange={set('dietary')}
                aria-invalid={Boolean(fieldErrors.dietary)}
                aria-describedby={describe('dietary')}
                className={cls('dietary')}
              >
                <option value="" disabled>
                  {labels.dietaryPlaceholder}
                </option>
                {dietaryOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <FieldError id="err-dietary" text={fieldErrors.dietary} />
            </div>

            {collectAccessibility ? (
              <div>
                <label htmlFor="reg-accessibility" className={labelCls}>
                  {labels.accessibility}
                </label>
                <textarea
                  id="reg-accessibility"
                  name="accessibility"
                  rows={2}
                  value={values.accessibility}
                  onChange={set('accessibility')}
                  aria-describedby="reg-accessibility-hint"
                  className={`${fieldOk} resize-none`}
                />
                <p
                  id="reg-accessibility-hint"
                  className="mt-1.5 text-xs text-[var(--x-faint)]"
                >
                  {labels.accessibilityHint}
                </p>
              </div>
            ) : null}

            {/* PRD §5.1 — the networking opt-in, asked at registration. */}
            <label
              htmlFor="reg-directory"
              className="flex cursor-pointer items-start gap-3 rounded-[var(--x-r-field)] border border-[var(--x-line)] bg-[var(--x-raise)] p-4 transition-colors has-[:checked]:border-[var(--x-primary)]/50 has-[:checked]:bg-[var(--x-primary-wash)]"
            >
              <input
                id="reg-directory"
                name="directory"
                type="checkbox"
                checked={values.directory}
                onChange={set('directory')}
                className="mt-0.5 size-5 flex-none accent-[var(--x-primary)]"
              />
              <span>
                <span className="block text-sm font-medium text-[var(--x-ink)]">
                  {labels.directoryQuestion}
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-[var(--x-soft)]">
                  {labels.directoryHint}
                </span>
              </span>
            </label>

            {/* Step one's values travel along, unseen. */}
            <input type="hidden" name="firstName" value={values.firstName} />
            <input type="hidden" name="lastName" value={values.lastName} />
            <input type="hidden" name="email" value={values.email} />
            <input type="hidden" name="phone" value={values.phone} />
            <input type="hidden" name="password" value={password} />
            <input type="hidden" name="passwordConfirm" value={passwordConfirm} />
          </>
        )}

        {showTaken ? (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-[var(--x-r-field)] border border-[var(--x-warn)]/30 bg-[var(--x-warn-wash)] px-4 py-3 text-sm text-[var(--x-warn)]"
          >
            <Warn />
            <span>
              {labels.errors.exists}{' '}
              <Link
                href={`/${locale}/me`}
                className="font-semibold underline underline-offset-4"
              >
                {labels.existsSignIn}
              </Link>
              {' · '}
              <Link
                href={`/${locale}/me?view=reset`}
                className="underline underline-offset-4"
              >
                {labels.existsReset}
              </Link>
            </span>
          </p>
        ) : null}

        {showGeneral && !showTaken ? (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-[var(--x-r-field)] border border-[var(--x-warn)]/30 bg-[var(--x-warn-wash)] px-4 py-3 text-sm text-[var(--x-warn)]"
          >
            <Warn />
            <span>
              {state.error === 'conflict' ? (
                <>
                  {labels.conflictBefore} <strong>{conflictWith}</strong>.{' '}
                  {labels.conflictAfter}
                </>
              ) : state.error === 'exists' ? (
                <>
                  {generalError}{' '}
                  <Link
                    href={`/${locale}/me`}
                    className="font-semibold underline underline-offset-4"
                  >
                    {labels.existsSignIn}
                  </Link>
                  {' · '}
                  <Link
                    href={`/${locale}/me?view=reset`}
                    className="underline underline-offset-4"
                  >
                    {labels.existsReset}
                  </Link>
                </>
              ) : (
                generalError
              )}
            </span>
          </p>
        ) : null}

        {step === 2 ? (
          /*
           * The notice section 11 of the Privacy Protection Law asks
           * for, beside the button that actually submits the details.
           */
          <p className="text-xs leading-relaxed text-[var(--x-soft)]">
            {labels.noticeBefore}
            <a
              href={`/${locale}/terms`}
              target="_blank"
              rel="noopener"
              className="text-[var(--x-primary)] underline underline-offset-4"
            >
              {labels.noticeTerms}
            </a>
            {labels.noticeBetween}
            <a
              href={`/${locale}/privacy`}
              target="_blank"
              rel="noopener"
              className="text-[var(--x-primary)] underline underline-offset-4"
            >
              {labels.noticePrivacy}
            </a>
            {labels.noticeAfter}
          </p>
        ) : null}

        <div className="mt-1 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-1.5 text-xs text-[var(--x-soft)]">
            <Lock />
            <span>{labels.trust}</span>
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            {step === 2 ? (
              <button type="button" onClick={goBack} className={`${ghostCls} w-full sm:w-auto`}>
                {labels.back}
              </button>
            ) : null}
            {/*
              * Keyed, and it matters. Without keys React sees a <button>
              * in the same slot on both steps and patches it in place —
              * so the button that was clicked as type="button" becomes
              * type="submit" *during* the click, before the browser runs
              * the click's default action, and the form submits with
              * step two empty. Found by a real mouse click; a synthetic
              * `.click()` never showed it. Distinct keys make them two
              * elements, and a click on one cannot land on the other.
              */}
            {step === 1 ? (
              <button
                key="continue"
                type="button"
                onClick={() => void goForward()}
                disabled={checking}
                className={`${primaryCls} w-full sm:w-auto sm:min-w-40`}
              >
                <span>{checking ? labels.checking : labels.continue}</span>
                {checking ? null : <Arrow />}
              </button>
            ) : (
              <button
                key="submit"
                type="submit"
                disabled={pending}
                onClick={guardSubmit}
                className={`${primaryCls} w-full sm:w-auto sm:min-w-44`}
              >
                <span>{pending ? labels.submitting : labels.submit}</span>
                {pending ? null : <Arrow />}
              </button>
            )}
          </div>
        </div>
        {step === 2 ? (
          <p className="-mt-3 text-xs text-[var(--x-faint)] sm:text-end">
            {labels.submitHint}
          </p>
        ) : null}
      </div>
    </form>
  );
};

export default RegisterForm;
