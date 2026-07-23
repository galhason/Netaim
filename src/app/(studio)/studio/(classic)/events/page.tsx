import Link from 'next/link';
import {
  DEMO_EVENT_SLUG,
  isDemoContentEnabled,
  listEvents,
} from '@/features/events';
import {
  EmptyState,
  EMPTY_STATES,
  getStudioLocale,
  PHASE_LABELS,
  STUDIO_AREAS,
  WORKSPACE_MESSAGES,
} from '@/features/studio';
import {
  archiveEventAction,
  createEventAction,
  duplicateEventAction,
} from '../actions';

const area = STUDIO_AREAS.find((entry) => entry.id === 'events');

const StudioEventsPage = async () => {
  const locale = await getStudioLocale();

  let events: Awaited<ReturnType<typeof listEvents>> = [];
  let available = true;
  try {
    events = await listEvents();
  } catch {
    available = false;
  }

  return (
    <section aria-label={area?.label[locale]} className="flex flex-col gap-10">
      <h2 className="font-display text-2xl font-medium">
        {area?.label[locale]}
      </h2>
      {available ? (
        <form
          action={createEventAction}
          className="flex max-w-xl flex-wrap items-end gap-x-6 gap-y-3"
        >
          <label className="flex min-w-48 flex-1 flex-col gap-1.5">
            <span className="text-xs tracking-widest text-text-secondary">
              {WORKSPACE_MESSAGES.eventTitle?.[locale]}
            </span>
            <input
              type="text"
              name="title"
              required
              className="border-b border-border bg-transparent py-1.5 outline-none"
            />
          </label>
          <label className="flex min-w-40 flex-col gap-1.5">
            <span className="text-xs tracking-widest text-text-secondary">
              {WORKSPACE_MESSAGES.eventDate?.[locale]}
            </span>
            <input
              type="date"
              name="startsAt"
              className="border-b border-border bg-transparent py-1.5 outline-none"
            />
          </label>
          <button
            type="submit"
            className="inline-flex min-h-11 items-center font-medium underline decoration-current/40 underline-offset-8 transition-colors hover:decoration-current"
          >
            {WORKSPACE_MESSAGES.create?.[locale]}
          </button>
        </form>
      ) : (
        <p className="text-sm text-text-secondary">
          {WORKSPACE_MESSAGES.connectionNeeded?.[locale]}
        </p>
      )}
      {events.length > 0 ? (
        <ul className="flex flex-col">
          {events.map((event) => (
            <li
              key={event.id}
              className="flex flex-wrap items-baseline gap-x-6 gap-y-2 border-t border-border py-4"
            >
              <Link
                href={`/studio/events/${event.slug}`}
                className="min-w-40 flex-1 font-display text-lg font-medium underline-offset-8 hover:underline"
              >
                {event.title}
              </Link>
              <span className="text-sm text-text-secondary">
                {PHASE_LABELS[event.phase]?.[locale]}
              </span>
              <span className="text-sm text-text-secondary">
                {event.launched
                  ? WORKSPACE_MESSAGES.launched?.[locale]
                  : WORKSPACE_MESSAGES.notLaunched?.[locale]}
              </span>
              <span className="flex items-center gap-4 text-sm">
                <form action={duplicateEventAction}>
                  <input type="hidden" name="slug" value={event.slug} />
                  <button
                    type="submit"
                    className="inline-flex min-h-11 items-center underline decoration-current/40 underline-offset-8 transition-colors hover:decoration-current"
                  >
                    {WORKSPACE_MESSAGES.duplicate?.[locale]}
                  </button>
                </form>
                {event.phase !== 'archived' ? (
                  <form action={archiveEventAction}>
                    <input type="hidden" name="slug" value={event.slug} />
                    <button
                      type="submit"
                      className="inline-flex min-h-11 items-center underline decoration-current/40 underline-offset-8 transition-colors hover:decoration-current"
                    >
                      {WORKSPACE_MESSAGES.archive?.[locale]}
                    </button>
                  </form>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      ) : available ? (
        isDemoContentEnabled() ? (
          <p className="text-sm text-text-secondary">
            <Link
              href={`/studio/events/${DEMO_EVENT_SLUG}`}
              className="underline decoration-current/40 underline-offset-8 transition-colors hover:decoration-current"
            >
              {WORKSPACE_MESSAGES.open?.[locale]}
            </Link>
          </p>
        ) : (
          <EmptyState
            title={EMPTY_STATES.events.title[locale]}
            body={EMPTY_STATES.events.body[locale]}
          />
        )
      ) : null}
    </section>
  );
};

export default StudioEventsPage;
