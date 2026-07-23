import { SpeakerPortrait } from '@/features/experience';
import { listPeople } from '@/features/events';
import {
  EMPTY_STATES,
  getStudioLocale,
  WORKSPACE_MESSAGES,
} from '@/features/studio';
import { addPersonAction } from '../../../actions';

const PEOPLE_COPY = {
  heading: { he: 'האנשים של האירוע', en: 'The event’s people' },
  intro: {
    he: 'הדוברים והמנחים שמספרים את הסיפור.',
    en: 'The speakers and facilitators who tell the story.',
  },
  add: { he: 'להוסיף אדם', en: 'Add a person' },
} as const;

const labelClass = 'text-xs tracking-widest text-text-secondary';
const fieldClass = 'border-b border-border bg-transparent py-1.5 outline-none';

/*
 * People are part of the experience, not records: portraits lead, the
 * add affordance rests quietly beneath. Never a spreadsheet.
 */
const PeoplePage = async () => {
  const locale = await getStudioLocale();

  let people: Awaited<ReturnType<typeof listPeople>> = [];
  let available = true;
  try {
    people = await listPeople();
  } catch {
    available = false;
  }

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-2xl font-medium">
          {PEOPLE_COPY.heading[locale]}
        </h2>
        <p className="text-sm text-text-secondary">
          {PEOPLE_COPY.intro[locale]}
        </p>
      </div>

      {!available ? (
        <p className="text-sm text-text-secondary">
          {WORKSPACE_MESSAGES.connectionNeeded[locale]}
        </p>
      ) : people.length > 0 ? (
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-8">
          {people.map((person) => (
            <SpeakerPortrait
              key={person.id}
              name={person.name}
              role={person.role}
              photoUrl={person.portraitUrl}
              photoAlt={person.name}
            />
          ))}
        </div>
      ) : (
        <p className="max-w-md text-sm text-text-secondary">
          {EMPTY_STATES.people.body[locale]}
        </p>
      )}

      {available ? (
        <details className="flex flex-col gap-4 border-t border-border pt-6">
          <summary className="cursor-pointer text-xs font-medium tracking-widest text-text-secondary">
            {PEOPLE_COPY.add[locale]}
          </summary>
          <form
            action={addPersonAction}
            className="mt-4 flex max-w-xl flex-wrap items-end gap-x-6 gap-y-3"
          >
            <label className="flex min-w-40 flex-1 flex-col gap-1.5">
              <span className={labelClass}>
                {WORKSPACE_MESSAGES.personName[locale]}
              </span>
              <input type="text" name="name" required className={fieldClass} />
            </label>
            <label className="flex min-w-40 flex-1 flex-col gap-1.5">
              <span className={labelClass}>
                {WORKSPACE_MESSAGES.personRole[locale]}
              </span>
              <input type="text" name="role" className={fieldClass} />
            </label>
            <button
              type="submit"
              className="inline-flex min-h-11 items-center font-medium underline decoration-current/40 underline-offset-8 transition-colors hover:decoration-current"
            >
              {WORKSPACE_MESSAGES.add[locale]}
            </button>
          </form>
        </details>
      ) : null}
    </div>
  );
};

export default PeoplePage;
