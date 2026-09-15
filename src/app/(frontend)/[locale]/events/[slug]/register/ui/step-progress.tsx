import type { Locale } from '@/config/locales';

/*
 * The three steps of registration, drawn as a line the person walks
 * along. Pure markup with no state of its own, so it renders the same
 * from a Server Component (the verification and success screens) and
 * from inside the client form (steps one and two).
 *
 * Direction is never assumed. The list is a flex row in document
 * order, so in Hebrew step one sits at the right and the line runs
 * leftward, and in English the reverse — without a single mirrored
 * value in the CSS.
 */
export const STEP_LABELS: Record<Locale, readonly [string, string, string]> = {
  he: ['פרטים אישיים', 'הארגון והמוסד', 'אימות וסיום'],
  en: ['Personal details', 'Organisation', 'Verify & finish'],
};

const STEP_NAME: Record<Locale, string> = {
  he: 'שלב',
  en: 'Step',
};

const PROGRESS_NAME: Record<Locale, string> = {
  he: 'שלבי ההרשמה',
  en: 'Registration steps',
};

interface StepProgressProps {
  locale: Locale;
  /* 1-based. 4 means every step is done — the success screen. */
  current: 1 | 2 | 3 | 4;
}

const Check = () => (
  <svg
    viewBox="0 0 16 16"
    aria-hidden="true"
    className="size-3.5"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 8.5l3 3 7-7" />
  </svg>
);

const StepProgress = ({ locale, current }: StepProgressProps) => (
  <ol
    aria-label={PROGRESS_NAME[locale]}
    className="flex items-start justify-between gap-2"
  >
    {STEP_LABELS[locale].map((label, index) => {
      const number = index + 1;
      const done = number < current;
      const active = number === current;
      const last = number === 3;
      return (
        <li
          key={label}
          aria-current={active ? 'step' : undefined}
          className={`relative flex min-w-0 flex-1 flex-col items-center gap-2 text-center ${
            last ? '' : ''
          }`}
        >
          {/*
            * The connecting line lives on every step but the last, from
            * this circle's centre to the next one. Logical `inset` keeps
            * it on the correct side in both directions.
            */}
          {last ? null : (
            <span
              aria-hidden="true"
              className={`absolute top-[18px] h-0.5 w-[calc(100%-2.75rem)] rounded-full transition-colors ${
                done ? 'bg-[var(--x-primary)]' : 'bg-[var(--x-line-strong)]'
              }`}
              style={{ insetInlineStart: 'calc(50% + 1.375rem)' }}
            />
          )}
          <span
            className={`grid size-9 place-items-center rounded-full border-2 text-sm font-semibold tabular-nums transition-[background-color,border-color,color,box-shadow] ${
              done
                ? 'border-[var(--x-primary)] bg-[var(--x-primary)] text-white'
                : active
                  ? 'border-[var(--x-primary)] bg-[var(--x-primary)] text-white shadow-[0_0_0_5px_var(--x-primary-wash)]'
                  : 'border-[var(--x-line-strong)] bg-[var(--x-surface)] text-[var(--x-faint)]'
            }`}
          >
            {done ? <Check /> : number}
            <span className="sr-only">
              {' '}
              {STEP_NAME[locale]} {number}
            </span>
          </span>
          <span
            className={`text-xs font-medium leading-tight md:text-[13px] ${
              active
                ? 'text-[var(--x-primary)]'
                : done
                  ? 'text-[var(--x-ink)]'
                  : 'text-[var(--x-faint)]'
            }`}
          >
            {label}
          </span>
        </li>
      );
    })}
  </ol>
);

export default StepProgress;
