import Link from 'next/link';
import type { Locale } from '@/config/locales';
import { BrandMark } from '@/shared';
import { PREPARING_COPY } from '../constants/preparing-copy';

/*
 * "The conference is being prepared" — what everyone but the Netaim
 * team sees of a conference the Studio has kept to the team.
 *
 * It says nothing about the conference: no name, no dates, no picture.
 * A visitor gets one way forward, signing in, because that is how a
 * team member gets past it; a signed-in guest is told plainly that the
 * page is for the team for now, and is pointed at their own area
 * instead of at a sign-in that would bring them straight back here.
 *
 * A whole page, with no conference bar above it: the bar names the
 * conference and links into it.
 */
interface ConferencePreparingProps {
  locale: Locale;
  /* A visitor, or a signed-in guest who is not on the team. */
  viewer: 'guest' | 'member';
  /* The sign-in screen, set to return to the page that was asked for. */
  signInHref: string;
  brand: string;
  brandLogo: string;
}

const ConferencePreparing = ({ locale, viewer, signInHref, brand, brandLogo }: ConferencePreparingProps) => {
  const copy = (entry: Record<Locale, string>) => entry[locale];
  return (
    <main
      id="main-content"
      className="experience flex min-h-dvh items-center justify-center bg-[var(--x-bg)] px-4 py-16"
    >
      <section
        aria-labelledby="conference-preparing-title"
        className="w-full max-w-lg rounded-[var(--x-r-card)] border border-[var(--x-line)] bg-[var(--x-surface)] px-6 py-10 text-center shadow-[var(--x-shadow)] sm:px-10 sm:py-12"
      >
        <BrandMark brand={brand} src={brandLogo} className="mx-auto h-10" textClassName="text-lg font-semibold" />

        <svg
          aria-hidden="true"
          viewBox="0 0 48 48"
          className="mx-auto mt-8 size-12 text-[var(--x-ok)]"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M24 42V22" />
          <path d="M24 26c0-7 5-12 13-12 0 8-5 13-13 12Z" />
          <path d="M24 30c0-6-4-10-11-10 0 7 4 11 11 10Z" />
          <path d="M14 42h20" />
        </svg>

        <p className="mt-5 inline-flex items-center gap-2 rounded-[var(--x-r-pill)] bg-[var(--x-warn-wash)] px-3 py-1 text-xs font-semibold tracking-[0.06em] text-[var(--x-warn)]">
          <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
          {copy(PREPARING_COPY.eyebrow)}
        </p>
        <h1 id="conference-preparing-title" className="mt-4 text-3xl font-bold text-[var(--x-ink)] sm:text-4xl">
          {copy(PREPARING_COPY.title)}
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-[15px] leading-relaxed text-[var(--x-soft)]">
          {copy(PREPARING_COPY.body)}
        </p>

        {viewer === 'guest' ? (
          <div className="mt-8 flex flex-col items-center gap-3">
            <Link
              href={signInHref}
              className="inline-flex min-h-12 w-full max-w-xs items-center justify-center rounded-[var(--x-r-field)] bg-[var(--x-primary)] px-6 text-[15px] font-semibold text-[var(--x-primary-ink)] transition-colors hover:bg-[var(--x-primary-strong)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--x-ring)] motion-reduce:transition-none"
            >
              {copy(PREPARING_COPY.signIn)}
            </Link>
            <p className="text-[13px] text-[var(--x-faint)]">{copy(PREPARING_COPY.teamOnly)}</p>
          </div>
        ) : (
          <div className="mt-8 flex flex-col items-center gap-4">
            <p
              role="status"
              className="rounded-[var(--x-r-field)] border border-[var(--x-line)] bg-[var(--x-bg)] px-4 py-3 text-sm leading-relaxed text-[var(--x-soft)]"
            >
              {copy(PREPARING_COPY.signedInNote)}
            </p>
            <Link
              href={`/${locale}/me`}
              className="inline-flex min-h-11 items-center justify-center rounded-[var(--x-r-field)] border border-[var(--x-line-strong)] px-5 text-[15px] font-medium text-[var(--x-ink)] transition-colors hover:border-[var(--x-primary)] hover:text-[var(--x-primary)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--x-ring)] motion-reduce:transition-none"
            >
              {copy(PREPARING_COPY.myArea)}
            </Link>
          </div>
        )}
      </section>
    </main>
  );
};

export default ConferencePreparing;
