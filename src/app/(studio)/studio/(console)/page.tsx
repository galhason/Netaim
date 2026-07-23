import Image from 'next/image';
import Link from 'next/link';
import { getActiveConferenceSlug, listEvents } from '@/features/events';
import {
  archiveEventAction,
  duplicateEventAction,
  launchExperienceAction,
} from '../(classic)/actions';
import { deleteEventAction, setActiveConferenceAction } from './actions';
import { getOpening } from '@/features/opening';
import {
  CONSOLE_UI,
  ConsoleShell,
  getStudioCreator,
  getStudioLocale,
} from '@/features/studio';

/*
 * The Experience Control Center: not a dashboard — a poster wall. The
 * opening experience leads; every launched conference stands beside it
 * as an equal Experience (Constitution v2 §2).
 */
const ConsolePage = async () => {
  const locale = await getStudioLocale();
  const creator = await getStudioCreator();
  const [opening, events, activeSlug] = await Promise.all([
    getOpening(locale),
    listEvents().catch(() => []),
    getActiveConferenceSlug(locale).catch(() => null),
  ]);
  const posterBySlug = new Map(
    opening.posters
      .filter((poster) => poster.slug)
      .map((poster) => [poster.slug as string, poster]),
  );

  return (
    <ConsoleShell
      locale={locale}
      userName={creator?.name ?? ''}
      breadcrumb={
        <span className="font-medium text-[var(--c-text)]">
          {CONSOLE_UI.experiences[locale]}
        </span>
      }
    >
      <div className="mx-auto flex h-full max-w-5xl flex-col gap-6 overflow-y-auto px-6 py-8">
        <header className="flex items-end gap-4">
          <div>
            <h1 className="font-display text-3xl font-medium">
              {CONSOLE_UI.experiences[locale]}
            </h1>
            <p className="mt-1 text-sm text-[var(--c-text-soft)]">
              {CONSOLE_UI.controlSub[locale]}
            </p>
          </div>
          <Link
            href="/studio/new"
            className="ms-auto rounded-lg bg-[var(--c-bronze)] px-5 py-2.5 text-sm font-medium text-[#161006] transition-colors hover:bg-[#dcbe84]"
          >
            {CONSOLE_UI.newExperience[locale]}
          </Link>
        </header>

        <Link
          href="/studio/homepage"
          className="group relative flex min-h-44 items-end overflow-hidden rounded-2xl border border-[var(--c-line)] bg-[var(--c-deep)] p-6 transition-colors hover:border-[var(--c-bronze)]/40"
        >
          <span
            aria-hidden="true"
            className="cine-hero-glow absolute inset-0 opacity-60"
          />
          <span className="relative flex w-full items-end gap-4">
            <span>
              <span className="inline-flex items-center gap-2 rounded-full border border-[var(--c-live)]/40 px-3 py-1 text-[10px] font-medium tracking-widest text-[var(--c-live)]">
                {CONSOLE_UI.live[locale]}
              </span>
              <span className="mt-2 block font-display text-2xl">
                {CONSOLE_UI.homepageName[locale]}
              </span>
              <span className="text-sm text-[var(--c-text-soft)]">
                {CONSOLE_UI.homepageSub[locale]}
              </span>
            </span>
            <span className="ms-auto rounded-lg bg-[var(--c-bronze)] px-5 py-2.5 text-sm font-medium text-[#161006] transition-colors group-hover:bg-[#dcbe84]">
              {CONSOLE_UI.openWorkspace[locale]}
            </span>
          </span>
        </Link>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => {
            const poster = posterBySlug.get(event.slug);
            const isActive = event.slug === activeSlug;
            return (
              <div
                key={event.id}
                className={`group relative rounded-xl border bg-[var(--c-panel)] transition-colors hover:border-[var(--c-bronze)]/40 ${
                  isActive
                    ? 'border-[var(--c-bronze)] ring-1 ring-[var(--c-bronze)]/40'
                    : 'border-[var(--c-line)]'
                }`}
              >
                <details className="absolute end-2 top-2 z-20">
                  <summary className="grid size-7 cursor-pointer list-none place-items-center rounded-lg bg-[rgba(6,9,15,0.65)] text-[var(--c-text-soft)] backdrop-blur-sm transition-colors hover:text-[var(--c-bronze)]">
                    ⋮
                  </summary>
                  <div className="absolute end-0 top-8 z-30 flex w-44 flex-col rounded-xl border border-[var(--c-line-strong)] bg-[var(--c-deep)] p-1.5 shadow-[0_18px_50px_rgba(0,0,0,0.5)]">
                    <Link
                      href={`/studio/experiences/${event.slug}`}
                      className="rounded-lg px-3 py-2 text-xs text-[var(--c-text)] transition-colors hover:bg-[var(--c-bronze)]/15"
                    >
                      {locale === 'he' ? 'פתח סביבת עבודה' : 'Open workspace'}
                    </Link>
                    <a
                      href={`/${locale}/events/${event.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg px-3 py-2 text-xs text-[var(--c-text)] transition-colors hover:bg-[var(--c-bronze)]/15"
                    >
                      {locale === 'he' ? 'תצוגה מקדימה' : 'Preview'}
                    </a>
                    {event.launched && !isActive ? (
                      <form action={setActiveConferenceAction}>
                        <input type="hidden" name="slug" value={event.slug} />
                        <button
                          type="submit"
                          className="w-full rounded-lg px-3 py-2 text-start text-xs text-[var(--c-bronze)] transition-colors hover:bg-[var(--c-bronze)]/15"
                        >
                          {locale === 'he' ? 'הפוך לאתר הפעיל' : 'Set as active site'}
                        </button>
                      </form>
                    ) : null}
                    {isActive ? (
                      <span className="rounded-lg px-3 py-2 text-xs text-[var(--c-live)]">
                        {locale === 'he' ? '✓ האתר הפעיל' : '✓ Active site'}
                      </span>
                    ) : null}
                    <form action={duplicateEventAction}>
                      <input type="hidden" name="slug" value={event.slug} />
                      <button
                        type="submit"
                        className="w-full rounded-lg px-3 py-2 text-start text-xs text-[var(--c-text)] transition-colors hover:bg-[var(--c-bronze)]/15"
                      >
                        {locale === 'he' ? 'שכפול' : 'Duplicate'}
                      </button>
                    </form>
                    {!event.launched ? (
                      <form action={launchExperienceAction}>
                        <input type="hidden" name="slug" value={event.slug} />
                        <button
                          type="submit"
                          className="w-full rounded-lg px-3 py-2 text-start text-xs text-[var(--c-live)] transition-colors hover:bg-[var(--c-live)]/10"
                        >
                          {locale === 'he' ? 'העלאה לאוויר' : 'Publish'}
                        </button>
                      </form>
                    ) : null}
                    <form action={archiveEventAction}>
                      <input type="hidden" name="slug" value={event.slug} />
                      <button
                        type="submit"
                        className="w-full rounded-lg px-3 py-2 text-start text-xs text-[#E39A8B] transition-colors hover:bg-[#B0442F]/10"
                      >
                        {locale === 'he' ? 'העברה לארכיון' : 'Archive'}
                      </button>
                    </form>
                    <details>
                      <summary className="cursor-pointer list-none rounded-lg px-3 py-2 text-xs text-[#E39A8B] transition-colors hover:bg-[#B0442F]/10">
                        {locale === 'he' ? 'מחיקה לצמיתות…' : 'Delete forever…'}
                      </summary>
                      <form action={deleteEventAction} className="p-1">
                        <input type="hidden" name="slug" value={event.slug} />
                        <button
                          type="submit"
                          className="w-full rounded-lg bg-[#B0442F] px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-[#96351F]"
                        >
                          {locale === 'he'
                            ? 'אישור: מחיקת הכנס וכל נתוניו'
                            : 'Confirm: delete conference & all its data'}
                        </button>
                      </form>
                    </details>
                  </div>
                </details>
              <Link
                href={`/studio/experiences/${event.slug}`}
                className="block"
              >
                <span className="relative block h-28 overflow-hidden rounded-t-xl bg-[var(--c-deep)]">
                  {poster ? (
                    <Image
                      src={poster.image}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 100vw, 33vw"
                      className="object-cover opacity-80 transition-opacity group-hover:opacity-100"
                    />
                  ) : (
                    <span
                      aria-hidden="true"
                      className="cine-hero-glow absolute inset-0 opacity-40"
                    />
                  )}
                  <span
                    className={`absolute start-2.5 top-2.5 rounded-full border px-2.5 py-0.5 text-[10px] tracking-widest backdrop-blur-sm ${
                      event.launched
                        ? 'border-[var(--c-live)]/50 bg-[rgba(6,9,15,0.6)] text-[var(--c-live)]'
                        : 'border-[var(--c-bronze)]/50 bg-[rgba(6,9,15,0.6)] text-[var(--c-bronze)]'
                    }`}
                  >
                    {event.launched
                      ? CONSOLE_UI.statusLive[locale]
                      : CONSOLE_UI.statusDraft[locale]}
                  </span>
                </span>
                <span className="block p-4">
                  <span className="block font-display text-lg">{event.title}</span>
                  <span className="block text-xs text-[var(--c-text-soft)]">
                    {poster
                      ? `${poster.dateLabel} · ${poster.location}`
                      : CONSOLE_UI.statusDraft[locale]}
                  </span>
                </span>
              </Link>
              </div>
            );
          })}
        </div>
      </div>
    </ConsoleShell>
  );
};

export default ConsolePage;
