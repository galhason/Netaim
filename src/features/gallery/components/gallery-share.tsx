'use client';

import { startTransition, useActionState, useEffect, useId, useRef, useState } from 'react';
import type { Locale } from '@/config/locales';
import { GALLERY_COPY, fill } from '../constants/gallery-copy';
import {
  SUBMISSION_ACCEPT,
  SUBMISSION_CAPTION_MAX,
  SUBMISSION_CREDIT_MAX,
  SUBMISSION_MAX_BYTES,
  SUBMISSION_MAX_MB,
  SUBMISSION_TYPES,
} from '../constants/gallery-limits';
import type { GallerySubmissionState } from '../types/gallery';

/*
 * "Share a photo" — a participant sends one photograph to the team.
 *
 * Opens in place, under the invitation that asks for it. The size and
 * the format are checked here first so nobody waits for an upload the
 * server will refuse — and checked again there, where it counts. What
 * comes back is said in words: sent for approval, or what to fix. The
 * photograph is never shown on the page by sending it.
 */
interface GalleryShareProps {
  locale: Locale;
  slug: string;
  submitterName: string;
  action: (state: GallerySubmissionState, formData: FormData) => Promise<GallerySubmissionState>;
}

const INITIAL: GallerySubmissionState = { status: 'idle' };

const FIELD =
  'w-full rounded-[var(--x-r-field)] border border-[var(--x-line-strong)] bg-[var(--x-surface)] px-3 py-2.5 text-sm text-[var(--x-ink)] outline-none focus:border-[var(--x-primary)] focus:ring-2 focus:ring-[var(--x-ring)]';
const LABEL = 'mb-1.5 block text-sm font-semibold text-[var(--x-ink)]';
const HINT = 'mt-1 block text-xs text-[var(--x-soft)]';

const GalleryShare = ({ locale, slug, submitterName, action }: GalleryShareProps) => {
  const words = GALLERY_COPY.share;
  const [state, formAction, pending] = useActionState(action, INITIAL);
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [localError, setLocalError] = useState<keyof typeof words.errors | null>(null);
  /* The server's last answer, until the person acts on it. */
  const [answerShown, setAnswerShown] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const fileId = useId();
  const panelId = useId();

  /* The preview's object URL lives as long as the choice does. */
  useEffect(() => () => {
    if (preview) {
      URL.revokeObjectURL(preview);
    }
  }, [preview]);

  useEffect(() => {
    setAnswerShown(state.status !== 'idle');
    if (state.status === 'sent') {
      form.current?.reset();
      setPreview(null);
    }
  }, [state]);

  const sent = answerShown && state.status === 'sent';

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

  const error = localError ?? (answerShown && state.status === 'error' ? state.reason : null);
  const say = (template: string) => fill(template, { mb: SUBMISSION_MAX_MB });

  if (!open) {
    return (
      <button
        type="button"
        aria-expanded="false"
        aria-controls={panelId}
        onClick={() => {
          setOpen(true);
          requestAnimationFrame(() => heading.current?.focus());
        }}
        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[var(--x-r-pill)] bg-[var(--x-primary)] px-7 text-sm font-bold text-[var(--x-primary-ink)] shadow-[var(--x-shadow)] transition-colors hover:bg-[var(--x-primary-strong)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--x-primary)]"
      >
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <rect x="3" y="6" width="18" height="14" rx="3" />
          <circle cx="12" cy="13" r="3.5" />
          <path d="M8.5 6l1.5-2.5h4L15.5 6" strokeLinejoin="round" />
        </svg>
        {words.open[locale]}
      </button>
    );
  }

  return (
    <div
      id={panelId}
      className="mx-auto w-full max-w-xl rounded-[var(--x-r-card)] border border-[var(--x-line)] bg-[var(--x-surface)] p-5 text-start shadow-[var(--x-shadow-lift)] md:p-6"
    >
      <h3 ref={heading} tabIndex={-1} className="font-display text-xl font-bold text-[var(--x-ink)] outline-none">
        {words.formTitle[locale]}
      </h3>
      <p className="mt-1 text-sm text-[var(--x-soft)]">{words.formNote[locale]}</p>

      {sent ? (
        <div className="mt-5">
          <p role="status" className="rounded-[var(--x-r-field)] bg-[var(--x-ok-wash)] px-4 py-3 text-sm font-medium text-[var(--x-ok)]">
            {words.sent[locale]}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                form.current?.reset();
                setAnswerShown(false);
              }}
              className="inline-flex min-h-11 items-center rounded-[var(--x-r-pill)] border border-[var(--x-primary)] px-5 text-sm font-bold text-[var(--x-primary)] hover:bg-[var(--x-primary-wash)]"
            >
              {words.another[locale]}
            </button>
          </div>
        </div>
      ) : null}

      {/*
        * Submitted by hand rather than through `action`: a form action
        * resets the form when it returns, and a refusal ("too large",
        * "confirm the rights") must leave the photo and the words where
        * the person put them.
        */}
      <form
        ref={form}
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          startTransition(() => formAction(data));
        }}
        className={`mt-5 flex flex-col gap-4 ${sent ? 'hidden' : ''}`}
        onReset={() => {
          setPreview(null);
          setLocalError(null);
        }}
      >
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="locale" value={locale} />

        <div>
          <span className={LABEL} id={`${fileId}-label`}>
            {words.file[locale]}
          </span>
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt={words.preview[locale]} className="mb-3 max-h-64 w-full rounded-[var(--x-r-field)] bg-[var(--x-bg-deep)] object-contain" />
          ) : null}
          <label
            htmlFor={fileId}
            className="inline-flex min-h-11 cursor-pointer items-center rounded-[var(--x-r-pill)] border border-dashed border-[var(--x-primary)] px-5 text-sm font-semibold text-[var(--x-primary)] hover:bg-[var(--x-primary-wash)] has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--x-primary)]"
          >
            {preview ? words.change[locale] : words.choose[locale]}
            <input
              id={fileId}
              name="photo"
              type="file"
              accept={SUBMISSION_ACCEPT}
              required
              aria-labelledby={`${fileId}-label`}
              aria-describedby={`${fileId}-hint`}
              className="sr-only"
              onChange={(event) => onFile(event.currentTarget.files?.[0])}
            />
          </label>
          <span id={`${fileId}-hint`} className={HINT}>
            {say(words.fileHint[locale])}
          </span>
        </div>

        <label className="block">
          <span className={LABEL}>{words.caption[locale]}</span>
          <textarea name="caption" rows={2} maxLength={SUBMISSION_CAPTION_MAX} dir="auto" className={FIELD} />
        </label>

        <label className="block">
          <span className={LABEL}>{words.credit[locale]}</span>
          <input name="credit" maxLength={SUBMISSION_CREDIT_MAX} dir="auto" placeholder={submitterName} className={FIELD} />
          <span className={HINT}>{words.creditHint[locale]}</span>
        </label>

        <label className="flex items-start gap-3 text-sm text-[var(--x-ink)]">
          <input type="checkbox" name="rights" required className="mt-0.5 size-5 shrink-0 accent-[var(--x-primary)]" />
          <span>{words.rights[locale]}</span>
        </label>

        {error ? (
          <p role="alert" className="rounded-[var(--x-r-field)] bg-[var(--x-full-wash)] px-4 py-3 text-sm font-medium text-[var(--x-full)]">
            {say(words.errors[error][locale])}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={pending || localError !== null}
            className="inline-flex min-h-11 items-center rounded-[var(--x-r-pill)] bg-[var(--x-primary)] px-6 text-sm font-bold text-[var(--x-primary-ink)] transition-colors hover:bg-[var(--x-primary-strong)] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--x-primary)]"
          >
            {pending ? words.sending[locale] : words.send[locale]}
          </button>
          <button
            type="button"
            onClick={() => {
              form.current?.reset();
              setOpen(false);
            }}
            className="inline-flex min-h-11 items-center rounded-[var(--x-r-pill)] px-5 text-sm font-semibold text-[var(--x-soft)] hover:text-[var(--x-ink)]"
          >
            {words.cancel[locale]}
          </button>
        </div>
      </form>
    </div>
  );
};

export default GalleryShare;
