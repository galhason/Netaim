import Link from 'next/link';
import type { Locale } from '@/config/locales';
import { ACCOUNT_UI } from '@/features/account';
import {
  ArrowOn,
  OnboardingLayout,
  onboardingCls,
  PASSWORD_POLICY_TEXT,
  PromoPanel,
} from '@/features/registration';
import {
  requestAccountLinkAction,
  signInAction,
  totpSignInAction,
} from './actions';

/*
 * The door, for someone who already has a key.
 *
 * This is the registration page seen from the other side: the same
 * frame, the same heading column, the same promise of the platform
 * beside the card — because a person who registered last week and a
 * person registering now are looking at the same place. The card holds
 * one of three tasks: the sign-in itself, recovery when the password
 * is gone, or the second factor when the account asks for one.
 *
 * Nothing behind the card changed. The three forms post to the same
 * three actions with the same field names, and every outcome those
 * actions can announce through `?state=` is still spoken here.
 */

interface SignInScreenProps {
  locale: Locale;
  view?: string;
  state?: string;
  ticket?: string;
  totpError?: string;
  link?: string;
  detail?: string;
  /* Where an account is made: the live conference's form. Null when none is live. */
  registerHref: string | null;
  /* This same screen in the other language, with the moment carried along. */
  switchHref: string;
}

const COPY = {
  eyebrow: { he: 'התחברות', en: 'Sign in' },
  resetEyebrow: { he: 'שחזור גישה', en: 'Account recovery' },
  resetTitle: { he: 'שכחתם את הסיסמה?', en: 'Forgot your password?' },
  resetIntro: {
    he: 'הזינו את כתובת הדוא״ל שאיתה נרשמתם, ונשלח אליה קישור כניסה חד־פעמי. אחרי הכניסה אפשר לקבוע סיסמה חדשה בעמוד הפרופיל.',
    en: 'Enter the email address you registered with and we will send a one-time sign-in link. Once you are in, you can set a new password on your profile page.',
  },
  resetHint: {
    he: 'הקישור תקף ל-15 דקות וניתן לשימוש פעם אחת.',
    en: 'The link is valid for 15 minutes and can be used once.',
  },
  sentTitle: { he: 'הקישור בדרך אליכם', en: 'The link is on its way' },
  sentBody: {
    he: 'אם הכתובת רשומה אצלנו, נשלח אליה כעת קישור כניסה. הקישור תקף ל-15 דקות וניתן לשימוש פעם אחת בלבד.',
    en: 'If that address is registered with us, a sign-in link is on its way to it. The link is valid for 15 minutes and can be used once.',
  },
  sentSpam: {
    he: 'ההודעה לא מופיעה? בדקו גם בתיקיית הספאם או בקידומי מכירות — היא נשלחת מהכתובת noreply@netaim26.org.',
    en: 'Not there? Check your spam or promotions folder — the message is sent from noreply@netaim26.org.',
  },
  sentRetry: { he: 'לשלוח לכתובת אחרת', en: 'Send to a different address' },
  totpEyebrow: { he: 'אימות דו-שלבי', en: 'Two-factor check' },
  totpTitle: { he: 'עוד צעד אחד', en: 'One more step' },
  noAccount: { he: 'עוד לא נרשמתם?', en: 'Not registered yet?' },
  register: { he: 'להרשמה לכנס', en: 'Register for the conference' },
  registerBody: {
    he: 'החשבון נוצר בהרשמה לכנס — כמה פרטים, אימות במייל, וזהו.',
    en: 'An account is made by registering for the conference — a few details, an email check, done.',
  },
  backToSignIn: { he: 'חזרה לכניסה', en: 'Back to sign in' },
  emailPlaceholder: { he: 'name@example.com', en: 'name@example.com' },
  passwordHint: { he: 'הסיסמה שקבעתם בהרשמה.', en: 'The password you set when registering.' },
  failed: { he: 'הכניסה נכשלה מסיבה טכנית.', en: 'Sign-in failed for a technical reason.' },
  invalidEmail: { he: 'הזינו כתובת אימייל.', en: 'Enter an email address.' },
} as const;

const pick = (lang: Locale, entry: { he: string; en: string }): string =>
  lang === 'he' ? entry.he : entry.en;

/*
 * What each `?state=` says. One table instead of eleven conditionals,
 * and a place to notice that `invalid` (an empty recovery address) had
 * no words at all before.
 */
const noteFor = (
  state: string | undefined,
  locale: Locale,
): { tone: 'warn' | 'ok'; text: string } | null => {
  const ui = ACCOUNT_UI;
  switch (state) {
    case 'wrong':
      return { tone: 'warn', text: ui.wrongCredentials[locale] };
    case 'blocked':
      return { tone: 'warn', text: ui.accountBlocked[locale] };
    case 'noPassword':
      return { tone: 'warn', text: ui.noPasswordYet[locale] };
    case 'locked':
      return { tone: 'warn', text: ui.signInLocked[locale] };
    case 'exists':
      return { tone: 'warn', text: ui.accountExists[locale] };
    case 'weakPassword':
      return {
        tone: 'warn',
        text: `${ui.weakPassword[locale]} ${PASSWORD_POLICY_TEXT[locale]}`,
      };
    case 'missing':
      return { tone: 'warn', text: ui.missingFields[locale] };
    case 'invalid':
      return { tone: 'warn', text: pick(locale, COPY.invalidEmail) };
    case 'needName':
      return { tone: 'warn', text: ui.needName[locale] };
    case 'tooMany':
      return { tone: 'warn', text: ui.tooManyLinks[locale] };
    case 'sent':
      return { tone: 'ok', text: ui.linkSent[locale] };
    case 'failed':
      return { tone: 'warn', text: pick(locale, COPY.failed) };
    default:
      return null;
  }
};

const Note = ({
  tone,
  children,
}: {
  tone: 'warn' | 'ok';
  children: React.ReactNode;
}) => (
  <p
    role={tone === 'ok' ? 'status' : 'alert'}
    className={tone === 'ok' ? onboardingCls.noteOk : onboardingCls.noteWarn}
  >
    {children}
  </p>
);

const SignInScreen = ({
  locale,
  view,
  state,
  ticket,
  totpError,
  link,
  detail,
  registerHref,
  switchHref,
}: SignInScreenProps) => {
  const ui = ACCOUNT_UI;
  const note = noteFor(state, locale);
  const totp = state === 'totp' && Boolean(ticket);
  const reset = !totp && view === 'reset';

  const aside = (
    <PromoPanel locale={locale}>
      {registerHref ? (
        <>
          <p className="text-[15px] font-semibold text-[var(--x-ink)]">
            {pick(locale, COPY.noAccount)}
          </p>
          <p className="mt-1 text-[13px] leading-relaxed text-[var(--x-soft)]">
            {pick(locale, COPY.registerBody)}
          </p>
          <Link
            href={registerHref}
            className={`${onboardingCls.ghost} mt-4 w-full`}
          >
            {pick(locale, COPY.register)}
            <ArrowOn className="size-4" />
          </Link>
        </>
      ) : (
        <p className="text-[13px] leading-relaxed text-[var(--x-soft)]">
          {pick(locale, COPY.registerBody)}
        </p>
      )}
    </PromoPanel>
  );

  /* ---- the second factor ---- */
  if (totp) {
    return (
      <OnboardingLayout
        locale={locale}
        switchHref={switchHref}
        eyebrow={pick(locale, COPY.totpEyebrow)}
        title={pick(locale, COPY.totpTitle)}
        intro={ui.totpIntro[locale]}
        aside={aside}
      >
        <section className={`${onboardingCls.card} p-6 md:p-9`}>
          <form action={totpSignInAction} className="mx-auto flex max-w-md flex-col gap-5">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="ticket" value={ticket} />
            <div>
              <label htmlFor="totp-code" className={onboardingCls.label}>
                {ui.totpCodeLabel[locale]}
              </label>
              <input
                id="totp-code"
                name="code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]*"
                maxLength={6}
                required
                autoFocus
                dir="ltr"
                aria-invalid={totpError === 'wrong'}
                aria-describedby={totpError === 'wrong' ? 'totp-error' : undefined}
                className={`${onboardingCls.field} text-center font-display text-2xl font-semibold tabular-nums tracking-[0.5em]`}
              />
            </div>
            {totpError === 'wrong' ? (
              <p id="totp-error" role="alert" className={onboardingCls.noteWarn}>
                {ui.totpWrong[locale]}
              </p>
            ) : null}
            <button type="submit" className={`${onboardingCls.primary} w-full`}>
              {ui.totpSubmit[locale]}
            </button>
            <p className="text-center text-xs">
              <Link href={`/${locale}/me`} className={`${onboardingCls.quietLink} text-[var(--x-soft)]`}>
                {pick(locale, COPY.backToSignIn)}
              </Link>
            </p>
          </form>
        </section>
      </OnboardingLayout>
    );
  }

  /* ---- recovery ---- */
  if (reset) {
    /*
     * Two screens in one route: the form, and what happens after it.
     *
     * The answer is deliberately the same whether or not the address
     * has an account — saying "no such account" would turn this box
     * into a way to ask the platform who is registered. So the screen
     * after sending does not claim a mail was sent to *you*; it says
     * what is true, and then spends its words on what actually helps:
     * how long the link lives, and where it hides.
     */
    if (state === 'sent') {
      return (
        <OnboardingLayout
          locale={locale}
          switchHref={switchHref}
          eyebrow={pick(locale, COPY.resetEyebrow)}
          title={pick(locale, COPY.sentTitle)}
          intro={pick(locale, COPY.sentBody)}
          aside={aside}
        >
          <section className={`${onboardingCls.card} p-6 md:p-9`}>
            <div className="mx-auto flex max-w-md flex-col items-center text-center">
              <span className="grid size-16 place-items-center rounded-full bg-[var(--x-ok-wash)] text-[var(--x-ok)]">
                <svg viewBox="0 0 24 24" aria-hidden="true" className="size-7" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="5.5" width="18" height="13" rx="2.5" />
                  <path d="m3.6 7 7.3 5.3a2 2 0 0 0 2.2 0L20.4 7" />
                </svg>
              </span>
              <p className="mt-5 text-[15px] leading-relaxed text-[var(--x-soft)]">
                {pick(locale, COPY.sentSpam)}
              </p>
              <div className="mt-7 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:justify-center">
                <Link href={`/${locale}/me`} className={onboardingCls.primary}>
                  {pick(locale, COPY.backToSignIn)}
                </Link>
                <Link href={`/${locale}/me?view=reset`} className={onboardingCls.ghost}>
                  {pick(locale, COPY.sentRetry)}
                </Link>
              </div>
            </div>
            {link ? <DevLink locale={locale} link={link} /> : null}
          </section>
        </OnboardingLayout>
      );
    }

    return (
      <OnboardingLayout
        locale={locale}
        switchHref={switchHref}
        eyebrow={pick(locale, COPY.resetEyebrow)}
        title={pick(locale, COPY.resetTitle)}
        intro={pick(locale, COPY.resetIntro)}
        aside={aside}
      >
        <section className={`${onboardingCls.card} p-6 md:p-9`}>
          <form action={requestAccountLinkAction} className="flex flex-col gap-5">
            <input type="hidden" name="locale" value={locale} />
            <div>
              <label htmlFor="reset-email" className={onboardingCls.label}>
                {ui.emailLabel[locale]}
              </label>
              <input
                id="reset-email"
                type="email"
                name="email"
                required
                autoComplete="email"
                autoFocus
                dir="ltr"
                placeholder={pick(locale, COPY.emailPlaceholder)}
                aria-describedby="reset-hint"
                className={`${onboardingCls.field} text-start`}
              />
              <p id="reset-hint" className="mt-1.5 text-xs text-[var(--x-faint)]">
                {pick(locale, COPY.resetHint)}
              </p>
            </div>
            {note ? <Note tone={note.tone}>{note.text}</Note> : null}
            <button type="submit" className={`${onboardingCls.primary} w-full`}>
              {ui.sendLink[locale]}
            </button>
          </form>
          <p className="mt-6 border-t border-[var(--x-line)] pt-5 text-sm text-[var(--x-soft)]">
            <Link href={`/${locale}/me`} className={onboardingCls.strongLink}>
              {ui.haveAccount[locale]}
              <ArrowOn />
            </Link>
          </p>
          {link ? <DevLink locale={locale} link={link} /> : null}
        </section>
      </OnboardingLayout>
    );
  }

  /* ---- sign in ---- */
  return (
    <OnboardingLayout
      locale={locale}
      switchHref={switchHref}
      eyebrow={pick(locale, COPY.eyebrow)}
      title={ui.signInTitle[locale]}
      intro={ui.signInIntro[locale]}
      aside={aside}
    >
      <section className={`${onboardingCls.card} p-6 md:p-9`}>
        {/*
          * The way to register, one line above the form and subordinate
          * to it — the mirror of the sign-in line on the registration
          * page. A newcomer who landed here finds it; a returning guest
          * is not distracted by a second card. On a wide screen the
          * panel beside the form says the same thing with a button, so
          * the line steps aside there rather than say it twice.
          */}
        {registerHref ? (
          <p className="mb-6 flex flex-wrap items-center justify-end gap-x-3 gap-y-1 text-sm text-[var(--x-soft)] lg:hidden">
            <span>{pick(locale, COPY.noAccount)}</span>
            <Link href={registerHref} className={onboardingCls.strongLink}>
              {pick(locale, COPY.register)}
              <ArrowOn />
            </Link>
          </p>
        ) : null}

        <form action={signInAction} className="flex flex-col gap-5">
          <input type="hidden" name="locale" value={locale} />
          <div>
            <label htmlFor="signin-email" className={onboardingCls.label}>
              {ui.emailLabel[locale]}
            </label>
            <input
              id="signin-email"
              type="email"
              name="email"
              required
              autoComplete="email"
              autoFocus
              dir="ltr"
              placeholder={pick(locale, COPY.emailPlaceholder)}
              aria-invalid={state === 'wrong'}
              className={`${onboardingCls.field} text-start`}
            />
          </div>
          <div>
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <label htmlFor="signin-password" className="block text-sm font-medium text-[var(--x-ink)]">
                {ui.passwordLabel[locale]}
              </label>
              <Link
                href={`/${locale}/me?view=reset`}
                className={`${onboardingCls.quietLink} text-xs text-[var(--x-soft)]`}
              >
                {ui.forgotPassword[locale]}
              </Link>
            </div>
            <input
              id="signin-password"
              type="password"
              name="password"
              required
              autoComplete="current-password"
              aria-invalid={state === 'wrong'}
              aria-describedby="signin-password-hint"
              className={onboardingCls.field}
            />
            <p id="signin-password-hint" className="mt-1.5 text-xs text-[var(--x-faint)]">
              {pick(locale, COPY.passwordHint)}
            </p>
          </div>

          {note ? (
            <Note tone={note.tone}>
              {note.text}
              {state === 'failed' && detail ? (
                <span className="mt-2 block break-all text-xs opacity-80" dir="ltr">
                  {detail}
                </span>
              ) : null}
            </Note>
          ) : null}

          <button type="submit" className={`${onboardingCls.primary} w-full`}>
            {ui.signIn[locale]}
            <ArrowOn className="size-4" />
          </button>
        </form>

        {link ? <DevLink locale={locale} link={link} /> : null}
      </section>
    </OnboardingLayout>
  );
};

/* Development only: the link that would have been mailed. */
const DevLink = ({ locale, link }: { locale: Locale; link: string }) => (
  <p className="mt-5 rounded-[var(--x-r-field)] border border-dashed border-[var(--x-line-strong)] px-4 py-3 text-xs text-[var(--x-soft)]">
    {ACCOUNT_UI.devLink[locale]}{' '}
    <a href={link} className="break-all text-[var(--x-primary)] underline underline-offset-4" dir="ltr">
      {link}
    </a>
  </p>
);

export default SignInScreen;
