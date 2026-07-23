'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Locale } from '@/config/locales';
import { WORKSPACE_AREAS } from '../constants/workspace';

interface WorkspaceJourneyProps {
  slug: string;
  locale: Locale;
  label: string;
}

/*
 * The event workspace spine (Studio-Workspace-Architecture §3): a stable
 * side journey on desktop, a wrapping row on narrow widths. Order never
 * changes under the user; the current area is always marked.
 */
const WorkspaceJourney = ({ slug, locale, label }: WorkspaceJourneyProps) => {
  const pathname = usePathname();
  const base = `/studio/events/${slug}`;

  return (
    <nav
      aria-label={label}
      className="flex flex-row flex-wrap items-center gap-x-6 gap-y-1 border-b border-border text-sm"
    >
      {WORKSPACE_AREAS.map((area) => {
        const href = area.segment ? `${base}/${area.segment}` : base;
        const active = area.segment
          ? pathname.startsWith(href)
          : pathname === base;

        return (
          <Link
            key={area.id}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={`-mb-px inline-flex min-h-11 items-center border-b-2 ${
              active
                ? 'border-accent font-medium text-text-primary'
                : 'border-transparent text-text-secondary transition-colors hover:text-text-primary'
            }`}
          >
            {area.label[locale]}
          </Link>
        );
      })}
    </nav>
  );
};

export default WorkspaceJourney;
