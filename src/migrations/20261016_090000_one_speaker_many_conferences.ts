import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/*
 * One speaker, many conferences.
 *
 * A speaker used to be a roster entry of one conference (`speakers.event_id`),
 * so a guest speaking at two conferences was two cards, and an external
 * speaker added to two activities of the same conference was two cards as
 * well. Now a speaker is one card in the organisation's library, and a
 * conference's speakers are read from its activities, plus the few listed
 * on it by hand — the new `events` relationship, stored by Payload in
 * `speakers_rels`.
 *
 * In four steps, every one of which asks first:
 *
 * 1. `speakers_rels`, named as `payload generate:db-schema` emits it, and
 *    `speakers_merge_log` (below). Neither existed before this migration;
 *    if either does, it is used and not replaced, and `speakers_merge_state`
 *    records which of them up made, so that down removes only those.
 *
 * 2. Keep every conference's page as it is. A speaker whose conference
 *    names them on a standing activity is on that page through the
 *    activity; one it does not (a speaker listed by hand, or whose
 *    activities were shelved) is listed on it explicitly.
 *
 * 3. Fold the certain duplicates into one card: the same account, or the
 *    same name once spacing and punctuation are set aside ("אבי דיקשטיין."
 *    and "אבי דיקשטיין"), within one organisation. The fullest card is
 *    kept — an account, a photo, a bio — and takes the other's activities
 *    (each activity naming it once), conferences (each once, after its
 *    own), every link it did not already have, and any words or picture it
 *    lacked. Names that only look alike ("ד״ר דמיטרי מריאסיס" / "דמיטרי
 *    מריאסיס") are left alone: the Studio lists them for a person to decide.
 *
 * 4. Drop `speakers.event_id`, now said by the activities and the rels.
 *
 * Every fold is written down first. `speakers_merge_log` keeps, per fold,
 * the folded card whole (its row, both languages, links, activities,
 * conferences in their order and its conference column) and the kept card
 * as it was before the fold. It is a plain table outside Payload's schema
 * on purpose: nothing in the application reads it; it exists so `down` can
 * undo the folds.
 *
 * Down replays the log newest first. The folded card comes back under its
 * own id: its links under their own ids, order, labels and addresses, its
 * conferences in their own order under their own row ids, and any other
 * relationship rows it had. The kept card
 * goes back to exactly what it held. A link that is no longer where the
 * fold left it — moved to another card, or edited since — stops the
 * rollback with its id rather than being overwritten or copied; Payload
 * runs down in one transaction, so nothing is changed. Then down restores
 * the column and removes what up made, and only that.
 *
 * Changes made in the Studio after the migration are not part of the log;
 * down is for going back soon after, not weeks later.
 */

interface SpeakerFact {
  id: number
  organization_id: number
  account_id: number | null
  photo_id: number | null
  name_he: string | null
  name_en: string | null
  bio_he: string | null
  job_he: string | null
  company_he: string | null
  activities: number
}

interface LocaleRow {
  _locale: string
  name: string | null
  job_title: string | null
  company: string | null
  bio: string | null
  role: string | null
}

export interface LinkRow {
  id: string
  _order: number
  label: string | null
  url: string | null
}

interface SessionLink {
  parent_id: number
  order: number | null
}

/* One row of the `events` relationship: which conference, at which place, under which row id. */
export interface EventLink {
  id: number
  events_id: number
  order: number | null
}

export interface CardSnapshot {
  id: number
  organization_id: number
  event_id: number | null
  account_id: number | null
  photo_id: number | null
  created_at: string
  updated_at: string
  locales: LocaleRow[]
  links: LinkRow[]
  sessions: SessionLink[]
  events: EventLink[]
  /* Its rows of any other relationship in `speakers_rels`, whole, as Postgres wrote them. */
  other_rels: Record<string, unknown>[]
}

/* What up found and what it made, so down takes away only what up made. */
export interface MergeState {
  rels_created: boolean
  events_column_created: boolean
  log_created: boolean
  log_from_id: number
  listed_rel_ids: number[]
}

/* A link row as it stands now, found by the id a folded link had. */
export interface HeldLink {
  id: string
  parent: number
  label: string | null
  url: string | null
}

export type LinkRestore =
  | { kind: 'insert'; link: LinkRow }
  | { kind: 'return'; link: LinkRow }
  | { kind: 'conflict'; link: LinkRow; holder: HeldLink }

/*
 * How each link of a folded card goes back.
 *
 * Absent — it was not carried (the kept card had its address) and went
 * with the folded card: written again under its own id. On the kept card,
 * unchanged — the fold carried it: moved back, with its own order. Anywhere
 * else, or edited since: a conflict. It is neither deleted nor copied; the
 * caller stops and names it.
 */
export const planLinkRestore = (foldedId: number, keptId: number, links: LinkRow[], held: HeldLink[]): LinkRestore[] => {
  const byId = new Map(held.map((row) => [row.id, row]))
  return links.map((link) => {
    const holder = byId.get(link.id)
    if (!holder) return { kind: 'insert', link }
    const unchanged = holder.label === link.label && holder.url === link.url
    if (unchanged && holder.parent === keptId && keptId !== foldedId) return { kind: 'return', link }
    return { kind: 'conflict', link, holder }
  })
}

export type RelsTeardown = 'drop-table' | 'drop-column' | 'keep'

/*
 * What down does with `speakers_rels` once the migration's rows are gone.
 * A table up made, left empty, is dropped. A column up added to a table
 * that has other rows is dropped, and the table stays. A table and column
 * that were there before are kept.
 */
export const relsTeardown = (state: Pick<MergeState, 'rels_created' | 'events_column_created'>, remainingRows: number): RelsTeardown => {
  if (!state.events_column_created) return 'keep'
  return state.rels_created && remainingRows === 0 ? 'drop-table' : 'drop-column'
}

/* The same name, with spacing, punctuation and pointing set aside. */
const sameName = (name: string): string =>
  name
    .normalize('NFKC')
    .replace(/[֑-ׇ]/g, '')
    .replace(/["'`״׳.,;:!?()[\]{}\-–—_/\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()

const fullness = (row: SpeakerFact): number =>
  (row.account_id ? 8 : 0) +
  (row.photo_id ? 4 : 0) +
  ((row.bio_he ?? '').trim() ? 2 : 0) +
  ((row.job_he ?? '').trim() ? 1 : 0) +
  ((row.company_he ?? '').trim() ? 1 : 0) +
  Math.min(row.activities, 9) / 10

type Db = MigrateUpArgs['db']

const tableExists = async (db: Db, table: string): Promise<boolean> =>
  (
    await db.execute(sql`
    SELECT 1 FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = ${table}`)
  ).rows.length > 0

const columnExists = async (db: Db, table: string, column: string): Promise<boolean> =>
  (
    await db.execute(sql`
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = ${table} AND column_name = ${column}`)
  ).rows.length > 0

const highestId = async (db: Db, table: 'speakers_merge_log'): Promise<number> => {
  const [row] = (await db.execute(sql`SELECT COALESCE(max("id"), 0)::int AS top FROM ${sql.identifier(table)}`)).rows as unknown as {
    top: number
  }[]
  return Number(row?.top ?? 0)
}

/* One card, whole, as it stands — what the log keeps and down puts back. */
const snapshotOf = async (db: Db, id: number): Promise<CardSnapshot> => {
  const [card] = (
    await db.execute(sql`
    SELECT "id", "organization_id", "event_id", "account_id", "photo_id",
      "created_at"::text AS created_at, "updated_at"::text AS updated_at
    FROM "speakers" WHERE "id" = ${id}`)
  ).rows as unknown as Omit<CardSnapshot, 'locales' | 'links' | 'sessions' | 'events' | 'other_rels'>[]
  const locales = (
    await db.execute(sql`
    SELECT "_locale"::text AS "_locale", "name", "job_title", "company", "bio", "role"
    FROM "speakers_locales" WHERE "_parent_id" = ${id} ORDER BY "_locale"`)
  ).rows as unknown as LocaleRow[]
  const links = (
    await db.execute(sql`
    SELECT "id", "_order", "label", "url" FROM "speakers_social_links"
    WHERE "_parent_id" = ${id} ORDER BY "_order"`)
  ).rows as unknown as LinkRow[]
  const sessions = (
    await db.execute(sql`
    SELECT "parent_id", "order" FROM "sessions_rels"
    WHERE "path" = 'speakers' AND "speakers_id" = ${id} ORDER BY "parent_id"`)
  ).rows as unknown as SessionLink[]
  const events = (
    await db.execute(sql`
    SELECT "id", "events_id", "order" FROM "speakers_rels"
    WHERE "parent_id" = ${id} AND "path" = 'events' AND "events_id" IS NOT NULL
    ORDER BY "order" NULLS LAST, "id"`)
  ).rows as unknown as EventLink[]
  const others = (
    await db.execute(sql`
    SELECT to_jsonb(r) AS "row" FROM "speakers_rels" r
    WHERE r."parent_id" = ${id} AND r."path" <> 'events' ORDER BY r."id"`)
  ).rows as unknown as { row: Record<string, unknown> }[]
  return {
    ...card!,
    locales,
    links,
    sessions: sessions.map((row) => ({ parent_id: Number(row.parent_id), order: row.order })),
    events: events.map((row) => ({
      id: Number(row.id),
      events_id: Number(row.events_id),
      order: row.order === null ? null : Number(row.order),
    })),
    other_rels: others.map((row) => row.row),
  }
}

export async function up({ db, payload }: MigrateUpArgs): Promise<void> {
  /* 1 — the relationship table, the log of folds, and what up made of them */
  if (await tableExists(db, 'speakers_merge_state')) {
    throw new Error('one speaker, many conferences: speakers_merge_state already exists — this migration has been applied; run down first')
  }
  const relsExisted = await tableExists(db, 'speakers_rels')
  const eventsColumnExisted = relsExisted && (await columnExists(db, 'speakers_rels', 'events_id'))
  const logExisted = await tableExists(db, 'speakers_merge_log')

  if (relsExisted) {
    for (const column of ['id', 'order', 'parent_id', 'path']) {
      if (!(await columnExists(db, 'speakers_rels', column))) {
        throw new Error(`one speaker, many conferences: speakers_rels exists without "${column}"; it is not a Payload relationship table`)
      }
    }
  } else {
    await db.execute(sql`
    CREATE TABLE "speakers_rels" (
      "id" serial PRIMARY KEY NOT NULL,
      "order" integer,
      "parent_id" integer NOT NULL,
      "path" varchar NOT NULL
    );
    ALTER TABLE "speakers_rels" ADD CONSTRAINT "speakers_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "speakers"("id") ON DELETE cascade ON UPDATE no action;
    CREATE INDEX "speakers_rels_order_idx" ON "speakers_rels" USING btree ("order");
    CREATE INDEX "speakers_rels_parent_idx" ON "speakers_rels" USING btree ("parent_id");
    CREATE INDEX "speakers_rels_path_idx" ON "speakers_rels" USING btree ("path");`)
  }
  if (!eventsColumnExisted) {
    await db.execute(sql`
    ALTER TABLE "speakers_rels" ADD COLUMN "events_id" integer;
    ALTER TABLE "speakers_rels" ADD CONSTRAINT "speakers_rels_events_fk" FOREIGN KEY ("events_id") REFERENCES "events"("id") ON DELETE cascade ON UPDATE no action;
    CREATE INDEX "speakers_rels_events_id_idx" ON "speakers_rels" USING btree ("events_id");`)
  }
  if (!logExisted) {
    await db.execute(sql`
    CREATE TABLE "speakers_merge_log" (
      "id" serial PRIMARY KEY NOT NULL,
      "kept_id" integer NOT NULL,
      "folded_id" integer NOT NULL,
      "kept_before" jsonb NOT NULL,
      "folded" jsonb NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );`)
  }
  const logFrom = logExisted ? await highestId(db, 'speakers_merge_log') : 0
  await db.execute(sql`
  CREATE TABLE "speakers_merge_state" (
    "id" integer PRIMARY KEY DEFAULT 1 CHECK ("id" = 1),
    "rels_created" boolean NOT NULL,
    "events_column_created" boolean NOT NULL,
    "log_created" boolean NOT NULL,
    "log_from_id" integer NOT NULL,
    "listed_rel_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );`)
  await db.execute(sql`
    INSERT INTO "speakers_merge_state" ("rels_created", "events_column_created", "log_created", "log_from_id")
    VALUES (${!relsExisted}, ${!eventsColumnExisted}, ${!logExisted}, ${logFrom})`)

  if (!(await columnExists(db, 'speakers', 'event_id'))) {
    return
  }

  /* 2 — every conference keeps its page; the rows written here are noted, so down removes these and no others */
  const listed = await db.execute(sql`
  INSERT INTO "speakers_rels" ("order", "parent_id", "path", "events_id")
  SELECT COALESCE((SELECT max(x."order") FROM "speakers_rels" x WHERE x."parent_id" = s."id" AND x."path" = 'events'), 0) + 1,
    s."id", 'events', s."event_id"
  FROM "speakers" s
  WHERE s."event_id" IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM "sessions_rels" r
      JOIN "sessions" se ON se."id" = r."parent_id"
      WHERE r."path" = 'speakers' AND r."speakers_id" = s."id"
        AND se."event_id" = s."event_id" AND se."archived_at" IS NULL
    )
    AND NOT EXISTS (
      SELECT 1 FROM "speakers_rels" x
      WHERE x."parent_id" = s."id" AND x."path" = 'events' AND x."events_id" = s."event_id"
    )
  RETURNING "id"`)
  const listedIds = (listed.rows as unknown as { id: number }[]).map((row) => Number(row.id))
  await db.execute(sql`UPDATE "speakers_merge_state" SET "listed_rel_ids" = ${JSON.stringify(listedIds)}::jsonb WHERE "id" = 1`)

  /* 3 — fold the certain duplicates */
  const facts = await db.execute(sql`
  SELECT s."id", s."organization_id", s."account_id", s."photo_id",
    he."name" AS name_he, en."name" AS name_en, he."bio" AS bio_he,
    COALESCE(NULLIF(he."job_title", ''), he."role") AS job_he, he."company" AS company_he,
    (SELECT count(*)::int FROM "sessions_rels" r WHERE r."path" = 'speakers' AND r."speakers_id" = s."id") AS activities
  FROM "speakers" s
  LEFT JOIN "speakers_locales" he ON he."_parent_id" = s."id" AND he."_locale" = 'he'
  LEFT JOIN "speakers_locales" en ON en."_parent_id" = s."id" AND en."_locale" = 'en'
  ORDER BY s."id"`)

  const groups = new Map<string, SpeakerFact[]>()
  for (const row of facts.rows as unknown as SpeakerFact[]) {
    const name = sameName(row.name_he || row.name_en || '')
    const key = row.account_id
      ? `account:${row.organization_id}:${row.account_id}`
      : name
        ? `name:${row.organization_id}:${name}`
        : null
    if (!key) continue
    groups.set(key, [...(groups.get(key) ?? []), row])
  }

  let folded = 0
  for (const rows of groups.values()) {
    if (rows.length < 2) continue
    const [keep, ...others] = [...rows].sort((a, b) => fullness(b) - fullness(a) || a.id - b.id)
    const S = Number(keep!.id)
    for (const other of others) {
      const D = Number(other.id)
      /* Written down before anything is touched, so down can put both back. */
      const keptBefore = await snapshotOf(db, S)
      const foldedCard = await snapshotOf(db, D)
      await db.execute(sql`
        INSERT INTO "speakers_merge_log" ("kept_id", "folded_id", "kept_before", "folded")
        VALUES (${S}, ${D}, ${JSON.stringify(keptBefore)}::jsonb, ${JSON.stringify(foldedCard)}::jsonb)`)

      /* One statement at a time: a prepared statement carries one command. */
      const steps = [
        /* Its activities: each activity names the kept card once. */
        sql`UPDATE "sessions_rels" SET "speakers_id" = ${S}
          WHERE "path" = 'speakers' AND "speakers_id" = ${D}
          AND "parent_id" NOT IN (SELECT "parent_id" FROM "sessions_rels" WHERE "path" = 'speakers' AND "speakers_id" = ${S})`,
        sql`DELETE FROM "sessions_rels" WHERE "path" = 'speakers' AND "speakers_id" = ${D}`,
        /* Its conferences: each conference once, in its own order after the kept card's. */
        sql`INSERT INTO "speakers_rels" ("order", "parent_id", "path", "events_id")
          SELECT COALESCE(d."order", 0) + COALESCE((SELECT max(k."order") FROM "speakers_rels" k WHERE k."parent_id" = ${S} AND k."path" = 'events'), 0),
            ${S}, 'events', d."events_id" FROM "speakers_rels" d
          WHERE d."parent_id" = ${D} AND d."path" = 'events' AND d."events_id" IS NOT NULL
          AND d."events_id" NOT IN (SELECT "events_id" FROM "speakers_rels" WHERE "parent_id" = ${S} AND "path" = 'events' AND "events_id" IS NOT NULL)`,
        /* Its picture and account, where the kept card had none. */
        sql`UPDATE "speakers" SET
          "photo_id" = COALESCE("speakers"."photo_id", d."photo_id"),
          "account_id" = COALESCE("speakers"."account_id", d."account_id")
          FROM "speakers" d WHERE "speakers"."id" = ${S} AND d."id" = ${D}`,
        /* Its words, field by field, where the kept card's are empty. */
        sql`UPDATE "speakers_locales" k SET
          "name" = COALESCE(NULLIF(k."name", ''), d."name"),
          "job_title" = COALESCE(NULLIF(k."job_title", ''), d."job_title"),
          "company" = COALESCE(NULLIF(k."company", ''), d."company"),
          "bio" = COALESCE(NULLIF(k."bio", ''), d."bio"),
          "role" = COALESCE(NULLIF(k."role", ''), d."role")
          FROM "speakers_locales" d
          WHERE k."_parent_id" = ${S} AND d."_parent_id" = ${D} AND k."_locale" = d."_locale"`,
        sql`INSERT INTO "speakers_locales" ("name", "job_title", "company", "bio", "role", "_locale", "_parent_id")
          SELECT d."name", d."job_title", d."company", d."bio", d."role", d."_locale", ${S} FROM "speakers_locales" d
          WHERE d."_parent_id" = ${D}
          AND NOT EXISTS (SELECT 1 FROM "speakers_locales" k WHERE k."_parent_id" = ${S} AND k."_locale" = d."_locale")`,
        /* Its links: every one the kept card does not already have, after the kept card's own. */
        sql`UPDATE "speakers_social_links" SET
          "_parent_id" = ${S},
          "_order" = "_order" + COALESCE((SELECT max("_order") FROM "speakers_social_links" WHERE "_parent_id" = ${S}), 0)
          WHERE "_parent_id" = ${D}
          AND COALESCE("url", '') NOT IN (SELECT COALESCE("url", '') FROM "speakers_social_links" WHERE "_parent_id" = ${S})`,
        /* Its relationship rows go with it, as the cascade would take them — said here for a table that has none. */
        sql`DELETE FROM "speakers_rels" WHERE "parent_id" = ${D}`,
        sql`DELETE FROM "speakers" WHERE "id" = ${D}`,
      ]
      for (const step of steps) {
        await db.execute(step)
      }
      folded += 1
    }
  }
  payload.logger.info(`one speaker, many conferences: ${folded} duplicate speaker card(s) folded`)

  /* 4 — the column the activities and the rels now say */
  await db.execute(sql`ALTER TABLE "speakers" DROP COLUMN IF EXISTS "event_id";`)
}

/* The words of one locale row, written back as they were. */
const writeLocale = async (db: Db, parent: number, row: LocaleRow): Promise<void> => {
  await db.execute(sql`
    INSERT INTO "speakers_locales" ("name", "job_title", "company", "bio", "role", "_locale", "_parent_id")
    VALUES (${row.name}, ${row.job_title}, ${row.company}, ${row.bio}, ${row.role}, ${row._locale}::"_locales", ${parent})
    ON CONFLICT ("_locale", "_parent_id") DO UPDATE SET
      "name" = EXCLUDED."name", "job_title" = EXCLUDED."job_title", "company" = EXCLUDED."company",
      "bio" = EXCLUDED."bio", "role" = EXCLUDED."role"`)
}

/* A card's conferences, written back under their own row ids and in their own order. */
const writeEventLinks = async (db: Db, parent: number, links: EventLink[]): Promise<void> => {
  for (const link of links) {
    const taken = await db.execute(sql`SELECT "parent_id" FROM "speakers_rels" WHERE "id" = ${link.id}`)
    if (taken.rows.length > 0) {
      throw new Error(
        `one speaker, many conferences: rollback stopped, nothing was changed — conference row ${link.id} of speaker ${parent} is held by another row; resolve it by hand and run down again`,
      )
    }
    await db.execute(sql`
      INSERT INTO "speakers_rels" ("id", "order", "parent_id", "path", "events_id")
      VALUES (${link.id}, ${link.order}, ${parent}, 'events', ${link.events_id})`)
  }
}

/* A folded card's links, each under its own id, order, label and address — or the rollback stops. */
const writeLinks = async (db: Db, foldedId: number, keptId: number, links: LinkRow[]): Promise<void> => {
  if (links.length === 0) return
  const held = (
    await db.execute(sql`
      SELECT "id", "_parent_id" AS parent, "label", "url" FROM "speakers_social_links"
      WHERE "id" IN (${sql.join(
        links.map((link) => sql`${link.id}`),
        sql`, `,
      )})`)
  ).rows as unknown as HeldLink[]
  const plan = planLinkRestore(
    foldedId,
    keptId,
    links,
    held.map((row) => ({ ...row, parent: Number(row.parent) })),
  )
  const conflicts = plan.flatMap((step) => (step.kind === 'conflict' ? [step] : []))
  if (conflicts.length > 0) {
    const named = conflicts
      .map(({ link, holder }) =>
        holder.parent === keptId
          ? `link ${link.id} (${link.url ?? ''}) was edited on speaker ${keptId}`
          : `link ${link.id} (${link.url ?? ''}) is now on speaker ${holder.parent}`,
      )
      .join('; ')
    throw new Error(
      `one speaker, many conferences: rollback stopped, nothing was changed — folded speaker ${foldedId}: ${named}. Resolve it by hand and run down again`,
    )
  }
  for (const step of plan) {
    const { link } = step
    if (step.kind === 'insert') {
      await db.execute(sql`
        INSERT INTO "speakers_social_links" ("_order", "_parent_id", "id", "label", "url")
        VALUES (${link._order}, ${foldedId}, ${link.id}, ${link.label}, ${link.url})`)
    } else {
      await db.execute(sql`
        UPDATE "speakers_social_links" SET "_parent_id" = ${foldedId}, "_order" = ${link._order}
        WHERE "id" = ${link.id} AND "_parent_id" = ${keptId}`)
    }
  }
}

export async function down({ db, payload }: MigrateDownArgs): Promise<void> {
  if (!(await tableExists(db, 'speakers_merge_state'))) {
    throw new Error(
      'one speaker, many conferences: speakers_merge_state is missing, so what up created cannot be told from what was there before; nothing was changed — restore the backup taken before the migration',
    )
  }
  const [state] = (
    await db.execute(sql`
    SELECT "rels_created", "events_column_created", "log_created", "log_from_id", "listed_rel_ids"
    FROM "speakers_merge_state" WHERE "id" = 1`)
  ).rows as unknown as MergeState[]
  if (!state) {
    throw new Error('one speaker, many conferences: speakers_merge_state is empty; nothing was changed')
  }
  const listedIds = (state.listed_rel_ids ?? []).map(Number)

  await db.execute(sql`
  ALTER TABLE "speakers" ADD COLUMN IF NOT EXISTS "event_id" integer;
  DO $$ BEGIN
    ALTER TABLE "speakers" ADD CONSTRAINT "speakers_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  CREATE INDEX IF NOT EXISTS "speakers_event_idx" ON "speakers" USING btree ("event_id");`)

  /* Undo the folds, newest first: each folded card back whole, each kept card as it was. */
  const logged = (
    await db.execute(sql`
    SELECT "kept_id", "folded_id", "kept_before", "folded" FROM "speakers_merge_log"
    WHERE "id" > ${Number(state.log_from_id)} ORDER BY "id" DESC`)
  ).rows as unknown as { kept_id: number; folded_id: number; kept_before: CardSnapshot; folded: CardSnapshot }[]

  for (const entry of logged) {
    const S = Number(entry.kept_id)
    const card = entry.folded
    const kept = entry.kept_before
    const D = Number(card.id)
    const keptHad = new Set(kept.sessions.map((link) => link.parent_id))

    /* The folded card, under its own id — which nothing else may have taken. */
    const occupied = await db.execute(sql`SELECT 1 FROM "speakers" WHERE "id" = ${D}`)
    if (occupied.rows.length > 0) {
      throw new Error(`one speaker, many conferences: rollback stopped, nothing was changed — speaker id ${D} is already in use`)
    }
    await db.execute(sql`
      INSERT INTO "speakers" ("id", "organization_id", "event_id", "account_id", "photo_id", "created_at", "updated_at")
      VALUES (${D}, ${card.organization_id}, ${card.event_id}, ${card.account_id}, ${card.photo_id},
        ${card.created_at}::timestamptz, ${card.updated_at}::timestamptz)`)
    for (const row of card.locales) {
      await writeLocale(db, D, row)
    }
    await writeLinks(db, D, S, card.links)
    await writeEventLinks(db, D, card.events)
    for (const row of card.other_rels) {
      await db.execute(sql`
        INSERT INTO "speakers_rels" SELECT * FROM jsonb_populate_record(NULL::"speakers_rels", ${JSON.stringify(row)}::jsonb)`)
    }
    /* Its activities: taken back from the kept card where it alone had them, named beside it where both did. */
    for (const link of card.sessions) {
      if (keptHad.has(link.parent_id)) {
        await db.execute(sql`
          INSERT INTO "sessions_rels" ("order", "parent_id", "path", "speakers_id")
          VALUES (${link.order}, ${link.parent_id}, 'speakers', ${D})`)
      } else {
        await db.execute(sql`
          UPDATE "sessions_rels" SET "speakers_id" = ${D}
          WHERE "path" = 'speakers' AND "parent_id" = ${link.parent_id} AND "speakers_id" = ${S}`)
      }
    }

    /* The kept card, as it was before the fold. */
    await db.execute(sql`
      UPDATE "speakers" SET "photo_id" = ${kept.photo_id}, "account_id" = ${kept.account_id}, "event_id" = ${kept.event_id}
      WHERE "id" = ${S}`)
    await db.execute(sql`DELETE FROM "speakers_locales" WHERE "_parent_id" = ${S}`)
    for (const row of kept.locales) {
      await writeLocale(db, S, row)
    }
    await db.execute(sql`DELETE FROM "speakers_rels" WHERE "parent_id" = ${S} AND "path" = 'events'`)
    await writeEventLinks(db, S, kept.events)
  }

  await db.execute(sql`
  UPDATE "speakers" s SET "event_id" = COALESCE(
    (SELECT min(x."events_id") FROM "speakers_rels" x WHERE x."parent_id" = s."id" AND x."path" = 'events'),
    (SELECT min(se."event_id") FROM "sessions_rels" r JOIN "sessions" se ON se."id" = r."parent_id"
      WHERE r."path" = 'speakers' AND r."speakers_id" = s."id")
  )
  WHERE s."event_id" IS NULL`)

  /*
   * Only what up made goes. A relationship column up added holds nothing
   * from before it; a column that was there keeps its rows, less the
   * listings up wrote.
   */
  if (state.events_column_created) {
    await db.execute(sql`DELETE FROM "speakers_rels" WHERE "path" = 'events'`)
  } else if (listedIds.length > 0) {
    await db.execute(sql`
      DELETE FROM "speakers_rels" WHERE "path" = 'events' AND "id" IN (${sql.join(
        listedIds.map((id) => sql`${id}`),
        sql`, `,
      )})`)
  }
  const [left] = (await db.execute(sql`SELECT count(*)::int AS n FROM "speakers_rels"`)).rows as unknown as { n: number }[]
  const teardown = relsTeardown(state, Number(left?.n ?? 0))
  if (teardown === 'drop-table') {
    await db.execute(sql`DROP TABLE "speakers_rels"`)
  } else if (teardown === 'drop-column') {
    await db.execute(sql`ALTER TABLE "speakers_rels" DROP COLUMN "events_id"`)
    if (state.rels_created) {
      payload.logger.warn('one speaker, many conferences: speakers_rels holds other relationships now; kept, without its events column')
    }
  }

  if (state.log_created) {
    await db.execute(sql`DROP TABLE "speakers_merge_log"`)
  } else {
    await db.execute(sql`DELETE FROM "speakers_merge_log" WHERE "id" > ${Number(state.log_from_id)}`)
  }
  await db.execute(sql`DROP TABLE "speakers_merge_state"`)
}
