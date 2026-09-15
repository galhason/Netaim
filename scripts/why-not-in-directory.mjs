import { readFileSync } from 'node:fs';
import pg from 'pg';

/*
 * Why is this person not in the networking directory?
 *
 * Appearing there is the result of three separate facts, and the page
 * cannot tell you which one is missing — it can only show a shorter
 * list. This script asks the database each question in turn and says,
 * in plain language, which one failed. It writes nothing.
 *
 *   node scripts/why-not-in-directory.mjs <email> [conference-slug]
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

const LIVE = ['pending', 'confirmed', 'waitlisted', 'attended'];

const email = (process.argv[2] ?? '').trim().toLowerCase();
const wantedSlug = (process.argv[3] ?? '').trim();

console.log('');
console.log('  למה המשתמש לא מופיע בנטוורקינג');
console.log('  ' + '─'.repeat(46));

const url = readEnv().DATABASE_URL;
if (!url) {
  console.log('');
  console.log('  לא נמצאה שורת DATABASE_URL בקובץ .env.');
  console.log('');
  process.exit(1);
}

const client = new pg.Client({ connectionString: url });
try {
  await client.connect();
} catch (error) {
  console.log('');
  console.log('  ✗ החיבור נכשל: ' + (error?.message ?? String(error)));
  console.log('');
  process.exit(1);
}

const rows = async (sql, params = []) => (await client.query(sql, params)).rows;

/*
 * With no address, the question is not about one person but about the
 * room: who is present in each conference, and who the directory would
 * therefore show. It is the faster way in when the page looks empty and
 * you do not yet know whose account to suspect.
 */
if (!email) {
  const conferences = await rows(
    `select e.id, e.slug, coalesce(l.title, '') as title
       from events e
       left join events_locales l
         on l._parent_id = e.id and l._locale = 'he'
      order by e.id desc`,
  );
  const [{ n: accounts }] = await rows(
    `select count(*)::int as n from participants`,
  );
  console.log('');
  console.log(`  ${accounts} חשבונות במערכת · ${conferences.length} כנסים`);

  for (const conference of conferences) {
    const listed = await rows(
      `select p.id, p.name, p.email,
              (select count(*)::int from session_registrations sr
                where sr.participant_id = p.id and sr.event_id = $1
                  and sr.status::text = any($2)) as places,
              (select count(*)::int from registrations r
                where r.participant_id = p.id and r.event_id = $1
                  and r.status::text = any($2)) as registered,
              p.contact_prefs_directory
         from participants p
        where p.blocked is not true and p.anonymized_at is null
        order by p.id`,
      [conference.id, LIVE],
    );
    const present = listed.filter((row) => row.places > 0 || row.registered > 0);
    const shown = present.filter((row) => row.contact_prefs_directory !== false);

    console.log('');
    console.log(`  ${conference.title || conference.slug}  (${conference.slug})`);
    if (present.length === 0) {
      console.log('    אין אף אחד שנרשם לכנס הזה או לפעילות שלו.');
      continue;
    }
    for (const row of present) {
      const why =
        row.contact_prefs_directory !== false
          ? '✓ מופיע בספרייה'
          : '✗ כיבה/תה את ההופעה בהעדפות הפרטיות';
      console.log(
        `    ${(row.name || '(ללא שם)').padEnd(18)} ${String(row.email).padEnd(30)} ` +
          `פעילויות:${row.places} הרשמה:${row.registered}  ${why}`,
      );
    }
    console.log(`    סה"כ בספרייה: ${shown.length} מתוך ${present.length} נוכחים`);
  }

  console.log('');
  console.log('  לבדיקת אדם מסוים:  npm run why:directory -- <email>');
  console.log('');
  await client.end();
  process.exit(0);
}

const [person] = await rows(
  `select id, name, email, blocked, anonymized_at, contact_prefs_directory
     from participants where lower(email) = $1 limit 1`,
  [email],
);

if (!person) {
  console.log('');
  console.log('  ✗ אין חשבון עם הכתובת הזו.');
  console.log('    בדוק אם ההרשמה בכלל נשמרה, או אם הכתובת שונה.');
  console.log('');
  await client.end();
  process.exit(0);
}

const optedIn = person.contact_prefs_directory !== false;

console.log('');
console.log(`  החשבון: ${person.name || '(ללא שם)'} · ${person.email} · id=${person.id}`);

if (person.blocked) {
  console.log('  ✗ החשבון חסום בסטודיו — חשבון חסום לא מופיע בשום ספרייה.');
}
if (person.anonymized_at) {
  console.log('  ✗ החשבון עבר אנונימיזציה.');
}

/*
 * A conference's title is translated, so it lives in the locales table
 * rather than beside the slug. Read in Hebrew, and fall back to the
 * slug when a conference has no Hebrew row yet.
 */
const conferences = await rows(
  `select e.id, e.slug, coalesce(l.title, '') as title
     from events e
     left join events_locales l
       on l._parent_id = e.id and l._locale = 'he'
    ${wantedSlug ? 'where e.slug = $1' : ''}
    order by e.id desc
    ${wantedSlug ? '' : 'limit 10'}`,
  wantedSlug ? [wantedSlug] : [],
);

if (conferences.length === 0) {
  console.log('');
  console.log('  ✗ לא נמצא כנס' + (wantedSlug ? ` עם ה-slug "${wantedSlug}".` : '.'));
  console.log('');
  await client.end();
  process.exit(0);
}

for (const conference of conferences) {
  const [places] = await rows(
    `select count(*)::int as n from session_registrations
      where participant_id = $1 and event_id = $2 and status::text = any($3)`,
    [person.id, conference.id, LIVE],
  );
  const [registered] = await rows(
    `select count(*)::int as n from registrations
      where participant_id = $1 and event_id = $2 and status::text = any($3)`,
    [person.id, conference.id, LIVE],
  );
  const takingPart = places.n > 0 || registered.n > 0;
  const shown = takingPart && optedIn;

  console.log('');
  console.log(`  ${conference.title || conference.slug}  (${conference.slug})`);
  console.log(
    `    משתתף/ת בכנס:      ${takingPart ? '✓' : '✗'}  ` +
      `(מקומות בפעילויות: ${places.n}, הרשמה לאירוע: ${registered.n})`,
  );
  console.log(
    `    מסכים/ה להופיע:    ${optedIn ? '✓' : '✗ כיבה/תה את ההופעה בהעדפות הפרטיות'}`,
  );
  console.log(`    יופיע בספרייה:     ${shown ? '✓ כן' : '✗ לא'}`);

  if (!shown && !takingPart) {
    console.log('      → אין הרשמה חיה לכנס הזה ואין מקום באף פעילות שלו.');
  }
}

console.log('');
await client.end();
