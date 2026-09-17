'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { motion, useReducedMotion } from 'motion/react';
import type { Locale } from '@/config/locales';
import { chooseLocaleAction } from '@/features/account/actions/choose-locale';
import { signOutAction } from '@/features/account/actions/sign-out';
import NavBell from '@/features/notifications/components/nav-bell';
import { BrandMark } from '@/shared';
import { CINEMATIC_UI, SITE_NAV_LINKS } from '../constants/cinematic-content';
import type { NavSection } from '../types/cinematic';

/*
 * Who is looking, as far as the nav needs to know. Just a display name —
 * never the account, never the email. This is resolved per request and
 * must never travel inside a cached experience descriptor, or one
 * visitor's name would be served to the next.
 */
export interface NavViewer {
  name: string;
}

interface CinematicNavProps {
  locale: Locale;
  registerHref: string;
  meHref: string;
  brand: string;
  /*
   * The logo for the cinematic chrome, which is dark. Absent, the name
   * is set in type as it was before there was a logo.
   */
  brandLogo?: string;
  /*
   * The participant's own day. Given, it takes the place Contact used
   * to hold in this row — the pages a person actually returns to are
   * the conference's and their own, and "My schedule" was reachable
   * from some pages and not others for no reason anyone could name.
   */
  scheduleHref?: string;
  /* `null` means nobody is signed in; `undefined` means not resolved. */
  viewer?: NavViewer | null;
  signInHref?: string;
  /*
   * On the landing the nav waits for the hero to speak before it fades
   * in; on inner pages there is no hero, so it should appear at once.
   */
  immediate?: boolean;
  /*
   * Legacy scene-derived anchors — accepted for contract compatibility
   * with the runtime nav scene, but the site navigation is now
   * route-based (product direction v6), so this is intentionally
   * unused.
   */
  sections?: NavSection[];
}

/*
 * The navigation is part of the opening, not a bar above it: it fades in
 * only after the arrival headline has spoken, and gains a glass surface —
 * a single hairline, not a hard rule — once the visitor has left the
 * first frame.
 *
 * The links are the pages of the active conference (Home, Program,
 * Speakers, Information, Networking, Contact) — never an index of
 * conferences. The visitor always feels they are inside one live event.
 */
const NAV_ENTER_DELAY = 1.8;

const CinematicNav = ({
  locale,
  registerHref,
  meHref,
  brand,
  brandLogo,
  scheduleHref,
  viewer = null,
  signInHref,
  immediate = false,
}: CinematicNavProps) => {
  const [solid, setSolid] = useState(false);
  const reduce = useReducedMotion();
  const other: Locale = locale === 'he' ? 'en' : 'he';
  const pathname = usePathname();
  /*
   * Switching language is a preference, not a link: the choice is saved
   * (on the account when signed in) and only then does the visitor land
   * on the same page in the other language. A plain link would be sent
   * straight back by the middleware, which honours the saved language.
   */
  const currentPath = pathname ?? `/${locale}`;

  const home = `/${locale}`;
  const isActive = (path: string): boolean => {
    const href = `${home}${path}`;
    if (path === '') {
      return pathname === home || pathname === `${home}/`;
    }
    return pathname === href || pathname?.startsWith(`${href}/`) === true;
  };

  useEffect(() => {
    const onScroll = () => {
      setSolid(window.scrollY > window.innerHeight * 1.4);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <motion.header
      initial={reduce ? false : { opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 1.2,
        delay: reduce || immediate ? 0 : NAV_ENTER_DELAY,
        ease: [0.16, 1, 0.3, 1],
      }}
      className={`fixed inset-x-0 top-[var(--announcement-h,0px)] z-50 transition-colors duration-700 ${
        solid ? 'border-b cine-hair bg-surface/85 backdrop-blur-md' : ''
      }`}
    >
      {/*
       * The English labels are longer than the Hebrew ones, so the row is
       * given the full editorial width and gaps that open up only when
       * there is room for them. Nothing is allowed to wrap or collide.
       */}
      <nav className="mx-auto flex h-[88px] max-w-[1560px] items-center justify-between gap-6 px-6 md:px-10 lg:px-14">
        <Link
          href={home}
          aria-label={brand}
          className="flex flex-none items-center whitespace-nowrap"
        >
          <BrandMark
            brand={brand}
            src={brandLogo}
            height={46}
            textClassName="font-display text-lg font-medium tracking-[0.22em] text-text-primary lg:tracking-[0.32em]"
          />
        </Link>

        <div className="hidden items-center gap-5 md:flex lg:gap-7 xl:gap-9">
          {SITE_NAV_LINKS.map((link) => {
            const active = isActive(link.path);
            return (
              <Link
                key={link.key}
                href={`${home}${link.path}`}
                aria-current={active ? 'page' : undefined}
                className={`whitespace-nowrap text-sm tracking-wide transition-colors hover:text-text-primary ${
                  active ? 'text-accent' : 'text-text-secondary'
                }`}
              >
                {link.label[locale]}
              </Link>
            );
          })}
          {scheduleHref ? (
            <Link
              href={scheduleHref}
              aria-current={pathname === scheduleHref ? 'page' : undefined}
              className={`whitespace-nowrap text-sm tracking-wide transition-colors hover:text-text-primary ${
                pathname === scheduleHref ? 'text-accent' : 'text-text-secondary'
              }`}
            >
              {locale === 'he' ? 'הלוז שלי' : 'My schedule'}
            </Link>
          ) : null}
        </div>

        <div className="flex flex-none items-center gap-4 lg:gap-5">
          <form action={chooseLocaleAction} className="flex">
            <input type="hidden" name="to" value={other} />
            <input type="hidden" name="next" value={currentPath} />
            <button
              type="submit"
              className="inline-flex min-h-11 cursor-pointer items-center text-sm text-text-secondary transition-colors hover:text-text-primary"
            >
              {other === 'he' ? 'עברית' : 'EN'}
            </button>
          </form>
          {viewer ? <NavBell locale={locale} /> : null}
          {viewer ? (
            /*
             * Signed in: the name is the destination. No "register"
             * button — someone already inside should not be asked to
             * join, and the nav saying so is how a guest knows the site
             * remembers them.
             */
            <Link
              href={meHref}
              className="group inline-flex min-h-10 items-center gap-2.5 whitespace-nowrap rounded-full border border-accent/40 px-4 text-sm text-text-secondary transition-colors hover:border-accent hover:text-text-primary lg:px-5"
            >
              <span
                aria-hidden="true"
                className="grid size-6 flex-none place-items-center rounded-full bg-accent/15 text-[0.7rem] font-semibold text-accent"
              >
                {viewer.name.trim().charAt(0) || '·'}
              </span>
              <span className="hidden sm:inline">
                {viewer.name.trim() || CINEMATIC_UI.myArea[locale]}
              </span>
              <span className="sr-only">
                {CINEMATIC_UI.signedInAs[locale]}
              </span>
            </Link>
          ) : null}
          {viewer ? (
            /*
             * The way out, beside the name. A door that can be entered
             * must be visibly leavable — on a shared or borrowed
             * screen this is the control that matters most, so it is
             * in the bar itself, not behind a menu. The word shows
             * from tablet width up; on a phone the icon stands alone
             * with its name for a screen reader.
             */
            <form action={signOutAction} className="flex">
              <input type="hidden" name="locale" value={locale} />
              <button
                type="submit"
                aria-label={CINEMATIC_UI.signOut[locale]}
                title={CINEMATIC_UI.signOut[locale]}
                className="inline-flex min-h-10 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full px-2 text-sm text-text-secondary transition-colors hover:text-text-primary lg:px-3"
              >
                <svg
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                  className="size-4 rtl:-scale-x-100"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M8 4H4.5A1.5 1.5 0 0 0 3 5.5v9A1.5 1.5 0 0 0 4.5 16H8M12.5 6.5 16 10l-3.5 3.5M16 10H7.5" />
                </svg>
                <span className="hidden lg:inline">{CINEMATIC_UI.signOut[locale]}</span>
              </button>
            </form>
          ) : (
            <>
              <Link
                href={signInHref ?? meHref}
                className="hidden whitespace-nowrap text-sm text-text-secondary transition-colors hover:text-text-primary sm:inline"
              >
                {CINEMATIC_UI.signIn[locale]}
              </Link>
              <Link
                href={registerHref}
                className="inline-flex min-h-10 items-center whitespace-nowrap rounded-full border border-accent px-5 text-sm font-medium text-accent transition-colors hover:bg-brand hover:text-brand-contrast lg:px-6"
              >
                {CINEMATIC_UI.registerShort[locale]}
              </Link>
            </>
          )}
        </div>
      </nav>
    </motion.header>
  );
};

export default CinematicNav;
