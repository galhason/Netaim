'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LOCALE_LABELS, SUPPORTED_LOCALES, type Locale } from '@/config/locales';
import { setStudioLocaleAction } from '@/app/(studio)/studio/(classic)/actions';
import { STUDIO_AREAS, STUDIO_MESSAGES } from '../constants/navigation';

interface StudioSidebarProps {
  locale: Locale;
  userName: string;
}

const initials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || '·';

const isActive = (pathname: string, path: string): boolean =>
  path === '/studio' ? pathname === '/studio' : pathname.startsWith(path);

const Wordmark = () => (
  <p className="font-display text-lg font-medium tracking-[0.2em] text-sidebar-text">
    נטעים
    <span className="ms-2 align-middle text-[0.6rem] tracking-[0.35em] text-sidebar-muted">
      STUDIO
    </span>
  </p>
);

const LocaleSwitch = ({ locale }: { locale: Locale }) => (
  <form action={setStudioLocaleAction} className="flex items-center gap-2 text-xs">
    {SUPPORTED_LOCALES.map((entry, index) => (
      <span key={entry} className="flex items-center gap-2">
        {index > 0 ? (
          <span aria-hidden="true" className="text-sidebar-muted/50">
            /
          </span>
        ) : null}
        <button
          type="submit"
          name="locale"
          value={entry}
          aria-pressed={entry === locale}
          className={`min-h-8 ${
            entry === locale
              ? 'font-medium text-sidebar-text'
              : 'text-sidebar-muted transition-colors hover:text-sidebar-text'
          }`}
        >
          {LOCALE_LABELS[entry]}
        </button>
      </span>
    ))}
  </form>
);

const User = ({ userName }: { userName: string }) => (
  <div className="flex items-center gap-3">
    <span
      aria-hidden="true"
      className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sidebar-active font-display text-sm text-sidebar-text"
    >
      {initials(userName)}
    </span>
    <span className="min-w-0 truncate text-sm text-sidebar-text">{userName}</span>
  </div>
);

const StudioSidebar = ({ locale, userName }: StudioSidebarProps) => {
  const pathname = usePathname();

  const navLink = (path: string, label: string, horizontal: boolean) => {
    const active = isActive(pathname, path);
    return (
      <Link
        key={path}
        href={path}
        aria-current={active ? 'page' : undefined}
        className={`inline-flex min-h-11 items-center rounded-md px-3 text-sm transition-colors ${
          horizontal ? '' : 'border-s-2'
        } ${
          active
            ? `bg-sidebar-active font-medium text-sidebar-text ${
                horizontal ? '' : 'border-accent'
              }`
            : `text-sidebar-muted hover:text-sidebar-text ${
                horizontal ? '' : 'border-transparent'
              }`
        }`}
      >
        {label}
      </Link>
    );
  };

  return (
    <>
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-8 border-e border-sidebar-border bg-sidebar px-4 py-6 md:flex">
        <div className="px-3">
          <Wordmark />
        </div>
        <nav
          aria-label={STUDIO_MESSAGES.title[locale]}
          className="flex flex-col gap-1"
        >
          {STUDIO_AREAS.map((area) =>
            navLink(area.path, area.label[locale], false),
          )}
        </nav>
        <div className="mt-auto flex flex-col gap-5 border-t border-sidebar-border pt-5">
          <LocaleSwitch locale={locale} />
          <User userName={userName} />
        </div>
      </aside>

      <header className="flex items-center justify-between gap-4 border-b border-sidebar-border bg-sidebar px-5 py-3 md:hidden">
        <Wordmark />
        <nav
          aria-label={STUDIO_MESSAGES.title[locale]}
          className="flex flex-1 items-center gap-1 overflow-x-auto"
        >
          {STUDIO_AREAS.map((area) =>
            navLink(area.path, area.label[locale], true),
          )}
        </nav>
        <LocaleSwitch locale={locale} />
      </header>
    </>
  );
};

export default StudioSidebar;
