'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Locale } from '@/config/locales';
import type { Capability } from '@/permission-engine';
import { WORKSPACE_TABS } from '../../constants/workspace-tabs';

/*
 * The tab row of the conference workspace. Highlights by the path the
 * browser is on, so a tab that leads to an organization-wide screen
 * lights up there too.
 */
const WorkspaceTabs = ({
  slug,
  locale,
  isActiveConference,
  capabilities,
}: {
  slug: string;
  locale: Locale;
  isActiveConference: boolean;
  capabilities: readonly Capability[];
}) => {
  const pathname = usePathname() ?? '';
  const base = `/studio/conference/${encodeURIComponent(slug)}`;
  return (
    <nav aria-label={locale === 'he' ? 'אזורי הכנס' : 'Conference areas'} className="flex gap-1 overflow-x-auto px-3">
      {WORKSPACE_TABS.filter((tab) => capabilities.includes(tab.needs)).map((tab) => {
        const href = tab.scoped ? `${base}/${tab.path}` : tab.path;
        const current = tab.scoped
          ? pathname.startsWith(href)
          : pathname === tab.path || pathname.startsWith(`${tab.path}/`);
        const dimmed = !tab.scoped && !isActiveConference;
        return (
          <Link
            key={tab.id}
            href={href}
            aria-current={current ? 'page' : undefined}
            className={`-mb-px shrink-0 border-b-2 px-3 py-2.5 text-sm transition-colors ${
              current
                ? 'border-[var(--c-bronze)] text-[var(--c-text)]'
                : 'border-transparent text-[var(--c-text-soft)] hover:text-[var(--c-text)]'
            } ${dimmed ? 'opacity-60' : ''}`}
          >
            {tab.label[locale]}
          </Link>
        );
      })}
    </nav>
  );
};

export default WorkspaceTabs;
