/*
 * The feature's client-safe entry.
 *
 * `@/features/registration` re-exports services that open the database,
 * so a client component cannot import from it — the whole registration
 * service layer would be dragged into the browser bundle. These are the
 * field components alone, with no service behind them, and this is the
 * door a client component uses.
 */
export { default as CountryFlag } from './country-flag';
export { default as CountrySelect } from './country-select';
export { default as DietarySelect } from './dietary-select';
export { default as MediaConsentDialog } from './media-consent-dialog';
