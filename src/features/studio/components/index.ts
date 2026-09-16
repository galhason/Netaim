/*
 * The Studio's client-safe entry.
 *
 * The feature's main barrel re-exports its services, and those read
 * cookies through `next/headers` — importing it from a file marked
 * 'use client' fails the build with a message that names neither the
 * barrel nor the service. Client components import from here instead,
 * which is the escape the architecture guard is written to allow: a
 * feature may publish `@/features/x/components`, and nothing below it.
 *
 * Everything exported here must be safe to run in a browser bundle.
 */
export { default as WhenField } from './console/when-field';
export {
  CTextField,
  CTextAreaField,
  CSelectField,
  CMediaPicker,
  CMediaMultiPicker,
  CSaveButton,
} from './console/console-fields';
