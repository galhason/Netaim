import { getStudioLocale, WORKSPACE_MESSAGES } from '@/features/studio';
import { reviewLaunch } from '@/features/events';
import { launchExperienceAction } from '../../actions';

interface OverviewPageProps {
  params: Promise<{ slug: string }>;
}

const REQUIRED_ACTIONS_SHOWN = 5;

/*
 * Overview is the event's home: readiness, what remains, and the launch
 * action itself. Launch is arrived at here, never navigated to; lifecycle
 * phases are shown as language in the workspace header, never operated.
 */
const EventOverviewPage = async ({ params }: OverviewPageProps) => {
  const { slug } = await params;
  const locale = await getStudioLocale();

  let review = null;
  try {
    review = await reviewLaunch(slug, locale);
  } catch {
    review = null;
  }

  if (!review) {
    return (
      <p className="text-sm text-text-secondary">
        {WORKSPACE_MESSAGES.connectionNeeded[locale]}
      </p>
    );
  }

  const { health } = review;
  const actions = health.requiredActions.slice(0, REQUIRED_ACTIONS_SHOWN);

  return (
    <div className="flex max-w-2xl flex-col gap-12">
      <section className="flex flex-col gap-2">
        <p className="flex items-baseline gap-3">
          <span className="font-display text-6xl font-medium leading-none tracking-tight tabular-nums">
            {health.readinessScore}%
          </span>
          <span className="text-sm text-text-secondary">
            {WORKSPACE_MESSAGES.readyToLaunch[locale]}
          </span>
        </p>
        <p className="text-sm text-text-secondary">
          {review.event.launched
            ? WORKSPACE_MESSAGES.launched[locale]
            : WORKSPACE_MESSAGES.notLaunched[locale]}
        </p>
      </section>

      {actions.length > 0 ? (
        <section className="flex flex-col">
          <h2 className="text-xs font-medium tracking-widest text-text-secondary">
            {WORKSPACE_MESSAGES.requiredActions[locale]}
          </h2>
          {actions.map((finding) => (
            <article
              key={finding.id}
              className="flex flex-col gap-1 border-t border-border py-4 first:mt-3"
            >
              <p className="font-medium">{finding.message[locale]}</p>
              <p className="text-sm text-text-secondary">
                {finding.action[locale]}
              </p>
            </article>
          ))}
        </section>
      ) : null}

      <section className="flex flex-col gap-3">
        {review.event.launched ? (
          <p className="max-w-prose text-text-secondary">
            {WORKSPACE_MESSAGES.alreadyLaunched[locale]}
          </p>
        ) : review.canLaunch ? (
          <form action={launchExperienceAction}>
            <input type="hidden" name="slug" value={review.event.slug} />
            <input type="hidden" name="contentLocale" value={locale} />
            <button
              type="submit"
              className="inline-flex min-h-14 items-center justify-center self-start rounded-lg bg-brand px-10 text-lg font-medium text-brand-contrast"
            >
              {WORKSPACE_MESSAGES.launchAction[locale]}
            </button>
          </form>
        ) : (
          <p className="max-w-prose text-text-secondary">
            {WORKSPACE_MESSAGES.launchBlocked[locale]}
          </p>
        )}
      </section>
    </div>
  );
};

export default EventOverviewPage;
