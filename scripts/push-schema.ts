/*
 * Pushes the Payload schema into the database.
 *
 * This project has no migration history — the note on `_migrations:README`
 * in package.json explains why — so a new collection reaches an existing
 * database through the adapter's own push, run deliberately rather than
 * silently on `npm run dev`.
 */
import { getPayload } from 'payload';
import config from '@payload-config';

await getPayload({ config });
console.log('Schema pushed.');
process.exit(0);
