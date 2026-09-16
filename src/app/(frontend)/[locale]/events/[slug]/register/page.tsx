import type { ReactNode } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { isSupportedLocale, type Locale } from '@/config/locales';
import { getSiteBrand } from '@/features/events';
import {
  ArrowOn,
  currentParticipant,
  getRegistrationSituation,
  dietaryOptionsFor,
  OnboardingLayout,
  onboardingCls,
  PASSWORD_POLICY_TEXT,
  pickCopy,
  PromoPanel,
  PUBLIC_STATE_LABELS,
  REGISTRATION_MESSAGES,
} from '@/features/registration';
import RegisterForm from './register-form';
import VerifyForm from './verify-form';
import StepProgress from './ui/step-progress';

interface RegisterPageProps {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{
    outcome?: string;
    error?: string;
    with?: string;
    /* The address awaiting its code — the second half of registration. */
    verify?: string;
    resent?: string;
    undelivered?: string;
    devCode?: string;
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

const STATE_TONE: Record<string, string> = {
  open: 'bg-[var(--x-ok-wash)] text-[var(--x-ok)]',
  limited: 'bg-[var(--x-warn-wash)] text-[var(--x-warn)]',
  waitlist: 'bg-[var(--x-wait-wash)] text-[var(--x-wait)]',
  closed: 'bg-[#f0f1f4] text-[var(--x-soft)]',
};

const { card: cardCls, primary: primaryCls, ghost: ghostCls } = onboardingCls;

/*
 * The page's own copy. Registration is one screen in the site's voice,
 * so the words live here beside the markup rather than in the shared
 * message table, which holds what the notifications and the form's
 * field names say.
 */
const COPY = {
  eyebrow: { he: 'הרשמה', en: 'Registration' },
  haveAccount: { he: 'כבר יש לך חשבון?', en: 'Already have an account?' },
  signIn: { he: 'התחברות', en: 'Sign in' },
  forgot: { he: 'שכחתי סיסמה', en: 'Forgot your password?' },
  communityLine: { he: 'נטעים מקשרת בין אנשים וארגונים', en: 'Netaim connects people and organisations' },
  registered: { he: 'משתמשים כבר נרשמו לכנס', en: 'people have already registered' },
  registeredOne: { he: 'משתמש כבר נרשם לכנס', en: 'person has already registered' },
  verifyEyebrow: { he: 'שלב 3 מתוך 3', en: 'Step 3 of 3' },
  doneEyebrow: { he: 'ההרשמה הושלמה', en: 'Registration complete' },
} as const;

const pick = pickCopy;

const IconCheck = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="size-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);

/* ---------- the community line: who is already here ---------- */

/*
 * Not the capacity. A count of free places and a progress bar read as
 * pressure — "hurry" — and the person filling in a form does not need
 * to be hurried. What they may want to know is that others are here:
 * the platform's one-line promise, and how many have already signed
 * up for this conference. The number is real; when nobody has yet,
 * the line stands alone rather than announce a zero.
 */
const CommunityStrip = ({
  locale,
  registered,
}: {
  locale: Locale;
  registered: number;
}) => (
  <>
    <p className="text-[15px] font-semibold text-[var(--x-ink)]">
      {pick(locale, COPY.communityLine)}
    </p>
    {registered > 0 ? (
      <p className="mt-2 flex items-baseline gap-2">
        <span className="font-display text-2xl font-extrabold tabular-nums text-[var(--x-primary)]">
          {registered.toLocaleString(locale === 'he' ? 'he-IL' : 'en-GB')}
        </span>
        <span className="text-sm text-[var(--x-soft)]">
          {registered === 1 ? pick(locale, COPY.registeredOne) : pick(locale, COPY.registered)}
        </span>
      </p>
    ) : null}
  </>
);

/* ---------- the page ---------- */

const RegisterPage = async ({ params, searchParams }: RegisterPageProps) => {
  const { locale, slug } = await params;
  if (!isSupportedLocale(locale)) {
    notFound();
  }
  setRequestLocale(locale);
  const lang = locale as Locale;
  const he = lang === 'he';

  const {
    outcome,
    error,
    with: conflictWith,
    verify,
    resent,
    undelivered,
    devCode,
  } = await searchParams;
  const situation = await getRegistrationSituation(slug, lang);
  const participant = await currentParticipant().catch(() => null);
  const m = REGISTRATION_MESSAGES;
  const open =
    situation.settings &&
    (OPEN_STATES as readonly string[]).includes(situation.state);
  /*
   * The same screen in the other language, with the step carried along:
   * a person waiting for a code who switches language stays on the code
   * screen, not back at an empty form.
   */
  const other: Locale = lang === 'he' ? 'en' : 'he';
  const carried = new URLSearchParams();
  for (const [key, value] of Object.entries({
    outcome,
    error,
    with: conflictWith,
    verify,
    resent,
    undelivered,
    devCode,
  })) {
    if (value) carried.set(key, value);
  }
  const query = carried.toString();
  const switchHref = `/${other}/events/${slug}/register${query ? `?${query}` : ''}`;

  const logo = await getSiteBrand();
  const stateLabel = PUBLIC_STATE_LABELS[situation.state][lang];
  const stateTone: string = STATE_TONE[situation.state] ?? STATE_TONE.closed ?? '';

  /*
   * The layout every state shares: a heading column and a supporting
   * column, form-side first in document order so it leads in both
   * reading directions and sits alone at the top on a phone.
   */
  const Layout = ({
    eyebrow,
    title,
    intro,
    children,
  }: {
    eyebrow: string;
    title: string;
    intro: string;
    children: ReactNode;
  }) => (
    <OnboardingLayout
      locale={lang}
      switchHref={switchHref}
      brandLogo={logo.onLight}
      eyebrow={eyebrow}
      title={title}
      intro={intro}
      aside={
        <PromoPanel locale={lang}>
          <CommunityStrip
            locale={lang}
            registered={situation.capacity?.confirmed ?? 0}
          />
        </PromoPanel>
      }
    >
      {children}
    </OnboardingLayout>
  );

  /* ---- done ---- */
  if (outcome && isOutcome(outcome)) {
    return (
      <Layout
        eyebrow={pick(lang, COPY.doneEyebrow)}
        title={m.public.heading[lang]}
        intro={m.public.intro[lang]}
      >
        <section className={`${cardCls} p-7 md:p-10`}>
          <StepProgress locale={lang} current={4} />
          <div className="mt-10 flex flex-col items-center text-center">
            <span className="grid size-16 place-items-center rounded-full bg-[var(--x-ok-wash)] text-[var(--x-ok)]">
              <IconCheck />
            </span>
            <h2 className="mt-5 font-display text-2xl font-bold text-[var(--x-ink)]">
              {OUTCOME_COPY[outcome].heading[lang]}
            </h2>
            <p className="mt-2 max-w-md text-[15px] leading-relaxed text-[var(--x-soft)]">
              {OUTCOME_COPY[outcome].text[lang]}
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Link href={`/${lang}/events/${slug}/workshops`} className={primaryCls}>
                {m.toWorkshops[lang]}
              </Link>
              <Link href={`/${lang}/me`} className={ghostCls}>
                {m.toPersonalArea[lang]}
              </Link>
            </div>
          </div>
        </section>
      </Layout>
    );
  }

  /* ---- step three: the address answers ---- */
  if (verify && open) {
    return (
      <Layout
        eyebrow={pick(lang, COPY.verifyEyebrow)}
        title={m.public.heading[lang]}
        intro={m.public.intro[lang]}
      >
        <section className={`${cardCls} p-6 md:p-9`}>
          <StepProgress locale={lang} current={3} />
          <div className="mx-auto mt-9 max-w-md">
            <VerifyForm
              locale={lang}
              slug={slug}
              email={verify}
              error={error ?? undefined}
              resent={Boolean(resent)}
              undelivered={Boolean(undelivered)}
              devCode={devCode}
              labels={{
                title: he ? 'אימות כתובת האימייל' : 'Verify your email',
                sentTo: he ? 'שלחנו קוד בן 6 ספרות אל' : 'We sent a 6-digit code to',
                validFor: he
                  ? 'הקוד תקף ל-15 דקות. ההרשמה תושלם רק אחרי שתזינו אותו.'
                  : 'It is valid for 15 minutes. Registration completes once you enter it.',
                codeLabel: he ? 'קוד האימות' : 'Verification code',
                digit: he ? 'ספרה' : 'Digit',
                submit: he ? 'אימות וסיום ההרשמה' : 'Verify and finish',
                submitting: he ? 'מאמתים…' : 'Verifying…',
                resendTitle: he ? 'הקוד לא הגיע?' : "Code didn't arrive?",
                resendHint: he
                  ? 'בדקו גם בתיקיית הספאם. אם יש טעות בכתובת — תקנו אותה כאן, והפרטים שכבר מילאתם יישמרו.'
                  : 'Check your spam folder too. If the address is wrong, correct it here — the details you already filled in are kept.',
                resend: he ? 'שלחו קוד מחדש' : 'Send a new code',
                resendIn: he ? 'שליחה חוזרת בעוד' : 'Resend in',
                addressLabel: he ? 'כתובת המייל' : 'Email address',
                startOver: he ? 'התחלה מחדש' : 'Start over',
                resent: he ? 'שלחנו קוד חדש.' : 'A new code is on its way.',
                undelivered: he
                  ? 'לא הצלחנו לאשר שההודעה נשלחה. אם הקוד לא מגיע תוך דקה, נסו לשלוח שוב.'
                  : 'We could not confirm the message went out. If nothing arrives within a minute, send it again.',
                devCode: he ? 'סביבת פיתוח — הקוד הוא' : 'Development only — the code is',
                errors: {
                  wrong: he
                    ? 'הקוד שגוי. בדקו שוב את ההודעה — יש לכם עוד ניסיונות.'
                    : 'That code is wrong. Check the message again — you have more tries.',
                  tooMany: he
                    ? 'יותר מדי ניסיונות. נסו שוב בעוד שעה, או התחילו מחדש.'
                    : 'Too many attempts. Try again in an hour, or start over.',
                },
              }}
            />
          </div>
        </section>
      </Layout>
    );
  }

  /* ---- steps one and two ---- */
  return (
    <Layout
      eyebrow={pick(lang, COPY.eyebrow)}
      title={m.public.heading[lang]}
      intro={open ? m.public.intro[lang] : stateLabel}
    >
      <section className={`${cardCls} p-6 md:p-9`}>
        {open ? (
          <>
            {/*
              * Sign-in belongs to /me, where it already lives. Here it
              * is one line, above the form and subordinate to it — a
              * returning guest finds it, a new one is not distracted by
              * a second card of fields.
              */}
            <p className="mb-6 flex flex-wrap items-center justify-end gap-x-3 gap-y-1 text-sm text-[var(--x-soft)]">
              <span>{pick(lang, COPY.haveAccount)}</span>
              <Link
                href={`/${lang}/me`}
                className="inline-flex items-center gap-1 font-semibold text-[var(--x-primary)] underline-offset-4 hover:underline"
              >
                {pick(lang, COPY.signIn)}
                <ArrowOn />
              </Link>
              <span aria-hidden="true" className="text-[var(--x-line-strong)]">·</span>
              <Link
                href={`/${lang}/me?view=reset`}
                className="underline-offset-4 hover:text-[var(--x-primary)] hover:underline"
              >
                {pick(lang, COPY.forgot)}
              </Link>
            </p>

            <RegisterForm
              locale={lang}
              slug={slug}
              collectAccessibility={Boolean(situation.settings?.collectAccessibility)}
              dietaryOptions={dietaryOptionsFor(lang)}
              initialError={error}
              initialConflictWith={conflictWith}
              labels={{
                firstName: he ? 'שם פרטי' : 'First name',
                lastName: he ? 'שם משפחה' : 'Last name',
                email: m.public.email[lang],
                phone: m.public.phone[lang],
                password: he ? 'סיסמה' : 'Password',
                passwordConfirm: he ? 'אימות סיסמה' : 'Confirm password',
                passwordHint: PASSWORD_POLICY_TEXT[lang],
                organization: m.public.organization[lang],
                role: m.public.role[lang],
                dietary: m.public.dietary[lang],
                dietaryPlaceholder: he ? 'בחרו העדפה' : 'Choose a preference',
                accessibility: m.public.accessibility[lang],
                accessibilityHint: he
                  ? 'לא חובה. נשתמש בזה רק כדי להתאים את הכנס עבורכם.'
                  : 'Optional. We use this only to make the conference work for you.',
                directoryQuestion: m.public.directoryQuestion[lang],
                directoryHint: m.public.directoryHint[lang],
                stepOneTitle: he ? 'פרטים אישיים' : 'Personal details',
                stepOneIntro: he ? 'נשמח להכיר אותך קצת יותר.' : 'A little about you.',
                stepTwoTitle: he ? 'הארגון והמוסד' : 'Your organisation',
                stepTwoIntro: he
                  ? 'מאיפה אתם מגיעים, ומה נכין לכם.'
                  : 'Where you come from, and what to prepare for you.',
                continue: he ? 'המשך' : 'Continue',
                back: he ? 'חזרה' : 'Back',
                submit: he ? 'שליחת קוד אימות' : 'Send verification code',
                submitting: he ? 'שולחים…' : 'Sending…',
                submitHint: he
                  ? 'נשלח קוד בן 6 ספרות לכתובת שמילאתם. ההרשמה תושלם אחרי שתזינו אותו.'
                  : 'A 6-digit code goes to the address you gave. Registration completes once you enter it.',
                trust: he
                  ? 'המידע שלכם בטוח ומאובטח אצלנו'
                  : 'Your information is safe and secure with us',
                noticeBefore: he
                  ? 'בשליחת הטופס אתם מאשרים את '
                  : 'By submitting you accept the ',
                noticeTerms: he ? 'תנאי השימוש' : 'terms of use',
                noticeBetween: he ? ' ואת ' : ' and the ',
                noticePrivacy: he ? 'מדיניות הפרטיות' : 'privacy policy',
                noticeAfter: he
                  ? ', ומאשרים שקראתם איזה מידע נאסף, מי רואה אותו וכמה זמן הוא נשמר.'
                  : ', and confirm you have read what is collected, who can see it and how long it is kept.',
                conflictBefore: he ? 'הכנס מתנגש בזמן עם' : 'This conference clashes with',
                conflictAfter: he
                  ? 'כדי להירשם, בטלו קודם את ההרשמה החופפת באזור האישי.'
                  : 'To register, first cancel the overlapping registration in your space.',
                existsSignIn: he ? 'להתחברות' : 'Sign in',
                existsReset: he ? 'שכחתי סיסמה' : 'Forgot password',
                checking: he ? 'בודקים…' : 'Checking…',
                errors: {
                  invalid: m.public.invalid[lang],
                  closed: m.public.closed[lang],
                  exists: he
                    ? 'כתובת הדוא״ל הזו כבר רשומה במערכת. אפשר להיכנס עם הסיסמה שלכם, ומשם להצטרף לכנס.'
                    : 'This email address is already registered. Sign in with your password and join the conference from your space.',
                  conflict: '',
                  weakPassword: he
                    ? `הסיסמה חלשה מדי. ${PASSWORD_POLICY_TEXT.he}`
                    : `Password too weak. ${PASSWORD_POLICY_TEXT.en}`,
                  passwordMismatch: he
                    ? 'שתי הסיסמאות אינן זהות. הקלידו אותן שוב.'
                    : 'The two passwords do not match. Please type them again.',
                  expired: he
                    ? 'הקוד פג. מלאו את הפרטים שוב ונשלח קוד חדש.'
                    : 'The code expired. Fill in the details again and we will send a new one.',
                  spent: he
                    ? 'יותר מדי ניסיונות שגויים. מטעמי אבטחה ההרשמה בוטלה — אפשר להתחיל מחדש.'
                    : 'Too many wrong codes. For safety that registration was discarded — you can start again.',
                  tooManyCodes: he
                    ? 'ביקשתם קודים רבים מדי לכתובת הזו. נסו שוב בעוד שעה.'
                    : 'Too many codes were requested for that address. Try again in an hour.',
                },
                fieldErrors: {
                  required: he ? 'שדה חובה' : 'Required',
                  email: he ? 'כתובת אימייל לא תקינה' : 'That email address is not valid',
                  emailTaken: he
                    ? 'הכתובת הזו כבר רשומה'
                    : 'This address is already registered',
                  phone: he ? 'מספר טלפון לא תקין' : 'That phone number is not valid',
                  password: he
                    ? `הסיסמה לא עומדת בדרישות. ${PASSWORD_POLICY_TEXT.he}`
                    : `Password does not meet the policy. ${PASSWORD_POLICY_TEXT.en}`,
                  passwordMismatch: he
                    ? 'הסיסמאות אינן זהות'
                    : 'The passwords do not match',
                },
              }}
            />
          </>
        ) : (
          <div className="flex flex-col items-start gap-4">
            <span
              className={`inline-flex items-center gap-1.5 rounded-[var(--x-r-pill)] px-3 py-1 text-xs font-semibold ${stateTone}`}
            >
              <span aria-hidden="true" className="inline-block size-1.5 rounded-full bg-current" />
              {stateLabel}
            </span>
            <p className="text-[15px] leading-relaxed text-[var(--x-soft)]">
              {m.public.closed[lang]}
            </p>
            {participant ? (
              <Link href={`/${lang}/me`} className={ghostCls}>
                {m.toPersonalArea[lang]}
              </Link>
            ) : (
              <Link href={`/${lang}/me`} className={ghostCls}>
                {pick(lang, COPY.signIn)}
              </Link>
            )}
          </div>
        )}
      </section>
    </Layout>
  );
};

/*
 * The response depends on who is asking, so it is rendered per request
 * and never prerendered or shared. Declared rather than left to Next to
 * infer from a cookie read: an inferred guard disappears the moment a
 * refactor moves that read behind a helper, and the failure would be a
 * privacy leak that nothing announces.
 */
export const dynamic = 'force-dynamic';

export default RegisterPage;
