import { fromDateTimeInputValue } from '@/shared';

/*
 * Reading a Studio form. Three small rules, named once, because every
 * Studio action needs the same ones and a second copy is how two forms
 * come to disagree about what an empty field means.
 */

/*
 * A field the editor left blank is *not written*, never written as an
 * empty string. Whitespace counts as blank: a space bar pressed by
 * accident should not overwrite a value with nothing.
 */
export const optionalText = (
  value: FormDataEntryValue | null,
): string | undefined => {
  const text = typeof value === 'string' ? value.trim() : '';
  return text.length > 0 ? text : undefined;
};

/*
 * A field that was present in the form, untrimmed — for the cases where
 * the editor may deliberately clear a value, and an absent field and an
 * emptied one have to stay distinguishable.
 */
export const formText = (
  formData: FormData,
  name: string,
): string | undefined => {
  const value = formData.get(name);
  return typeof value === 'string' ? value : undefined;
};

/*
 * `datetime-local` gives a wall-clock string with no zone. One
 * conversion, so no action invents its own.
 */
export const toIsoDateTime = (
  value: FormDataEntryValue | null,
): string | undefined => {
  const text = typeof value === 'string' ? value.trim() : '';
  return fromDateTimeInputValue(text);
};
