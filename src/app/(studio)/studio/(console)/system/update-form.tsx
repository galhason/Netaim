'use client';

import { startTransition, useActionState, useId, type FormEvent } from 'react';
import Link from 'next/link';
import type { Locale } from '@/config/locales';
import { SYSTEM_COPY, SYSTEM_KIND_LABELS, SYSTEM_REFUSALS } from '@/features/system/constants/system-copy';
import { SYSTEM_UPDATE_LIMITS } from '@/features/system/constants/system-limits';
import { SYSTEM_UPDATE_KINDS, type SystemUpdate } from '@/features/system/types/system-update';
import type { SystemFormState } from './actions';

/*
 * One release note, new or edited. Drawn only for the developer; the
 * action asks again either way. A refusal comes back with what was
 * typed still in the fields (the action returns rather than redirects
 * on a refusal) and the message beside the field it is about.
 *
 * Submitted through onSubmit rather than as the form's action: a form
 * action resets every field when it settles, which would empty the
 * note the moment the server refused one part of it.
 */
interface UpdateFormProps {
  locale: Locale;
  action: (state: SystemFormState, form: FormData) => Promise<SystemFormState>;
  /* The note being edited; absent for a new one. */
  update?: SystemUpdate;
  today: string;
}

const LABEL = 'mb-1.5 block text-[11px] font-medium tracking-[0.08em] text-[var(--c-text-soft)]';
const INPUT =
  'w-full rounded-lg border border-[var(--c-line)] bg-[rgba(7,19,36,0.6)] px-3 py-2.5 text-sm text-[var(--c-text)] transition-colors placeholder:text-[var(--c-text-faint)] focus:border-[var(--c-bronze)]/60 focus:outline-none aria-[invalid=true]:border-[var(--c-danger)]/70';
const HINT = 'mt-1 text-[11px] text-[var(--c-text-faint)]';
const ERROR = 'mt-1 text-[12px] text-[var(--c-danger-text)]';

const UpdateForm = ({ locale, action, update, today }: UpdateFormProps) => {
  const [state, formAction, pending] = useActionState(action, {});
  const id = useId();
  const words = SYSTEM_COPY;
  const field = (name: string) => `${id}-${name}`;
  const refusal = state.error && state.error in SYSTEM_REFUSALS ? state.error : null;
  const errorOn = (name: 'version' | 'title' | 'details' | 'kind' | 'date') =>
    refusal === name ? SYSTEM_REFUSALS[name][locale] : null;
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => formAction(data));
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      {update ? <input type="hidden" name="id" value={update.id} /> : null}

      <div className="grid gap-4 sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)_minmax(0,9rem)_minmax(0,10rem)]">
        <div>
          <label htmlFor={field('version')} className={LABEL}>
            {words.version[locale]}
          </label>
          <input
            id={field('version')}
            name="version"
            dir="ltr"
            required
            maxLength={SYSTEM_UPDATE_LIMITS.version}
            defaultValue={update?.version ?? ''}
            placeholder="1.0"
            aria-invalid={Boolean(errorOn('version'))}
            aria-describedby={`${field('version')}-hint`}
            className={`${INPUT} text-start tabular-nums`}
          />
          <p id={`${field('version')}-hint`} className={errorOn('version') ? ERROR : HINT}>
            {errorOn('version') ?? words.versionHint[locale]}
          </p>
        </div>
        <div>
          <label htmlFor={field('title')} className={LABEL}>
            {words.updateTitle[locale]}
          </label>
          <input
            id={field('title')}
            name="title"
            required
            maxLength={SYSTEM_UPDATE_LIMITS.title}
            defaultValue={update?.title ?? ''}
            placeholder={words.titleHint[locale]}
            aria-invalid={Boolean(errorOn('title'))}
            className={INPUT}
          />
          {errorOn('title') ? <p className={ERROR}>{errorOn('title')}</p> : null}
        </div>
        <div>
          <label htmlFor={field('kind')} className={LABEL}>
            {words.kind[locale]}
          </label>
          <select
            id={field('kind')}
            name="kind"
            defaultValue={update?.kind ?? 'feature'}
            aria-invalid={Boolean(errorOn('kind'))}
            className={INPUT}
          >
            {SYSTEM_UPDATE_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {SYSTEM_KIND_LABELS[kind][locale]}
              </option>
            ))}
          </select>
          {errorOn('kind') ? <p className={ERROR}>{errorOn('kind')}</p> : null}
        </div>
        <div>
          <label htmlFor={field('releasedAt')} className={LABEL}>
            {words.releasedAt[locale]}
          </label>
          <input
            id={field('releasedAt')}
            name="releasedAt"
            type="date"
            max={today}
            defaultValue={update?.releasedAt ?? today}
            aria-invalid={Boolean(errorOn('date'))}
            className={`${INPUT} [color-scheme:dark]`}
          />
          {errorOn('date') ? <p className={ERROR}>{errorOn('date')}</p> : null}
        </div>
      </div>

      <div>
        <label htmlFor={field('details')} className={LABEL}>
          {words.details[locale]}
        </label>
        <textarea
          id={field('details')}
          name="details"
          rows={5}
          maxLength={SYSTEM_UPDATE_LIMITS.details}
          defaultValue={update?.details ?? ''}
          aria-invalid={Boolean(errorOn('details'))}
          aria-describedby={`${field('details')}-hint`}
          className={`${INPUT} resize-y leading-relaxed`}
        />
        <p id={`${field('details')}-hint`} className={errorOn('details') ? ERROR : HINT}>
          {errorOn('details') ?? words.detailsHint[locale]}
        </p>
      </div>

      {state.error === 'failed' || state.error === 'forbidden' ? (
        <p role="alert" className="rounded-lg border border-[var(--c-danger)]/40 bg-[var(--c-danger)]/10 px-3 py-2 text-sm text-[var(--c-danger-text)]">
          {state.error === 'forbidden' ? words.readOnly[locale] : words.failed[locale]}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-end gap-2">
        {update ? (
          <Link
            href="/studio/system"
            className="inline-flex min-h-10 items-center rounded-lg border border-[var(--c-line-strong)] px-4 text-sm text-[var(--c-text-soft)] hover:text-[var(--c-text)]"
          >
            {words.cancel[locale]}
          </Link>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-10 items-center rounded-lg bg-[var(--c-bronze)] px-5 text-sm font-semibold text-[var(--c-on-accent)] transition-colors hover:bg-[var(--c-bronze-hover)] disabled:opacity-60"
        >
          {update ? words.save[locale] : words.publish[locale]}
        </button>
      </div>
    </form>
  );
};

export default UpdateForm;
