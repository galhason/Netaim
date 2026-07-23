'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { motion, useReducedMotion } from 'motion/react';
import type { Locale } from '@/config/locales';
import { CINEMATIC_UI, SITE_NAV_LINKS } from '../constants/cinematic-content';
import type { NavSection } from '../types/cinematic';

interface CinematicNavProps {
  locale: Locale;
  registerHref: string;
  meHref: string;
  brand: string;
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
  immediate = false,
}: CinematicNavProps) => {
  const [solid, setSolid] = useState(false);
  const reduce = useReducedMotion();
  const other: Locale = locale === 'he' ? 'en' : 'he';
  const pathname = usePathname();
  /*
   * The language toggle keeps the visitor on the current page in the
   * other locale — swap only the leading locale segment. Jumping to the
   * site root instead threw a visitor back to the landing (and took the
   * page they were reading with it).
   */
  const localeHref =
    pathname && /^\/(he|en)(\/|$)/.test(pathname)
      ? pathname.replace(/^\/(he|en)/, `/${other}`)
      : `/${other}`;

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
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-700 ${
        solid ? 'border-b cine-hair bg-surface/85 backdrop-blur-md' : ''
      }`}
    >
      <nav className="mx-auto flex h-[88px] max-w-7xl items-center justify-between px-6 md:px-14">
        <Link
          href={home}
          className="font-display text-lg font-medium tracking-[0.32em] text-text-primary"
        >
          {brand}
        </Link>

        <div className="hidden items-center gap-9 md:flex">
          {SITE_NAV_LINKS.map((link) => {
            const active = isActive(link.path);
            return (
              <Link
                key={link.key}
                href={`${home}${link.path}`}
                aria-current={active ? 'page' : undefined}
                className={`text-sm tracking-wide transition-colors hover:text-text-primary ${
                  active ? 'text-accent' : 'text-text-secondary'
                }`}
              >
                {link.label[locale]}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-5">
          <Link
            href={localeHref}
            className="text-sm text-text-secondary transition-colors hover:text-text-primary"
          >
            {other === 'he' ? 'עברית' : 'EN'}
          </Link>
          <Link
            href={meHref}
            className="hidden text-sm text-text-secondary transition-colors hover:text-text-primary sm:inline"
          >
            {CINEMATIC_UI.myArea[locale]}
          </Link>
          <Link
            href={registerHref}
            className="inline-flex min-h-10 items-center rounded-full border border-accent px-6 text-sm font-medium text-accent transition-colors hover:bg-brand hover:text-brand-contrast"
          >
            {CINEMATIC_UI.registerShort[locale]}
          </Link>
        </div>
      </nav>
    </motion.header>
  );
};

export default CinematicNav;
