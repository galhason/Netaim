import type { ReactNode } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { isSupportedLocale, type Locale } from '@/config/locales';
import { BRAND_NAME } from '@/config/brand';
import { ConferenceFooter, SITE_NAV_LINKS } from '@/features/cinematic';
import { ExperienceNav } from '@/features/conference';
import {
  currentParticipant,
  getRegistrationSituation,
  PASSWORD_POLICY_TEXT,
  PUBLIC_STATE_LABELS,
  REGISTRATION_MESSAGES,
} from '@/features/registration';
import { registerAction, passwordSignInAction } from './actions';

interface RegisterPageProps {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{
    outcome?: string;
    error?: string;
    signinError?: string;
    with?: string;
  }>;
}

const OUTCOME_COPY = {
  confirmed: REGISTRATION_MESSAGES.confirmed,
  pending: REGISTRATION_MESSAGES.pending,
  waitlisted: REGISTRATION_MESSAGES.waitlisted,
} as const;

const isOutcome = (value: string): value is keyof typeof OUTCOME_COPY =>
  value === 'confirmed' || value === 'pending' || value === 'waitlisted';

const OPEN_STATES = ['open', 'limited', 'waitlist'] as const;

/* PRD §3.1: dietary preference is a fixed choice, never free text. */
const DIETARY_OPTIONS = [
  { he: 'רגיל', en: 'Regular' },
  { he: 'צמחוני', en: 'Vegetarian' },
  { he: 'טבעוני', en: 'Vegan' },
  { he: 'ללא גלוטן', en: 'Gluten-free' },
  { he: 'כשרות מהודרת', en: 'Kosher mehadrin' },
] as const;

/* Experience form primitives — the daylight counterpart to the lounge set. */
const xLabel = 'mb-1.5 block text-sm font-medium text-[var(--x-ink)]';
const xField =
  'w-full rounded-2xl border border-[var(--x-line)] bg-[var(--x-surface)] px-4 py-3 text-[15px] text-[var(--x-ink)] outline-none transition-[box-shadow,border-color] duration-200 placeholder:text-[var(--x-faint)] focus:border-[var(--x-primary)] focus:ring-4 focus:ring-[var(--x-ring)]';
const xPrimary =
  'inline-flex min-h-12 items-center justify-center rounded-2xl bg-[var(--x-primary)] px-6 text-[15px] font-semibold text-white shadow-[0_10px_30px_rgba(110,86,207,0.28)] transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--x-ring)]';
const xGhost =
  'inline-flex min-h-11 items-center justify-center rounded-2xl border border-[var(--x-line)] bg-[var(--x-surface)] px-5 text-sm font-semibold text-[var(--x-ink)] transition-colors hover:border-[var(--x-primary)]';
const cardCls =
  'rounded-[var(--x-r-card)] border border-[var(--x-line)] bg-[var(--x-surface)] shadow-[var(--x-shadow)]';

const STATE_TONE: Record<string, string> = {
  open: 'bg-[var(--x-ok-wash)] text-[var(--x-ok)]',
  limited: 'bg-[var(--x-warn-wash)] text-[var(--x-warn)]',
  waitlist: 'bg-[var(--x-wait-wash)] text-[var(--x-wait)]',
  closed: 'bg-[#f0f1f4] text-[var(--x-soft)]',
};

const Shell = ({
  locale,
  slug,
  userName,
  children,
}: {
  locale: Locale;
  slug: string;
  userName?: string;
  children: ReactNode;
}) => (
  <div className="experience min-h-dvh bg-[var(--x-bg)] text-[var(--x-ink)]">
    <ExperienceNav
      locale={locale}
      links={SITE_NAV_LINKS}
      brand={BRAND_NAME}
      registerHref={`/${locale}/events/${slug}/register`}
      meHref={`/${locale}/me`}
      userName={userName}
      {...(userName
        ? { scheduleHref: `/${locale}/events/${slug}/my-activities` }
        : {})}
    />
    {children}
    <ConferenceFooter locale={locale} brand={BRAND_NAME} />
  </div>
);

const RegisterPage = async ({ params, searchParams }: RegisterPageProps) => {
  const { locale, slug } = await params;
  if (!isSupportedLocale(locale)) {
    notFound();
  }
  setRequestLocale(locale);
  const lang = locale as Locale;
  const he = lang === 'he';

  const { outcome, error, signinError, with: conflictWith } = await searchParams;
  const situation = await getRegistrationSituation(slug, lang);
  const participant = await currentParticipant().catch(() => null);
  const m = REGISTRATION_MESSAGES;
  const open =
    situation.settings &&
    (OPEN_STATES as readonly string[]).includes(situation.state);
  const backHref = `/${lang}/events/${slug}`;
  const backLabel = he ? '→ לעמוד הכנס' : '← Back to the conference';

  if (outcome && isOutcome(outcome)) {
    return (
      <Shell locale={lang} slug={slug} userName={participant?.name ?? undefined}>
        <main className="mx-auto max-w-xl px-6 pb-24 pt-28 md:pt-32">
          <div className={`${cardCls} p-8 text-center`}>
            <span
              aria-hidden="true"
              className="mx-auto grid size-14 place-items-center rounded-full bg-[var(--x-ok-wash)] text-2xl text-[var(--x-ok)]"
            >
              ✓
            </span>
            <h1 className="mt-5 font-display text-3xl font-extrabold tracking-tight text-[var(--x-ink)]">
              {OUTCOME_COPY[outcome].heading[lang]}
            </h1>
            <p className="mt-3 text-[15px] text-[var(--x-soft)]">
              {OUTCOME_COPY[outcome].text[lang]}
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Link
                href={`/${lang}/events/${slug}/workshops`}
                className={xPrimary}
              >
                {m.toWorkshops[lang]}
              </Link>
              <Link href={`/${lang}/me`} className={xGhost}>
                {m.toPersonalArea[lang]}
              </Link>
            </div>
          </div>
        </main>
      </Shell>
    );
  }

  const cap = situation.capacity;
  const showBar = open && cap.limit != null && cap.limit > 0;
  const pct = showBar
    ? Math.min(100, Math.round((cap.confirmed / (cap.limit as number)) * 100))
    : 0;

  const perks: { he: string; en: string }[] = [
    { he: 'אישור מיידי במייל', en: 'Instant email confirmation' },
    { he: 'בחירת הרצאות וסדנאות', en: 'Pick talks and workshops' },
    { he: 'אזור אישי עם הלו״ז שלך', en: 'A personal area with your schedule' },
  ];

  return (
    <Shell locale={lang} slug={slug} userName={participant?.name ?? undefined}>
      <main className="mx-auto max-w-5xl px-6 pb-24 pt-28 md:px-10 md:pt-32">
        <Link
          href={backHref}
          className="text-sm font-medium text-[var(--x-soft)] transition-colors hover:text-[var(--x-primary)]"
        >
          {backLabel}
        </Link>
        <header className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--x-primary)]">
            {he ? 'הרשמה' : 'Registration'}
          </p>
          <h1 className="mt-2 font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-[var(--x-ink)] md:text-5xl">
            {m.public.heading[lang]}
          </h1>
          <p className="mt-3 max-w-2xl text-lg text-[var(--x-soft)]">
            {open
              ? m.public.intro[lang]
              : PUBLIC_STATE_LABELS[situation.state][lang]}
          </p>
        </header>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1.5fr_1fr] lg:items-start">
          {/* Form */}
          {open ? (
            <form
              action={registerAction}
              className={`${cardCls} order-2 flex flex-col gap-5 p-6 md:p-8 lg:order-1`}
            >
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="locale" value={lang} />

              <label>
                <span className={xLabel}>{m.public.name[lang]} *</span>
                <input
                  type="text"
                  name="name"
                  required
                  autoComplete="name"
                  className={xField}
                />
              </label>
              <label>
                <span className={xLabel}>{m.public.email[lang]} *</span>
                <input
                  type="email"
                  name="email"
                  required
                  autoComplete="email"
                  className={xField}
                />
              </label>
              <label>
                <span className={xLabel}>{he ? 'סיסמה' : 'Password'} *</span>
                <input
                  type="password"
                  name="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className={xField}
                />
                <span className="mt-1 block text-xs text-[var(--x-faint)]">
                  {PASSWORD_POLICY_TEXT[lang]}
                </span>
              </label>
              <label>
                <span className={xLabel}>{m.public.phone[lang]} *</span>
                <input
                  type="tel"
                  name="phone"
                  required
                  autoComplete="tel"
                  className={xField}
                />
              </label>

              <div className="grid gap-5 sm:grid-cols-2">
                <label>
                  <span className={xLabel}>
                    {m.public.organization[lang]} *
                  </span>
                  <input
                    type="text"
                    name="organization"
                    required
                    className={xField}
                  />
                </label>
                <label>
                  <span className={xLabel}>{m.public.role[lang]} *</span>
                  <input
                    type="text"
                    name="role"
                    required
                    className={xField}
                  />
                </label>
              </div>

              <label>
                <span className={xLabel}>{m.public.dietary[lang]} *</span>
                <select
                  name="dietary"
                  required
                  defaultValue=""
                  className={xField}
                >
                  <option value="" disabled>
                    {he ? 'בחרו העדפה' : 'Choose a preference'}
                  </option>
                  {DIETARY_OPTIONS.map((option) => (
                    <option key={option.en} value={option[lang]}>
                      {option[lang]}
                    </option>
                  ))}
                </select>
              </label>

              {situation.settings?.collectAccessibility ? (
                <label>
                  <span className={xLabel}>
                    {m.public.accessibility[lang]}
                  </span>
                  <textarea
                    name="accessibility"
                    rows={2}
                    className={`${xField} resize-none`}
                  />
                </label>
              ) : null}

              <label className="flex items-start gap-3 rounded-2xl bg-[var(--x-raise)] p-4 text-sm">
                <input
                  type="checkbox"
                  name="networkingOptIn"
                  className="mt-0.5 size-4 accent-[var(--x-primary)]"
                />
                <span className="text-[var(--x-soft)]">
                  {m.public.networkingOptIn[lang]}
                </span>
              </label>

              {error ? (
                <p className="rounded-2xl border border-[var(--x-warn)]/30 bg-[var(--x-warn-wash)] px-4 py-3 text-sm text-[var(--x-warn)]">
                  {error === 'invalid' ? (
                    m.public.invalid[lang]
                  ) : error === 'conflict' ? (
                    <>
                      {he
                        ? 'הכנס מתנגש בזמן עם'
                        : 'This conference clashes with'}{' '}
                      <strong>{conflictWith}</strong>.{' '}
                      {he
                        ? 'כדי להירשם, בטלו קודם את ההרשמה החופפת באזור האישי.'
                        : 'To register, first cancel the overlapping registration in your space.'}
                    </>
                  ) : error === 'weakPassword' ? (
                    he
                      ? `הסיסמה חלשה מדי. ${PASSWORD_POLICY_TEXT.he}`
                      : `Password too weak. ${PASSWORD_POLICY_TEXT.en}`
                  ) : (
                    m.public.closed[lang]
                  )}
                </p>
              ) : null}

              <button type="submit" className={`${xPrimary} mt-1`}>
                {m.public.submit[lang]}
              </button>
            </form>
          ) : null}

          {/* Aside — live state, capacity, what you get */}
          <aside
            className={`${open ? 'order-1 lg:order-2' : ''} flex flex-col gap-4 lg:sticky lg:top-24`}
          >
            <div className={`${cardCls} p-6`}>
              <span
                className={`inline-flex items-center gap-1.5 rounded-[var(--x-r-pill)] px-3 py-1 text-xs font-semibold ${
                  STATE_TONE[situation.state] ?? STATE_TONE.closed
                }`}
              >
                <span
                  aria-hidden="true"
                  className="inline-block size-1.5 rounded-full bg-current"
                />
                {PUBLIC_STATE_LABELS[situation.state][lang]}
              </span>

              {showBar ? (
                <div className="mt-5">
                  <div className="flex items-baseline justify-between">
                    <span className="font-display text-2xl font-extrabold tabular-nums text-[var(--x-ink)]">
                      {cap.available ?? 0}
                    </span>
                    <span className="text-xs text-[var(--x-faint)]">
                      {he ? 'מקומות פנויים' : 'places left'}
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--x-raise)]">
                    <div
                      className="h-full rounded-full bg-[var(--x-primary)] transition-[width] duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-[var(--x-faint)]">
                    {he
                      ? `${cap.confirmed} מתוך ${cap.limit} כבר נרשמו`
                      : `${cap.confirmed} of ${cap.limit} already registered`}
                  </p>
                </div>
              ) : null}

              {open ? (
                <ul className="mt-5 flex flex-col gap-2.5 border-t border-[var(--x-line)] pt-5">
                  {perks.map((perk) => (
                    <li
                      key={perk.en}
                      className="flex items-center gap-2.5 text-sm text-[var(--x-soft)]"
                    >
                      <span
                        aria-hidden="true"
                        className="grid size-5 flex-none place-items-center rounded-full bg-[var(--x-ok-wash)] text-[11px] font-bold text-[var(--x-ok)]"
                      >
                        ✓
                      </span>
                      {perk[lang]}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            {/* Returning guest sign-in */}
            <div className={`${cardCls} p-6`}>
              <p className="text-sm font-semibold text-[var(--x-ink)]">
                {he ? 'כבר יש לך חשבון?' : 'Already have an account?'}
              </p>
              <p className="mt-1 text-sm text-[var(--x-soft)]">
                {he
                  ? 'התחברו עם האימייל והסיסמה שלכם.'
                  : 'Sign in with your email and password.'}
              </p>
              <form
                action={passwordSignInAction}
                className="mt-4 flex flex-col gap-3"
              >
                <input type="hidden" name="slug" value={slug} />
                <input type="hidden" name="locale" value={lang} />
                <label>
                  <span className={xLabel}>{m.public.email[lang]}</span>
                  <input
                    type="email"
                    name="email"
                    required
                    autoComplete="email"
                    className={xField}
                  />
                </label>
                <label>
                  <span className={xLabel}>{he ? 'סיסמה' : 'Password'}</span>
                  <input
                    type="password"
                    name="password"
                    required
                    autoComplete="current-password"
                    className={xField}
                  />
                </label>
                {signinError ? (
                  <p className="rounded-2xl border border-[var(--x-warn)]/30 bg-[var(--x-warn-wash)] px-3 py-2 text-xs text-[var(--x-warn)]">
                    {signinError === 'wrong'
                      ? he
                        ? 'אימייל או סיסמה שגויים.'
                        : 'Wrong email or password.'
                      : signinError === 'locked'
                        ? he
                          ? 'יותר מדי ניסיונות. נסו שוב מאוחר יותר.'
                          : 'Too many attempts. Try again later.'
                        : signinError === 'noPassword'
                          ? he
                            ? 'לחשבון הזה אין עדיין סיסמה — הירשמו כדי ליצור אחת.'
                            : 'This account has no password yet — register to create one.'
                          : he
                            ? 'לא הצלחנו להתחבר. בדקו את הפרטים.'
                            : 'Could not sign in. Check your details.'}
                  </p>
                ) : null}
                <button type="submit" className={xGhost}>
                  {he ? 'התחברות' : 'Sign in'}
                </button>
              </form>
            </div>
          </aside>
        </div>
      </main>
    </Shell>
  );
};

export default RegisterPage;
