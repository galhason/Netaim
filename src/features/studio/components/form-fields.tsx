import type { ReactNode } from 'react';

/*
 * The Studio's form language: quiet editorial fields that read the same
 * on a phone and a desktop — full-width inputs at a comfortable touch
 * size, one accent for focus, whitespace instead of boxes.
 */
interface FieldOption {
  value: string;
  label: string;
}

export const FormSection = ({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) => (
  <section className="flex flex-col gap-5">
    <h2 className="font-display text-lg font-semibold tracking-tight text-text-primary">
      {title}
    </h2>
    {children}
  </section>
);

export const FieldGrid = ({ children }: { children: ReactNode }) => (
  <div className="grid grid-cols-1 gap-x-8 gap-y-5 md:grid-cols-2">
    {children}
  </div>
);

export const TextField = ({
  name,
  label,
  defaultValue,
}: {
  name: string;
  label: string;
  defaultValue?: string;
}) => (
  <label className="flex flex-col gap-1.5">
    <span className="text-xs tracking-widest text-text-secondary">{label}</span>
    <input
      type="text"
      name={name}
      defaultValue={defaultValue ?? ''}
      className="min-h-11 border-b border-border bg-transparent py-2 text-base outline-none transition-colors focus:border-accent"
    />
  </label>
);

export const TextAreaField = ({
  name,
  label,
  defaultValue,
  rows = 3,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  rows?: number;
}) => (
  <label className="flex flex-col gap-1.5">
    <span className="text-xs tracking-widest text-text-secondary">{label}</span>
    <textarea
      name={name}
      rows={rows}
      defaultValue={defaultValue ?? ''}
      className="resize-y border-b border-border bg-transparent py-2 text-base leading-relaxed outline-none transition-colors focus:border-accent"
    />
  </label>
);

export const SelectField = ({
  name,
  label,
  defaultValue,
  options,
  emptyLabel,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  options: FieldOption[];
  emptyLabel?: string;
}) => (
  <label className="flex flex-col gap-1.5">
    <span className="text-xs tracking-widest text-text-secondary">{label}</span>
    <select
      name={name}
      defaultValue={defaultValue ?? ''}
      className="min-h-11 rounded-lg border border-border bg-surface-raised px-3 py-2 text-base outline-none transition-colors focus:border-accent"
    >
      {emptyLabel !== undefined ? <option value="">{emptyLabel}</option> : null}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </label>
);

export const CheckboxField = ({
  name,
  label,
  defaultChecked,
}: {
  name: string;
  label: string;
  defaultChecked?: boolean;
}) => (
  <label className="flex min-h-11 items-center gap-3">
    <input
      type="checkbox"
      name={name}
      defaultChecked={defaultChecked}
      className="size-5 accent-brand"
    />
    <span className="text-sm text-text-primary">{label}</span>
  </label>
);

export const SaveButton = ({ label }: { label: string }) => (
  <button
    type="submit"
    className="inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-brand px-8 font-medium text-brand-contrast transition-transform hover:scale-[1.01] sm:w-auto sm:self-start"
  >
    {label}
  </button>
);
