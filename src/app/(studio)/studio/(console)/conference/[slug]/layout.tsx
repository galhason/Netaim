import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { findEvent, getActiveConferenceSlug, getStaffOnlyConferenceSlug } from '@/features/events';
import { ConsoleDenied, ConsoleShell, WorkspaceTabs, getStudioAccess, getStudioLocale } from '@/features/studio';
import { capabilitiesOf, can } from '@/permission-engine';
import { WORKSPACE_UI } from '@/features/studio/constants/workspace-tabs';
import { marketingRepository } from '@/infrastructure';
import { formatDayLabel } from '@/shared';

/*
 * The conference workspace: one frame for everything an organizer does
 * with one conference. The name, the dates and the state of the draft
 * sit in the header; the tabs beneath carry the areas.
 */
interface WorkspaceLayoutProps {
  params: Promise<{ slug: string }>;
  children: ReactNode;
}

const ConferenceWorkspaceLayout = async ({ params, children }: WorkspaceLayoutProps) => {
  const { slug: raw } = await params;
  const slug = decodeURIComponent(raw);
  const [locale, access, summary] = await Promise.all([
    getStudioLocale(),
    getStudioAccess(),
    findEvent(slug).catch(() => null),
  ]);
  if (!summary) {
    notFound();
  }
  /* The workspace is for those who shape the conference. */
  if (!access || !can(access.grants, 'events:manage', slug)) {
    return <ConsoleDenied locale={locale} title={summary.title} userName={access?.creator.name ?? ''} />;
  }
  const creator = access.creator;
  const capabilities = capabilitiesOf(access.grants, slug);
  const [activeSlug, staffOnlySlug, published] = await Promise.all([
    getActiveConferenceSlug(locale).catch(() => null),
    getStaffOnlyConferenceSlug().catch(() => null),
    marketingRepository.findPublishedIdentity(slug, locale).catch(() => null),
  ]);
  const isActive = activeSlug === slug;
  const state = summary.launched
    ? 'live'
    : published
      ? 'changes'
      : 'draft';
  const dates = summary.startsAt
    ? `${formatDayLabel(summary.startsAt, locale)}${
        summary.endsAt ? ` – ${formatDayLabel(summary.endsAt, locale)}` : ''
      }`
    : '';

  return (
    <ConsoleShell
      locale={locale}
      userName={creator?.name ?? ''}
      breadcrumb={
        <>
          <Link href="/studio" className="hover:text-[var(--c-text)]">
            {WORKSPACE_UI.allConferences[locale]}
          </Link>
          <span aria-hidden="true">/</span>
          <span className="font-medium text-[var(--c-text)]">{summary.title}</span>
        </>
      }
    >
      <div className="flex h-full min-h-0 flex-col">
        <div className="border-b border-[var(--c-line)]">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-6 pt-5 pb-3">
            <h1 className="text-2xl font-semibold text-[var(--c-text)]">{summary.title}</h1>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-medium tracking-[0.06em] ${
                state === 'live'
                  ? 'bg-[rgba(52,211,153,0.15)] text-[var(--c-live)]'
                  : state === 'changes'
                    ? 'bg-[rgba(245,158,11,0.15)] text-[var(--c-bronze)]'
                    : 'bg-[rgba(255,255,255,0.08)] text-[var(--c-text-soft)]'
              }`}
            >
              {state === 'live' ? WORKSPACE_UI.live[locale] : state === 'changes' ? WORKSPACE_UI.changes[locale] : WORKSPACE_UI.draft[locale]}
            </span>
            {staffOnlySlug === slug ? (
              <span className="rounded-full bg-[rgba(245,158,11,0.15)] px-2 py-0.5 text-[11px] font-medium tracking-[0.06em] text-[var(--c-bronze)]">
                {WORKSPACE_UI.staffOnly[locale]}
              </span>
            ) : null}
            {dates ? <span className="text-sm text-[var(--c-text-soft)]">{dates}</span> : null}
            {!isActive ? (
              <span className="basis-full text-xs text-[var(--c-text-faint)]">{WORKSPACE_UI.notActive[locale]}</span>
            ) : null}
          </div>
          <WorkspaceTabs slug={slug} locale={locale} isActiveConference={isActive} capabilities={capabilities} />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </ConsoleShell>
  );
};

export const dynamic = 'force-dynamic';

export default ConferenceWorkspaceLayout;
