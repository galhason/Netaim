import Link from 'next/link';
import type { ReactNode } from 'react';

/*
 * The Lounge kit: the guest-facing design language in one place. Every
 * personal surface — account, registration, workshops, schedule,
 * networking — is built from these, so the experience stays one piece
 * instead of six screens that drifted apart.
 */

export const loungeField =
  'w-full rounded-xl border border-[var(--l-hair)] bg-white px-3.5 py-2.5 text-sm text-[var(--l-ink)] transition-colors focus:border-[var(--l-bronze)] focus:outline-none';

export const loungeLabel =
  'mb-1.5 block text-xs font-medium text-[var(--l-soft)]';

export const loungePrimary =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--l-navy)] px-6 text-sm font-medium text-white transition-colors hover:bg-[#16263c]';

export const loungeQuiet =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--l-hair)] bg-white px-5 text-sm font-medium text-[var(--l-ink)] transition-colors hover:border-[var(--l-bronze)]';

export const loungeGhost =
  'inline-flex min-h-11 items-center text-sm text-[var(--l-soft)] underline decoration-current/30 underline-offset-8 transition-colors hover:text-[var(--l-ink)]';

export const loungeChip =
  'inline-flex items-center rounded-full bg-[var(--l-bronze)]/12 px-3 py-1 text-xs font-medium text-[var(--l-bronze)]';

interface LoungeShellProps {
  children: ReactNode;
  /* Where the quiet back link returns to, when there is one. */
  backHref?: string;
  backLabel?: string;
  width?: 'narrow' | 'wide';
}

export const LoungeShell = ({
  children,
  backHref,
  backLabel,
  width = 'wide',
}: LoungeShellProps) => (
  <main
    id="main-content"
    className="lounge min-h-dvh bg-[var(--l-bg)] font-body text-[var(--l-ink)]"
  >
    <div
      className={`mx-auto w-full px-6 py-10 md:px-10 ${
        width === 'narrow' ? 'max-w-xl' : 'max-w-5xl'
      }`}
    >
      {backHref ? (
        <Link
          href={backHref}
          className="text-sm text-[var(--l-soft)] transition-colors hover:text-[var(--l-ink)]"
        >
          ← {backLabel}
        </Link>
      ) : null}
      {children}
    </div>
  </main>
);

interface LoungeCardProps {
  children: ReactNode;
  className?: string;
  delay?: 0 | 1 | 2 | 3;
}

const DELAYS = ['', '[animation-delay:60ms]', '[animation-delay:120ms]', '[animation-delay:180ms]'];

export const LoungeCard = ({
  children,
  className = '',
  delay = 0,
}: LoungeCardProps) => (
  <article
    className={`lounge-rise flex flex-col rounded-3xl bg-white p-5 shadow-[0_14px_44px_rgba(35,40,47,0.08)] ${DELAYS[delay]} ${className}`}
  >
    {children}
  </article>
);

interface LoungeHeadingProps {
  eyebrow?: string;
  title: string;
  sub?: string;
  action?: ReactNode;
}

export const LoungeHeading = ({
  eyebrow,
  title,
  sub,
  action,
}: LoungeHeadingProps) => (
  <header className="flex flex-wrap items-end gap-4">
    <div className="min-w-0">
      {eyebrow ? (
        <p className="text-xs font-medium tracking-[0.18em] text-[var(--l-bronze)]">
          {eyebrow}
        </p>
      ) : null}
      <h1 className="mt-1 font-display text-3xl font-semibold md:text-4xl">
        {title}
      </h1>
      {sub ? (
        <p className="mt-2 text-[15px] text-[var(--l-soft)]">{sub}</p>
      ) : null}
    </div>
    {action ? <div className="ms-auto flex items-center gap-3">{action}</div> : null}
  </header>
);

export const LoungeSection = ({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) => (
  <section className="mt-10 flex flex-col gap-4">
    <h2 className="font-display text-xl font-semibold">{title}</h2>
    {children}
  </section>
);

export const LoungeNote = ({
  tone = 'quiet',
  children,
}: {
  tone?: 'quiet' | 'accent' | 'good';
  children: ReactNode;
}) => {
  const tones = {
    quiet: 'bg-white text-[var(--l-soft)]',
    accent: 'bg-[var(--l-bronze)]/12 text-[var(--l-ink)]',
    good: 'bg-[var(--l-live)]/10 text-[var(--l-live)]',
  };
  return (
    <p className={`rounded-2xl px-5 py-4 text-sm ${tones[tone]}`}>{children}</p>
  );
};
