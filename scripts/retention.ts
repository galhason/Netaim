/*
 * The forgetting, performed by hand.
 *
 * Erasing a conference is deliberate, so it is a command a person runs
 * — never a clock. Two modes, and the safe one is the default:
 *
 *   npm run retention:status
 *       Looks. Lists every conference past its retention deadline and
 *       what it still holds. Erases nothing.
 *
 *   npm run retention:purge -- <slug> --confirm
 *       Erases one named conference. Both the name and the flag are
 *       required: a command that can delete a room full of people
 *       should be impossible to run by pressing Up and Enter.
 *
 * Neither mode can touch a conference that has not passed its deadline.
 * The deadline is RETENTION_DAYS (default 7) after the event ends, and
 * it is the same constant the privacy policy quotes.
 */
import { getPayload } from 'payload';
import config from '@payload-config';

const RETENTION_DAYS = (() => {
  const raw = Number(process.env.RETENTION_DAYS);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 7;
})();

interface EventRow {
  id: number | string;
  slug?: string | null;
  title?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
}

const payload = await getPayload({ config });

/*
 * The arguments arrive as environment variables rather than argv:
 * `payload run` does not forward a command line to the script it runs.
 * `scripts/retention.mjs` is the front door that parses them.
 */
const wantsPurge = process.env.RETENTION_MODE === 'purge';
const confirmed = process.env.RETENTION_CONFIRM === 'yes';
const slugArg = process.env.RETENTION_SLUG || undefined;

const day = 24 * 60 * 60 * 1000;
const now = Date.now();

const endInstant = (row: EventRow): number | null => {
  const raw = row.endsAt ?? row.startsAt ?? null;
  if (!raw) return null;
  const parsed = Date.parse(raw);
  return Number.isNaN(parsed) ? null : parsed;
};

const events = await payload.find({
  collection: 'events',
  pagination: false,
  depth: 0,
  overrideAccess: true,
});

const due = (events.docs as unknown as EventRow[])
  .map((row) => {
    const ended = endInstant(row);
    if (!ended || !row.slug) return null;
    const dueAt = ended + RETENTION_DAYS * day;
    return { slug: row.slug, title: row.title ?? row.slug, ended, dueAt };
  })
  .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

const past = due.filter((entry) => entry.dueAt <= now);

const counts = async (slug: string) => {
  const found = await payload.find({
    collection: 'events',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  const row = found.docs[0] as { id: number | string } | undefined;
  if (!row) return null;
  const eventId = Number(row.id);
  const of = async (
    collection:
      | 'networking-connections'
      | 'networking-meetings'
      | 'registrations'
      | 'session-registrations',
  ) => {
    const result = await payload
      .count({
        collection,
        where: { event: { equals: eventId } },
        overrideAccess: true,
      })
      .catch(() => ({ totalDocs: 0 }));
    return result.totalDocs;
  };
  return {
    connections: await of('networking-connections'),
    meetings: await of('networking-meetings'),
    registrations: await of('registrations'),
    sessionRegistrations: await of('session-registrations'),
  };
};

if (!wantsPurge) {
  console.log(`\nRetention period: ${RETENTION_DAYS} days after a conference ends.\n`);
  if (past.length === 0) {
    console.log('Nothing is past its deadline. No conference is due for erasure.\n');
    if (due.length > 0) {
      console.log('Upcoming deadlines:');
      for (const entry of due) {
        console.log(
          `  ${entry.slug.padEnd(16)} due ${new Date(entry.dueAt).toISOString().slice(0, 10)}`,
        );
      }
      console.log('');
    }
  } else {
    console.log(`${past.length} conference(s) past the deadline:\n`);
    for (const entry of past) {
      const held = await counts(entry.slug);
      console.log(`  ${entry.title}  [${entry.slug}]`);
      console.log(
        `    ended ${new Date(entry.ended).toISOString().slice(0, 10)} · due since ${new Date(entry.dueAt).toISOString().slice(0, 10)}`,
      );
      if (held) {
        console.log(
          `    holds: ${held.registrations} registrations, ${held.sessionRegistrations} activity places, ${held.connections} connections, ${held.meetings} meetings`,
        );
      }
      console.log(`    erase with:  npm run retention:purge -- ${entry.slug} --confirm`);
      console.log('');
    }
  }
  process.exit(0);
}

/* --- the erasing path --- */

if (!slugArg) {
  console.error('\nWhich conference? Name it:\n');
  console.error('  npm run retention:purge -- <slug> --confirm\n');
  console.error('Run `npm run retention:status` to see what is due.\n');
  process.exit(1);
}

const target = past.find((entry) => entry.slug === slugArg);
if (!target) {
  const known = due.find((entry) => entry.slug === slugArg);
  console.error(
    known
      ? `\n"${slugArg}" has not reached its deadline yet (due ${new Date(known.dueAt).toISOString().slice(0, 10)}). Nothing was erased.\n`
      : `\nNo conference called "${slugArg}" is past its retention deadline. Nothing was erased.\n`,
  );
  process.exit(1);
}

if (!confirmed) {
  const held = await counts(target.slug);
  console.log(`\nAbout to erase every participant record of: ${target.title} [${target.slug}]`);
  if (held) {
    console.log(
      `  ${held.registrations} registrations · ${held.sessionRegistrations} activity places · ${held.connections} connections · ${held.meetings} meetings, plus all chat, notices and the accounts that exist only for this conference.`,
    );
  }
  console.log('\nThis cannot be undone. Add --confirm to proceed:\n');
  console.log(`  npm run retention:purge -- ${target.slug} --confirm\n`);
  process.exit(1);
}

const { purgeConferenceData } = await import(
  '../src/infrastructure/payload/payload-retention'
);

console.log(`\nErasing ${target.title} [${target.slug}]...\n`);
const report = await purgeConferenceData(target.slug);
console.log('  chat messages        ', report.messages);
console.log('  connections          ', report.connections);
console.log('  meetings             ', report.meetings);
console.log('  notices              ', report.notifications);
console.log('  activity places      ', report.sessionRegistrations);
console.log('  registrations        ', report.registrations);
console.log('  safety reports       ', report.reports);
console.log('  accounts deleted     ', report.accountsDeleted);
console.log('  accounts kept (staff)', report.accountsKept);
console.log('\nDone. Recorded in the activity history as privacy.retentionPurge.\n');
process.exit(0);
