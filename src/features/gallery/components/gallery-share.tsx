'use client';

import { startTransition, useActionState, useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Locale } from '@/config/locales';
import { IconClose } from '@/features/conference';
import { GALLERY_COPY, fill } from '../constants/gallery-copy';
import {
  SUBMISSION_ACCEPT,
  SUBMISSION_MAX_BYTES,
  SUBMISSION_MAX_MB,
  SUBMISSION_TYPES,
} from '../constants/gallery-limits';
import type { GallerySubmissionState } from '../types/gallery';

/*
 * "Share a photo" — one small window that does one thing: send a photo.
 *
 * Choose, see it, send. Nothing to fill in: the credit is the sender's
 * own name, because only a registered participant can send at all, and
 * the line under the photo says what sending means. The size and the
 * format are checked here first so nobody waits for an upload the
 * server would refuse — and checked again there, where it counts.
 *
 * A dialog in the proper sense: the focus moves into it and stays, the
 * page behind it is locked, Escape closes it and the focus returns to
 * the button that opened it.
 */
interface GalleryShareProps {
  locale: Locale;
  slug: string;
  action: (state: GallerySubmissionState, formData: FormData) => Promise<GallerySubmissionState>;
}

const INITIAL: GallerySubmissionState = { status: 'idle' };

const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';

const PRIMARY =
  'inline-flex min-h-11 items-center justify-center rounded-[var(--x-r-pill)] bg-[var(--x-primary)] px-6 text-sm font-bold text-[var(--x-primary-ink)] transition-colors hover:bg-[var(--x-primary-strong)] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--x-primary)]';
const QUIET =
  'inline-flex min-h-11 items-center justify-center rounded-[var(--x-r-pill)] px-5 text-sm font-semibold text-[var(--x-soft)] hover:text-[var(--x-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--x-primary)]';

const GalleryShare = ({ locale, slug, action }: GalleryShareProps) => {
  const words = GALLERY_COPY.share;
  const [state, formAction, pending] = useActionState(action, INITIAL);
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [localError, setLocalError] = useState<keyof typeof words.errors | null>(null);
  /* The server's last answer, until the person acts on it. */
  const [answerShown, setAnswerShown] = useState(false);
  const dialog = useRef<HTMLDivElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const fileId = useId();
  const titleId = useId();

  const say = (template: string) => fill(template, { mb: SUBMISSION_MAX_MB });
  const sent = answerShown && state.status === 'sent';
  const error = localError ?? (answerShown && state.status === 'error' ? state.reason : null);

  const clear = useCallback(() => {
    form.current?.reset();
    setPreview(null);
    setLocalError(null);
    setAnswerShown(false);
  }, []);

  const close = useCallback(() => {
    clear();
    setOpen(false);
    requestAnimationFrame(() => opener.current?.focus());
  }, [clear]);

  /* The preview's object URL lives as long as the choice does. */
  useEffect(
    () => () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    },
    [preview],
  );

  useEffect(() => {
    setAnswerShown(state.status !== 'idle');
  }, [state]);

  /* Into the window, kept there, and the page behind it held still. */
  useEffect(() => {
    if (!open) {
      return;
    }
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => dialog.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus());
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
        return;
      }
      if (event.key === 'Tab' && dialog.current) {
        const items = [...dialog.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null || el === document.activeElement);
        const first = items[0];
        const last = items[items.length - 1];
        if (!first || !last) {
          return;
        }
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close]);

  const onFile = (file: File | undefined) => {
    setLocalError(null);
    setAnswerShown(false);
    setPreview(null);
    if (!file) {
      return;
    }
    if (!(SUBMISSION_TYPES as readonly string[]).includes(file.type)) {
      setLocalError('type');
      return;
    }
    if (file.size > SUBMISSION_MAX_BYTES) {
      setLocalError('size');
      return;
    }
    setPreview(URL.createObjectURL(file));
  };

  return (
    <>
      <button
        ref={opener}
        type="button"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[var(--x-r-pill)] bg-[var(--x-primary)] px-7 text-sm font-bold text-[var(--x-primary-ink)] shadow-[var(--x-shadow)] transition-colors hover:bg-[var(--x-primary-strong)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--x-primary)]"
      >
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <rect x="3" y="6" width="18" height="14" rx="3" />
          <circle cx="12" cy="13" r="3.5" />
          <path d="M8.5 6l1.5-2.5h4L15.5 6" strokeLinejoin="round" />
        </svg>
        {words.open[locale]}
      </button>

      {/*
        * Into the body, not the section: the invitation it opens from is
        * its own stacking context, under the sticky bar, and a window
        * drawn inside it would slide beneath the bar on a phone.
        */}
      {open ? createPortal(
        <div className="experience experience--programme experience--gallery fixed inset-0 z-[90] grid place-items-center p-4" dir={locale === 'he' ? 'rtl' : 'ltr'}>
          <button
            type="button"
            tabIndex={-1}
            aria-label={words.close[locale]}
            onClick={close}
            className="absolute inset-0 bg-[rgb(6_20_11/0.55)] backdrop-blur-[2px]"
          />
          <div
            ref={dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative w-full max-w-sm rounded-[var(--x-r-card)] bg-[var(--x-surface)] p-5 text-start shadow-[var(--x-shadow-lift)]"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 id={titleId} className="font-display text-lg font-bold text-[var(--x-ink)]">
                {words.title[locale]}
              </h3>
              <button
                type="button"
                onClick={close}
                aria-label={words.close[locale]}
                className="grid size-9 place-items-center rounded-full text-[var(--x-soft)] hover:bg-[var(--x-mute-wash)] hover:text-[var(--x-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--x-primary)]"
              >
                <IconClose className="size-5" />
              </button>
            </div>

            {sent ? (
              <div className="text-center">
                <p role="status" className="rounded-[var(--x-r-field)] bg-[var(--x-ok-wash)] px-4 py-4 text-sm font-semibold text-[var(--x-ok)]">
                  {words.sent[locale]}
                </p>
                <div className="mt-4 flex justify-center gap-2">
                  <button type="button" onClick={clear} className={QUIET}>
                    {words.another[locale]}
                  </button>
                  <button type="button" onClick={close} className={PRIMARY}>
                    {words.close[locale]}
                  </button>
                </div>
              </div>
            ) : (
              /*
               * Submitted by hand rather than through `action`: a form
               * action resets the form when it returns, and a refusal must
               * leave the chosen photo where the person put it.
               */
              <form
                ref={form}
                onSubmit={(event) => {
                  event.preventDefault();
                  const data = new FormData(event.currentTarget);
                  startTransition(() => formAction(data));
                }}
              >
                <input type="hidden" name="slug" value={slug} />
                <input type="hidden" name="locale" value={locale} />
                <label
                  htmlFor={fileId}
                  className="group relative grid aspect-[4/3] w-full cursor-pointer place-items-center overflow-hidden rounded-[var(--x-r-field)] border-2 border-dashed border-[var(--x-line-strong)] bg-[var(--x-bg)] text-center transition-colors hover:border-[var(--x-primary)] has-[:focus-visible]:border-[var(--x-primary)] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--x-ring)]"
                >
                  {preview ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={preview} alt={words.preview[locale]} className="absolute inset-0 size-full object-contain" />
                      <span className="absolute bottom-2 end-2 rounded-full bg-[rgb(0_0_0/0.6)] px-3 py-1 text-xs font-semibold text-[var(--x-on-forest)]">
                        {words.change[locale]}
                      </span>
                    </>
                  ) : (
                    <span className="px-4">
                      <svg viewBox="0 0 24 24" className="mx-auto mb-2 size-8 text-[var(--x-primary)]" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                        <path d="M12 16V4m0 0l-4.5 4.5M12 4l4.5 4.5M4 15v3a2 2 0 002 2h12a2 2 0 002-2v-3" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span className="block text-sm font-semibold text-[var(--x-ink)]">{words.choose[locale]}</span>
                      <span className="mt-1 block text-xs text-[var(--x-soft)]">{say(words.limits[locale])}</span>
                    </span>
                  )}
                  <input
                    id={fileId}
                    name="photo"
                    type="file"
                    accept={SUBMISSION_ACCEPT}
                    required
                    aria-label={words.choose[locale]}
                    className="sr-only"
                    onChange={(event) => onFile(event.currentTarget.files?.[0])}
                  />
                </label>

                <p className="mt-3 text-xs leading-relaxed text-[var(--x-soft)]">{words.note[locale]}</p>

                {error ? (
                  <p role="alert" className="mt-3 rounded-[var(--x-r-field)] bg-[var(--x-full-wash)] px-3 py-2 text-sm font-medium text-[var(--x-full)]">
                    {say(words.errors[error][locale])}
                  </p>
                ) : null}

                <div className="mt-4 flex justify-end gap-2">
                  <button type="button" onClick={close} className={QUIET}>
                    {words.cancel[locale]}
                  </button>
                  <button type="submit" disabled={pending || !preview} className={PRIMARY}>
                    {pending ? words.sending[locale] : words.send[locale]}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>,
        document.body,
      ) : null}
    </>
  );
};

export default GalleryShare;
