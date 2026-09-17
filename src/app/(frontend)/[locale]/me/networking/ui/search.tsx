import Link from 'next/link';
import LiveSearch from './live-search';
import { railChip } from './shared';

/*
 * "Looking for someone?" — the same GET form and query parameters as
 * always (?q, ?conf, ?org, ?open), now live: the client island in
 * live-search.tsx debounces typing onto the very same URL, and the
 * chips below stay plain links (soft-navigating, without scrolling)
 * so search and filters keep composing in the URL exactly as before.
 *
 * The chips are honest about what this platform can actually filter:
 * the organizations in the room with their real counts, and one green
 * chip for people open to meetings. Topic chips would be a taxonomy
 * the system does not keep — a row of buttons that lie.
 */
interface SearchProps {
  he: boolean;
  basePath: string;
  num: (value: number) => string;
  q?: string;
  org?: string;
  conf?: string;
  open?: string;
  joined: { slug: string; title: string }[];
  organizations: [string, number][];
  linkTo: (
    next: Partial<Record<'q' | 'org' | 'conf' | 'open', string | undefined>>,
  ) => string;
}

const NetworkingSearch = ({
  he,
  basePath,
  num,
  q,
  org,
  conf,
  open,
  joined,
  organizations,
  linkTo,
}: SearchProps) => (
  <section id="search" className="scroll-mt-24">
    <h2 className="mb-2.5 font-display text-xl font-semibold md:text-2xl">
      {he ? 'מחפשים מישהו?' : 'Looking for someone?'}
    </h2>
    <LiveSearch
      basePath={basePath}
      he={he}
      q={q}
      org={org}
      conf={conf}
      open={open}
      joined={joined}
      copy={{
        label: he ? 'חיפוש משתתפים' : 'Search participants',
        placeholder: he
          ? 'חיפוש לפי שם, ארגון, תפקיד או תחום עניין…'
          : 'Search by name, organization, role or interest…',
        clear: he ? 'ניקוי החיפוש' : 'Clear search',
        submit: he ? 'חיפוש' : 'Search',
        allConferences: he ? 'כל הכנסים' : 'All conferences',
      }}
    />

    <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
      <Link
        href={linkTo({ org: undefined, open: undefined })}
        scroll={false}
        aria-current={org || open ? undefined : 'true'}
        className={`${railChip} ${
          org || open
            ? 'border-[var(--n-hair)] bg-white text-[var(--n-soft)] hover:border-[var(--n-purple)]/50'
            : 'border-transparent bg-[var(--n-purple)] text-white'
        }`}
      >
        {he ? 'הכל' : 'All'}
      </Link>
      {organizations.slice(0, 12).map(([name, count]) => {
        const active = org === name;
        return (
          <Link
            key={name}
            href={linkTo({ org: active ? undefined : name })}
            scroll={false}
            aria-current={active ? 'true' : undefined}
            className={`${railChip} ${
              active
                ? 'border-transparent bg-[var(--n-purple)] text-white'
                : 'border-[var(--n-hair)] bg-white text-[var(--n-soft)] hover:border-[var(--n-purple)]/50'
            }`}
          >
            {name}
            <span
              className={`tabular-nums ${active ? 'text-white/70' : 'text-[var(--n-faint)]'}`}
            >
              {num(count)}
            </span>
          </Link>
        );
      })}
      <Link
        href={linkTo({ open: open ? undefined : '1' })}
        scroll={false}
        aria-current={open ? 'true' : undefined}
        className={`${railChip} ${
          open
            ? 'border-transparent bg-[var(--n-green)] text-white'
            : 'border-[var(--n-green)]/40 bg-[var(--n-green)]/8 text-[var(--n-green)] hover:border-[var(--n-green)]'
        }`}
      >
        {he ? 'פתוחים לפגישות' : 'Open to meetings'}
      </Link>
    </div>
  </section>
);

export default NetworkingSearch;
