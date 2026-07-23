import { notFound, redirect } from 'next/navigation';
import {
  ConsoleShell,
  getStudioCreator,
  getStudioLocale as localeOf,
} from '@/features/studio';
import { getActiveConferenceSlug } from '@/features/events';
import { getSessionSituation } from '@/features/program';
import { listSpeakerCandidates } from '@/features/speakers';
import { toDateTimeInputValue } from '@/shared';
import ActivityWizard, { type WizardInitial } from '../activity-wizard';
import { BackToActivities } from '../activity-manager';

interface EditActivityPageProps {
  params: Promise<{ id: string }>;
}

/*
 * The same wizard, opened on an existing activity. Its stored content
 * seeds every step; dates are turned back into the venue-local values
 * the datetime inputs expect. Live capacity and registrations belong to
 * the frozen engine and are never edited here.
 */
const EditActivityPage = async ({ params }: EditActivityPageProps) => {
  const { id } = await params;
  const locale = await localeOf();
  const creator = await getStudioCreator();
  const slug = await getActiveConferenceSlug(locale).catch(() => null);
  if (!slug) {
    redirect('/studio/activity');
  }

  const situation = await getSessionSituation(id, locale).catch(() => null);
  if (!situation) {
    notFound();
  }
  const s = situation.session;
  const candidates = await listSpeakerCandidates(locale).catch(() => []);

  const initial: WizardInitial = {
    sessionId: s.id,
    title: s.title,
    subtitle: s.subtitle,
    description: s.description,
    sessionType: s.sessionType,
    speakers: s.speakers,
    startsAt: toDateTimeInputValue(s.startsAt),
    endsAt: toDateTimeInputValue(s.endsAt),
    floor: s.floor,
    track: s.track,
    language: s.language,
    capacity: s.capacity != null ? String(s.capacity) : '',
    waitlistEnabled: s.waitlistEnabled,
    registrationOpensAt: toDateTimeInputValue(s.registrationOpensAt),
    registrationClosesAt: toDateTimeInputValue(s.registrationClosesAt),
    allowCancellation: s.allowCancellation ?? true,
    cancellationDeadline: toDateTimeInputValue(s.cancellationDeadline),
    featured: s.featured,
  };

  return (
    <ConsoleShell
      locale={locale}
      userName={creator?.name ?? ''}
      breadcrumb={<BackToActivities locale={locale} />}
    >
      <ActivityWizard
        locale={locale}
        slug={slug}
        candidates={candidates}
        initial={initial}
      />
    </ConsoleShell>
  );
};

export default EditActivityPage;
