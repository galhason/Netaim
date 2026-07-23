import { currentOrganization } from '@/features/studio/services/studio-settings';
import {
  getStudioCreator,
  getStudioLocale,
  STUDIO_AREAS,
  WORKSPACE_MESSAGES,
} from '@/features/studio';
import {
  renameOrganizationAction,
  updateProfileNameAction,
} from '../actions';

const area = STUDIO_AREAS.find((entry) => entry.id === 'organization');

const SETTINGS_LABELS = {
  organizationName: { he: 'שם הארגון', en: 'Organization name' },
  yourName: { he: 'השם שלך', en: 'Your name' },
  organizationSection: { he: 'הארגון', en: 'Organization' },
  profileSection: { he: 'הפרופיל שלך', en: 'Your profile' },
  organizationHint: {
    he: 'השם שמופיע ליד האירועים שלכם.',
    en: 'The name shown beside your events.',
  },
  profileHint: {
    he: 'איך אתם מופיעים בסטודיו.',
    en: 'How you appear across the Studio.',
  },
} as const;

const labelClass = 'text-xs tracking-widest text-text-secondary';
const fieldClass = 'border-b border-border bg-transparent py-1.5 outline-none';
const saveClass =
  'inline-flex min-h-11 items-center font-medium underline decoration-current/40 underline-offset-8 transition-colors hover:decoration-current';

const StudioSettingsPage = async () => {
  const locale = await getStudioLocale();
  const creator = await getStudioCreator();

  let organization = null;
  let available = true;
  try {
    organization = await currentOrganization();
  } catch {
    available = false;
  }

  return (
    <div className="flex max-w-xl flex-col gap-14">
      <h2 className="font-display text-2xl font-medium">
        {area?.label[locale]}
      </h2>

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h3 className={labelClass}>
            {SETTINGS_LABELS.organizationSection[locale]}
          </h3>
          <p className="text-sm text-text-secondary">
            {SETTINGS_LABELS.organizationHint[locale]}
          </p>
        </div>
        {available && organization ? (
          <form
            action={renameOrganizationAction}
            className="flex flex-wrap items-end gap-x-6 gap-y-3"
          >
            <label className="flex min-w-52 flex-1 flex-col gap-1.5">
              <span className={labelClass}>
                {SETTINGS_LABELS.organizationName[locale]}
              </span>
              <input
                type="text"
                name="name"
                defaultValue={organization.name}
                required
                className={fieldClass}
              />
            </label>
            <button type="submit" className={saveClass}>
              {WORKSPACE_MESSAGES.save[locale]}
            </button>
          </form>
        ) : (
          <p className="text-sm text-text-secondary">
            {available
              ? WORKSPACE_MESSAGES.nothingHere[locale]
              : WORKSPACE_MESSAGES.connectionNeeded[locale]}
          </p>
        )}
      </section>

      <section className="flex flex-col gap-4 border-t border-border pt-10">
        <div className="flex flex-col gap-1">
          <h3 className={labelClass}>
            {SETTINGS_LABELS.profileSection[locale]}
          </h3>
          <p className="text-sm text-text-secondary">
            {SETTINGS_LABELS.profileHint[locale]}
          </p>
        </div>
        <form
          action={updateProfileNameAction}
          className="flex flex-wrap items-end gap-x-6 gap-y-3"
        >
          <label className="flex min-w-52 flex-1 flex-col gap-1.5">
            <span className={labelClass}>
              {SETTINGS_LABELS.yourName[locale]}
            </span>
            <input
              type="text"
              name="name"
              defaultValue={creator?.name ?? ''}
              required
              className={fieldClass}
            />
          </label>
          <button type="submit" className={saveClass}>
            {WORKSPACE_MESSAGES.save[locale]}
          </button>
        </form>
      </section>
    </div>
  );
};

export default StudioSettingsPage;
