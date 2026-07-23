import {
  getRegistrationSettings,
  getRegistrationSituation,
  listRegistrations,
  PUBLIC_STATE_LABELS,
  REGISTRATION_MESSAGES,
  type RegistrationSummary,
} from '@/features/registration';
import { getStudioLocale } from '@/features/studio';
import {
  approveRegistrationAction,
  cancelRegistrationAction,
  declineRegistrationAction,
  promoteRegistrationAction,
  saveRegistrationSettingsAction,
} from '../../../actions';

interface RegistrationPageProps {
  params: Promise<{ slug: string }>;
}

const fieldClass = 'border-b border-border bg-transparent py-1.5 outline-none';
const labelClass = 'text-xs tracking-widest text-text-secondary';
const actionClass =
  'inline-flex min-h-11 items-center font-medium underline decoration-current/40 underline-offset-8 transition-colors hover:decoration-current';

const dateValue = (iso?: string): string => (iso ? iso.slice(0, 10) : '');

const RegistrationPage = async ({ params }: RegistrationPageProps) => {
  const { slug } = await params;
  const locale = await getStudioLocale();
  const m = REGISTRATION_MESSAGES;

  let settings = null;
  let situation = null;
  let registrations: RegistrationSummary[] = [];
  try {
    [settings, situation, registrations] = await Promise.all([
      getRegistrationSettings(slug, locale),
      getRegistrationSituation(slug, locale),
      listRegistrations(slug),
    ]);
  } catch {
    settings = null;
  }

  const pending = registrations.filter((r) => r.status === 'pending');
  const waitlisted = registrations.filter((r) => r.status === 'waitlisted');
  const confirmed = registrations.filter((r) => r.status === 'confirmed');
  const person = (registration: RegistrationSummary) =>
    registration.participant.name || registration.participant.email;

  return (
    <div className="flex flex-col gap-14">
      <div className="flex flex-col gap-2">
        <h2 className="font-display text-2xl font-medium">
          {m.studio.title[locale]}
        </h2>
        {!settings ? (
          <p className="max-w-md text-sm text-text-secondary">
            {m.studio.notConfigured[locale]}
          </p>
        ) : null}
      </div>

      {settings && situation ? (
        <section className="flex flex-col gap-3">
          <h3 className="text-xs font-medium tracking-widest text-text-secondary">
            {m.capacity.heading[locale]}
          </h3>
          <p className="text-sm text-text-secondary">
            {PUBLIC_STATE_LABELS[situation.state][locale]}
          </p>
          <p className="flex flex-wrap gap-x-8 gap-y-2 pt-1">
            <span className="flex items-baseline gap-2">
              <span className="font-display text-3xl font-medium tabular-nums">
                {situation.capacity.confirmed}
              </span>
              <span className="text-sm text-text-secondary">
                {m.capacity.confirmed[locale]}
              </span>
            </span>
            {situation.capacity.reserved > 0 ? (
              <span className="flex items-baseline gap-2">
                <span className="font-display text-3xl font-medium tabular-nums">
                  {situation.capacity.reserved}
                </span>
                <span className="text-sm text-text-secondary">
                  {m.capacity.reserved[locale]}
                </span>
              </span>
            ) : null}
            {situation.capacity.waiting > 0 ? (
              <span className="flex items-baseline gap-2">
                <span className="font-display text-3xl font-medium tabular-nums">
                  {situation.capacity.waiting}
                </span>
                <span className="text-sm text-text-secondary">
                  {m.capacity.waiting[locale]}
                </span>
              </span>
            ) : null}
            <span className="flex items-baseline gap-2">
              <span className="font-display text-3xl font-medium tabular-nums">
                {situation.capacity.available ?? '—'}
              </span>
              <span className="text-sm text-text-secondary">
                {situation.capacity.limit === null
                  ? m.capacity.unlimited[locale]
                  : m.capacity.available[locale]}
              </span>
            </span>
          </p>
        </section>
      ) : null}

      {settings ? (
        <section className="flex flex-col gap-6">
          <h3 className="text-xs font-medium tracking-widest text-text-secondary">
            {m.studio.participants[locale]}
          </h3>
          {registrations.length === 0 ? (
            <p className="max-w-md text-sm text-text-secondary">
              {m.studio.noParticipants[locale]}
            </p>
          ) : (
            <div className="flex flex-col gap-8">
              {pending.length > 0 ? (
                <div className="flex flex-col gap-2">
                  <p className={labelClass}>
                    {m.studio.awaitingApproval[locale]}
                  </p>
                  {pending.map((registration) => (
                    <div
                      key={registration.id}
                      className="flex flex-wrap items-baseline gap-x-6 gap-y-1 border-t border-border py-3"
                    >
                      <span className="min-w-40 flex-1 font-medium">
                        {person(registration)}
                      </span>
                      <form action={approveRegistrationAction}>
                        <input type="hidden" name="slug" value={slug} />
                        <input
                          type="hidden"
                          name="registrationId"
                          value={registration.id}
                        />
                        <button type="submit" className={actionClass}>
                          {m.studio.approve[locale]}
                        </button>
                      </form>
                      <form action={declineRegistrationAction}>
                        <input type="hidden" name="slug" value={slug} />
                        <input
                          type="hidden"
                          name="registrationId"
                          value={registration.id}
                        />
                        <button type="submit" className={actionClass}>
                          {m.studio.decline[locale]}
                        </button>
                      </form>
                    </div>
                  ))}
                </div>
              ) : null}

              {waitlisted.length > 0 ? (
                <div className="flex flex-col gap-2">
                  <p className={labelClass}>{m.studio.onWaitlist[locale]}</p>
                  {waitlisted.map((registration) => (
                    <div
                      key={registration.id}
                      className="flex flex-wrap items-baseline gap-x-6 gap-y-1 border-t border-border py-3"
                    >
                      <span className="min-w-40 flex-1 font-medium">
                        {person(registration)}
                      </span>
                      <form action={promoteRegistrationAction}>
                        <input type="hidden" name="slug" value={slug} />
                        <input
                          type="hidden"
                          name="registrationId"
                          value={registration.id}
                        />
                        <button type="submit" className={actionClass}>
                          {m.studio.promote[locale]}
                        </button>
                      </form>
                    </div>
                  ))}
                </div>
              ) : null}

              {confirmed.length > 0 ? (
                <div className="flex flex-col gap-2">
                  <p className={labelClass}>{m.studio.confirmedList[locale]}</p>
                  {confirmed.map((registration) => (
                    <div
                      key={registration.id}
                      className="flex flex-wrap items-baseline gap-x-6 gap-y-1 border-t border-border py-3"
                    >
                      <span className="min-w-40 flex-1">
                        {person(registration)}
                      </span>
                      <form action={cancelRegistrationAction}>
                        <input type="hidden" name="slug" value={slug} />
                        <input
                          type="hidden"
                          name="registrationId"
                          value={registration.id}
                        />
                        <button
                          type="submit"
                          className="inline-flex min-h-11 items-center text-sm text-text-secondary underline decoration-current/30 underline-offset-8 hover:decoration-current"
                        >
                          {m.studio.cancel[locale]}
                        </button>
                      </form>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          )}
        </section>
      ) : null}

      <details open={!settings} className="flex flex-col gap-6">
        <summary className="cursor-pointer text-xs font-medium tracking-widest text-text-secondary">
          {m.studio.adjust[locale]}
        </summary>
        <form
          action={saveRegistrationSettingsAction}
          className="mt-6 flex max-w-xl flex-col gap-6"
        >
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="contentLocale" value={locale} />

          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>{m.studio.whoCanAttend[locale]}</span>
            <select
              name="mode"
              defaultValue={settings?.mode ?? 'open'}
              className={fieldClass}
            >
              <option value="open">{m.studio.modeOpen[locale]}</option>
              <option value="approval">{m.studio.modeApproval[locale]}</option>
              <option value="invitation">
                {m.studio.modeInvitation[locale]}
              </option>
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>{m.studio.howManyPlaces[locale]}</span>
            <input
              type="number"
              name="capacity"
              min={1}
              defaultValue={settings?.capacity ?? undefined}
              placeholder={m.studio.placesHint[locale]}
              className={fieldClass}
            />
          </label>

          <div className="flex flex-wrap gap-x-8 gap-y-6">
            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>{m.studio.opensWhen[locale]}</span>
              <input
                type="date"
                name="opensAt"
                defaultValue={dateValue(settings?.opensAt)}
                className={fieldClass}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>{m.studio.closesWhen[locale]}</span>
              <input
                type="date"
                name="closesAt"
                defaultValue={dateValue(settings?.closesAt)}
                className={fieldClass}
              />
            </label>
          </div>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              name="waitlistEnabled"
              defaultChecked={settings?.waitlistEnabled ?? false}
              className="size-4"
            />
            <span>{m.studio.waitingList[locale]}</span>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>
              {m.studio.confirmationMessage[locale]}
            </span>
            <textarea
              name="confirmationMessage"
              rows={3}
              defaultValue={settings?.confirmationMessage ?? ''}
              className={`${fieldClass} resize-none`}
            />
          </label>

          <div className="flex flex-col gap-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                name="collectPhone"
                defaultChecked={settings?.collectPhone ?? false}
                className="size-4"
              />
              <span>{m.studio.collectPhone[locale]}</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                name="collectAccessibility"
                defaultChecked={settings?.collectAccessibility ?? false}
                className="size-4"
              />
              <span>{m.studio.collectAccessibility[locale]}</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                name="collectDietary"
                defaultChecked={settings?.collectDietary ?? false}
                className="size-4"
              />
              <span>{m.studio.collectDietary[locale]}</span>
            </label>
          </div>

          <button type="submit" className={`${actionClass} self-start`}>
            {m.studio.save[locale]}
          </button>
        </form>
      </details>
    </div>
  );
};

export default RegistrationPage;
