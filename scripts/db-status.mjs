import { readFileSync } from 'node:fs';
import pg from 'pg';

/*
 * A read-only report on the database, in plain language.
 *
 * It exists because adopting migrations is a delicate operation and the
 * first thing anyone needs is an honest picture of what is actually
 * there. It connects, counts, and says what it found. It writes nothing.
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
    if (match?.[1]) {
      out[match[1]] = (match[2] ?? '').replace(/^["']|["']$/g, '');
    }
  }
  return out;
};

/* The password never belongs in a printed line. */
const safeUrl = (url) => url.replace(/:\/\/([^:/@]+):[^@]*@/, '://$1:****@');

const env = readEnv();
const url = env.DATABASE_URL;

console.log('');
console.log('  בדיקת בסיס הנתונים');
console.log('  ' + '─'.repeat(46));

if (!url) {
  console.log('');
  console.log('  לא נמצאה שורת DATABASE_URL בקובץ .env.');
  console.log('  בלי זה אי אפשר להתחבר. בדוק שהקובץ .env קיים בתיקיית הפרויקט.');
  console.log('');
  process.exit(1);
}

console.log('  מתחבר אל: ' + safeUrl(url));

const client = new pg.Client({ connectionString: url });

try {
  await client.connect();
} catch (error) {
  console.log('');
  console.log('  ✗ החיבור נכשל.');
  console.log('    ' + (error?.message ?? String(error)));
  console.log('');
  console.log('  מה זה בדרך כלל אומר:');
  console.log('    ECONNREFUSED  — שרת בסיס הנתונים לא רץ, או שהפורט שגוי.');
  console.log('    password auth  — הסיסמה ב-.env לא נכונה.');
  console.log('    does not exist — שם בסיס הנתונים ב-.env לא נכון.');
  console.log('');
  process.exit(1);
}

const one = async (sql, params = []) => (await client.query(sql, params)).rows;

const tables = await one(
  `select table_name from information_schema.tables
   where table_schema = 'public' order by table_name`,
);
const names = new Set(tables.map((row) => row.table_name));

const has = (name) => names.has(name);
const column = async (table, col) =>
  (
    await one(
      `select 1 from information_schema.columns
       where table_schema='public' and table_name=$1 and column_name=$2`,
      [table, col],
    )
  ).length > 0;

console.log('');
console.log(`  ✓ מחובר. נמצאו ${tables.length} טבלאות.`);

/* --- the two tables earlier work added and never created --- */
console.log('');
console.log('  טבלאות שהקוד מצפה להן:');
for (const [table, why] of [
  ['audit_log', 'יומן פעולות — מי עשה מה ומתי'],
  ['account_sessions', 'סשנים שאפשר לנתק'],
]) {
  console.log(`    ${has(table) ? '✓' : '✗'}  ${table.padEnd(18)} ${why}`);
}

/* --- the three venue columns --- */
console.log('');
console.log('  עמודות המקום (כתובת ומפה):');
const venue = [
  ['events_locales', 'opening_venue_address', 'כתובת'],
  ['events', 'opening_venue_map_url', 'קישור מפה'],
  ['events_locales', 'opening_venue_map_label', 'טקסט הכפתור'],
];
let venueOk = true;
for (const [table, col, why] of venue) {
  const ok = has(table) && (await column(table, col));
  if (!ok) venueOk = false;
  console.log(`    ${ok ? '✓' : '✗'}  ${why.padEnd(14)} (${table}.${col})`);
}

/* --- the migration history, which is the whole question --- */
console.log('');
console.log('  היסטוריית מיגרציות:');
let migrations = [];
if (has('payload_migrations')) {
  migrations = await one(
    'select name, batch from payload_migrations order by id',
  );
  if (migrations.length === 0) {
    console.log('    הטבלה קיימת אבל ריקה.');
  }
  for (const row of migrations) {
    console.log(`    batch ${String(row.batch).padStart(3)}  ${row.name}`);
  }
} else {
  console.log('    אין טבלת payload_migrations בכלל.');
}

const onlyDevMarker =
  migrations.length > 0 &&
  migrations.every((row) => Number(row.batch) === -1 || row.name === 'dev');

console.log('');
console.log('  ' + '─'.repeat(46));
console.log('  המצב:');
console.log('');

const missing = [];
if (!has('audit_log')) missing.push('audit_log');
if (!has('account_sessions')) missing.push('account_sessions');
if (!venueOk) missing.push('עמודות המקום');

if (missing.length > 0) {
  console.log('  ✗ חסרים במסד הנתונים: ' + missing.join(', '));
  console.log('');
  console.log('    זה מצופה — הקוד החדש מוסיף אותם ועדיין לא הרצת את השלב');
  console.log('    שיוצר אותם. זה מה שצריך לעשות עכשיו, והוא חד־פעמי:');
  console.log('');
  console.log('      1. פתח את הקובץ .env והוסף שורה:  PAYLOAD_DB_PUSH=true');
  console.log('      2. הרץ:  npm run dev');
  console.log('      3. חכה שיופיע Ready, ואז עצור עם Ctrl+C');
  console.log('      4. מחק את השורה שהוספת מ-.env');
  console.log('      5. הרץ שוב:  node scripts/db-status.mjs');
  console.log('');
  console.log('    שים לב: אחרי זה כל מי שמחובר לאתר יתנתק פעם אחת. זה מכוון.');
} else if (migrations.length === 0 || onlyDevMarker) {
  console.log('  ✓ כל הטבלאות והעמודות קיימות.');
  console.log('  ✗ אין היסטוריית מיגרציות אמיתית.');
  console.log('');
  console.log('    זה המצב שציפינו לו, וזה מה שצריך לתקן לפני העלאה לשרת.');
  console.log('    אל תריץ npm run migrate — הוא ייכשל, כי הוא ינסה לבנות');
  console.log('    טבלאות שכבר קיימות.');
  console.log('');
  console.log('    כשתהיה מוכן, תגיד לי ונעשה את זה יחד, צעד אחר צעד.');
} else {
  console.log('  ✓ יש היסטוריית מיגרציות אמיתית. אין כאן מה לעשות.');
}

console.log('');
await client.end();
