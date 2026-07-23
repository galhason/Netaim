import Link from 'next/link';
import { setRequestLocale } from 'next-intl/server';
import { isSupportedLocale, type Locale } from '@/config/locales';
import { findPortalEvent, getActiveConferenceSlug } from '@/features/events';
import { formatLongDate } from '@/shared';

interface ContactPageProps {
  params: Promise<{ locale: string }>;
}

/*
 * Contact: a calm closing invitation. The details are the active
 * conference's own — when and where — with the register call and the
 * personal area, so the page stays dynamic and never invents data.
 */
const ContactPage = async ({ params }: ContactPageProps) => {
  const { locale } = await params;
  const lang = (isSupportedLocale(locale) ? locale : 'he') as Locale;
  setRequestLocale(lang);

  const slug = await getActiveConferenceSlug(lang).catch(() => null);
  const event = slug
    ? await findPortalEvent(slug, lang).catch(() => null)
    : null;
  const registerHref = slug ? `/${lang}/events/${slug}/register` : `/${lang}`;
  const dateLabel = event ? formatLongDate(event.startsAt, lang) : '';

  return (
    <main className="mx-auto flex max-w-3xl flex-col px-6 pb-28 pt-32 md:px-10">
      <p className="text-xs font-medium uppercase tracking-[0.34em] text-accent">
        {lang === 'he' ? 'צור קשר' : 'Contact'}
      </p>
      <h1 className="mt-4 font-display text-4xl font-extrabold leading-tight tracking-tight text-text-primary md:text-6xl">
        {lang === 'he' ? 'נשמח לראותכם' : "We'd love to see you"}
      </h1>
      {event ? (
        <p className="mt-5 max-w-xl text-lg text-text-secondary">
          {event.title}
          {dateLabel ? ` · ${dateLabel}` : ''}
          {event.location ? ` · ${event.location}` : ''}
        </p>
      ) : null}

      <div className="cine-card cine-float mt-10 flex flex-col gap-6 rounded-3xl p-8">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-accent">
            {lang === 'he' ? 'מיקום' : 'Location'}
          </span>
          <span className="text-lg text-text-primary">
            {event?.location ?? (lang === 'he' ? 'יעודכן בקרוב' : 'To be announced')}
          </span>
        </div>
        {dateLabel ? (
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-accent">
              {lang === 'he' ? 'מועד' : 'Date'}
            </span>
            <span className="text-lg text-text-primary">{dateLabel}</span>
          </div>
        ) : null}
        <div className="flex flex-wrap gap-4 pt-2">
          <Link
            href={registerHref}
            className="inline-flex min-h-12 items-center rounded-xl bg-brand px-8 font-medium text-brand-contrast shadow-[0_14px_44px_-12px_rgba(201,161,93,0.55)] transition-all hover:scale-[1.02]"
          >
            {lang === 'he' ? 'הרשמה לכנס' : 'Register'}
          </Link>
          <Link
            href={`/${lang}/me`}
            className="inline-flex min-h-12 items-center rounded-xl bg-surface/40 px-7 text-text-secondary ring-1 ring-white/12 backdrop-blur-md transition-colors hover:text-text-primary hover:ring-accent/45"
          >
            {lang === 'he' ? 'האזור האישי' : 'My space'}
          </Link>
        </div>
      </div>
    </main>
  );
};

export default ContactPage;
