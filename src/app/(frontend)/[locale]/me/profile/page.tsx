import Image from 'next/image';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { isSupportedLocale } from '@/config/locales';
import {
  ACCOUNT_UI,
  LanguageSwitchForm,
  signOutAction,
  signOutEverywhereAction,
} from '@/features/account';
import {
  LOUNGE_UI,
  LoungeNote,
  loungeField,
  loungeLabel,
  loungeGhost,
  loungePrimary,
  loungeQuiet,
} from '@/features/attendee';
import {
  DietarySelect,
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
    <span className="absolute -top-32 left-1/2 h-[30rem] w-[48rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(249,161,27,0.4),transparent_70%)]" />
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
            <div className="flex items-center gap-5">
              <span className="font-display text-sm font-semibold tracking-[0.3em]">
                נטעים
              </span>
              <form action={signOutAction}>
                <input type="hidden" name="locale" value={locale} />
                <button
                  type="submit"
                  className="inline-flex min-h-10 cursor-pointer items-center gap-1.5 text-sm text-white/80 transition-colors hover:text-white"
                >
                  <svg viewBox="0 0 20 20" aria-hidden="true" className="size-4 rtl:-scale-x-100" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8 4H4.5A1.5 1.5 0 0 0 3 5.5v9A1.5 1.5 0 0 0 4.5 16H8M12.5 6.5 16 10l-3.5 3.5M16 10H7.5" />
                  </svg>
                  {ACCOUNT_UI.signOut[locale]}
                </button>
              </form>
            </div>
          </div>
          <div className="mt-auto pb-14 text-white">
            <p className="text-xs font-medium tracking-[0.18em] text-[var(--l-bronze-soft)]">
              {he ? 'הפרופיל שלי' : 'My profile'}
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-6 pb-16">
        <div className="lounge-rise relative -mt-16 rounded-3xl bg-white p-7 shadow-[0_14px_44px_rgba(23,32,51,0.08)]">
          <div className="flex flex-wrap items-end gap-5">
            <span className="relative -mt-16 block size-28 flex-none overflow-hidden rounded-3xl bg-[var(--l-navy)] shadow-[0_10px_30px_rgba(11,27,51,0.25)] ring-4 ring-white">
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

        {/*
          * Site language: a small, permanent control — the choice is kept
          * on the account, so it holds on every device and every visit.
          */}
        <div className="lounge-rise mt-5 flex flex-wrap items-center gap-x-6 gap-y-4 rounded-3xl bg-white px-7 py-5 shadow-[0_14px_44px_rgba(23,32,51,0.08)] [animation-delay:30ms]">
          <div className="min-w-0">
            <h2 className="font-display text-base font-semibold">
              {ACCOUNT_UI.languageLabel[locale]}
            </h2>
            <p className="mt-0.5 text-xs text-[var(--l-soft)]">
              {ACCOUNT_UI.languageChoiceHint[locale]}
            </p>
          </div>
          <div className="ms-auto w-full max-w-[16rem]">
            <LanguageSwitchForm
              locale={locale}
              next={`/${locale}/me/profile`}
            />
          </div>
        </div>

        {/*
          * Directory visibility — the opt-in, one glance and one click,
          * right on the profile's front page (PRD §5.1). The button
          * flips only this choice: the other contact preferences ride
          * along as hidden fields exactly as they are, because the save
          * action reads the whole set and an absent field means "off".
          * The full checkbox panel remains in the edit view.
          */}
        {!editing ? (
          <div className="lounge-rise mt-5 flex flex-wrap items-center gap-x-6 gap-y-4 rounded-3xl bg-white px-7 py-5 shadow-[0_14px_44px_rgba(23,32,51,0.08)] [animation-delay:45ms]">
            <div className="min-w-0 flex-1 basis-60">
              <h2 className="flex items-center gap-2 font-display text-base font-semibold">
                <span
                  aria-hidden="true"
                  className={`size-2 rounded-full ${
                    contact?.prefs.directory === true
                      ? 'bg-[var(--l-live)]'
                      : 'bg-[var(--l-soft)]/50'
                  }`}
                />
                {he
                  ? 'הצגה בספריית המשתתפים'
                  : 'Listing in the participants directory'}
              </h2>
              <p className="mt-0.5 text-xs text-[var(--l-soft)]">
                {contact?.prefs.directory === true
                  ? he
                    ? 'אתם מוצגים למשתתפי הכנסים שלכם — שם, תפקיד וארגון בלבד. פרטי הקשר נשארים סגורים עד שתאשרו התחברות.'
                    : 'You are shown to fellow participants — name, role and organisation only. Contact details stay closed until you approve a connection.'
                  : he
                    ? 'אתם לא מוצגים בספריית המשתתפים ולא ניתן לשלוח לכם בקשות התחברות.'
                    : 'You are not shown in the participants directory, and nobody can send you connection requests.'}
              </p>
            </div>
            <form action={saveContactPrefsAction} className="ms-auto flex-none">
              <input type="hidden" name="locale" value={locale} />
              {contact?.prefs.whatsapp !== false ? (
                <input type="hidden" name="whatsapp" value="on" />
              ) : null}
              {contact?.prefs.phone !== false ? (
                <input type="hidden" name="phonePref" value="on" />
              ) : null}
              {contact?.prefs.email !== false ? (
                <input type="hidden" name="emailPref" value="on" />
              ) : null}
              {contact?.prefs.meetings !== false ? (
                <input type="hidden" name="meetings" value="on" />
              ) : null}
              {contact?.prefs.directory === true ? null : (
                <input type="hidden" name="directory" value="on" />
              )}
              <button
                type="submit"
                className={
                  contact?.prefs.directory === true
                    ? 'inline-flex min-h-11 items-center rounded-full border border-[var(--l-line,rgba(23,32,51,0.14))] px-5 text-sm font-medium text-[var(--l-soft)] transition-colors hover:border-[var(--l-bronze)] hover:text-[var(--l-ink,var(--nt-ink))]'
                    : 'inline-flex min-h-11 items-center rounded-full bg-[var(--l-bronze)] px-5 text-sm font-medium text-white transition-colors hover:opacity-90'
                }
              >
                {contact?.prefs.directory === true
                  ? he
                    ? 'להסתיר אותי מהספרייה'
                    : 'Hide me from the directory'
                  : he
                    ? 'להציג אותי בספרייה'
                    : 'Show me in the directory'}
              </button>
            </form>
          </div>
        ) : null}

        {editing ? (
          <>
            <div className="lounge-rise mt-5 rounded-3xl bg-white p-7 shadow-[0_14px_44px_rgba(23,32,51,0.08)] [animation-delay:60ms]">
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

            <div className="lounge-rise mt-5 rounded-3xl bg-white p-7 shadow-[0_14px_44px_rgba(23,32,51,0.08)] [animation-delay:120ms]">
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
                  <DietarySelect
                    locale={locale}
                    value={details.dietary}
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
                {/*
                  * How you introduce yourself in a participants list.
                  * These lived on a separate form, once per conference,
                  * so a guest attending two had two half-filled
                  * introductions and no way to know which a stranger was
                  * reading. One profile, shown wherever you are.
                  */}
                <label className="sm:col-span-2">
                  <span className={loungeLabel}>
                    {he ? 'כותרת — איך תציגו את עצמכם' : 'Headline — how you introduce yourself'}
                  </span>
                  <input
                    name="headline"
                    defaultValue={details.headline}
                    placeholder={
                      he
                        ? 'מנהלת חינוך, עיריית באר שבע'
                        : 'Head of education, City of Beer Sheva'
                    }
                    className={loungeField}
                  />
                </label>
                <label className="sm:col-span-2">
                  <span className={loungeLabel}>
                    {he ? 'כמה מילים עליי' : 'A few words about me'}
                  </span>
                  <textarea
                    name="bio"
                    rows={3}
                    defaultValue={details.bio}
                    className={`${loungeField} resize-none`}
                  />
                </label>
                {[0, 1].map((index) => (
                  <div key={index} className="grid gap-3 sm:col-span-2 sm:grid-cols-[1fr_2fr]">
                    <label>
                      <span className={loungeLabel}>
                        {he ? `קישור ${index + 1} — שם` : `Link ${index + 1} — label`}
                      </span>
                      <input
                        name={`linkLabel${index}`}
                        defaultValue={details.links?.[index]?.label ?? ''}
                        className={loungeField}
                      />
                    </label>
                    <label>
                      <span className={loungeLabel}>
                        {he ? 'כתובת' : 'URL'}
                      </span>
                      <input
                        name={`linkUrl${index}`}
                        defaultValue={details.links?.[index]?.url ?? ''}
                        dir="ltr"
                        className={loungeField}
                      />
                    </label>
                  </div>
                ))}
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

            <div
              id="privacy"
              className="lounge-rise mt-5 scroll-mt-24 rounded-3xl bg-white p-7 shadow-[0_14px_44px_rgba(23,32,51,0.08)] [animation-delay:150ms]"
            >
              <h2 className="font-display text-xl font-semibold">
                {he ? 'פרטיות ויצירת קשר' : 'Privacy & contact'}
              </h2>
              <p className="mt-1.5 text-sm text-[var(--l-soft)]">
                {he
                  ? 'מי רואה אתכם, ומה נפתח למי שאישרתם התחברות. השינויים חלים מיד.'
                  : 'Who can see you, and what opens to connections you approved. Changes apply immediately.'}
              </p>
              <form
                action={saveContactPrefsAction}
                className="mt-5 flex flex-col gap-3"
              >
                <input type="hidden" name="locale" value={locale} />
                <label className="flex items-start gap-3 text-sm">
                  <input
                    type="checkbox"
                    name="directory"
                    defaultChecked={contact?.prefs.directory === true}
                    className="mt-0.5 size-4 accent-[var(--l-bronze)]"
                  />
                  <span>
                    {he
                      ? 'להופיע ברשימת המשתתפים של הכנסים שאני משתתף/ת בהם'
                      : 'Appear in the participants list of conferences I attend'}
                    <span className="mt-0.5 block text-xs text-[var(--l-soft)]">
                      {he
                        ? 'מוצגים השם, התפקיד והארגון שמסרתם. פרטי הקשר נשארים סגורים עד שתאשרו התחברות.'
                        : 'Your name, role and organisation are shown. Contact details stay closed until you approve a connection.'}
                    </span>
                  </span>
                </label>
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
                    defaultChecked={contact?.prefs.phone !== false}
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
                    defaultChecked={contact?.prefs.email !== false}
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

            <div className="lounge-rise mt-5 rounded-3xl bg-white p-7 shadow-[0_14px_44px_rgba(23,32,51,0.08)] [animation-delay:180ms]">
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
              className="lounge-rise mt-5 rounded-3xl bg-white p-7 shadow-[0_14px_44px_rgba(23,32,51,0.08)] [animation-delay:210ms]"
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

        {/*
          * The way out, as a card of its own at the foot of the
          * profile — where a person looks after checking their details
          * on a screen that is not theirs. Two buttons for two
          * situations: leaving this device, and cutting every session
          * the account holds when a phone is lost or a password may
          * have travelled.
          */}
        <div className="lounge-rise mt-5 rounded-3xl bg-white p-7 shadow-[0_14px_44px_rgba(23,32,51,0.08)] [animation-delay:240ms]">
          <h2 className="font-display text-xl font-semibold">
            {he ? 'יציאה מהחשבון' : 'Sign out'}
          </h2>
          <p className="mt-1.5 text-sm text-[var(--l-soft)]">
            {he
              ? 'התנתקות במכשיר הזה בלבד, או מכל המכשירים שבהם החשבון פתוח — למשל אחרי שימוש במחשב משותף או אם הטלפון אבד.'
              : 'Sign out on this device only, or on every device where the account is open — after using a shared computer, say, or if a phone was lost.'}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3">
            <form action={signOutAction}>
              <input type="hidden" name="locale" value={locale} />
              <button type="submit" className={loungeQuiet}>
                {he ? 'התנתקות במכשיר הזה' : 'Sign out on this device'}
              </button>
            </form>
            <form action={signOutEverywhereAction}>
              <input type="hidden" name="locale" value={locale} />
              <button type="submit" className={loungeGhost}>
                {he ? 'התנתקות מכל המכשירים' : 'Sign out everywhere'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
};

/* The guest's own session decides this page; never a build snapshot. */
export const dynamic = 'force-dynamic';

export default AccountProfilePage;
