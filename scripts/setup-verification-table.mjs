/*
 * Creates the table the registration code step needs, on whatever
 * database DATABASE_URL points at.
 *
 * The project has no migration history, so a new collection normally
 * arrives through PAYLOAD_DB_PUSH on a development boot. That is a
 * blunt instrument to reach for when one table is missing, and it
 * rewrites more of the schema than anyone intends — so this applies
 * exactly the one thing that is needed, and nothing else.
 *
 * Safe to run more than once: every statement is guarded.
 *
 *   node scripts/setup-verification-table.mjs
 */
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const root = process.cwd();

/* Read DATABASE_URL from the environment, falling back to .env. */
const urlFromEnvFile = () => {
  for (const name of ['.env.local', '.env']) {
    const file = path.join(root, name);
    if (!existsSync(file)) continue;
    const line = readFileSync(file, 'utf8')
      .split('\n')
      .find((l) => l.trim().startsWith('DATABASE_URL='));
    if (line) return line.slice(line.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '');
  }
  return null;
};

const connectionString = process.env.DATABASE_URL || urlFromEnvFile();
if (!connectionString) {
  console.error('No DATABASE_URL found — set it, or put it in .env');
  process.exit(1);
}

const shown = connectionString.replace(/:[^:@/]*@/, ':***@');
console.log(`\nDatabase: ${shown}\n`);

const client = new pg.Client({ connectionString });
await client.connect();

const before = await client.query(
  "select to_regclass('public.email_verifications') as t",
);
if (before.rows[0].t) {
  console.log('email_verifications already exists.');
} else {
  console.log('email_verifications is missing — creating it.');
}

const sqlFile = path.join(root, 'scripts', 'sql', '001-email-verifications.sql');
if (!existsSync(sqlFile)) {
  console.error(`Cannot find ${sqlFile}`);
  process.exit(1);
}
await client.query(readFileSync(sqlFile, 'utf8'));

const after = await client.query(`
  select
    (select to_regclass('public.email_verifications')) as tbl,
    (select count(*) from information_schema.columns
      where table_name = 'payload_locked_documents_rels'
        and column_name = 'email_verifications_id') as rel
`);

console.log('');
console.log('  table email_verifications          ', after.rows[0].tbl ? 'OK' : 'MISSING');
console.log('  relation column on locked_documents', Number(after.rows[0].rel) === 1 ? 'OK' : 'MISSING');
console.log('');
console.log('Done. Restart the dev server and the code step will work.\n');

await client.end();
