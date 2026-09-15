import Link from 'next/link';
import type { Locale } from '@/config/locales';

/*
 * The thumb bar — mobile only, and every stop on it is real: three are
 * anchors into this very page (discovery, search, meetings) and one is
 * the existing messages page, wearing the true unread count. Nothing
 * here pretends to be app navigation; it is four links a phone-holding
 * guest reaches without moving their hand. Hidden on desktop, where
 * the whole page is one glance anyway.
 */
const ICONS = {
  discover: (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="m15.5 8.5-2 5-5 2 2-5z" />
    </svg>
  ),
  search: (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </svg>
  ),
  messages: (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a8 8 0 0 1-8 8H4l1.5-3.2A8 8 0 1 1 21 12Z" />
    </svg>
  ),
  meetings: (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
      <rect x="4" y="5.5" width="16" height="15" rx="2.5" />
      <path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" />
    </svg>
  ),
} as const;

const itemClass =
  'flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium text-[var(--n-soft)] transition-colors hover:text-[var(--n-purple)]';

const MobileNav = ({
  locale,
  he,
  unreadTotal,
  num,
}: {
  locale: Locale;
  he: boolean;
  unreadTotal: number;
  num: (value: number) => string;
}) => (
  <nav
    aria-label={he ? 'ניווט הקהילה' : 'Community navigation'}
    className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--n-hair)] bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
  >
    <div className="mx-auto flex max-w-md items-stretch px-2 py-1.5">
      <a href="#discovery" className={itemClass}>
        {ICONS.discover}
        {he ? 'גילוי' : 'Discover'}
      </a>
      <a href="#search" className={itemClass}>
        {ICONS.search}
        {he ? 'חיפוש' : 'Search'}
      </a>
      <Link href={`/${locale}/me/messages`} className={`${itemClass} relative`}>
        <span className="relative">
          {ICONS.messages}
          {unreadTotal > 0 ? (
            <span className="absolute -end-2 -top-1 grid min-w-4 place-items-center rounded-full bg-[var(--n-purple)] px-1 text-[9px] font-semibold tabular-nums text-white">
              {num(unreadTotal)}
            </span>
          ) : null}
        </span>
        {he ? 'הודעות' : 'Messages'}
      </Link>
      <a href="#meetings" className={itemClass}>
        {ICONS.meetings}
        {he ? 'פגישות' : 'Meetings'}
      </a>
    </div>
  </nav>
);

export default MobileNav;
