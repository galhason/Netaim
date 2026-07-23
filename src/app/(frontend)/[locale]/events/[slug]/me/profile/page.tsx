import Link from 'next/link';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { isSupportedLocale } from '@/config/locales';
import { LOUNGE_UI } from '@/features/attendee';
import { getMyDetails } from '@/features/registration';
import { saveMyProfileAction } from './actions';

/*
 * The profile as a card, not a form-first screen: who the guest is, in
 * the lounge's warm light — then quiet fields to adjust.
 */
interface ProfilePageProps {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ saved?: string }>;
}

const FIELD_CLASS =
  'w-full rounded-xl border border-[var(--l-hair)] bg-white px-3.5 py-2.5 text-sm text-[var(--l-ink)] transition-colors focus:border-[var(--l-bronze)] focus:outline-none';
const LABEL_CLASS = 'mb-1.5 block text-xs font-medium text-[var(--l-soft)]';

const ProfilePage = async ({ params, searchParams }: ProfilePageProps) => {
  const { locale, slug } = await params;
  const { saved } = await searchParams;

  if (!isSupportedLocale(locale)) {
    notFound();
  }

  setRequestLocale(locale);

  const details = await getMyDetails();

  if (!details) {
    notFound();
  }

  return (
    <div className="lounge min-h-dvh bg-[var(--l-bg)] font-body text-[var(--l-ink)]">
      <div className="mx-auto max-w-xl px-6 py-10">
        <Link
          href={`/${locale}/events/${slug}/me`}
          className="text-sm text-[var(--l-soft)] transition-colors hover:text-[var(--l-ink)]"
        >
          ← {LOUNGE_UI.backToLounge[locale]}
        </Link>

        <div className="lounge-rise mt-5 rounded-3xl bg-white p-7 shadow-[0_14px_44px_rgba(35,40,47,0.08)]">
          <div className="flex items-center gap-4">
            <span className="grid size-14 flex-none place-items-center rounded-full bg-[var(--l-navy)] font-display text-xl text-white">
              {(details.name ?? details.email).slice(0, 1).toUpperCase()}
            </span>
            <span className="min-w-0">
              <span className="block truncate font-display text-2xl">
                {details.name ?? details.email}
              </span>
              <span className="block truncate text-sm text-[var(--l-soft)]">
                {details.email}
                {details.organization ? ` · ${details.organization}` : ''}
              </span>
            </span>
          </div>
          <p className="mt-3 text-sm text-[var(--l-soft)]">
            {LOUNGE_UI.profileSub[locale]}
          </p>

          {saved ? (
            <p className="mt-4 rounded-xl bg-[var(--l-live)]/10 px-4 py-2.5 text-sm text-[var(--l-live)]">
              {LOUNGE_UI.profileSaved[locale]}
            </p>
          ) : null}

          <form
            action={saveMyProfileAction}
            className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2"
          >
            <input type="hidden" name="slug" value={slug} />
            <input type="hidden" name="locale" value={locale} />
            <label className="sm:col-span-2">
              <span className={LABEL_CLASS}>{LOUNGE_UI.fieldName[locale]}</span>
              <input name="name" defaultValue={details.name} className={FIELD_CLASS} />
            </label>
            <label>
              <span className={LABEL_CLASS}>{LOUNGE_UI.fieldPhone[locale]}</span>
              <input
                type="tel"
                name="phone"
                defaultValue={details.phone}
                className={FIELD_CLASS}
              />
            </label>
            <label>
              <span className={LABEL_CLASS}>
                {LOUNGE_UI.fieldOrganization[locale]}
              </span>
              <input
                name="organization"
                defaultValue={details.organization}
                className={FIELD_CLASS}
              />
            </label>
            <label>
              <span className={LABEL_CLASS}>{LOUNGE_UI.fieldRole[locale]}</span>
              <input name="role" defaultValue={details.role} className={FIELD_CLASS} />
            </label>
            <label>
              <span className={LABEL_CLASS}>{LOUNGE_UI.fieldDietary[locale]}</span>
              <input
                name="dietary"
                defaultValue={details.dietary}
                className={FIELD_CLASS}
              />
            </label>
            <label className="sm:col-span-2">
              <span className={LABEL_CLASS}>
                {LOUNGE_UI.fieldAccessibility[locale]}
              </span>
              <textarea
                name="accessibility"
                rows={2}
                defaultValue={details.accessibility}
                className={`${FIELD_CLASS} resize-none`}
              />
            </label>
            <button
              type="submit"
              className="min-h-11 rounded-xl bg-[var(--l-navy)] text-sm font-medium text-white transition-colors hover:bg-[#16263c] sm:col-span-2"
            >
              {LOUNGE_UI.saveProfile[locale]}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
