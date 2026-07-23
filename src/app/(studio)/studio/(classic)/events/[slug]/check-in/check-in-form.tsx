'use client';

import { useState, useTransition } from 'react';
import { checkInAction } from '../../../actions';

interface CheckInLabels {
  placeholder: string;
  button: string;
  scanning: string;
  checkedin: string;
  already: string;
  blocked: string;
  invalid: string;
}

interface CheckInFormProps {
  labels: CheckInLabels;
}

type CheckInOutcome = Awaited<ReturnType<typeof checkInAction>>;

const CheckInForm = ({ labels }: CheckInFormProps) => {
  const [token, setToken] = useState('');
  const [result, setResult] = useState<CheckInOutcome | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    const value = token.trim();
    if (!value || pending) {
      return;
    }
    startTransition(async () => {
      const outcome = await checkInAction(value);
      setResult(outcome);
      setToken('');
    });
  };

  const positive = result?.outcome === 'checkedin';
  const message = result
    ? result.outcome === 'checkedin'
      ? `${labels.checkedin} — ${result.name ?? ''}`
      : result.outcome === 'already'
        ? `${labels.already} — ${result.name ?? ''}`
        : result.outcome === 'blocked'
          ? `${labels.blocked} — ${result.name ?? ''}`
          : labels.invalid
    : null;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end gap-4">
        <input
          type="text"
          value={token}
          onChange={(event) => setToken(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              submit();
            }
          }}
          placeholder={labels.placeholder}
          autoFocus
          className="min-w-64 flex-1 border-b border-border bg-transparent py-2 font-mono text-sm outline-none"
        />
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="inline-flex min-h-11 items-center rounded-lg bg-brand px-6 font-medium text-brand-contrast disabled:opacity-60"
        >
          {pending ? labels.scanning : labels.button}
        </button>
      </div>
      {message ? (
        <p
          role="status"
          aria-live="polite"
          className={`text-lg font-medium ${positive ? 'text-text-primary' : 'text-accent'}`}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
};

export default CheckInForm;
