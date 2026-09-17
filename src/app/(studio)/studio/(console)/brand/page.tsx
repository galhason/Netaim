import Link from 'next/link';
import { brandFor } from '@/config/brand';
import {
  getSiteBrand,
  getSiteBrandChoice,
  listMedia,
} from '@/features/events';
import {
  CMediaPicker,
  CSaveButton,
  CONSOLE_UI,
  ConsoleShell,
  WORKSPACE_MESSAGES,
  getStudioCreator,
  getStudioLocale,
  requireCapability,
} from '@/features/studio';
import { BrandMark } from '@/shared';
import { saveBrandAction } from './actions';

/*
 * The logo.
 *
 * One picture, worn by the navigation bar, the footer, the sign-in
 * screen, this rail and the header of every message the platform sends
 * — so it is set once, here, rather than being a file somebody swaps in
 * the source tree.
 *
 * Two fields rather than one, because the platform has two chromes: a
 * daylight page and a navy bar. A single logo drawn on both is how a
 * dark-green wordmark ends up invisible on navy. An organization with
 * one file uploads it once and the light one stands in for both.
 *
 * It carries its own capability gate: the layout above proves only that
 * some grant exists, and changing the mark on every page is the same
 * authority as composing the site itself.
 */
const ConsoleBrandPage = async () => {
  const locale = await getStudioLocale();
  const access = await requireCapability('experiences:manage');
  const creator = await getStudioCreator();
  const [media, current, chosen] = await Promise.all([
    access ? listMedia().catch(() => []) : Promise.resolve([]),
    getSiteBrand(),
    getSiteBrandChoice().catch(() => ({ logo: null, logoOnDark: null })),
  ]);

  const brand = brandFor(locale);

  return (
    <ConsoleShell
      locale={locale}
      userName={creator?.name ?? ''}
      breadcrumb={
        <span className="flex items-center gap-2 text-sm text-[var(--c-text-soft)]">
          <Link
            href="/studio"
            className="transition-colors hover:text-[var(--c-text)]"
          >
            {CONSOLE_UI.backToConsole[locale]}
          </Link>
          <span aria-hidden="true">›</span>
          <span className="font-medium text-[var(--c-text)]">
            {CONSOLE_UI.brandTitle[locale]}
          </span>
        </span>
      }
    >
      <div className="mx-auto flex h-full max-w-3xl flex-col gap-6 overflow-y-auto px-6 py-8">
        <header>
          <h1 className="font-display text-3xl font-medium">
            {CONSOLE_UI.brandTitle[locale]}
          </h1>
          <p className="mt-1 text-sm text-[var(--c-text-soft)]">
            {CONSOLE_UI.brandSub[locale]}
          </p>
        </header>

        {!access ? (
          <p className="text-sm text-[var(--c-text-soft)]">
            {CONSOLE_UI.brandDenied[locale]}
          </p>
        ) : (
          <>
            {/*
              * The preview is the point of the screen: a logo is judged
              * by how it sits on the two backgrounds it will live on,
              * not by its filename. Both are drawn at the size the real
              * chrome draws them.
              */}
            <section className="flex flex-col gap-2">
              <h2 className="text-[10px] font-medium tracking-[0.16em] text-[var(--c-text-faint)]">
                {CONSOLE_UI.brandPreview[locale]}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex h-24 items-center justify-center rounded-xl border border-[var(--c-line)] bg-[var(--nt-dark)] px-4">
                  <BrandMark brand={brand} src={current.onDark} height={38} />
                </div>
                <div className="flex h-24 items-center justify-center rounded-xl border border-[var(--c-line)] bg-[var(--nt-bg)] px-4">
                  <BrandMark brand={brand} src={current.onLight} height={38} />
                </div>
              </div>
            </section>

            <form
              action={saveBrandAction}
              className="flex flex-col gap-6 rounded-xl border border-[var(--c-line)] p-5"
            >
              <div className="flex flex-col gap-1.5">
                <CMediaPicker
                  name="logo"
                  label={CONSOLE_UI.brandOnLight[locale]}
                  {...(chosen.logo ? { defaultValue: chosen.logo } : {})}
                  media={media}
                  emptyLabel={CONSOLE_UI.brandDefault[locale]}
                  kind="image"
                  locale={locale}
                />
                <p className="text-xs text-[var(--c-text-faint)]">
                  {CONSOLE_UI.brandOnLightHint[locale]}
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <CMediaPicker
                  name="logoOnDark"
                  label={CONSOLE_UI.brandOnDark[locale]}
                  {...(chosen.logoOnDark
                    ? { defaultValue: chosen.logoOnDark }
                    : {})}
                  media={media}
                  emptyLabel={CONSOLE_UI.brandDefault[locale]}
                  kind="image"
                  locale={locale}
                />
                <p className="text-xs text-[var(--c-text-faint)]">
                  {CONSOLE_UI.brandOnDarkHint[locale]}
                </p>
              </div>

              <CSaveButton label={WORKSPACE_MESSAGES.save[locale]} />
            </form>
          </>
        )}
      </div>
    </ConsoleShell>
  );
};

/*
 * The response depends on who is asking, so it is rendered per request
 * and never prerendered or shared.
 */
export const dynamic = 'force-dynamic';

export default ConsoleBrandPage;
