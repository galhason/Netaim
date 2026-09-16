'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Locale } from '@/config/locales';
import { chooseLocaleAction } from '@/features/account/actions/choose-locale';
import { signOutAction } from '@/features/account/actions/sign-out';
import NavBell from '@/features/notifications/components/nav-bell';
import { BrandMark } from '@/shared';
import { Avatar } from '../ui/kit';
import { IconCalendar, IconSearch } from '../ui/icons';

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
  /*
   * The logo for this bar's navy, when the site has one. Absent, the
   * name is written in type exactly as it was before there was a logo.
   */
  brandLogo?: string;
  userName?: string;
  /*
   * Inside a conference the participant's own schedule is a destination,
   * not a setting. Pages that know which conference they belong to pass
   * its address here and the bar grows one more stop; pages that don't
   * (the portal, the landing) leave it out and the bar is unchanged.
   */
  scheduleHref?: string;
}


const Exit = ({ className = '' }: { className?: string }) => (
  <svg
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className={`${className} rtl:-scale-x-100`}
  >
    <path d="M8 4H4.5A1.5 1.5 0 0 0 3 5.5v9A1.5 1.5 0 0 0 4.5 16H8M12.5 6.5 16 10l-3.5 3.5M16 10H7.5" />
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
  brandLogo,
  userName,
  scheduleHref,
}: Props) => {
  const pathname = usePathname();
  const home = `/${locale}`;
  const other: Locale = locale === 'he' ? 'en' : 'he';
  const [open, setOpen] = useState(false);
  const signOutLabel = locale === 'he' ? 'התנתקות' : 'Sign out';

  const isActive = (path: string) => {
    const href = `${home}${path}`;
    return path === ''
      ? pathname === home
      : pathname === href || pathname?.startsWith(`${href}/`);
  };

  const scheduleOn = Boolean(scheduleHref && pathname === scheduleHref);

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
      {scheduleHref ? (
        <Link
          href={scheduleHref}
          onClick={() => setOpen(false)}
          className={`relative inline-flex items-center gap-1.5 py-1.5 text-sm transition-colors ${
            scheduleOn ? 'font-medium text-white' : 'text-white/70 hover:text-white'
          }`}
        >
          <IconCalendar className="size-4" />
          {locale === 'he' ? 'הלוז שלי' : 'My schedule'}
          {scheduleOn ? (
            <span className="absolute inset-x-0 -bottom-0.5 h-0.5 rounded-full bg-[var(--x-primary)]" />
          ) : null}
        </Link>
      ) : null}
    </>
  );

  return (
    <header className="experience sticky top-0 z-50 bg-[var(--x-nav)] shadow-[0_1px_0_rgba(255,255,255,0.06)]">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-6 md:px-10">
        <Link href={home} className="flex flex-none items-center" aria-label={brand}>
          <BrandMark
            brand={brand}
            src={brandLogo}
            height={38}
            textClassName="font-display text-lg font-extrabold tracking-[0.14em] text-white"
          />
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
          {/*
            * The bell opens the notifications, here as everywhere else.
            * It used to be a link to the personal page — the same icon
            * as on the landing, in the same corner, doing something
            * else entirely, which is worse than not having it.
            */}
          {userName ? <NavBell locale={locale} /> : null}
          {/*
            * Language is a preference, not navigation. A plain link to
            * /en could not work: a participant with a stored preference
            * is redirected straight back by the middleware, so the
            * switch appeared to do nothing at all. The action stores the
            * choice first and then moves.
            */}
          <form action={chooseLocaleAction} className="hidden sm:block">
            <input type="hidden" name="to" value={other} />
            <input type="hidden" name="next" value={pathname ?? home} />
            <button
              type="submit"
              className="cursor-pointer rounded-full px-2.5 py-1 text-sm font-medium text-white/70 transition-colors hover:text-white"
            >
              {other === 'en' ? 'EN' : 'עב'}
            </button>
          </form>

          {userName ? (
            <>
              <Link
                href={meHref}
                className="flex items-center gap-2 rounded-full py-1 ps-1 pe-3 transition-colors hover:bg-white/10"
              >
                <Avatar name={userName} size={30} ring={false} />
                <span className="hidden text-sm font-medium text-white sm:block">
                  {userName}
                </span>
              </Link>
              {/*
                * The way out, beside the name — visible in the bar, not
                * behind the menu, because on a borrowed screen it is
                * the control that matters most. On a phone the icon
                * stands alone, named for a screen reader; the menu
                * below repeats it in words.
                */}
              <form action={signOutAction} className="flex">
                <input type="hidden" name="locale" value={locale} />
                <button
                  type="submit"
                  aria-label={signOutLabel}
                  title={signOutLabel}
                  className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full px-2 text-sm text-white/80 transition-colors hover:bg-white/10 hover:text-white md:px-3"
                >
                  <Exit className="size-4" />
                  <span className="hidden md:inline">{signOutLabel}</span>
                </button>
              </form>
            </>
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
          {/*
            * The language belongs in the drawer too. On a phone the
            * desktop switch is hidden, so without this there is no way
            * to change language on the pages most people browse.
            */}
          <form
            action={chooseLocaleAction}
            className="mt-2 border-t border-white/10 pt-2"
          >
            <input type="hidden" name="to" value={other} />
            <input type="hidden" name="next" value={pathname ?? home} />
            <button
              type="submit"
              className="inline-flex items-center gap-2 py-1.5 text-sm text-white/70 transition-colors hover:text-white"
            >
              {other === 'en' ? 'English' : 'עברית'}
            </button>
          </form>
          {userName ? (
            <form action={signOutAction} className="mt-2 border-t border-white/10 pt-2">
              <input type="hidden" name="locale" value={locale} />
              <button
                type="submit"
                className="inline-flex items-center gap-2 py-1.5 text-sm text-white/70 transition-colors hover:text-white"
              >
                <Exit className="size-4" />
                {signOutLabel}
              </button>
            </form>
          ) : null}
        </div>
      ) : null}
    </header>
  );
};

export default ExperienceNav;
