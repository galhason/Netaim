import Image from 'next/image';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { isSupportedLocale } from '@/config/locales';
import {
  LOUNGE_UI,
  LoungeNote,
  loungeField,
  loungeLabel,
  loungePrimary,
  loungeQuiet,
} from '@/features/attendee';
import {
  PASSWORD_POLICY_TEXT,
  getMyDetails,
  myContactPreferences,
  myTotpStatus,
} from '@/features/registration';
import {
  changePasswordAction,
  confirmTotpAction,
  disableTotpAction,
  saveAccountProfileAction,
  saveContactPrefsAction,
  savePhotoAction,
  startTotpAction,
} from './actions';
import TotpQr from './totp-qr';

/*
 * The Profile Card (the approved participant vision): not a form — a
 * card. Portrait, name, organization, interests; editing is a second
 * breath of the same room. Same Lounge DNA as the personal home: the
 * navy dusk, the bronze light, the quiet rise.
 */
interface ProfilePageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    saved?: string;
    password?: string;
    view?: string;
    photo?: string;
    totp?: string;
  }>;
}

const Atmosphere = () => (
  <span aria-hidden="true" className="absolute inset-0 overflow-hidden">
    <span className="absolute inset-0 bg-[var(--l-navy)]" />
    <span className="absolute -top-32 left-1/2 h-[30rem] w-[48rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(201,169,110,0.4),transparent_70%)]" />
    <span className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-transparent to-[var(--l-bg)]" />
  </span>
);

const interestChips = (interests: string | undefined): string[] =>
  (interests ?? '')
    .split(',')
    .map((chip) => chip.trim())
    .filter((chip) => chip.length > 0)
    .slice(0, 8);

const AccountProfilePage = async ({
  params,
  searchParams,
}: ProfilePageProps) => {
  const { locale } = await params;
  const {
    saved,
    password: passwordState,
    view,
    photo: photoState,
    totp: totpParam,
  } = await searchParams;
  const he = locale === 'he';

  if (!isSupportedLocale(locale)) {
    notFound();
  }

  setRequestLocale(locale);

  const details = await getMyDetails();
  const contact = await myContactPreferences();
  const totp = await myTotpStatus();

  if (!details) {
    redirect(`/${locale}/me`);
  }

  const editing = view === 'edit';
  const chips = interestChips(details.interests);
  const initial = (details.name ?? details.email).slice(0, 1).toUpperCase();

  return (
    <main
      id="main-content"
      className="lounge relative min-h-dvh bg-[var(--l-bg)] font-body text-[var(--l-ink)]"
    >
      <div className="relative h-56 md:h-64">
        <Atmosphere />
        <div className="relative mx-auto flex h-full max-w-2xl flex-col px-6">
          <div className="flex items-center justify-between pt-6 text-white/85">
            <Link
              href={`/${locale}/me`}
              className="text-sm transition-opacity hover:opacity-75"
            >
              ← {LOUNGE_UI.myExperience[locale]}
            </Link>
            <span className="font-display text-sm font-semibold tracking-[0.3em]">
              נטעים
            </span>
          </div>
          <div className="mt-auto pb-14 text-white">
            <p className="text-xs font-medium tracking-[0.18em] text-[var(--l-bronze-soft,#d8b98a)]">
              {he ? 'הפרופיל שלי' : 'My profile'}
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-6 pb-16">
        <div className="lounge-rise relative -mt-16 rounded-3xl bg-white p-7 shadow-[0_14px_44px_rgba(35,40,47,0.08)]">
          <div className="flex flex-wrap items-end gap-5">
            <span className="relative -mt-16 block size-28 flex-none overflow-hidden rounded-3xl bg-[var(--l-navy)] shadow-[0_10px_30px_rgba(14,27,46,0.25)] ring-4 ring-white">
              {details.photoUrl ? (
                <Image
                  src={details.photoUrl}
                  alt=""
                  fill
                  sizes="112px"
                  className="object-cover"
                />
              ) : (
                <span className="grid size-full place-items-center font-display text-4xl text-white">
                  {initial}
                </span>
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-display text-3xl font-semibold">
                {details.name ?? details.email}
              </span>
              <span className="mt-0.5 block truncate text-sm text-[var(--l-soft)]">
                {[details.role, details.organization]
                  .filter(Boolean)
                  .join(' · ') || details.email}
              </span>
            </span>
            {!editing ? (
              <Link
                href={`/${locale}/me/profile?view=edit`}
                className={loungeQuiet}
              >
                {LOUNGE_UI.editProfile[locale]}
              </Link>
            ) : null}
          </div>

          {chips.length > 0 && !editing ? (
            <div className="mt-5 flex flex-wrap gap-2">
              {chips.map((chip) => (
                <span
                  key={chip}
                  className="inline-flex items-center rounded-full bg-[var(--l-bronze)]/12 px-3.5 py-1.5 text-sm text-[var(--l-bronze)]"
                >
                  {chip}
                </span>
              ))}
            </div>
          ) : null}

          {!editing ? (
            <dl className="mt-6 grid grid-cols-1 gap-x-8 gap-y-4 border-t border-[var(--l-hair)] pt-5 sm:grid-cols-2">
              <div>
                <dt className={loungeLabel}>{he ? 'אימייל' : 'Email'}</dt>
                <dd className="text-sm">{details.email}</dd>
              </div>
              {details.phone ? (
                <div>
                  <dt className={loungeLabel}>
                    {LOUNGE_UI.fieldPhone[locale]}
                  </dt>
                  <dd className="text-sm">{details.phone}</dd>
                </div>
              ) : null}
              {details.dietary ? (
                <div>
                  <dt className={loungeLabel}>
                    {LOUNGE_UI.fieldDietary[locale]}
                  </dt>
                  <dd className="text-sm">{details.dietary}</dd>
                </div>
              ) : null}
              {details.accessibility ? (
                <div>
                  <dt className={loungeLabel}>
                    {LOUNGE_UI.fieldAccessibility[locale]}
                  </dt>
                  <dd className="text-sm">{details.accessibility}</dd>
                </div>
              ) : null}
            </dl>
          ) : null}

          {saved ? (
            <div className="mt-5">
              <LoungeNote tone="good">
                {LOUNGE_UI.profileSaved[locale]}
              </LoungeNote>
            </div>
          ) : null}
          {photoState === 'failed' ? (
            <div className="mt-5">
              <LoungeNote tone="accent">
                {he
                  ? 'התמונה לא נקלטה — ודאו שזה קובץ תמונה עד 5MB.'
                  : 'The photo was not accepted — make sure it is an image up to 5MB.'}
              </LoungeNote>
            </div>
          ) : null}
        </div>

        {editing ? (
          <>
            <div className="lounge-rise mt-5 rounded-3xl bg-white p-7 shadow-[0_14px_44px_rgba(35,40,47,0.08)] [animation-delay:60ms]">
              <h2 className="font-display text-xl font-semibold">
                {he ? 'תמונת פרופיל' : 'Profile photo'}
              </h2>
              <form
                action={savePhotoAction}
                className="mt-4 flex flex-wrap items-center gap-4"
              >
                <input type="hidden" name="locale" value={locale} />
                <input
                  type="file"
                  name="photo"
                  accept="image/*"
                  required
                  className="text-sm text-[var(--l-soft)] file:me-4 file:rounded-xl file:border-0 file:bg-[var(--l-navy)] file:px-5 file:py-2.5 file:text-sm file:font-medium file:text-white"
                />
                <button type="submit" className={loungeQuiet}>
                  {he ? 'העלאה' : 'Upload'}
                </button>
              </form>
            </div>

            <div className="lounge-rise mt-5 rounded-3xl bg-white p-7 shadow-[0_14px_44px_rgba(35,40,47,0.08)] [animation-delay:120ms]">
              <h2 className="font-display text-xl font-semibold">
                {he ? 'פרטים' : 'Details'}
              </h2>
              <form
                action={saveAccountProfileAction}
                className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2"
              >
                <input type="hidden" name="locale" value={locale} />
                <label className="sm:col-span-2">
                  <span className={loungeLabel}>
                    {LOUNGE_UI.fieldName[locale]}
                  </span>
                  <input
                    name="name"
                    defaultValue={details.name}
                    autoComplete="name"
                    className={loungeField}
                  />
                </label>
                <label>
                  <span className={loungeLabel}>
                    {LOUNGE_UI.fieldPhone[locale]}
                  </span>
                  <input
                    type="tel"
                    name="phone"
                    defaultValue={details.phone}
                    autoComplete="tel"
                    className={loungeField}
                  />
                </label>
                <label>
                  <span className={loungeLabel}>
                    {LOUNGE_UI.fieldOrganization[locale]}
                  </span>
                  <input
                    name="organization"
                    defaultValue={details.organization}
                    className={loungeField}
                  />
                </label>
                <label>
                  <span className={loungeLabel}>
                    {LOUNGE_UI.fieldRole[locale]}
                  </span>
                  <input
                    name="role"
                    defaultValue={details.role}
                    className={loungeField}
                  />
                </label>
                <label>
                  <span className={loungeLabel}>
                    {LOUNGE_UI.fieldDietary[locale]}
                  </span>
                  <input
                    name="dietary"
                    defaultValue={details.dietary}
                    className={loungeField}
                  />
                </label>
                <label className="sm:col-span-2">
                  <span className={loungeLabel}>
                    {he ? 'תחומי עניין (מופרדים בפסיק)' : 'Interests (comma-separated)'}
                  </span>
                  <input
                    name="interests"
                    defaultValue={details.interests}
                    placeholder={he ? 'AI, מדיניות, חינוך' : 'AI, policy, education'}
                    className={loungeField}
                  />
                </label>
                <label className="sm:col-span-2">
                  <span className={loungeLabel}>
                    {LOUNGE_UI.fieldAccessibility[locale]}
                  </span>
                  <textarea
                    name="accessibility"
                    rows={2}
                    defaultValue={details.accessibility}
                    className={`${loungeField} resize-none`}
                  />
                </label>
                <div className="flex items-center gap-4 sm:col-span-2">
                  <button type="submit" className={loungePrimary}>
                    {LOUNGE_UI.saveProfile[locale]}
                  </button>
                  <Link
                    href={`/${locale}/me/profile`}
                    className="text-sm text-[var(--l-soft)] underline underline-offset-4 transition-colors hover:text-[var(--l-ink)]"
                  >
                    {he ? 'סגירה' : 'Close'}
                  </Link>
                </div>
              </form>
            </div>

            <div className="lounge-rise mt-5 rounded-3xl bg-white p-7 shadow-[0_14px_44px_rgba(35,40,47,0.08)] [animation-delay:150ms]">
              <h2 className="font-display text-xl font-semibold">
                {he ? 'פרטיות ויצירת קשר' : 'Privacy & contact'}
              </h2>
              <p className="mt-1.5 text-sm text-[var(--l-soft)]">
                {he
                  ? 'מה נפתח למי שאישרתם התחברות. השינויים חלים מיד.'
                  : 'What opens to connections you approved. Changes apply immediately.'}
              </p>
              <form
                action={saveContactPrefsAction}
                className="mt-5 flex flex-col gap-3"
              >
                <input type="hidden" name="locale" value={locale} />
                <label className="flex items-center gap-3 text-sm text-[var(--l-soft)]">
                  <input
                    type="checkbox"
                    checked
                    disabled
                    className="size-4 accent-[var(--l-bronze)]"
                  />
                  {he ? 'הודעות נטעים — תמיד פתוח' : 'נטעים Messages — always on'}
                </label>
                <label className="flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    name="whatsapp"
                    defaultChecked={contact?.prefs.whatsapp !== false}
                    className="size-4 accent-[var(--l-bronze)]"
                  />
                  {he ? 'שיחת WhatsApp מהירה' : 'WhatsApp quick chat'}
                </label>
                <label className="flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    name="phonePref"
                    defaultChecked={contact?.prefs.phone === true}
                    className="size-4 accent-[var(--l-bronze)]"
                  />
                  {he
                    ? 'הצגת מספר הטלפון שלי לקשרים מאושרים'
                    : 'Show my phone number to approved connections'}
                </label>
                <label className="flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    name="emailPref"
                    defaultChecked={contact?.prefs.email === true}
                    className="size-4 accent-[var(--l-bronze)]"
                  />
                  {he
                    ? 'הצגת כתובת האימייל שלי לקשרים מאושרים'
                    : 'Show my email to approved connections'}
                </label>
                <label className="flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    name="meetings"
                    defaultChecked={contact?.prefs.meetings !== false}
                    className="size-4 accent-[var(--l-bronze)]"
                  />
                  {he ? 'קבלת הצעות לפגישות' : 'Receive meeting requests'}
                </label>
                <div>
                  <button type="submit" className={loungePrimary}>
                    {he ? 'שמירת ההעדפות' : 'Save preferences'}
                  </button>
                </div>
              </form>
            </div>

            <div className="lounge-rise mt-5 rounded-3xl bg-white p-7 shadow-[0_14px_44px_rgba(35,40,47,0.08)] [animation-delay:180ms]">
              <h2 className="font-display text-xl font-semibold">
                {he ? 'החלפת סיסמה' : 'Change password'}
              </h2>
              <p className="mt-1.5 text-sm text-[var(--l-soft)]">
                {PASSWORD_POLICY_TEXT[locale]}
              </p>

              {passwordState === 'changed' ? (
                <div className="mt-4">
                  <LoungeNote tone="good">
                    {he ? 'הסיסמה הוחלפה.' : 'Your password was changed.'}
                  </LoungeNote>
                </div>
              ) : null}
              {passwordState === 'weak' ? (
                <div className="mt-4">
                  <LoungeNote tone="accent">
                    {he ? 'הסיסמה חלשה מדי.' : 'That password is too weak.'}{' '}
                    {PASSWORD_POLICY_TEXT[locale]}
                  </LoungeNote>
                </div>
              ) : null}

              <form
                action={changePasswordAction}
                className="mt-5 flex flex-col gap-4"
              >
                <input type="hidden" name="locale" value={locale} />
                <label>
                  <span className={loungeLabel}>
                    {he ? 'סיסמה חדשה' : 'New password'}
                  </span>
                  <input
                    type="password"
                    name="password"
                    required
                    autoComplete="new-password"
                    className={loungeField}
                  />
                </label>
                <button type="submit" className={loungePrimary}>
                  {he ? 'שמירת סיסמה' : 'Save password'}
                </button>
              </form>
            </div>

            <div
              id="totp"
              className="lounge-rise mt-5 rounded-3xl bg-white p-7 shadow-[0_14px_44px_rgba(35,40,47,0.08)] [animation-delay:210ms]"
            >
              <h2 className="font-display text-xl font-semibold">
                {he ? 'אימות דו-שלבי' : 'Two-factor authentication'}
              </h2>
              <p className="mt-1.5 text-sm text-[var(--l-soft)]">
                {he
                  ? 'קוד מאפליקציית אימות (Google Authenticator, 1Password וכדומה) בנוסף לסיסמה.'
                  : 'A code from an authenticator app (Google Authenticator, 1Password…) on top of your password.'}
              </p>

              {totpParam === 'enabled' ? (
                <div className="mt-4">
                  <LoungeNote tone="good">
                    {he
                      ? 'אימות דו-שלבי הופעל. מהכניסה הבאה יידרש קוד.'
                      : 'Two-factor is on. Your next sign-in will ask for a code.'}
                  </LoungeNote>
                </div>
              ) : null}
              {totpParam === 'disabled' ? (
                <div className="mt-4">
                  <LoungeNote tone="good">
                    {he ? 'אימות דו-שלבי כובה.' : 'Two-factor was turned off.'}
                  </LoungeNote>
                </div>
              ) : null}
              {totpParam === 'wrong' ? (
                <div className="mt-4">
                  <LoungeNote tone="accent">
                    {he
                      ? 'הקוד לא נכון. נסו את הקוד הנוכחי באפליקציה.'
                      : 'Wrong code. Try the current code in the app.'}
                  </LoungeNote>
                </div>
              ) : null}

              {totp?.enabled ? (
                <form
                  action={disableTotpAction}
                  className="mt-5 flex flex-wrap items-end gap-3"
                >
                  <input type="hidden" name="locale" value={locale} />
                  <label className="flex-1">
                    <span className={loungeLabel}>
                      {he
                        ? 'לכיבוי — הזינו קוד נוכחי'
                        : 'To turn off — enter a current code'}
                    </span>
                    <input
                      name="code"
                      inputMode="numeric"
                      maxLength={6}
                      required
                      className={loungeField}
                    />
                  </label>
                  <button
                    type="submit"
                    className="inline-flex min-h-11 items-center rounded-xl border border-[var(--l-hair)] px-5 text-sm font-medium"
                  >
                    {he ? 'כיבוי' : 'Turn off'}
                  </button>
                </form>
              ) : totp?.pendingOtpauth ? (
                <div className="mt-5 flex flex-col gap-4">
                  <p className="text-sm text-[var(--l-soft)]">
                    {he
                      ? '1. סרקו את הקוד באפליקציית האימות. 2. הזינו את הקוד שהיא מציגה.'
                      : '1. Scan this in your authenticator app. 2. Enter the code it shows.'}
                  </p>
                  <TotpQr value={totp.pendingOtpauth} />
                  <form
                    action={confirmTotpAction}
                    className="flex flex-wrap items-end gap-3"
                  >
                    <input type="hidden" name="locale" value={locale} />
                    <label className="flex-1">
                      <span className={loungeLabel}>
                        {he ? 'קוד בן 6 ספרות' : '6-digit code'}
                      </span>
                      <input
                        name="code"
                        inputMode="numeric"
                        maxLength={6}
                        required
                        className={loungeField}
                      />
                    </label>
                    <button type="submit" className={loungePrimary}>
                      {he ? 'אישור והפעלה' : 'Confirm & enable'}
                    </button>
                  </form>
                </div>
              ) : (
                <form action={startTotpAction} className="mt-5">
                  <input type="hidden" name="locale" value={locale} />
                  <button type="submit" className={loungePrimary}>
                    {he ? 'הפעלת אימות דו-שלבי' : 'Enable two-factor'}
                  </button>
                </form>
              )}
            </div>
          </>
        ) : null}
      </div>
    </main>
  );
};

export default AccountProfilePage;
