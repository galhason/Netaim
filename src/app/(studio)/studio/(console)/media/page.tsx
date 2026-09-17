import Image from 'next/image';
import { listMedia } from '@/features/events';
import {
  CONSOLE_UI,
  CSaveButton,
  CTextField,
  ConsoleShell,
  getStudioCreator,
  getStudioLocale,
} from '@/features/studio';
import { uploadMediaAction } from '../actions';

/*
 * The Media Library: every asset the organization's experiences are
 * made of, and one quiet upload row — the engine's panel stays sealed
 * (Constitution v2 §4, §7).
 */
interface MediaPageProps {
  searchParams: Promise<{ upload?: string }>;
}

const NOTE: Record<string, keyof typeof CONSOLE_UI> = {
  ok: 'uploadOk',
  missing: 'uploadMissing',
  type: 'uploadWrongType',
  size: 'uploadTooLarge',
};

const MediaPage = async ({ searchParams }: MediaPageProps) => {
  const locale = await getStudioLocale();
  const creator = await getStudioCreator();
  const { upload } = await searchParams;
  const note = upload ? NOTE[upload] : undefined;
  const media = await listMedia().catch(() => []);

  return (
    <ConsoleShell
      locale={locale}
      userName={creator?.name ?? ''}
      breadcrumb={
        <span className="font-medium text-[var(--c-text)]">
          {CONSOLE_UI.mediaTitle[locale]}
        </span>
      }
    >
      <div className="mx-auto flex h-full max-w-5xl flex-col gap-6 overflow-y-auto px-6 py-8">
        <header>
          <h1 className="font-display text-3xl font-medium">
            {CONSOLE_UI.mediaTitle[locale]}
          </h1>
          <p className="mt-1 text-sm text-[var(--c-text-soft)]">
            {CONSOLE_UI.mediaSub[locale]}
          </p>
        </header>

        <form
          action={uploadMediaAction}
          className="flex flex-wrap items-end gap-4 rounded-xl border border-[var(--c-line)] bg-[var(--c-glass)] p-4"
        >
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-medium tracking-[0.16em] text-[var(--c-text-faint)]">
              {CONSOLE_UI.uploadMedia[locale]}
            </span>
            <input
              type="file"
              name="file"
              accept="image/jpeg,image/png,image/webp,image/avif,image/svg+xml,video/mp4,video/webm"
              required
              className="block text-sm text-[var(--c-text-soft)] file:me-3 file:rounded-lg file:border file:border-[var(--c-line-strong)] file:bg-transparent file:px-4 file:py-2 file:text-sm file:text-[var(--c-text)]"
            />
          </label>
          <div className="min-w-52">
            <CTextField name="alt" label={CONSOLE_UI.uploadAlt[locale]} />
          </div>
          <div className="w-40">
            <CSaveButton label={CONSOLE_UI.uploadMedia[locale]} />
          </div>
          <p className="w-full text-[11px] text-[var(--c-text-faint)]">
            {CONSOLE_UI.uploadNote[locale]}
          </p>
          {note ? (
            <p
              className={`w-full rounded-lg px-3 py-2 text-[11px] ${
                upload === 'ok'
                  ? 'bg-[var(--c-live)]/10 text-[var(--c-live)]'
                  : 'bg-[var(--c-danger)]/10 text-[var(--c-danger-text)]'
              }`}
            >
              {CONSOLE_UI[note][locale]}
            </p>
          ) : null}
        </form>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {media.map((item) => (
            <figure
              key={item.id}
              className="overflow-hidden rounded-xl border border-[var(--c-line)] bg-[var(--c-panel)]"
            >
              <span className="relative block h-32">
                {item.mimeType?.startsWith('video/') ? (
                  /*
                   * Muted, loopless, controls on: the library is where an
                   * operator checks what a file actually is, and sixty
                   * autoplaying films would be sixty downloads.
                   */
                  <video
                    src={item.url}
                    {...(item.posterUrl ? { poster: item.posterUrl } : {})}
                    controls
                    muted
                    preload="metadata"
                    playsInline
                    className="size-full bg-black object-cover"
                  />
                ) : (
                  <Image
                    src={item.url}
                    alt={item.alt}
                    fill
                    sizes="(max-width: 640px) 50vw, 25vw"
                    className="object-cover"
                  />
                )}
              </span>
              <figcaption className="truncate px-3 py-2 text-xs text-[var(--c-text-soft)]">
                {item.alt || item.filename}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
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

export default MediaPage;
