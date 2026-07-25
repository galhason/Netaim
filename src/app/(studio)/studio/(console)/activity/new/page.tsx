import { redirect } from 'next/navigation';
import {
  ConsoleShell,
  getStudioCreator,
  getStudioLocale as localeOf,
} from '@/features/studio';
import { getActiveConferenceSlug, listMedia } from '@/features/events';
import { listSpeakerCandidates } from '@/features/speakers';
import ActivityWizard from '../activity-wizard';
import { BackToActivities } from '../activity-manager';

/*
 * A blank Activity Studio wizard for the active conference. The speaker
 * candidates (existing platform accounts) are read once here so the picker
 * can offer real people. With no active conference there is nothing to
 * attach an activity to, so we return to the manager.
 */
const NewActivityPage = async () => {
  const locale = await localeOf();
  const creator = await getStudioCreator();
  const slug = await getActiveConferenceSlug(locale).catch(() => null);
  if (!slug) {
    redirect('/studio/activity');
  }
  const [candidates, media] = await Promise.all([
    listSpeakerCandidates(locale).catch(() => []),
    listMedia().catch(() => []),
  ]);
  const library = media.map((item) => ({
    id: item.id,
    url: item.url,
    alt: item.alt,
  }));

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
      />
    </ConsoleShell>
  );
};

export default NewActivityPage;
