import { notFound, redirect } from 'next/navigation';
import {
  ConsoleShell,
  getStudioCreator,
  getStudioLocale as localeOf,
} from '@/features/studio';
import { getActiveConferenceSlug, listMedia } from '@/features/events';
import { getSessionSituation, getSessionTranslation } from '@/features/program';
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

  /*
   * Both languages, because the wizard shows both rows. The English
   * read asks for English alone — with the fallback on it would arrive
   * full of Hebrew, and the first save would freeze that Hebrew into
   * English for good. Same trap as the conference inspector had.
   */
  const [situation, en] = await Promise.all([
    getSessionSituation(id, locale).catch(() => null),
    getSessionTranslation(id, 'en').catch(() => null),
  ]);
  if (!situation) {
    notFound();
  }
  const s = situation.session;
  const [candidates, media] = await Promise.all([
    listSpeakerCandidates(locale).catch(() => []),
    listMedia().catch(() => []),
  ]);
  const library = media.map((item) => ({
    id: item.id,
    url: item.url,
    alt: item.alt,
  }));

  const initial: WizardInitial = {
    sessionId: s.id,
    title: s.title,
    subtitle: s.subtitle,
    description: s.description,
    titleEn: en?.title,
    subtitleEn: en?.subtitle,
    descriptionEn: en?.description,
    trackEn: en?.track,
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
    image:
      s.imageId && s.image ? { id: s.imageId, url: s.image } : undefined,
  };

  return (
    <ConsoleShell
      locale={locale}
      userName={creator?.name ?? ''}
      breadcrumb={<BackToActivities locale={locale} />}
    >
      <ActivityWizard
        key={locale}
        locale={locale}
        slug={slug}
        candidates={candidates}
        library={library}
        initial={initial}
      />
    </ConsoleShell>
  );
};

/*
 * The response depends on who is asking, so it is rendered per request
 * and never prerendered or shared. Declared rather than left to Next to
 * infer from a cookie read: an inferred guard disappears the moment a
 * refactor moves that read behind a helper, and the failure would be a
 * privacy leak that nothing announces.
 */
export const dynamic = 'force-dynamic';

export default EditActivityPage;
