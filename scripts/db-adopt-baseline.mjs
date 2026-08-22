import { readFileSync, readdirSync } from 'node:fs';
import pg from 'pg';

/*
 * Records the baseline migration as already applied, without running it.
 *
 * The database was built by letting the adapter sync the schema, so the
 * tables the baseline describes are already there. Executing it would
 * fail on the first statement. What is missing is only the bookkeeping:
 * a row saying "this migration's result is the database you are looking
 * at", so every migration written after it runs, and it does not.
 *
 * Everything here is checked before anything is written, and the single
 * row it inserts is printed with the statement that removes it again.
 */

const readEnv = () => {
  const out = {};
  let text = '';
  try {
    text = readFileSync('.env', 'utf8');
  } catch {
    return out;
  }
  for (const line of text.split(/\r?\n/)) {
    const match = /^([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line.trim());
    if (match?.[1]) out[match[1]] = (match[2] ?? '').replace(/^["']|["']$/g, '');
  }
  return out;
};

const stop = (...lines) => {
  console.log('');
  console.log('  ✗ עצרתי. לא נכתב שום דבר.');
  for (const line of lines) console.log('    ' + line);
  console.log('');
  process.exit(1);
};

console.log('');
console.log('  רישום ה-baseline כמיושם');
console.log('  ' + '─'.repeat(46));

/* --- 1. the migration file on disk --- */
let files = [];
try {
  files = readdirSync('src/migrations').filter(
    (name) => /^\d/.test(name) && name.endsWith('.ts'),
  );
} catch {
  stop('אין תיקיית src/migrations.', 'הרץ קודם:  npm run migrate:create');
}
if (files.length === 0) {
  stop('לא נמצא קובץ מיגרציה.', 'הרץ קודם:  npm run migrate:create');
}
if (files.length > 1) {
  stop(
    `נמצאו ${files.length} קבצי מיגרציה:`,
    ...files.map((f) => '  ' + f),
    'הסקריפט הזה מיועד למצב שבו יש בדיוק אחד — ה-baseline.',
    'אם כבר אימצת מיגרציות, אתה לא צריך אותו.',
  );
}
const name = files[0].replace(/\.ts$/, '');
console.log('  קובץ ה-baseline:  ' + name);

const env = readEnv();
if (!env.DATABASE_URL) stop('אין DATABASE_URL בקובץ .env.');

const client = new pg.Client({ connectionString: env.DATABASE_URL });
try {
  await client.connect();
} catch (error) {
  stop('החיבור נכשל:', error?.message ?? String(error));
}

const rows = async (sql, params = []) => (await client.query(sql, params)).rows;

/* --- 2. the schema really is already there --- */
const tables = await rows(
  `select table_name from information_schema.tables where table_schema='public'`,
);
const names = new Set(tables.map((r) => r.table_name));
const expected = ['events', 'participants', 'registrations', 'audit_log'];
const absent = expected.filter((t) => !names.has(t));
if (absent.length > 0) {
  stop(
    'הטבלאות האלה לא קיימות: ' + absent.join(', '),
    'כלומר בסיס הנתונים אינו במצב שה-baseline מתאר,',
    'ולרשום אותו כמיושם יהיה שקר. אל תמשיך בלי לברר.',
  );
}
console.log(`  טבלאות קיימות:   ${tables.length}`);

/* --- 3. nothing real is recorded yet --- */
if (!names.has('payload_migrations')) {
  stop('אין טבלת payload_migrations. משהו לא צפוי — תעצור ותשאל.');
}
const history = await rows(
  'select name, batch from payload_migrations order by id',
);
const real = history.filter(
  (r) => Number(r.batch) !== -1 && r.name !== 'dev',
);
if (real.length > 0) {
  stop(
    'כבר יש היסטוריית מיגרציות אמיתית:',
    ...real.map((r) => `  batch ${r.batch}  ${r.name}`),
    'אין צורך באימוץ, והרצה כאן רק תבלבל את ההיסטוריה.',
  );
}
if (history.some((r) => r.name === name)) {
  stop('ה-baseline הזה כבר רשום. אין מה לעשות.');
}
console.log(
  '  היסטוריה כרגע:   ' +
    (history.length === 0
      ? 'ריקה'
      : history.map((r) => `${r.name} (batch ${r.batch})`).join(', ')),
);

/* --- 4. write the one row, shaped to whatever columns the table has --- */
const columns = new Set(
  (
    await rows(
      `select column_name from information_schema.columns
       where table_schema='public' and table_name='payload_migrations'`,
    )
  ).map((r) => r.column_name),
);

const fields = ['name', 'batch'];
const values = [name, 1];
for (const stamp of ['created_at', 'updated_at']) {
  if (columns.has(stamp)) {
    fields.push(stamp);
    values.push(new Date());
  }
}
const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');

await client.query(
  `insert into payload_migrations (${fields.map((f) => `"${f}"`).join(', ')})
   values (${placeholders})`,
  values,
);

console.log('');
console.log('  ✓ נרשם.');
console.log('');
const after = await rows(
  'select name, batch from payload_migrations order by id',
);
for (const row of after) {
  console.log(`    batch ${String(row.batch).padStart(3)}  ${row.name}`);
}

console.log('');
console.log('  ' + '─'.repeat(46));
console.log('  לבדיקה, הרץ:   npm run migrate:status');
console.log('  אמור להראות את ה-baseline כמיושם, ו-migrate לא ירוץ.');
console.log('');
console.log('  אם משהו השתבש, זו הפקודה שמבטלת בדיוק את מה שעשיתי:');
console.log('');
console.log(`    delete from payload_migrations where name = '${name}';`);
console.log('');

await client.end();
