import { LOCALE_LABELS, SUPPORTED_LOCALES, type Locale } from '@/config/locales';
import { getEventOpeningDraft, listMedia } from '@/features/events';
import {
  ATMOSPHERE_LABELS,
  CheckboxField,
  EDITOR_MESSAGES,
  FieldGrid,
  FormSection,
  SaveButton,
  SelectField,
  TextAreaField,
  TextField,
  getStudioLocale,
} from '@/features/studio';
import { GUIDING_TONE_KEYS } from '@/shared';
import { saveEventOpeningAction } from '../../../actions';

interface OpeningEditorProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ content?: string }>;
}

const OpeningEditor = async ({ params, searchParams }: OpeningEditorProps) => {
  const { slug } = await params;
  const { content: contentParam } = await searchParams;
  const locale = await getStudioLocale();
  const contentLocale: Locale =
    contentParam === 'en' || contentParam === 'he' ? contentParam : 'he';

  const [draft, media] = await Promise.all([
    getEventOpeningDraft(slug, contentLocale).catch(() => null),
    listMedia().catch(() => []),
  ]);

  if (!draft) {
    return (
      <p className="text-sm text-text-secondary">
        {EDITOR_MESSAGES.notFound?.[locale]}
      </p>
    );
  }

  const mediaOptions = media.map((item) => ({
    value: item.id,
    label: item.alt || item.filename,
  }));
  const atmosphereOptions = GUIDING_TONE_KEYS.map((tone) => ({
    value: tone,
    label: ATMOSPHERE_LABELS[tone]?.[locale] ?? tone,
  }));

  const imageSelect = (
    name: string,
    label: string | undefined,
    value?: string,
  ) => (
    <SelectField
      name={name}
      label={label ?? ''}
      defaultValue={value}
      options={mediaOptions}
      emptyLabel={EDITOR_MESSAGES.noImage?.[locale]}
    />
  );

  return (
    <div className="flex max-w-3xl flex-col gap-10">
      <p className="max-w-xl text-sm leading-relaxed text-text-secondary">
        {EDITOR_MESSAGES.openingIntro?.[locale]}
      </p>

      <nav
        aria-label={EDITOR_MESSAGES.contentLanguage?.[locale]}
        className="flex items-center gap-3 text-sm"
      >
        <span className="text-xs tracking-widest text-text-secondary">
          {EDITOR_MESSAGES.contentLanguage?.[locale]}
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

      <form action={saveEventOpeningAction} className="flex flex-col gap-10">
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="contentLocale" value={contentLocale} />

        <FormSection title={EDITOR_MESSAGES.sectionPortal?.[locale] ?? ''}>
          <TextField
            name="teaser"
            label={EDITOR_MESSAGES.teaser?.[locale] ?? ''}
            defaultValue={draft.teaser}
          />
          <FieldGrid>
            <TextField
              name="location"
              label={EDITOR_MESSAGES.location?.[locale] ?? ''}
              defaultValue={draft.location}
            />
            <SelectField
              name="atmosphere"
              label={EDITOR_MESSAGES.atmosphere?.[locale] ?? ''}
              defaultValue={draft.atmosphere}
              options={atmosphereOptions}
            />
            {imageSelect(
              'posterId',
              EDITOR_MESSAGES.poster?.[locale],
              draft.posterId,
            )}
            {imageSelect(
              'heroImageId',
              EDITOR_MESSAGES.heroBackdrop?.[locale],
              draft.heroImageId,
            )}
          </FieldGrid>
          <CheckboxField
            name="featured"
            label={EDITOR_MESSAGES.featured?.[locale] ?? ''}
            defaultChecked={draft.featured}
          />
        </FormSection>

        <FormSection title={EDITOR_MESSAGES.sectionArrival?.[locale] ?? ''}>
          <TextField
            name="arrivalEyebrow"
            label={EDITOR_MESSAGES.arrivalEyebrow?.[locale] ?? ''}
            defaultValue={draft.arrivalEyebrow}
          />
        </FormSection>

        <FormSection title={EDITOR_MESSAGES.sectionStory?.[locale] ?? ''}>
          <FieldGrid>
            <TextField
              name="storyEyebrow"
              label={EDITOR_MESSAGES.storyEyebrow?.[locale] ?? ''}
              defaultValue={draft.story.eyebrow}
            />
            <TextField
              name="storyTitle"
              label={EDITOR_MESSAGES.storyTitle?.[locale] ?? ''}
              defaultValue={draft.story.title}
            />
          </FieldGrid>
          <TextAreaField
            name="storyParagraph"
            label={EDITOR_MESSAGES.storyParagraph?.[locale] ?? ''}
            defaultValue={draft.story.paragraph}
          />
          {imageSelect(
            'storyImageId',
            EDITOR_MESSAGES.storyImage?.[locale],
            draft.story.imageId,
          )}
        </FormSection>

        <FormSection title={EDITOR_MESSAGES.sectionQuote?.[locale] ?? ''}>
          <TextAreaField
            name="quoteText"
            label={EDITOR_MESSAGES.quoteText?.[locale] ?? ''}
            defaultValue={draft.quote.text}
            rows={2}
          />
          <FieldGrid>
            <TextField
              name="quoteAttribution"
              label={EDITOR_MESSAGES.quoteAttribution?.[locale] ?? ''}
              defaultValue={draft.quote.attribution}
            />
            <TextField
              name="quoteRole"
              label={EDITOR_MESSAGES.quoteRole?.[locale] ?? ''}
              defaultValue={draft.quote.role}
            />
            <TextField
              name="quoteStatValue"
              label={EDITOR_MESSAGES.quoteStatValue?.[locale] ?? ''}
              defaultValue={draft.quote.statValue}
            />
            <TextField
              name="quoteStatLabel"
              label={EDITOR_MESSAGES.quoteStatLabel?.[locale] ?? ''}
              defaultValue={draft.quote.statLabel}
            />
          </FieldGrid>
          {imageSelect(
            'quoteImageId',
            EDITOR_MESSAGES.storyImage?.[locale],
            draft.quote.imageId,
          )}
        </FormSection>

        <FormSection title={EDITOR_MESSAGES.sectionVenue?.[locale] ?? ''}>
          <FieldGrid>
            <TextField
              name="venueName"
              label={EDITOR_MESSAGES.venueName?.[locale] ?? ''}
              defaultValue={draft.venue.name}
            />
            {imageSelect(
              'venueImageId',
              EDITOR_MESSAGES.storyImage?.[locale],
              draft.venue.imageId,
            )}
          </FieldGrid>
          <TextAreaField
            name="venueNarrative"
            label={EDITOR_MESSAGES.venueNarrative?.[locale] ?? ''}
            defaultValue={draft.venue.narrative}
            rows={2}
          />
        </FormSection>

        <FormSection title={EDITOR_MESSAGES.sectionClosing?.[locale] ?? ''}>
          <TextAreaField
            name="closingLine"
            label={EDITOR_MESSAGES.closingLine?.[locale] ?? ''}
            defaultValue={draft.closing.line}
            rows={2}
          />
          {imageSelect(
            'closingImageId',
            EDITOR_MESSAGES.storyImage?.[locale],
            draft.closing.imageId,
          )}
        </FormSection>

        <SaveButton label={EDITOR_MESSAGES.save?.[locale] ?? ''} />
      </form>
    </div>
  );
};

export default OpeningEditor;
