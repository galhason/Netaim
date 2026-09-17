import type { ReactNode } from 'react';
import Link from 'next/link';
import { brandFor } from '@/config/brand';
import type { Locale } from '@/config/locales';
import { ConferenceFooter } from '@/features/cinematic';
import { BrandMark } from '@/shared';

/*
 * The onboarding shell: the frame, the heading and the supporting
 * panel that registration and sign-in share.
 *
 * The two screens are one moment seen from two sides — a person
 * arriving for the first time, and a person coming back — so they wear
 * the same clothes: a minimal header with one exit and the language
 * switch, a heading column, a card for the task, and the promise of
 * the platform beside it. What differs (the form, the numbers) is
 * passed in; what is the same lives here once.
 */

/* ---------- shared classes: the Experience design language ---------- */

export const onboardingCls = {
  card: 'rounded-[var(--x-r-card)] border border-[var(--x-line)] bg-[var(--x-surface)] shadow-[var(--x-shadow)]',
  primary:
    'inline-flex min-h-12 items-center justify-center gap-2 rounded-[var(--x-r-field)] bg-[var(--x-primary)] px-6 text-[15px] font-semibold text-white shadow-[0_10px_30px_rgb(42 144 200 / 0.28)] transition-[transform,background-color,box-shadow] hover:-translate-y-0.5 hover:bg-[var(--x-primary-strong)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--x-ring)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 motion-reduce:transition-none motion-reduce:hover:translate-y-0',
  ghost:
    'inline-flex min-h-12 items-center justify-center gap-2 rounded-[var(--x-r-field)] border border-[var(--x-line-strong)] bg-[var(--x-surface)] px-5 text-[15px] font-medium text-[var(--x-ink)] transition-colors hover:border-[var(--x-primary)] hover:text-[var(--x-primary)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--x-ring)]',
  field:
    'w-full rounded-[var(--x-r-field)] border border-[var(--x-line-strong)] bg-[var(--x-surface)] px-4 py-3 text-[15px] text-[var(--x-ink)] outline-none transition-[box-shadow,border-color] duration-200 placeholder:text-[var(--x-faint)] focus:border-[var(--x-primary)] focus:ring-4 focus:ring-[var(--x-ring)] disabled:opacity-60',
  label: 'mb-1.5 block text-sm font-medium text-[var(--x-ink)]',
  noteWarn:
    'rounded-[var(--x-r-field)] border border-[var(--x-warn)]/30 bg-[var(--x-warn-wash)] px-4 py-3 text-sm leading-relaxed text-[var(--x-warn)]',
  noteOk:
    'rounded-[var(--x-r-field)] border border-[var(--x-ok)]/30 bg-[var(--x-ok-wash)] px-4 py-3 text-sm leading-relaxed text-[var(--x-ok)]',
  quietLink:
    'underline-offset-4 hover:text-[var(--x-primary)] hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--x-ring)] rounded',
  strongLink:
    'inline-flex items-center gap-1 font-semibold text-[var(--x-primary)] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--x-ring)] rounded',
} as const;

/* ---------- copy the two screens share ---------- */

export const ONBOARDING_COPY = {
  backHome: { he: 'לעמוד הראשי', en: 'Back to home' },
  language: { he: 'שפה', en: 'Language' },
  tagline: { he: 'חיבור של אנשים לאירועים טובים', en: 'Connecting people to good events' },
  promoTitle: { he: 'אירועים טובים מתחילים כאן', en: 'Good events start here' },
  promoBody: {
    he: 'נטעים מחברת בין אנשים סביב כנס אחד: תוכנית ברורה, מקום שמור, ואנשים ששווה להכיר.',
    en: 'Netaim brings people together around one conference: a clear programme, a saved place, and people worth meeting.',
  },
  benefits: {
    he: [
      { title: 'ניהול פשוט ויעיל', body: 'ההרשמה, הסדנאות והלו״ז — במקום אחד' },
      { title: 'חיבור בין אנשים', body: 'זירת נטוורקינג לפני הכנס ובמהלכו' },
      { title: 'הכנס ממשיך איתכם', body: 'חשבון אחד לכל הכנסים — הקשרים והלו״ז נשארים' },
    ],
    en: [
      { title: 'Simple to manage', body: 'Registration, workshops and schedule in one place' },
      { title: 'People, connected', body: 'A networking space before and during the conference' },
      { title: 'It carries on with you', body: 'One account for every conference — your connections and schedule stay' },
    ],
  },
} as const;

export const pickCopy = (lang: Locale, entry: { he: string; en: string }): string =>
  lang === 'he' ? entry.he : entry.en;

/* ---------- icons: small, inline, and only where they carry meaning ---------- */

export const Sprout = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6" fill="none">
    <path d="M12 21v-8" stroke="var(--x-ok)" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M12 13c0-4 3-7 7.5-7 0 4.5-3 7-7.5 7Z" fill="var(--x-ok)" opacity=".9" />
    <path d="M12 13c0-3.2-2.4-5.6-6-5.6 0 3.6 2.4 5.6 6 5.6Z" fill="var(--x-ok)" opacity=".55" />
  </svg>
);

const IconCalendar = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3.5" y="5" width="17" height="15" rx="3" />
    <path d="M3.5 10h17M8 3v4M16 3v4" />
  </svg>
);

const IconPeople = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="8.5" r="3.2" />
    <circle cx="16.5" cy="10" r="2.4" />
    <path d="M3.5 19c.6-3.2 2.9-5 5.5-5s4.9 1.8 5.5 5M14.6 18.5c.4-2 1.6-3.2 3.2-3.2 1.4 0 2.4.9 2.7 2.7" />
  </svg>
);

const IconHeart = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20s-7-4.4-7-9.6A3.9 3.9 0 0 1 12 8a3.9 3.9 0 0 1 7 2.4C19 15.6 12 20 12 20Z" />
  </svg>
);

/* An arrow that points "onward" in the reading direction. */
export const ArrowOn = ({ className = 'size-3.5' }: { className?: string }) => (
  <svg viewBox="0 0 20 20" aria-hidden="true" className={`${className} rtl:-scale-x-100`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 10h12M11 5l5 5-5 5" />
  </svg>
);

/* ---------- the frame: a minimal header for a focused task, the site's footer ---------- */

export const OnboardingFrame = ({
  locale,
  switchHref,
  brandLogo,
  children,
}: {
  locale: Locale;
  /* This same screen, in the other language. */
  switchHref: string;
  /*
   * The site's logo for a daylight header. Absent — a caller that has
   * not resolved it — and the sprout and the name stand as before.
   */
  brandLogo?: string;
  children: ReactNode;
}) => (
  <div className="experience flex min-h-dvh flex-col bg-[var(--x-bg)] text-[var(--x-ink)]">
    {/*
      * A person signing in or registering has one thing to do. The
      * full site navigation is a set of exits; this header keeps one —
      * home — and the name of the place they are entering.
      */}
    <header className="border-b border-[var(--x-line)] bg-[var(--x-surface)]/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 md:px-8">
        <Link
          href={`/${locale}`}
          className="flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--x-ring)]"
        >
          {brandLogo ? null : <Sprout />}
          <span className="flex flex-col leading-none">
            <BrandMark
              brand={brandFor(locale)}
              src={brandLogo}
              height={40}
              textClassName="font-display text-xl font-extrabold tracking-tight text-[var(--x-ink)]"
            />
            <span className="mt-1 text-[11px] text-[var(--x-faint)]">
              {pickCopy(locale, ONBOARDING_COPY.tagline)}
            </span>
          </span>
        </Link>
        <div className="flex items-center gap-3 sm:gap-5">
          {/*
            * The language switch: both names, always, the current one
            * filled. Each is written in its own script, so a person who
            * cannot read the page can still find the way out of it —
            * which is the one thing a language switch must do.
            */}
          <nav
            aria-label={pickCopy(locale, ONBOARDING_COPY.language)}
            className="flex items-center rounded-full border border-[var(--x-line)] bg-[var(--x-surface)] p-0.5 text-[13px] font-medium"
          >
            {(['he', 'en'] as const).map((option) => {
              const active = option === locale;
              return active ? (
                <span
                  key={option}
                  aria-current="true"
                  lang={option}
                  className="rounded-full bg-[var(--x-ink)] px-3 py-1 text-white"
                >
                  {option === 'he' ? 'עב' : 'EN'}
                </span>
              ) : (
                <Link
                  key={option}
                  href={switchHref}
                  lang={option}
                  hrefLang={option}
                  className="rounded-full px-3 py-1 text-[var(--x-soft)] transition-colors hover:text-[var(--x-ink)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--x-ring)]"
                >
                  {option === 'he' ? 'עב' : 'EN'}
                </Link>
              );
            })}
          </nav>
          <Link
            href={`/${locale}`}
            className="inline-flex items-center gap-1.5 rounded-lg text-sm font-medium text-[var(--x-soft)] transition-colors hover:text-[var(--x-primary)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--x-ring)]"
          >
            <svg viewBox="0 0 20 20" aria-hidden="true" className="size-4 rtl:-scale-x-100" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 10H4M9 5l-5 5 5 5" />
            </svg>
            <span className="hidden sm:inline">{pickCopy(locale, ONBOARDING_COPY.backHome)}</span>
            <span className="sr-only sm:hidden">{pickCopy(locale, ONBOARDING_COPY.backHome)}</span>
          </Link>
        </div>
      </div>
    </header>
    <div className="flex-1">{children}</div>
    <ConferenceFooter
      locale={locale}
      brand={brandFor(locale)}
      brandLogo={brandLogo}
    />
  </div>
);

/* ---------- the layout: heading, task card, supporting panel ---------- */

export const OnboardingLayout = ({
  locale,
  switchHref,
  brandLogo,
  eyebrow,
  title,
  intro,
  aside,
  children,
}: {
  locale: Locale;
  switchHref: string;
  brandLogo?: string;
  eyebrow: string;
  title: string;
  intro: string;
  aside: ReactNode;
  children: ReactNode;
}) => (
  <OnboardingFrame
    locale={locale}
    switchHref={switchHref}
    brandLogo={brandLogo}
  >
    <main
      id="main-content"
      className="mx-auto max-w-6xl px-5 pb-20 pt-10 md:px-8 md:pt-14"
    >
      <header className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--x-primary)]">
          {eyebrow}
        </p>
        <h1 className="mt-2 flex items-center gap-3 font-display text-[2rem] font-extrabold leading-[1.1] tracking-tight text-[var(--x-ink)] md:text-[2.6rem]">
          <span>{title}</span>
          <span className="hidden sm:inline-block" aria-hidden="true">
            <Sprout />
          </span>
        </h1>
        <p className="mt-3 text-[17px] leading-relaxed text-[var(--x-soft)]">{intro}</p>
      </header>

      {/*
        * Task first in document order, so it leads in both reading
        * directions and sits alone at the top on a phone; the panel
        * follows and, on a wide screen, stays put while the form scrolls.
        */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,1fr)] lg:items-start lg:gap-8">
        {children}
        <div className="lg:sticky lg:top-6">{aside}</div>
      </div>
    </main>
  </OnboardingFrame>
);

/* ---------- the supporting panel: why join, and whatever the screen adds ---------- */

export const PromoPanel = ({
  locale,
  children,
}: {
  locale: Locale;
  /* The screen's own strip at the foot: capacity for registration, the way to register for sign-in. */
  children?: ReactNode;
}) => {
  const benefits = locale === 'he' ? ONBOARDING_COPY.benefits.he : ONBOARDING_COPY.benefits.en;
  const icons = [IconCalendar, IconPeople, IconHeart];
  return (
    <aside
      className={`${onboardingCls.card} relative overflow-hidden p-7 md:p-8`}
      aria-labelledby="promo-title"
    >
      {/*
        * A soft botanical wash, drawn rather than photographed: two
        * leaf forms in the brand green, faint enough to sit behind the
        * text without competing with it.
        */}
      <svg
        viewBox="0 0 320 320"
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-16 -start-16 size-72 opacity-[0.16] rtl:-scale-x-100"
        fill="var(--x-ok)"
      >
        <path d="M60 300c0-90 55-160 150-180-10 95-60 160-150 180Z" />
        <path d="M120 310c20-60 70-100 140-110-20 70-70 110-140 110Z" opacity=".6" />
        <path d="M40 320c-5-40 10-80 45-100 5 40-10 80-45 100Z" opacity=".5" />
      </svg>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -end-24 -top-24 size-64 rounded-full bg-[var(--x-primary-wash)] opacity-80 blur-2xl"
      />

      <div className="relative">
        <h2
          id="promo-title"
          className="font-display text-2xl font-extrabold leading-tight tracking-tight text-[var(--x-ink)] md:text-[1.7rem]"
        >
          {pickCopy(locale, ONBOARDING_COPY.promoTitle)}
        </h2>
        <p className="mt-3 text-[15px] leading-relaxed text-[var(--x-soft)]">
          {pickCopy(locale, ONBOARDING_COPY.promoBody)}
        </p>

        <ul className="mt-7 flex flex-col gap-4">
          {benefits.map((benefit, index) => {
            const Icon = icons[index] ?? IconCalendar;
            return (
              <li key={benefit.title} className="flex items-start gap-3.5">
                <span className="grid size-11 flex-none place-items-center rounded-full bg-[var(--x-primary-wash)] text-[var(--x-primary)]">
                  <Icon />
                </span>
                <span>
                  <span className="block text-[15px] font-semibold text-[var(--x-ink)]">
                    {benefit.title}
                  </span>
                  <span className="mt-0.5 block text-[13px] leading-relaxed text-[var(--x-soft)]">
                    {benefit.body}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>

        {children ? (
          <div className="mt-8 rounded-[var(--x-r-field)] border border-[var(--x-line)] bg-[var(--x-surface)]/80 p-4">
            {children}
          </div>
        ) : null}
      </div>
    </aside>
  );
};
