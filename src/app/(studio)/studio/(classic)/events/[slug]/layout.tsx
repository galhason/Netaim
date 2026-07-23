import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import {
  DEMO_EVENT_SLUG,
  findEvent,
  isDemoContentEnabled,
} from '@/features/events';
import {
  getStudioLocale,
  PHASE_ADAPTATION,
  PHASE_LABELS,
  WorkspaceJourney,
} from '@/features/studio';
import type { EventSummary } from '@/features/events';

interface WorkspaceLayoutProps {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}

const demoSummary = (slug: string): EventSummary => ({
  id: 'demo',
  slug,
  title: slug,
  phase: 'planning',
  capabilities: ['registration', 'notifications'],
  launched: true,
});

/*
 * Entering an event is entering its own space: the event's name leads,
 * its moment is stated in language, and its areas are calm tabs. Global
 * navigation stays in the rail; nothing here feels administrative.
 */
const WorkspaceLayout = async ({ children, params }: WorkspaceLayoutProps) => {
  const { slug } = await params;
  const locale = await getStudioLocale();

  let event: EventSummary | null = null;
  try {
    event = await findEvent(slug);
  } catch {
    event = null;
  }
  if (!event && isDemoContentEnabled() && slug === DEMO_EVENT_SLUG) {
    event = demoSummary(slug);
  }
  if (!event) {
    notFound();
  }

  const adaptation = PHASE_ADAPTATION[event.phase];

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <span aria-hidden="true" className="block h-px w-16 bg-accent" />
        <h1 className="font-display text-3xl font-medium leading-tight md:text-4xl">
          {event.title}
        </h1>
        <p className="text-sm text-text-secondary">
          {PHASE_LABELS[event.phase]?.[locale]} · {adaptation.focus[locale]}
        </p>
      </header>
      <WorkspaceJourney slug={event.slug} locale={locale} label={event.title} />
      <div className="min-w-0">{children}</div>
    </div>
  );
};

export default WorkspaceLayout;
