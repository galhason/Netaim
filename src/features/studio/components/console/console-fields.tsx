'use client';

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
}

interface CMediaPickerProps extends CFieldProps {
  media: CMediaItem[];
  emptyLabel: string;
}

export const CMediaPicker = ({
  name,
  label,
  defaultValue,
  media,
  emptyLabel,
}: CMediaPickerProps) => {
  const current = media.find((item) => item.id === defaultValue);
  const orphan = Boolean(defaultValue) && !current;

  return (
    <fieldset className="block">
      <legend className={LABEL_CLASS}>{label}</legend>
      {orphan ? (
        /* The saved image is not in the library list — keep its id
         * checked and invisible so an untouched save changes nothing. */
        <input
          type="radio"
          name={name}
          value={defaultValue}
          defaultChecked
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
            defaultChecked={!defaultValue}
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
              defaultChecked={item.id === defaultValue}
              className="peer sr-only"
            />
            <span className="block overflow-hidden rounded-md border border-transparent opacity-75 transition-all peer-checked:border-[var(--c-bronze)] peer-checked:opacity-100 peer-checked:shadow-[0_0_0_1px_var(--c-bronze)] peer-focus-visible:border-[var(--c-bronze)] hover:opacity-100">
              {/* eslint-disable-next-line @next/next/no-img-element -- library thumbnails come straight from the media API */}
              <img
                src={item.url}
                alt={item.alt || item.filename}
                loading="lazy"
                className="aspect-video w-full object-cover"
              />
            </span>
          </label>
        ))}
      </div>
      <p className="mt-1 truncate text-[10px] text-[var(--c-text-faint)]">
        {current ? current.alt || current.filename : ' '}
      </p>
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
              {/* eslint-disable-next-line @next/next/no-img-element -- library thumbnails come straight from the media API */}
              <img
                src={item.url}
                alt={item.alt || item.filename}
                loading="lazy"
                className="aspect-video w-full object-cover"
              />
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
