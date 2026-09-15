import Image from 'next/image';
import { listMedia } from '@/features/events';
import {
  EmptyState,
  EMPTY_STATES,
  getStudioLocale,
  WORKSPACE_MESSAGES,
} from '@/features/studio';
import { addMediaAction } from '../../../actions';

interface MediaPageProps {
  searchParams: Promise<{ q?: string }>;
}

const MediaPage = async ({ searchParams }: MediaPageProps) => {
  const { q } = await searchParams;
  const locale = await getStudioLocale();

  let media: Awaited<ReturnType<typeof listMedia>> = [];
  let available = true;
  try {
    media = await listMedia(q);
  } catch {
    available = false;
  }

  return (
    <div className="flex flex-col gap-10">
      {available ? (
        <div className="flex flex-wrap items-end gap-x-10 gap-y-4">
          <form method="get" className="flex min-w-52 flex-col gap-1.5">
            <label
              htmlFor="media-search"
              className="text-xs tracking-widest text-text-secondary"
            >
              {WORKSPACE_MESSAGES.searchMedia?.[locale]}
            </label>
            <input
              id="media-search"
              type="search"
              name="q"
              defaultValue={q ?? ''}
              className="border-b border-border bg-transparent py-1.5 outline-none"
            />
          </form>
          <form
            action={addMediaAction}
            className="flex flex-wrap items-end gap-x-6 gap-y-3"
          >
            <label className="flex flex-col gap-1.5">
              <span className="text-xs tracking-widest text-text-secondary">
                {WORKSPACE_MESSAGES.addMedia?.[locale]}
              </span>
              <input
                type="file"
                name="file"
                accept="image/*,video/*,application/pdf"
                required
                className="min-h-11 max-w-56 text-sm"
              />
            </label>
            <label className="flex min-w-44 flex-col gap-1.5">
              <span className="text-xs tracking-widest text-text-secondary">
                {WORKSPACE_MESSAGES.mediaAlt?.[locale]}
              </span>
              <input
                type="text"
                name="alt"
                required
                className="border-b border-border bg-transparent py-1.5 outline-none"
              />
            </label>
            <button
              type="submit"
              className="inline-flex min-h-11 items-center font-medium underline decoration-current/40 underline-offset-8 transition-colors hover:decoration-current"
            >
              {WORKSPACE_MESSAGES.upload?.[locale]}
            </button>
          </form>
        </div>
      ) : (
        <p className="text-sm text-text-secondary">
          {WORKSPACE_MESSAGES.connectionNeeded?.[locale]}
        </p>
      )}
      {media.length > 0 ? (
        <ul className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
          {media.map((item) => (
            <li key={item.id} className="flex flex-col gap-2">
              <div className="relative aspect-[4/3] overflow-hidden bg-border/30">
                {item.url ? (
                  <Image
                    src={item.url}
                    alt={item.alt}
                    fill
                    sizes="(min-width: 1024px) 25vw, 50vw"
                    className="object-cover"
                  />
                ) : null}
              </div>
              <p className="text-sm">{item.alt}</p>
              <p className="text-xs text-text-secondary">{item.filename}</p>
            </li>
          ))}
        </ul>
      ) : available ? (
        q ? (
          <p className="text-sm text-text-secondary">
            {WORKSPACE_MESSAGES.noMatch?.[locale]}
          </p>
        ) : (
          <EmptyState
            title={EMPTY_STATES.media.title[locale]}
            body={EMPTY_STATES.media.body[locale]}
          />
        )
      ) : null}
    </div>
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
