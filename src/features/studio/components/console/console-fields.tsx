'use client';

import { useId, useState } from 'react';
import { useFormStatus } from 'react-dom';

/*
 * The Console's field primitives: dark glass over the deep surface,
 * bronze focus. The inspector is an assistant, not a form — labels are
 * quiet mono lines, inputs blend into the panel.
 */
const LABEL_CLASS =
  'mb-1.5 block text-[10px] font-medium tracking-[0.16em] text-[var(--c-text-faint)]';
const INPUT_CLASS =
  'w-full rounded-lg border border-[var(--c-line)] bg-[rgba(6,10,16,0.6)] px-3 py-2.5 text-sm text-[var(--c-text)] transition-colors focus:border-[var(--c-bronze)]/60 focus:outline-none';

interface CFieldProps {
  name: string;
  label: string;
  defaultValue?: string;
}

export const CTextField = ({ name, label, defaultValue }: CFieldProps) => (
  <label className="block">
    <span className={LABEL_CLASS}>{label}</span>
    <input name={name} defaultValue={defaultValue ?? ''} className={INPUT_CLASS} />
  </label>
);

export const CTextAreaField = ({ name, label, defaultValue }: CFieldProps) => (
  <label className="block">
    <span className={LABEL_CLASS}>{label}</span>
    <textarea
      name={name}
      rows={3}
      defaultValue={defaultValue ?? ''}
      className={`${INPUT_CLASS} resize-none`}
    />
  </label>
);

interface CSelectFieldProps extends CFieldProps {
  options: { value: string; label: string }[];
  emptyLabel?: string;
}

export const CSelectField = ({
  name,
  label,
  defaultValue,
  options,
  emptyLabel,
}: CSelectFieldProps) => (
  <label className="block">
    <span className={LABEL_CLASS}>{label}</span>
    <select name={name} defaultValue={defaultValue ?? ''} className={INPUT_CLASS}>
      <option value="">{emptyLabel ?? '—'}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </label>
);

/*
 * The unified media browser: every image field in the workspace shows
 * the library itself — thumbnails to tap, not identifiers to paste.
 * Pure radios inside the surrounding form, so the existing server
 * actions receive exactly the same field names as before.
 */
interface CMediaItem {
  id: string;
  url: string;
  alt: string;
  filename: string;
  mimeType?: string;
  posterUrl?: string;
}

const isVideo = (item: CMediaItem): boolean =>
  Boolean(item.mimeType?.startsWith('video/'));

/*
 * A tile in the library.
 *
 * A video has no still to show unless one was attached to it, and a
 * `<video>` element in a grid of sixty would have the browser opening
 * sixty connections to draw sixty first frames. So a video without a
 * poster is a film strip and its filename — enough to choose by, and
 * nothing is fetched until the page it is chosen for.
 */
const MediaTile = ({ item }: { item: CMediaItem }) => {
  if (isVideo(item) && !item.posterUrl) {
    return (
      <span className="flex aspect-video w-full flex-col items-center justify-center gap-1 bg-[rgba(255,255,255,0.04)] px-1 text-center">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          aria-hidden="true"
          className="text-[var(--c-bronze)]"
        >
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <path d="M10 9.5v5l4.5-2.5z" fill="currentColor" stroke="none" />
        </svg>
        <span className="line-clamp-2 text-[9px] leading-tight text-[var(--c-text-faint)]">
          {item.filename}
        </span>
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- library thumbnails come straight from the media API
    <img
      src={item.posterUrl ?? item.url}
      alt={item.alt || item.filename}
      loading="lazy"
      className="aspect-video w-full object-cover"
    />
  );
};

interface CMediaPickerProps extends CFieldProps {
  media: CMediaItem[];
  emptyLabel: string;
  /* The wording on the upload control, in the operator's language. */
  uploadLabel?: string;
  locale?: 'he' | 'en';
  /*
   * Which half of the library to offer. A hero's still and a hero's
   * film are two different fields, and showing every file in both is
   * how a video ends up chosen as a photograph — which fails silently,
   * as a broken image, on the live site.
   */
  kind?: 'image' | 'video';
}

/*
 * What the file input will take, by field.
 *
 * An image field that accepts a film would put a video where a section
 * draws a photograph; a film field that accepts a photograph is the
 * same mistake mirrored. A field with no `kind` takes either, which is
 * most of them: a section asks for "the media here".
 */
const ACCEPT: Record<'image' | 'video' | 'either', string> = {
  image: 'image/jpeg,image/png,image/webp,image/avif,image/svg+xml',
  video: 'video/mp4,video/webm',
  either:
    'image/jpeg,image/png,image/webp,image/avif,image/svg+xml,video/mp4,video/webm',
};

const FAILED = {
  he: 'ההעלאה נכשלה. נסו שוב.',
  en: 'The upload failed. Try again.',
} as const;

const REFUSAL: Record<string, { he: string; en: string }> = {
  denied: { he: 'אין הרשאה להעלות.', en: 'Not allowed to upload.' },
  missing: { he: 'לא נבחר קובץ.', en: 'No file chosen.' },
  type: {
    he: 'הפורמט לא נתמך בשדה הזה.',
    en: 'That format is not supported in this field.',
  },
  size: {
    he: 'הקובץ גדול מדי — תמונות עד 10MB, סרטונים עד 200MB.',
    en: 'Too large — images up to 10MB, video up to 200MB.',
  },
  failed: FAILED,
};

export const CMediaPicker = ({
  name,
  label,
  defaultValue,
  media: library,
  emptyLabel,
  kind,
  uploadLabel,
  locale = 'he',
}: CMediaPickerProps) => {
  const inputId = useId();
  const [added, setAdded] = useState<CMediaItem[]>([]);
  const [chosen, setChosen] = useState(defaultValue ?? '');
  const [refusal, setRefusal] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const shown = [...added, ...library];
  const media = kind
    ? shown.filter((item) => (kind === 'video' ? isVideo(item) : !isVideo(item)))
    : shown;
  const current = media.find((item) => item.id === chosen);

  /*
   * Straight into the library and straight into this field. The new
   * item is held in local state as well, because the server's copy of
   * the list was rendered before the file existed.
   */
  const onFile = async (file: File | undefined) => {
    if (!file) {
      return;
    }
    setRefusal(null);
    setUploading(true);
    const body = new FormData();
    body.set('file', file);
    try {
      const response = await fetch('/studio/media/upload', {
        method: 'POST',
        body,
      });
      const outcome = (await response.json()) as
        | { ok: true; media: CMediaItem }
        | { ok: false; reason: string };
      if (!outcome.ok) {
        setRefusal(REFUSAL[outcome.reason]?.[locale] ?? FAILED[locale]);
        return;
      }
      setAdded((held) => [outcome.media, ...held]);
      setChosen(outcome.media.id);
    } catch {
      setRefusal(FAILED[locale]);
    } finally {
      setUploading(false);
    }
  };
  const orphan = Boolean(chosen) && !current;

  return (
    <fieldset className="block">
      <legend className={LABEL_CLASS}>{label}</legend>
      {orphan ? (
        /* The chosen file is not in the visible list — keep its id
         * checked and invisible so an untouched save changes nothing. */
        <input
          type="radio"
          name={name}
          value={chosen}
          checked
          readOnly
          aria-hidden="true"
          tabIndex={-1}
          className="hidden"
        />
      ) : null}
      <div className="grid max-h-56 grid-cols-3 gap-2 overflow-y-auto rounded-lg border border-[var(--c-line)] bg-[rgba(6,10,16,0.6)] p-2">
        <label className="relative block cursor-pointer">
          <input
            type="radio"
            name={name}
            value=""
            checked={chosen === ''}
            onChange={() => setChosen('')}
            className="peer sr-only"
          />
          <span className="grid aspect-video w-full place-items-center rounded-md border border-dashed border-[var(--c-line)] px-1 text-center text-[10px] text-[var(--c-text-faint)] transition-colors peer-checked:border-[var(--c-bronze)] peer-checked:text-[var(--c-bronze)] peer-focus-visible:border-[var(--c-bronze)] hover:text-[var(--c-text-soft)]">
            {emptyLabel}
          </span>
        </label>
        {media.map((item) => (
          <label
            key={item.id}
            className="relative block cursor-pointer"
            title={item.alt || item.filename}
          >
            <input
              type="radio"
              name={name}
              value={item.id}
              checked={item.id === chosen}
              onChange={() => setChosen(item.id)}
              className="peer sr-only"
            />
            <span className="block overflow-hidden rounded-md border border-transparent opacity-75 transition-all peer-checked:border-[var(--c-bronze)] peer-checked:opacity-100 peer-checked:shadow-[0_0_0_1px_var(--c-bronze)] peer-focus-visible:border-[var(--c-bronze)] hover:opacity-100">
              <MediaTile item={item} />
            </span>
          </label>
        ))}
      </div>
      <div className="mt-1 flex items-center gap-2">
        <p className="min-w-0 flex-1 truncate text-[10px] text-[var(--c-text-faint)]">
          {current ? current.alt || current.filename : '\u00a0'}
        </p>
        {/*
          * The way in. A file chosen here joins the library and this
          * field at once — the editor never leaves the page they are
          * directing in order to go and fetch something.
          */}
        <label
          htmlFor={inputId}
          className={`flex-none cursor-pointer rounded-md border border-[var(--c-line-strong)] px-2 py-1 text-[10px] transition-colors ${
            uploading
              ? 'cursor-wait text-[var(--c-text-faint)]'
              : 'text-[var(--c-text-soft)] hover:border-[var(--c-bronze)]/50 hover:text-[var(--c-bronze)]'
          }`}
        >
          {uploading
            ? locale === 'he'
              ? 'מעלה…'
              : 'Uploading…'
            : (uploadLabel ?? (locale === 'he' ? 'העלאה' : 'Upload'))}
        </label>
        <input
          id={inputId}
          type="file"
          accept={ACCEPT[kind ?? 'either']}
          disabled={uploading}
          onChange={(event) => {
            void onFile(event.target.files?.[0]);
            event.target.value = '';
          }}
          className="hidden"
        />
      </div>
      {refusal ? (
        <p className="mt-1 text-[10px] text-[#E39A8B]">{refusal}</p>
      ) : null}
    </fieldset>
  );
};

/*
 * The multi-select sibling for galleries (the homepage moments):
 * checkboxes under the same field name, so FormData.getAll sees the
 * exact shape the old multi-select produced.
 */
interface CMediaMultiPickerProps {
  name: string;
  label: string;
  hint?: string;
  defaultValues?: string[];
  media: CMediaItem[];
}

export const CMediaMultiPicker = ({
  name,
  label,
  hint,
  defaultValues,
  media,
}: CMediaMultiPickerProps) => {
  const chosen = new Set(defaultValues ?? []);

  return (
    <fieldset className="block">
      <legend className={LABEL_CLASS}>{label}</legend>
      <div className="grid max-h-64 grid-cols-3 gap-2 overflow-y-auto rounded-lg border border-[var(--c-line)] bg-[rgba(6,10,16,0.6)] p-2">
        {media.map((item) => (
          <label
            key={item.id}
            className="relative block cursor-pointer"
            title={item.alt || item.filename}
          >
            <input
              type="checkbox"
              name={name}
              value={item.id}
              defaultChecked={chosen.has(item.id)}
              className="peer sr-only"
            />
            <span className="block overflow-hidden rounded-md border border-transparent opacity-75 transition-all peer-checked:border-[var(--c-bronze)] peer-checked:opacity-100 peer-checked:shadow-[0_0_0_1px_var(--c-bronze)] peer-focus-visible:border-[var(--c-bronze)] hover:opacity-100">
              <MediaTile item={item} />
            </span>
          </label>
        ))}
      </div>
      {hint ? (
        <p className="mt-1 text-[10px] text-[var(--c-text-faint)]">{hint}</p>
      ) : null}
    </fieldset>
  );
};

interface CSaveButtonProps {
  label: string;
}

export const CSaveButton = ({ label }: CSaveButtonProps) => {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="min-h-11 w-full rounded-lg bg-[var(--c-bronze)] text-sm font-medium text-[#161006] transition-all hover:bg-[#dcbe84] disabled:opacity-60"
    >
      {label}
    </button>
  );
};
