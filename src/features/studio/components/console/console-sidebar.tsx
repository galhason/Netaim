'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BRAND_NAME } from '@/config/brand';
import type { Locale } from '@/config/locales';
import { BrandMark } from '@/shared';
import { CONSOLE_UI } from '../../constants/console';

/*
 * The console's navigation, in two bodies: a static navy rail on desktop,
 * and a slide-in drawer on mobile so the stage keeps the full width. Both
 * render the same link list, so the menu never drifts between sizes.
 */
const ITEM =
  'flex w-full items-center rounded-lg px-3 py-2 text-[13px] text-[var(--c-text-soft)] transition-colors hover:bg-white/5 hover:text-[var(--c-text)]';
const SOON =
  'flex w-full cursor-default items-center rounded-lg px-3 py-2 text-[13px] text-[var(--c-text-faint)]';
const GROUP =
  'mb-1.5 mt-5 px-3 text-[9.5px] font-semibold tracking-[0.2em] text-[var(--c-text-faint)]';

interface NavEntry {
  href?: string;
  label: string;
  soon?: boolean;
  /* A number worth interrupting for — shown as a badge beside the link. */
  badge?: number;
}

const buildGroups = (
  locale: Locale,
  openReports: number,
): { title: string; items: NavEntry[] }[] => [
  {
    title: CONSOLE_UI.groupMain[locale],
    items: [
      { href: '/studio', label: CONSOLE_UI.experiences[locale] },
      { href: '/studio/media', label: CONSOLE_UI.media[locale] },
      { href: '/studio/people', label: CONSOLE_UI.peopleTitle[locale] },
      { href: '/studio/participants', label: CONSOLE_UI.participantsTitle[locale] },
      { href: '/studio/logistics', label: CONSOLE_UI.logisticsTitle[locale] },
      { href: '/studio/communications', label: CONSOLE_UI.communications[locale] },
      {
        href: '/studio/reports',
        label: CONSOLE_UI.reportsNav[locale],
        ...(openReports > 0 ? { badge: openReports } : {}),
      },
      { href: '/studio/networking', label: CONSOLE_UI.networkingNav[locale] },
      { href: '/studio/insights', label: CONSOLE_UI.insights[locale] },
      { href: '/studio/history', label: CONSOLE_UI.history[locale] },
    ],
  },
  {
    title: CONSOLE_UI.groupWorkspace[locale],
    items: [
      { href: '/studio/homepage', label: CONSOLE_UI.scenes[locale] },
      { href: '/studio/events', label: CONSOLE_UI.classicStudio[locale] },
      { label: CONSOLE_UI.dockDna[locale], soon: true },
      { href: '/studio/activity', label: CONSOLE_UI.dockActivity[locale] },
    ],
  },
  {
    title: CONSOLE_UI.groupOrg[locale],
    items: [
      { href: '/studio/brand', label: CONSOLE_UI.brandNav[locale] },
      { href: '/studio/organization', label: CONSOLE_UI.organization[locale] },
      { href: '/studio/team', label: CONSOLE_UI.teams[locale] },
      { label: CONSOLE_UI.settings[locale], soon: true },
    ],
  },
];

/*
 * The rail's own mark. The site's logo when there is one — the operator
 * should see the brand they are editing, not a placeholder initial —
 * and the letter and the name when there is not.
 */
const Logo = ({ brandLogo }: { brandLogo?: string }) => (
  <Link
    href="/studio"
    aria-label={BRAND_NAME}
    className="flex items-center gap-2.5 px-2 py-2.5"
  >
    {brandLogo ? (
      <BrandMark brand={BRAND_NAME} src={brandLogo} height={34} />
    ) : (
      <>
        <span className="grid size-7 place-items-center rounded-full border border-[var(--c-bronze)]/50 font-display text-sm text-[var(--c-bronze)]">
          H
        </span>
        <span className="text-[13px] font-semibold tracking-[0.3em] text-[var(--c-text)]">
          {BRAND_NAME}
        </span>
      </>
    )}
  </Link>
);

const NavList = ({
  locale,
  openReports,
  onNavigate,
}: {
  locale: Locale;
  openReports: number;
  onNavigate?: () => void;
}) => (
  <nav className="flex flex-col">
    {buildGroups(locale, openReports).map((group) => (
      <div key={group.title} className="flex flex-col">
        <p className={GROUP}>{group.title}</p>
        {group.items.map((item) =>
          item.soon || !item.href ? (
            <span
              key={item.label}
              className={SOON}
              title={CONSOLE_UI.soon[locale]}
            >
              {item.label}
            </span>
          ) : (
            <Link
              key={item.label}
              href={item.href}
              className={ITEM}
              onClick={onNavigate}
            >
              {item.label}
              {item.badge ? (
                <span className="ms-auto grid min-w-5 place-items-center rounded-full bg-[var(--c-danger)] px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  {item.badge}
                </span>
              ) : null}
            </Link>
          ),
        )}
      </div>
    ))}
  </nav>
);

const ConsoleSidebar = ({
  locale,
  openReports = 0,
  brandLogo,
}: {
  locale: Locale;
  openReports?: number;
  brandLogo?: string;
}) => {
  const [open, setOpen] = useState(false);
  const he = locale === 'he';

  return (
    <>
      {/* Mobile top bar */}
      <div className="flex items-center justify-between bg-[var(--c-void)] px-3 py-2 md:hidden">
        <Logo brandLogo={brandLogo} />
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={he ? 'פתיחת תפריט' : 'Open menu'}
          className="grid size-10 place-items-center rounded-lg text-[var(--c-text-soft)] transition-colors hover:bg-white/5 hover:text-[var(--c-text)]"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Desktop rail */}
      <aside className="hidden flex-col bg-[var(--c-void)] p-3 md:flex">
        <Logo brandLogo={brandLogo} />
        <NavList locale={locale} openReports={openReports} />
      </aside>

      {/* Mobile drawer */}
      {open ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label={he ? 'סגירת תפריט' : 'Close menu'}
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/55"
          />
          <aside className="absolute inset-y-0 end-0 flex w-72 max-w-[85%] flex-col overflow-y-auto bg-[var(--c-void)] p-3 shadow-2xl">
            <div className="flex items-center justify-between">
              <Logo brandLogo={brandLogo} />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={he ? 'סגירת תפריט' : 'Close menu'}
                className="grid size-10 place-items-center rounded-lg text-[var(--c-text-soft)] transition-colors hover:bg-white/5 hover:text-[var(--c-text)]"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
            <NavList
              locale={locale}
              openReports={openReports}
              onNavigate={() => setOpen(false)}
            />
          </aside>
        </div>
      ) : null}
    </>
  );
};

export default ConsoleSidebar;
