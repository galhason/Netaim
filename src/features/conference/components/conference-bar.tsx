'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Locale } from '@/config/locales';
import { withBasePath } from '@/config/site';
import { isWordPressHref, wordpressHref } from '@/config/wordpress';
import { chooseLocaleAction } from '@/features/account/actions/choose-locale';
import { signOutAction } from '@/features/account/actions/sign-out';
import NavBell from '@/features/notifications/components/nav-bell';
import { BrandMark } from '@/shared';

/*
 * The conference bar — the one navigation for every page of the
 * conference system, on the organisation's site and on the platform
 * alike.
 *
 * It is the bar the WordPress conference pages carry (`[netaim_
 * conference_nav]` in the child theme), drawn here with the same class
 * names, the same order and the same colours, so that a person moving
 * from the site's "Speakers" page to the platform's programme and on
 * to their own schedule sees one bar the whole way. Two rows: the
 * organisation's mark with the language switch, and the conference's
 * own row — the public pages, then the doorway.
 *
 *   public    הכנס · דוברים · תוכנית · מידע · נטוורקינג
 *   doorway   signed out: התחברות · הרשמה
 *             signed in:  the bell · the person's chip · התנתקות ·
 *                         האזור שלי ▾ (הלו״ז שלי, הפעילויות שלי,
 *                         הפרופיל שלי, הודעות)
 *
 * Everything it shows arrives resolved: the component is synchronous
 * and serialisable, so the landing's scene renderer (which must stay
 * synchronous) and the personal pages (which resolve the viewer on the
 * server) both hand it the same props. The stylesheet is
 * `../styles/conference-bar.css`, imported once from globals.
 */
export interface ConferenceBarViewer {
  name: string;
  photoUrl?: string;
  /* A member of the Netaim team: the menu offers the Studio. */
  studio?: boolean;
}

export interface ConferenceBarProps {
  locale: Locale;
  /* The conference the bar belongs to; null when none is open. */
  slug: string | null;
  viewer: ConferenceBarViewer | null;
  /* The organisation's mark for a light ground. */
  brandLogo?: string;
  brand: string;
}

const WORDS = {
  conference: { he: 'הכנס', en: 'Event' },
  speakers: { he: 'דוברים', en: 'Speakers' },
  program: { he: 'תוכנית', en: 'Program' },
  info: { he: 'מידע', en: 'Info' },
  networking: { he: 'נטוורקינג', en: 'Networking' },
  enter: { he: 'התחברות', en: 'Sign in' },
  register: { he: 'הרשמה', en: 'Register' },
  schedule: { he: 'הלו״ז שלי', en: 'My Schedule' },
  profile: { he: 'הפרופיל שלי', en: 'My Profile' },
  messages: { he: 'הודעות', en: 'Messages' },
  studio: { he: 'סטודיו', en: 'Studio' },
  myArea: { he: 'האזור שלי', en: 'My area' },
  areaLabel: { he: 'האזור האישי בפלטפורמת הכנס', en: 'Your personal area on the conference platform' },
  navLabel: { he: 'ניווט בכנס', en: 'Conference navigation' },
  signedIn: { he: 'מחובר/ת', en: 'Signed in' },
  signOut: { he: 'התנתקות', en: 'Sign out' },
  language: { he: 'EN', en: 'עברית' },
} as const;

const initialOf = (name: string): string => name.trim().charAt(0).toUpperCase() || '·';

const ConferenceBar = ({ locale, slug, viewer, brandLogo, brand }: ConferenceBarProps) => {
  const pathname = usePathname() ?? `/${locale}`;
  const t = (key: keyof typeof WORDS) => WORDS[key][locale];
  const other: Locale = locale === 'he' ? 'en' : 'he';
  const home = wordpressHref('home', locale);
  const conf = slug ? `/${locale}/events/${slug}` : null;

  const publicLinks: { key: string; href: string; label: string }[] = [
    { key: 'hub', href: wordpressHref('conferences', locale), label: t('conference') },
    { key: 'speakers', href: wordpressHref('conferenceSpeakers', locale), label: t('speakers') },
    /*
     * The programme is the platform's own agenda, not the WordPress
     * listing. A participant reads it to register for activities, and
     * WordPress has no way to register anyone -- sending "תוכנית" there
     * left a reader on a page where the one thing they came to do was
     * impossible, and, since the edge collapses every locale onto one
     * page, in English. `/agenda` rather than `/program` because the
     * edge gives every address ending in `/program` to WordPress.
     */
    ...(conf ? [{ key: 'program', href: `${conf}/agenda`, label: t('program') }] : []),
    { key: 'info', href: wordpressHref('conferenceInfo', locale), label: t('info') },
    { key: 'networking', href: `/${locale}/me/networking`, label: t('networking') },
  ];
  const area: { key: string; href: string; label: string }[] = [
    ...(conf
      ? [
          /* The personal day: one page, my-activities. */
          { key: 'schedule', href: `${conf}/my-activities`, label: t('schedule') },
        ]
      : []),
    { key: 'profile', href: `/${locale}/me/profile`, label: t('profile') },
    { key: 'messages', href: `/${locale}/me/messages`, label: t('messages') },
  ];

  /* A platform address is current when the page is it or under it. */
  const isCurrent = (href: string): boolean =>
    !isWordPressHref(href) && (pathname === href || pathname.startsWith(`${href}/`));

  const link = (item: { key: string; href: string; label: string }, className = '') => {
    const current = isCurrent(item.href);
    const cls = `nt-conf-nav__link${current ? ' is-current' : ''}${className ? ` ${className}` : ''}`;
    return isWordPressHref(item.href) ? (
      <a key={item.key} href={item.href} className={cls} data-nt-dest={item.key}>
        {item.label}
      </a>
    ) : (
      <Link key={item.key} href={item.href} className={cls} aria-current={current ? 'page' : undefined} data-nt-dest={item.key}>
        {item.label}
      </Link>
    );
  };

  return (
    <header className="nt-bar" dir={locale === 'he' ? 'rtl' : 'ltr'}>
      <div className="nt-bar__brand">
        <a href={home} aria-label={brand} className="nt-bar__logo">
          <BrandMark brand={brand} src={brandLogo} height={44} textClassName="nt-bar__wordmark" />
        </a>
        <form
          action={chooseLocaleAction}
          className="nt-bar__lang"
          /* The same page in the other language, query included: a
             sign-in mid-way, a chosen day, a filter all carry over. */
          onSubmit={(event) => {
            const next = event.currentTarget.elements.namedItem('next');
            if (next instanceof HTMLInputElement) {
              next.value = `${pathname}${window.location.search}`;
            }
          }}
        >
          <input type="hidden" name="to" value={other} />
          <input type="hidden" name="next" value={pathname} />
          <button type="submit" className="nt-bar__lang-button">
            {t('language')}
          </button>
        </form>
      </div>

      <nav className="nt-conf-nav" aria-label={t('navLabel')}>
        <ul className="nt-conf-nav__list nt-conf-nav__list--public">
          {publicLinks.map((item) => (
            <li key={item.key} className="nt-conf-nav__item">
              {link(item, item.key === 'networking' ? 'nt-conf-nav__link--networking' : '')}
            </li>
          ))}
        </ul>
        <ul className="nt-conf-nav__list nt-conf-nav__list--app">
          <li className="nt-conf-nav__item nt-conf-nav__item--doorway">
            {viewer ? (
              <ul className="nt-conf-nav__doorway nt-conf-nav__doorway--me">
                <li className="nt-conf-nav__item nt-conf-nav__item--bell">
                  <NavBell locale={locale} />
                </li>
                <li className="nt-conf-nav__item">
                  <Link href={`/${locale}/me/profile`} className="nt-conf-nav__me" title={t('areaLabel')} data-nt-dest="profile">
                    <span className="nt-conf-nav__avatar" aria-hidden="true">
                      {viewer.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={viewer.photoUrl} alt="" />
                      ) : (
                        initialOf(viewer.name)
                      )}
                    </span>
                    <span className="nt-conf-nav__me-text">
                      <span className="nt-conf-nav__me-status">{t('signedIn')}</span>
                      {/* The first name on the chip; the whole name for a screen reader. */}
                      <span className="nt-conf-nav__me-name" aria-hidden="true">
                        {viewer.name.trim().split(/\s+/)[0] || viewer.name}
                      </span>
                      <span className="sr-only">{viewer.name}</span>
                    </span>
                  </Link>
                </li>
                <li className="nt-conf-nav__item">
                  <form action={signOutAction}>
                    <input type="hidden" name="locale" value={locale} />
                    <button type="submit" className="nt-conf-nav__signout">
                      {t('signOut')}
                    </button>
                  </form>
                </li>
              </ul>
            ) : (
              <ul className="nt-conf-nav__doorway">
                {conf ? (
                  <>
                    <li className="nt-conf-nav__item nt-conf-nav__item--app">
                      <Link href={`${conf}/enter`} className="nt-conf-nav__link nt-conf-nav__link--enter" data-nt-dest="enter">
                        {t('enter')}
                      </Link>
                    </li>
                    <li className="nt-conf-nav__item nt-conf-nav__item--app">
                      <Link href={`${conf}/register`} className="nt-conf-nav__link nt-conf-nav__link--register" data-nt-dest="register">
                        {t('register')}
                      </Link>
                    </li>
                  </>
                ) : (
                  /* No conference open: the door is the personal area, and
                     registering means joining the organisation's site. */
                  <>
                    <li className="nt-conf-nav__item nt-conf-nav__item--app">
                      <Link href={`/${locale}/me`} className="nt-conf-nav__link nt-conf-nav__link--enter" data-nt-dest="enter">
                        {t('enter')}
                      </Link>
                    </li>
                    <li className="nt-conf-nav__item nt-conf-nav__item--app">
                      <a href={home} className="nt-conf-nav__link nt-conf-nav__link--register" data-nt-dest="register">
                        {t('register')}
                      </a>
                    </li>
                  </>
                )}
              </ul>
            )}
          </li>
          <li className="nt-conf-nav__item nt-conf-nav__item--area">
            <details className="nt-conf-nav__area">
              <summary className="nt-conf-nav__link nt-conf-nav__link--area" aria-label={t('areaLabel')}>
                {t('myArea')}
              </summary>
              <ul className="nt-conf-nav__menu">
                {area.map((item) => (
                  <li key={item.key} className="nt-conf-nav__item nt-conf-nav__item--app">
                    {link(item)}
                  </li>
                ))}
                {viewer?.studio ? (
                  /*
                   * A plain anchor: the Studio is another root layout, and a
                   * client-side hop between the two would be a full load anyway.
                   */
                  <li className="nt-conf-nav__item nt-conf-nav__item--app nt-conf-nav__item--studio">
                    <a href={withBasePath('/studio')} className="nt-conf-nav__link nt-conf-nav__link--studio" data-nt-dest="studio">
                      {t('studio')}
                    </a>
                  </li>
                ) : null}
              </ul>
            </details>
          </li>
        </ul>
      </nav>
    </header>
  );
};

export default ConferenceBar;
