import { SUPPORTED_LOCALES, LOCALE_LABELS, type Locale } from '@/config/locales';
import { getEventExperience } from '@/features/events';
import { getStudioLocale, WORKSPACE_MESSAGES } from '@/features/studio';
import { updateVenueAction } from '../../../actions';

interface VenuePageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ content?: string }>;
}

interface VenueContentShape {
  name?: string;
  address?: string;
  description?: string;
  mapUrl?: string;
  mapLabel?: string;
  details?: { id: string; value: string }[];
}

const VenuePage = async ({ params, searchParams }: VenuePageProps) => {
  const { slug } = await params;
  const { content: contentParam } = await searchParams;
  const locale = await getStudioLocale();
  const contentLocale: Locale =
    contentParam === 'en' || contentParam === 'he' ? contentParam : 'he';

  let venue: VenueContentShape | null = null;
  let available = true;
  try {
    const content = await getEventExperience(slug, contentLocale, {
      draft: true,
    });
    const scene = content?.scenes.find((entry) => entry.type === 'venue');
    venue =
      scene && typeof scene.content === 'object' && scene.content !== null
        ? (scene.content as VenueContentShape)
        : null;
  } catch {
    available = false;
  }

  if (!available) {
    return (
      <p className="text-sm text-text-secondary">
        {WORKSPACE_MESSAGES.connectionNeeded?.[locale]}
      </p>
    );
  }

  if (!venue) {
    return (
      <p className="text-sm text-text-secondary">
        {WORKSPACE_MESSAGES.nothingHere?.[locale]}
      </p>
    );
  }

  const detail = (id: string): string =>
    venue?.details?.find((entry) => entry.id === id)?.value ?? '';

  const textField = (
    name: string,
    label: string | undefined,
    value: string,
  ) => (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs tracking-widest text-text-secondary">
        {label}
      </span>
      <input
        type="text"
        name={name}
        defaultValue={value}
        className="border-b border-border bg-transparent py-1.5 outline-none"
      />
    </label>
  );

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <nav
        aria-label={WORKSPACE_MESSAGES.contentLanguage?.[locale]}
        className="flex items-center gap-3 text-sm"
      >
        <span className="text-xs tracking-widest text-text-secondary">
          {WORKSPACE_MESSAGES.contentLanguage?.[locale]}
        </span>
        {SUPPORTED_LOCALES.map((entry) => (
          <a
            key={entry}
            href={`?content=${entry}`}
            aria-current={entry === contentLocale ? 'true' : undefined}
            className={
              entry === contentLocale
                ? 'font-medium text-accent'
                : 'opacity-75 transition-opacity hover:opacity-100'
            }
          >
            {LOCALE_LABELS[entry]}
          </a>
        ))}
      </nav>
      <form action={updateVenueAction} className="flex flex-col gap-5">
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="contentLocale" value={contentLocale} />
        {textField(
          'name',
          WORKSPACE_MESSAGES.venueName?.[locale],
          venue.name ?? '',
        )}
        {textField(
          'address',
          WORKSPACE_MESSAGES.venueAddress?.[locale],
          venue.address ?? '',
        )}
        <label className="flex flex-col gap-1.5">
          <span className="text-xs tracking-widest text-text-secondary">
            {WORKSPACE_MESSAGES.venueDescription?.[locale]}
          </span>
          <textarea
            name="description"
            rows={3}
            defaultValue={venue.description ?? ''}
            className="resize-y border-b border-border bg-transparent py-1.5 leading-relaxed outline-none"
          />
        </label>
        {textField(
          'mapUrl',
          WORKSPACE_MESSAGES.venueMapUrl?.[locale],
          venue.mapUrl ?? '',
        )}
        {textField(
          'mapLabel',
          WORKSPACE_MESSAGES.venueMapLabel?.[locale],
          venue.mapLabel ?? '',
        )}
        {textField(
          'access',
          WORKSPACE_MESSAGES.venueAccess?.[locale],
          detail('access'),
        )}
        {textField(
          'emergency',
          WORKSPACE_MESSAGES.venueEmergency?.[locale],
          detail('emergency'),
        )}
        {textField(
          'parking',
          WORKSPACE_MESSAGES.venueParking?.[locale],
          detail('parking'),
        )}
        {textField(
          'transit',
          WORKSPACE_MESSAGES.venueTransit?.[locale],
          detail('transit'),
        )}
        <button
          type="submit"
          className="inline-flex min-h-12 items-center justify-center self-start rounded-lg bg-brand px-8 font-medium text-brand-contrast"
        >
          {WORKSPACE_MESSAGES.save?.[locale]}
        </button>
      </form>
    </div>
  );
};

export default VenuePage;
