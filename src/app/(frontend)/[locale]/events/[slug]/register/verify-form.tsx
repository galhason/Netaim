'use client';

import {
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
} from 'react';
import type { Locale } from '@/config/locales';
import { confirmCodeAction, resendCodeAction } from './actions';

/*
 * Step three: the six digits, one box each.
 *
 * Six boxes read as six digits — the person sees the shape of what
 * they are about to type before they type it, and a finished code looks
 * finished. Each box takes one digit and moves focus along; backspace
 * moves it back; pasting the whole code from a mail client fills all
 * six at once.
 *
 * The boxes are a way of typing, not a way of sending. What reaches the
 * server is a single `code` field, exactly as before, assembled from the
 * six on every keystroke — so `confirmCodeAction` is unchanged, and if
 * the boxes ever fail the action can still read the six named digits
 * they post on their own.
 *
 * The digits are LTR in both languages. A code is a number, and a
 * number reads the same way everywhere; a row of boxes that filled
 * right-to-left in Hebrew would put the first digit typed on the right
 * of the code in the email — a small betrayal at the one moment the
 * person is comparing two strings.
 *
 * "Send again" waits a minute. Not because the server needs it — the
 * server has its own allowance — but because a person who presses it
 * at second five gets two codes in the inbox and types the wrong one.
 */

export interface VerifyFormLabels {
  title: string;
  sentTo: string;
  validFor: string;
  codeLabel: string;
  digit: string;
  submit: string;
  submitting: string;
  resendTitle: string;
  resendHint: string;
  resend: string;
  resendIn: string;
  addressLabel: string;
  startOver: string;
  errors: Record<string, string>;
  resent: string;
  undelivered: string;
  devCode: string;
}

interface VerifyFormProps {
  locale: Locale;
  slug: string;
  email: string;
  labels: VerifyFormLabels;
  error?: string;
  resent?: boolean;
  undelivered?: boolean;
  devCode?: string;
}

const RESEND_WAIT_SECONDS = 60;

const fieldCls =
  'w-full rounded-[var(--x-r-field)] border border-[var(--x-line-strong)] bg-[var(--x-surface)] px-4 py-3 text-[15px] text-[var(--x-ink)] outline-none transition-[box-shadow,border-color] duration-200 placeholder:text-[var(--x-faint)] focus:border-[var(--x-primary)] focus:ring-4 focus:ring-[var(--x-ring)]';
const primaryCls =
  'inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[var(--x-r-field)] bg-[var(--x-primary)] px-6 text-[15px] font-semibold text-white shadow-[0_10px_30px_rgb(42 144 200 / 0.28)] transition-[transform,background-color] hover:-translate-y-0.5 hover:bg-[var(--x-primary-strong)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--x-ring)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 motion-reduce:transition-none';
const ghostCls =
  'inline-flex min-h-11 items-center justify-center rounded-[var(--x-r-field)] border border-[var(--x-line-strong)] bg-[var(--x-surface)] px-5 text-sm font-medium text-[var(--x-ink)] transition-colors hover:border-[var(--x-primary)] hover:text-[var(--x-primary)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--x-ring)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-[var(--x-line-strong)] disabled:hover:text-[var(--x-ink)]';

const VerifyForm = ({
  locale,
  slug,
  email,
  labels,
  error,
  resent,
  undelivered,
  devCode,
}: VerifyFormProps) => {
  const [digits, setDigits] = useState<string[]>(Array(6).fill(''));
  const [wait, setWait] = useState(RESEND_WAIT_SECONDS);
  const [sending, setSending] = useState(false);
  const boxes = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    boxes.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (wait <= 0) return;
    const id = window.setTimeout(() => setWait((w) => w - 1), 1000);
    return () => window.clearTimeout(id);
  }, [wait]);

  const code = digits.join('');
  const complete = code.length === 6;

  const put = (index: number, raw: string) => {
    const clean = raw.replace(/\D/g, '');
    if (!clean) {
      setDigits((d) => d.map((v, i) => (i === index ? '' : v)));
      return;
    }
    /* A paste, or an autofill: spread whatever arrived across the boxes. */
    setDigits((d) => {
      const next = [...d];
      for (let i = 0; i < clean.length && index + i < 6; i += 1) {
        next[index + i] = clean[i] ?? '';
      }
      return next;
    });
    const landing = Math.min(index + clean.length, 5);
    boxes.current[landing]?.focus();
    boxes.current[landing]?.select();
  };

  const onKey = (index: number) => (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      event.preventDefault();
      boxes.current[index - 1]?.focus();
      setDigits((d) => d.map((v, i) => (i === index - 1 ? '' : v)));
    }
    /* Physical arrows follow the visual LTR row of digits. */
    if (event.key === 'ArrowLeft' && index > 0) boxes.current[index - 1]?.focus();
    if (event.key === 'ArrowRight' && index < 5) boxes.current[index + 1]?.focus();
  };

  const onPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const text = event.clipboardData.getData('text');
    if (/\d{2,}/.test(text)) {
      event.preventDefault();
      put(0, text);
    }
  };

  const message = error ? labels.errors[error] : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h2 className="font-display text-xl font-bold text-[var(--x-ink)] md:text-2xl">
          {labels.title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--x-soft)]">
          {labels.sentTo}{' '}
          <strong className="font-medium text-[var(--x-ink)]" dir="ltr">
            {email}
          </strong>
          <br />
          {labels.validFor}
        </p>
      </div>

      {resent ? (
        <p
          role="status"
          className="rounded-[var(--x-r-field)] border border-[var(--x-ok)]/30 bg-[var(--x-ok-wash)] px-4 py-3 text-center text-sm text-[var(--x-ok)]"
        >
          {labels.resent}
        </p>
      ) : null}
      {undelivered ? (
        <p
          role="status"
          className="rounded-[var(--x-r-field)] border border-[var(--x-warn)]/30 bg-[var(--x-warn-wash)] px-4 py-3 text-sm text-[var(--x-warn)]"
        >
          {labels.undelivered}
        </p>
      ) : null}
      {devCode ? (
        <p className="rounded-[var(--x-r-field)] border border-dashed border-[var(--x-line-strong)] px-4 py-3 text-center text-sm text-[var(--x-soft)]">
          {labels.devCode}{' '}
          <strong className="tabular-nums tracking-[0.3em] text-[var(--x-ink)]" dir="ltr">
            {devCode}
          </strong>
        </p>
      ) : null}

      <form action={confirmCodeAction} className="flex flex-col gap-5">
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="code" value={code} />

        <fieldset className="m-0 border-0 p-0">
          <legend className="sr-only">{labels.codeLabel}</legend>
          <div dir="ltr" className="flex justify-center gap-1.5 sm:gap-3">
            {digits.map((value, index) => (
              <input
                key={index}
                ref={(node) => {
                  boxes.current[index] = node;
                }}
                id={`reg-code-${index + 1}`}
                name={`d${index + 1}`}
                type="text"
                inputMode="numeric"
                autoComplete={index === 0 ? 'one-time-code' : 'off'}
                pattern="[0-9]*"
                maxLength={6}
                value={value}
                onChange={(event) => put(index, event.target.value)}
                onKeyDown={onKey(index)}
                onPaste={onPaste}
                onFocus={(event) => event.target.select()}
                aria-label={`${labels.digit} ${index + 1}`}
                aria-invalid={Boolean(message)}
                className={`aspect-[4/5] w-full min-w-0 max-w-[3.25rem] rounded-[var(--x-r-field)] border bg-[var(--x-surface)] p-0 text-center font-display text-xl font-semibold tabular-nums text-[var(--x-ink)] outline-none transition-[box-shadow,border-color] focus:border-[var(--x-primary)] focus:ring-4 focus:ring-[var(--x-ring)] sm:text-2xl ${
                  message
                    ? 'border-[var(--x-full)]'
                    : value
                      ? 'border-[var(--x-primary)]/60'
                      : 'border-[var(--x-line-strong)]'
                }`}
              />
            ))}
          </div>
        </fieldset>

        {message ? (
          <p
            role="alert"
            className="rounded-[var(--x-r-field)] border border-[var(--x-warn)]/30 bg-[var(--x-warn-wash)] px-4 py-3 text-center text-sm text-[var(--x-warn)]"
          >
            {message}
          </p>
        ) : null}

        <button type="submit" disabled={!complete} className={primaryCls}>
          {labels.submit}
        </button>
      </form>

      {/*
        * Resend and correct are one form, because they are one thought:
        * the code has not arrived. Usually that means waiting; sometimes
        * it means the address has a typo in it. The details already
        * filled in stay where they are — changing the address here does
        * not ask for them again.
        */}
      <form
        action={resendCodeAction}
        onSubmit={() => setSending(true)}
        className="border-t border-[var(--x-line)] pt-5"
      >
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="email" value={email} />
        <p className="text-sm font-medium text-[var(--x-ink)]">{labels.resendTitle}</p>
        <p className="mt-1 text-xs leading-relaxed text-[var(--x-soft)]">
          {labels.resendHint}
        </p>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <input
            id="reg-newEmail"
            type="email"
            name="newEmail"
            defaultValue={email}
            autoComplete="email"
            dir="ltr"
            aria-label={labels.addressLabel}
            className={`${fieldCls} text-start sm:flex-1`}
          />
          <button
            type="submit"
            disabled={wait > 0 || sending}
            className={`${ghostCls} tabular-nums`}
          >
            {wait > 0 ? `${labels.resendIn} ${wait}` : labels.resend}
          </button>
        </div>
      </form>

      <p className="text-center text-xs">
        <a
          href={`/${locale}/events/${slug}/register`}
          className="text-[var(--x-soft)] underline underline-offset-4 hover:text-[var(--x-primary)]"
        >
          {labels.startOver}
        </a>
      </p>
    </div>
  );
};

export default VerifyForm;
