import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { brandFor } from '@/config/brand';
import { isSupportedLocale, type Locale } from '@/config/locales';
import { ACCOUNT_UI } from '@/features/account';
import { ConferenceBar } from '@/features/conference';
import { visibleSiteConference } from '@/features/conference/services/conference-door';
import { getSiteBrand } from '@/features/events';
import {
  ArrowOn,
  OnboardingLayout,
  PASSWORD_POLICY_TEXT,
  PromoPanel,
  onboardingCls,
  passwordResetLink,
} from '@/features/registration';
import { PasswordField } from '@/features/registration/components';
import { setNewPasswordAction } from '../actions';
import SubmitButton from './submit-button';

/*
 * Choosing a new password, from the reset link.
 *
 * The mailed link used to sign the person straight in and leave them to
 * find the password form on their profile — so many never did, and were
 * back at "forgot password" the next time. The link now opens this page
 * and nothing else: the new password, typed twice, and for an account
 * with an authenticator its six digits. Reading the page does not spend
 * the link; saving does.
 */
interface NewPasswordPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string; state?: string }>;
}

/* The token rides in the address: it is never sent on to another site. */
export const metadata: Metadata = {
  referrer: 'no-referrer',
  robots: { index: false, follow: false },
};

const COPY = {
  eyebrow: { he: 'איפוס סיסמה', en: 'Password reset' },
  title: { he: 'בחירת סיסמה חדשה', en: 'Choose a new password' },
  intro: {
    he: 'בחרו סיסמה חדשה לחשבון והקלידו אותה פעמיים. אחרי השמירה תיכנסו ישר לאזור האישי.',
    en: 'Choose a new password for your account and type it twice. Once it is saved, you go straight to your space.',
  },
  password: { he: 'סיסמה חדשה', en: 'New password' },
  confirm: { he: 'אימות הסיסמה החדשה', en: 'Confirm the new password' },
  code: { he: 'קוד מאפליקציית האימות (6 ספרות)', en: 'Code from your authenticator app (6 digits)' },
  save: { he: 'שמירת הסיסמה וכניסה', en: 'Save the password and sign in' },
  saving: { he: 'שומרים…', en: 'Saving…' },
  mismatch: { he: 'שתי הסיסמאות אינן זהות. הקלידו את אותה סיסמה בשני השדות.', en: 'The two passwords do not match. Type the same password in both fields.' },
  totpWrong: { he: 'הקוד מאפליקציית האימות לא נכון או שפג תוקפו. נסו את הקוד הנוכחי.', en: 'The authenticator code is wrong or expired. Try the current code.' },
  deadTitle: { he: 'הקישור כבר לא בתוקף', en: 'This link no longer works' },
  deadIntro: {
    he: 'קישור לאיפוס סיסמה תקף ל-15 דקות וניתן לשימוש פעם אחת. אפשר לבקש קישור חדש — זה לוקח רגע.',
    en: 'A reset link is valid for 15 minutes and can be used once. You can ask for a new one — it takes a moment.',
  },
  newLink: { he: 'לשלוח לי קישור חדש', en: 'Send me a new link' },
  backToSignIn: { he: 'חזרה לכניסה', en: 'Back to sign in' },
  aside: {
    he: 'הסיסמה החדשה מחליפה את הקודמת מיד, וכל מכשיר אחר שהיה מחובר לחשבון יתנתק.',
    en: 'The new password replaces the old one at once, and every other device signed in to the account is signed out.',
  },
} as const;

const pick = (locale: Locale, entry: { he: string; en: string }): string => entry[locale];

const noteFor = (state: string | undefined, locale: Locale): string | null => {
  switch (state) {
    case 'mismatch':
      return pick(locale, COPY.mismatch);
    case 'weakPassword':
      return `${ACCOUNT_UI.weakPassword[locale]} ${PASSWORD_POLICY_TEXT[locale]}`;
    case 'totpWrong':
      return pick(locale, COPY.totpWrong);
    case 'locked':
      return ACCOUNT_UI.signInLocked[locale];
    default:
      return null;
  }
};

const NewPasswordPage = async ({ params, searchParams }: NewPasswordPageProps) => {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) {
    notFound();
  }
  setRequestLocale(locale);
  const { token = '', state } = await searchParams;
  const [link, siteLogo, openSlug] = await Promise.all([
    passwordResetLink(token),
    getSiteBrand(),
    visibleSiteConference(locale).catch(() => null),
  ]);
  const other: Locale = locale === 'he' ? 'en' : 'he';
  const switchHref = `/${other}/me/new-password?token=${encodeURIComponent(token)}`;
  const bar = (
    <ConferenceBar locale={locale} slug={openSlug} viewer={null} brand={brandFor(locale)} brandLogo={siteLogo.onLight} />
  );
  const aside = (
    <PromoPanel locale={locale}>
      <p className="text-[13px] leading-relaxed text-[var(--x-soft)]">{pick(locale, COPY.aside)}</p>
    </PromoPanel>
  );

  /* Spent, expired, or never ours: say so, and offer the way to a new one. */
  if (!link.ok) {
    return (
      <OnboardingLayout
        locale={locale}
        bar={bar}
        switchHref={switchHref}
        brandLogo={siteLogo.onLight}
        eyebrow={pick(locale, COPY.eyebrow)}
        title={pick(locale, COPY.deadTitle)}
        intro={pick(locale, COPY.deadIntro)}
        aside={aside}
      >
        <section className={`${onboardingCls.card} p-6 md:p-9`}>
          <div className="mx-auto flex max-w-md flex-col gap-3 sm:flex-row sm:justify-center">
            <Link href={`/${locale}/me?view=reset`} className={onboardingCls.primary}>
              {pick(locale, COPY.newLink)}
              <ArrowOn className="size-4" />
            </Link>
            <Link href={`/${locale}/me`} className={onboardingCls.ghost}>
              {pick(locale, COPY.backToSignIn)}
            </Link>
          </div>
        </section>
      </OnboardingLayout>
    );
  }

  const note = noteFor(state, locale);
  return (
    <OnboardingLayout
      locale={locale}
      bar={bar}
      switchHref={switchHref}
      brandLogo={siteLogo.onLight}
      eyebrow={pick(locale, COPY.eyebrow)}
      title={pick(locale, COPY.title)}
      intro={pick(locale, COPY.intro)}
      aside={aside}
    >
      <section className={`${onboardingCls.card} p-6 md:p-9`}>
        <form action={setNewPasswordAction} className="mx-auto flex max-w-md flex-col gap-5">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="token" value={token} />
          <div>
            <label htmlFor="new-password" className={onboardingCls.label}>
              {pick(locale, COPY.password)}
            </label>
            <PasswordField
              locale={locale}
              id="new-password"
              name="password"
              required
              minLength={8}
              autoComplete="new-password"
              autoFocus
              aria-invalid={state === 'weakPassword'}
              aria-describedby="new-password-policy"
              className={onboardingCls.field}
            />
            <p id="new-password-policy" className="mt-1.5 text-xs text-[var(--x-faint)]">
              {PASSWORD_POLICY_TEXT[locale]}
            </p>
          </div>
          <div>
            <label htmlFor="new-password-confirm" className={onboardingCls.label}>
              {pick(locale, COPY.confirm)}
            </label>
            <PasswordField
              locale={locale}
              id="new-password-confirm"
              name="passwordConfirm"
              required
              autoComplete="new-password"
              aria-invalid={state === 'mismatch'}
              className={onboardingCls.field}
            />
          </div>
          {link.totp ? (
            <div>
              <label htmlFor="new-password-code" className={onboardingCls.label}>
                {pick(locale, COPY.code)}
              </label>
              <input
                id="new-password-code"
                name="code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]*"
                maxLength={6}
                required
                dir="ltr"
                aria-invalid={state === 'totpWrong'}
                className={`${onboardingCls.field} text-center font-display text-xl font-semibold tabular-nums tracking-[0.4em]`}
              />
            </div>
          ) : null}
          {note ? (
            <p role="alert" className={onboardingCls.noteWarn}>
              {note}
            </p>
          ) : null}
          <SubmitButton className={`${onboardingCls.primary} w-full`} pendingLabel={pick(locale, COPY.saving)}>
            {pick(locale, COPY.save)}
            <ArrowOn className="size-4" />
          </SubmitButton>
        </form>
      </section>
    </OnboardingLayout>
  );
};

export const dynamic = 'force-dynamic';

export default NewPasswordPage;
