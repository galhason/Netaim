'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Locale } from '@/config/locales';
import { Avatar } from '../ui/kit';
import { IconSearch } from '../ui/icons';

interface NavLink {
  key: string;
  path: string;
  label: Record<Locale, string>;
}

interface Props {
  locale: Locale;
  links: NavLink[];
  registerHref: string;
  meHref: string;
  brand: string;
  userName?: string;
}

const Bell = ({ className = '' }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className={className}
  >
    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.7 21a2 2 0 0 1-3.4 0" />
  </svg>
);

/*
 * The public wayfinding bar for the conference experience — a calm, solid
 * navy rail that stays the same on every participant page, so the product
 * reads as one place. Marketing energy lives on the landing; here the nav
 * is a tool: find a page, search, reach your space, register.
 */
const ExperienceNav = ({
  locale,
  links: navLinks,
  registerHref,
  meHref,
  brand,
  userName,
}: Props) => {
  const pathname = usePathname();
  const home = `/${locale}`;
  const other: Locale = locale === 'he' ? 'en' : 'he';
  const localeHref = pathname
    ? pathname.replace(new RegExp(`^/${locale}(?=/|$)`), `/${other}`)
    : `/${other}`;
  const [open, setOpen] = useState(false);

  const isActive = (path: string) => {
    const href = `${home}${path}`;
    return path === ''
      ? pathname === home
      : pathname === href || pathname?.startsWith(`${href}/`);
  };

  const links = (
    <>
      {navLinks.map((link) => {
        const on = isActive(link.path);
        return (
          <Link
            key={link.key}
            href={`${home}${link.path}`}
            onClick={() => setOpen(false)}
            className={`relative py-1.5 text-sm transition-colors ${
              on ? 'font-medium text-white' : 'text-white/70 hover:text-white'
            }`}
          >
            {link.label[locale]}
            {on ? (
              <span className="absolute inset-x-0 -bottom-0.5 h-0.5 rounded-full bg-[var(--x-primary)]" />
            ) : null}
          </Link>
        );
      })}
    </>
  );

  return (
    <header className="experience sticky top-0 z-50 bg-[var(--x-nav)] shadow-[0_1px_0_rgba(255,255,255,0.06)]">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-6 md:px-10">
        <Link
          href={home}
          className="font-display text-lg font-extrabold tracking-[0.14em] text-white"
        >
          {brand}
        </Link>

        <div className="hidden items-center gap-7 lg:flex">{links}</div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href={`${home}/program`}
            aria-label={locale === 'he' ? 'חיפוש' : 'Search'}
            className="grid size-9 place-items-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            <IconSearch className="size-5" />
          </Link>
          <Link
            href={`${home}/me`}
            aria-label={locale === 'he' ? 'התראות' : 'Notifications'}
            className="relative grid size-9 place-items-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            <Bell className="size-5" />
          </Link>
          <Link
            href={localeHref}
            className="hidden rounded-full px-2.5 py-1 text-sm font-medium text-white/70 transition-colors hover:text-white sm:block"
          >
            {other === 'en' ? 'EN' : 'עב'}
          </Link>

          {userName ? (
            <Link
              href={meHref}
              className="flex items-center gap-2 rounded-full py-1 ps-1 pe-3 transition-colors hover:bg-white/10"
            >
              <Avatar name={userName} size={30} ring={false} />
              <span className="hidden text-sm font-medium text-white sm:block">
                {userName}
              </span>
            </Link>
          ) : (
            <Link
              href={registerHref}
              className="rounded-[var(--x-r-field)] bg-[var(--x-primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--x-primary-strong)]"
            >
              {locale === 'he' ? 'הרשמה' : 'Register'}
            </Link>
          )}

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
            aria-expanded={open}
            className="grid size-9 place-items-center rounded-full text-white/80 hover:bg-white/10 lg:hidden"
          >
            <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round">
              {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </nav>

      {open ? (
        <div className="border-t border-white/10 bg-[var(--x-nav)] px-6 pb-4 pt-2 lg:hidden">
          <div className="flex flex-col gap-1">{links}</div>
        </div>
      ) : null}
    </header>
  );
};

export default ExperienceNav;
