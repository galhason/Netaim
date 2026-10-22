/*
 * One field of a CSV file the Studio hands out.
 *
 * A spreadsheet reads a field that starts with = + - or @ as a formula,
 * and a field a guest typed — a name, an organisation, an accessibility
 * note — is exactly such a field: `=HYPERLINK(...)` in a name became a
 * live link in the caterer's spreadsheet, and the older DDE forms run
 * programs on some machines. Such a field is now written with an
 * apostrophe in front, which every spreadsheet shows as text.
 *
 * A plain number or telephone number — digits, spaces, dots, brackets
 * and dashes, with a leading + or - — cannot carry a formula and is left
 * as it is, so "+972 54-000-0000" stays readable.
 */
const FORMULA_START = /^[=+\-@\t\r]/;
const PLAIN_NUMBER = /^[+-]?[\d\s().-]+$/;

export const neutralizeFormula = (text: string): string =>
  FORMULA_START.test(text) && !PLAIN_NUMBER.test(text) ? `'${text}` : text;

export const csvText = (value: unknown): string =>
  value === null || value === undefined
    ? ''
    : typeof value === 'object'
      ? JSON.stringify(value)
      : String(value);

/* Always quoted: a comma or a line break inside a note never shifts a column. */
export const csvField = (value: unknown): string =>
  `"${neutralizeFormula(csvText(value)).replace(/"/g, '""')}"`;
