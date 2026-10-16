import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import type { ResolvedSpeaker } from '@/features/speakers';
import { findSpeakerLookalikes } from '@/features/speakers/services/speaker-service';
import { likelySameSpeaker, sameSpeakerName } from '@/features/speakers/utils/speaker-names';
import { conferenceRoster } from '@/infrastructure/payload/payload-speaker-roster';
import type { HeldLink, LinkRow } from '@/migrations/20261016_090000_one_speaker_many_conferences';

/*
 * One speaker, many conferences.
 *
 * A guest who speaks at two conferences, or at two activities of one,
 * is one card in the organisation's library — found by name when the
 * next activity needs them, never typed in again. A conference's
 * speakers page is read from its activities, plus the few it lists by
 * hand; so putting a speaker on an activity is what puts them on the
 * page. The duplicates made before were folded when the library was
 * made, where certain; the ones that only look alike wait for a person.
 */
const read = (path: string) => readFileSync(path, 'utf8');

const card = (id: string, name: string, over: Partial<ResolvedSpeaker> = {}): ResolvedSpeaker => ({
  id,
  name,
  socialLinks: [],
  isRegistered: false,
  own: { name },
  ...over,
});

describe('when two names are one person', () => {
  it('is certain only when the letters are the same, spacing and punctuation aside', () => {
    expect(sameSpeakerName('אבי דיקשטיין.')).toBe(sameSpeakerName('אבי דיקשטיין'));
    expect(sameSpeakerName('מרים  פרץ')).toBe(sameSpeakerName('מרים פרץ'));
    expect(sameSpeakerName('ד"ר דמיטרי מריאסיס')).not.toBe(sameSpeakerName('דמיטרי מריאסיס'));
  });

  it('suspects when a title or a bracket is all that differs', () => {
    expect(likelySameSpeaker('ד"ר דמיטרי מריאסיס')).toBe(likelySameSpeaker('דמיטרי מריאסיס'));
    expect(likelySameSpeaker("פרופ' אריאל פלדשטיין")).toBe(likelySameSpeaker('אריאל פלדשטיין'));
    expect(likelySameSpeaker("רחל ברדצ' (Rachel Dratch)")).toBe(likelySameSpeaker("רחל ברדצ'"));
    expect(likelySameSpeaker('Dr. Dmitry Maryasis')).toBe(likelySameSpeaker('Dmitry Maryasis'));
    expect(likelySameSpeaker('רחל לוי')).not.toBe(likelySameSpeaker('רחל כהן'));
  });

  it('offers the look-alikes for a person to decide, in either language, never two accounts', () => {
    const library = [
      card('1', 'ד"ר דמיטרי מריאסיס'),
      card('2', 'דמיטרי מריאסיס'),
      card('3', 'רחל לוי'),
      card('4', 'Rachel Levi'),
      card('5', 'דני כהן', { isRegistered: true, accountId: 'a' }),
      card('6', 'דני כהן', { isRegistered: true, accountId: 'b' }),
      card('7', 'מיכל'),
      card('8', 'מיכל'),
    ];
    const english = new Map([['3', card('3', 'Rachel Levi', { own: { name: 'Rachel Levi' } })]]);
    const groups = findSpeakerLookalikes(library, english).map((group) => group.speakers.map((s) => s.id).sort());
    expect(groups).toContainEqual(['1', '2']);
    expect(groups).toContainEqual(['3', '4']);
    /* Two registered accounts are two people. */
    expect(groups).not.toContainEqual(['5', '6']);
    /* A single word is too little to suspect anyone. */
    expect(groups).not.toContainEqual(['7', '8']);
  });
});

describe('a conference roster is read, not stored', () => {
  it('is everyone its standing activities name, plus whoever it lists by hand', async () => {
    const asked: unknown[] = [];
    const payload = {
      find: async (query: unknown) => {
        asked.push(query);
        return { docs: [{ speakers: [3, 4] }, { speakers: [{ id: 4 }, 9] }, { speakers: [] }] };
      },
    };
    const roster = await conferenceRoster(payload as never, 7);
    expect(asked[0]).toMatchObject({
      collection: 'sessions',
      where: { and: [{ event: { equals: 7 } }, { archivedAt: { exists: false } }] },
    });
    expect(Object.fromEntries(roster.activities)).toEqual({ '3': 1, '4': 2, '9': 1 });
    expect(roster.where).toEqual({
      or: [{ events: { in: [7] } }, { id: { in: ['3', '4', '9'] } }],
    });
  });

  it('is the hand-made list alone when no activity names anyone', async () => {
    const payload = { find: async () => ({ docs: [] }) };
    const roster = await conferenceRoster(payload as never, 7);
    expect(roster.where).toEqual({ events: { in: [7] } });
  });

  it('is the same question for the platform, the site and the Studio', () => {
    expect(read('src/infrastructure/payload/payload-marketing.ts')).toContain('const roster = await conferenceRoster(payload, eventId);');
    const repository = read('src/infrastructure/payload/payload-speaker.ts');
    expect(repository).toContain('const roster = await conferenceRoster(payload, event.id);');
    expect(repository).not.toContain('where: { event: { equals: event.id } }');
    /* A speaker page lists this conference's activities, not every conference's. */
    for (const page of [
      'src/app/(frontend)/[locale]/events/[slug]/(experience)/speakers/page.tsx',
      'src/app/(frontend)/[locale]/events/[slug]/(experience)/speakers/[id]/page.tsx',
    ]) {
      expect(read(page), page).toMatch(/activitiesForSpeaker\([^)]*, lang, slug\)/);
    }
  });
});

describe('one card per person', () => {
  it('keeps no conference on the card, only the conferences that list it by hand', () => {
    const collection = read('src/cms/collections/speakers.ts');
    expect(collection).toContain("name: 'events',");
    expect(collection).toContain('hasMany: true,');
    expect(collection).not.toContain("name: 'event',");
  });

  it('returns the card that exists rather than making a second one', () => {
    const repository = read('src/infrastructure/payload/payload-speaker.ts');
    /* A guest by the same name, unless a second card was chosen on purpose. */
    expect(repository).toContain('const existing = placement.force');
    expect(repository).toContain("await existingCard(payload, organization, locale, { name: input.name })");
    /* An account is one card in the organisation, whatever conference asks. */
    expect(repository).toContain('const found = await existingCard(payload, organization, locale, { accountId });');
  });

  it('is found by name from the activity, registered users and external speakers apart', () => {
    const picker = read('src/app/(studio)/studio/(console)/activity/speaker-picker.tsx');
    expect(picker).toContain('{offerList(t.groupRegistered, offers.registered)}');
    expect(picker).toContain('{offerList(t.groupExternal, offers.external)}');
    /* An account that already has a card is offered as that card. */
    expect(picker).toContain('!cardByAccount.has(c.accountId)');
    /* A new guest whose name the library already holds is asked about first. */
    expect(picker).toContain('likelySameSpeaker(card.name) === key');
    expect(picker).toContain('onClick={() => createExternal(lookalikes.length > 0)}');
  });

  it('comes off a conference list without leaving the library', () => {
    const actions = read('src/app/(studio)/studio/(console)/conference/[slug]/speakers/actions.ts');
    expect(actions).toContain('await setSpeakerListed(id, slug, false);');
    expect(actions).not.toContain('removeSpeaker(');
    expect(actions).toContain("const placement = { slug, listOn: true };");
  });

  it('is kept in the library, where look-alikes are merged by a person', () => {
    const page = read('src/app/(studio)/studio/(console)/speakers/page.tsx');
    expect(page).toContain('findSpeakerLookalikes(library, enById)');
    expect(page).toContain('<ActionForm action={mergeSpeakersAction}>');
    expect(read('src/features/studio/components/console/console-sidebar.tsx')).toContain("href: '/studio/speakers'");
  });
});

describe('the library was made from the cards there were', () => {
  const migration = read('src/migrations/20261016_090000_one_speaker_many_conferences.ts');

  it('adds the hand-made listing, named as Payload names it', () => {
    expect(migration).toContain('CREATE TABLE "speakers_rels" (');
    expect(migration).toContain('"speakers_rels_events_fk" FOREIGN KEY ("events_id") REFERENCES "events"("id") ON DELETE cascade');
  });

  it('keeps every page as it was: a speaker on no standing activity there is listed by hand', () => {
    expect(migration).toContain('AND se."event_id" = s."event_id" AND se."archived_at" IS NULL');
  });

  it('folds only the certain duplicates — one account, or one name — and keeps the fullest card', () => {
    expect(migration).toContain('`account:${row.organization_id}:${row.account_id}`');
    expect(migration).toContain('`name:${row.organization_id}:${name}`');
    expect(migration).toContain('.sort((a, b) => fullness(b) - fullness(a) || a.id - b.id)');
    /* An activity that named both cards names the kept one once. */
    expect(migration).toContain('AND "parent_id" NOT IN (SELECT "parent_id" FROM "sessions_rels" WHERE "path" = \'speakers\' AND "speakers_id" = ${S})');
  });

  it('carries every link the kept card lacks, and never the same link twice', () => {
    expect(migration).toContain('AND COALESCE("url", \'\') NOT IN (SELECT COALESCE("url", \'\') FROM "speakers_social_links" WHERE "_parent_id" = ${S})');
    const repository = read('src/infrastructure/payload/payload-speaker.ts');
    expect(repository).toContain('socialLinks: [...keepLinks, ...newLinks]');
  });

  it('writes every fold down first, so down can put both cards back as they were', () => {
    expect(migration).toContain('CREATE TABLE "speakers_merge_log" (');
    const logged = migration.indexOf('INSERT INTO "speakers_merge_log"');
    const deleted = migration.indexOf('DELETE FROM "speakers" WHERE "id" = ${D}');
    expect(logged).toBeGreaterThan(-1);
    expect(logged).toBeLessThan(deleted);
    /* Newest fold first; the folded card under its own id; the kept card as it was. */
    expect(migration).toContain('WHERE "id" > ${Number(state.log_from_id)} ORDER BY "id" DESC');
    expect(migration).toContain('INSERT INTO "speakers" ("id", "organization_id", "event_id", "account_id", "photo_id", "created_at", "updated_at")');
    expect(migration).toContain('DELETE FROM "speakers_locales" WHERE "_parent_id" = ${S}');
  });

  it('runs each step as its own statement, and is registered', () => {
    expect(migration).toContain('for (const step of steps) {');
    expect(migration).toContain('ALTER TABLE "speakers" DROP COLUMN IF EXISTS "event_id";');
    expect(read('src/migrations/index.ts')).toContain("name: '20261016_090000_one_speaker_many_conferences'");
  });
});

describe('down puts back what up folded, and takes away only what up made', () => {
  const migration = read('src/migrations/20261016_090000_one_speaker_many_conferences.ts');
  /* The migration brings the Postgres adapter with it: loaded once, here, outside any test's time limit. */
  let planLinkRestore: typeof import('@/migrations/20261016_090000_one_speaker_many_conferences').planLinkRestore;
  let relsTeardown: typeof import('@/migrations/20261016_090000_one_speaker_many_conferences').relsTeardown;
  beforeAll(async () => {
    ({ planLinkRestore, relsTeardown } = await import('@/migrations/20261016_090000_one_speaker_many_conferences'));
  }, 60_000);
  const link = (id: string, order: number, url: string, label = 'LinkedIn'): LinkRow => ({ id, _order: order, label, url });
  const held = (id: string, parent: number, url: string, label = 'LinkedIn'): HeldLink => ({ id, parent, label, url });

  it('writes a link back under its own id when the fold left it behind', () => {
    const plan = planLinkRestore(3, 2, [link('lnk-c1', 1, 'https://c.example')], []);
    expect(plan).toEqual([{ kind: 'insert', link: link('lnk-c1', 1, 'https://c.example') }]);
  });

  it('moves a carried link back from the kept card, with its own order, when its id is already there', () => {
    /* The fold moved it to card 2 and appended it after 2's links (order 3); it goes back as order 1. */
    const plan = planLinkRestore(3, 2, [link('lnk-c1', 1, 'https://c.example')], [held('lnk-c1', 2, 'https://c.example')]);
    expect(plan).toEqual([{ kind: 'return', link: link('lnk-c1', 1, 'https://c.example') }]);
  });

  it('stops on a link id another card holds, and neither deletes nor copies it', () => {
    const plan = planLinkRestore(
      3,
      2,
      [link('lnk-c1', 1, 'https://c.example'), link('lnk-c2', 2, 'https://d.example')],
      [held('lnk-c1', 6, 'https://c.example'), held('lnk-c2', 2, 'https://d.example', 'Edited since')],
    );
    expect(plan.map((step) => step.kind)).toEqual(['conflict', 'conflict']);
    expect(plan[0]).toMatchObject({ holder: { parent: 6 } });
    expect(plan[1]).toMatchObject({ holder: { parent: 2, label: 'Edited since' } });
    /* The conflicts are thrown before a single link is written: no DELETE by id, no second copy. */
    expect(migration).not.toContain('DELETE FROM "speakers_social_links" WHERE "id" IN');
    const thrown = migration.indexOf('if (conflicts.length > 0) {');
    const written = migration.indexOf('INSERT INTO "speakers_social_links"');
    expect(thrown).toBeGreaterThan(-1);
    expect(thrown).toBeLessThan(written);
  });

  it('keeps every conference row of a card with its own order and row id', () => {
    expect(migration).toContain('SELECT "id", "events_id", "order" FROM "speakers_rels"');
    expect(migration).toContain('ORDER BY "order" NULLS LAST, "id"');
    expect(migration).toContain('VALUES (${link.id}, ${link.order}, ${parent}, \'events\', ${link.events_id})');
    /* Never the flat "order 1" the first draft wrote. */
    expect(migration).not.toMatch(/VALUES \(1, \$\{[DS]\}, 'events'/);
    expect(migration).toContain('await writeEventLinks(db, D, card.events)');
    expect(migration).toContain('await writeEventLinks(db, S, kept.events)');
  });

  it('drops speakers_rels only when up made it and nothing else is in it', () => {
    const made = { rels_created: true, events_column_created: true };
    expect(relsTeardown(made, 0)).toBe('drop-table');
    /* Up made the table, but another relationship has written into it since: the table stays. */
    expect(relsTeardown(made, 4)).toBe('drop-column');
    /* The table was there before: only the column up added goes. */
    expect(relsTeardown({ rels_created: false, events_column_created: true }, 0)).toBe('drop-column');
    /* Table and column were there before: both stay. */
    expect(relsTeardown({ rels_created: false, events_column_created: false }, 0)).toBe('keep');
    expect(migration).not.toContain('CASCADE');
    expect(migration).not.toContain('DROP TABLE IF EXISTS');
  });

  it('records what it found before making anything, and refuses to guess without that record', () => {
    const recorded = migration.indexOf('INSERT INTO "speakers_merge_state"');
    const looked = migration.indexOf("const relsExisted = await tableExists(db, 'speakers_rels')");
    const created = migration.indexOf('CREATE TABLE "speakers_rels" (');
    expect(looked).toBeGreaterThan(-1);
    expect(looked).toBeLessThan(created);
    expect(created).toBeLessThan(recorded);
    expect(migration).toContain('RETURNING "id"');
    expect(migration).toContain("speakers_merge_state is missing, so what up created cannot be told from what was there before");
  });
});
