import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import pg from 'pg';

/*
 * Carrying the per-conference networking profiles onto the accounts.
 *
 * The profile a guest wrote — headline, a few lines, interests, links —
 * used to live on a `networking-profiles` row, one per conference. It
 * lives on the account now, once. The tables holding the old rows are
 * dropped by the migration, so the content has to be lifted out before
 * that and put back afterwards.
 *
 * Two steps, on purpose, with the migration between them:
 *
 *   1. node scripts/carry-profiles-to-accounts.mjs --stash
 *        Reads the old rows into profiles-carried.json. Changes nothing.
 *   2. npm run migrate:create  &&  npm run migrate
 *        The account gains the fields; the old tables go.
 *   3. node scripts/carry-profiles-to-accounts.mjs --apply
 *        Writes the stashed content onto the accounts.
 *
 * The file left behind is the safety net: if step 3 goes wrong, nothing
 * was lost, and it can be run again.
 *
 * When one account had profiles at several conferences, the fullest one
 * wins — the guess is only ever between two things the same person
 * wrote about themselves, and an empty headline is never chosen over a
 * written one.
 */
const STASH = 'profiles-carried.json';

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

const mode = process.argv[2];

console.log('');
console.log('  העברת פרופילי הנטוורקינג לחשבונות');
console.log('  ' + '─'.repeat(46));

if (mode !== '--stash' && mode !== '--apply') {
  console.log('');
  console.log('  שימוש:');
  console.log('    1)  node scripts/carry-profiles-to-accounts.mjs --stash');
  console.log('    2)  npm run migrate:create   ואז   npm run migrate');
  console.log('    3)  node scripts/carry-profiles-to-accounts.mjs --apply');
  console.log('');
  process.exit(1);
}

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

const tableExists = async (name) => {
  const [row] = await rows(
    `select to_regclass($1) is not null as present`,
    [`public.${name}`],
  );
  return row?.present === true;
};

/* How much of themselves a person actually wrote. */
const weight = (profile) =>
  (profile.headline ? 2 : 0) +
  (profile.bio ? 2 : 0) +
  (profile.interests ? 1 : 0) +
  profile.links.length;

if (mode === '--stash') {
  if (!(await tableExists('networking_profiles'))) {
    console.log('');
    console.log('  אין טבלת networking_profiles — כנראה שהמיגרציה כבר רצה.');
    console.log('  אם כבר הרצת --stash קודם, אפשר להמשיך ל---apply.');
    console.log('');
    await client.end();
    process.exit(0);
  }

  const profiles = await rows(
    `select id, participant_id, headline, bio, interests
       from networking_profiles order by id`,
  );
  const links = (await tableExists('networking_profiles_links'))
    ? await rows(
        `select _parent_id, label, url from networking_profiles_links
          order by _parent_id, _order`,
      )
    : [];

  const linksByProfile = new Map();
  for (const link of links) {
    if (!link.url) {
      continue;
    }
    const held = linksByProfile.get(link._parent_id) ?? [];
    held.push({ label: link.label ?? '', url: link.url });
    linksByProfile.set(link._parent_id, held);
  }

  /* One entry per account: the fullest profile that account wrote. */
  const best = new Map();
  for (const profile of profiles) {
    const candidate = {
      participantId: profile.participant_id,
      headline: profile.headline ?? null,
      bio: profile.bio ?? null,
      interests: profile.interests ?? null,
      links: linksByProfile.get(profile.id) ?? [],
    };
    const held = best.get(profile.participant_id);
    if (!held || weight(candidate) > weight(held)) {
      best.set(profile.participant_id, candidate);
    }
  }

  const carried = [...best.values()];
  writeFileSync(STASH, JSON.stringify(carried, null, 2), 'utf8');

  console.log('');
  console.log(`  נקראו ${profiles.length} פרופילים, ל-${carried.length} חשבונות.`);
  console.log(`  נשמרו אל ${STASH}. לא שונה דבר בבסיס הנתונים.`);
  console.log('');
  console.log('  עכשיו:  npm run migrate:create   ואז   npm run migrate');
  console.log('  ואחר כך: node scripts/carry-profiles-to-accounts.mjs --apply');
  console.log('');
  await client.end();
  process.exit(0);
}

/* --apply */
if (!existsSync(STASH)) {
  console.log('');
  console.log(`  לא נמצא ${STASH}. יש להריץ קודם --stash, לפני המיגרציה.`);
  console.log('');
  await client.end();
  process.exit(1);
}

const carried = JSON.parse(readFileSync(STASH, 'utf8'));

const [{ present }] = await rows(
  `select count(*)::int as present from information_schema.columns
    where table_name = 'participants' and column_name = 'headline'`,
);
if (present === 0) {
  console.log('');
  console.log('  לחשבונות עוד אין את השדות החדשים — המיגרציה לא רצה.');
  console.log('  הריצו npm run migrate ואז נסו שוב.');
  console.log('');
  await client.end();
  process.exit(1);
}

const hasLinks = await tableExists('participants_links');

let written = 0;
let withLinks = 0;
for (const profile of carried) {
  /*
   * Never overwrite something already on the account. A person who
   * filled in their profile after the change should not have it
   * replaced by what they wrote for one conference last year.
   */
  const updated = await rows(
    `update participants set
       headline  = coalesce(nullif(headline, ''), $2),
       bio       = coalesce(nullif(bio, ''), $3),
       interests = coalesce(nullif(interests, ''), $4)
     where id = $1
     returning id`,
    [profile.participantId, profile.headline, profile.bio, profile.interests],
  );
  if (updated.length === 0) {
    continue;
  }
  written += 1;

  if (!hasLinks || profile.links.length === 0) {
    continue;
  }
  const [{ n }] = await rows(
    `select count(*)::int as n from participants_links where _parent_id = $1`,
    [profile.participantId],
  );
  if (n > 0) {
    continue;
  }
  let order = 1;
  for (const link of profile.links) {
    await client.query(
      `insert into participants_links (_order, _parent_id, id, label, url)
       values ($1, $2, $3, $4, $5)`,
      [
        order,
        profile.participantId,
        `carried-${profile.participantId}-${order}`,
        link.label,
        link.url,
      ],
    );
    order += 1;
  }
  withLinks += 1;
}

console.log('');
console.log(`  עודכנו ${written} חשבונות, מתוכם ${withLinks} עם קישורים.`);
console.log(`  ${STASH} נשאר על הדיסק כגיבוי — אפשר למחוק אותו כשהכל נראה תקין.`);
console.log('');
await client.end();
