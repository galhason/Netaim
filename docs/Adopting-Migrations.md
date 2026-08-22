# Adopting Migrations

Status: **adopted, 2026-08-21.** Baseline `20260821_063558` is recorded
as applied; `migrate:status` lists it as run.

This document is kept as the record of how it was done and why. Two
things about it were wrong, and both are worth knowing:

**Step 6 assumed `PAYLOAD_DB_PUSH=false` was enough to stop pushing.** It
was not. `payload.config.ts` added `push: true` when the variable was
set and added *nothing* when it was not — leaving the adapter's own
default in charge, and that default is on outside production. Every
`npm run dev` was reshaping the database while the variable read as off.
The config now states `push` explicitly, so the variable is the only
switch.

**The rehearsal on a copy was skipped, deliberately.** The machine had no
`pg_dump` and no `psql`, and the operation is a single inserted row on a
development database that can be rebuilt. `scripts/db-adopt-baseline.mjs`
checks its preconditions and prints the statement that reverses it.
**On the production database, rehearse on a restored copy first** — the
reasoning below still holds there, where the data cannot be recreated.

Two scripts came out of this and are the way to repeat it:

- `node scripts/db-status.mjs` — read-only; reports what exists and what
  is recorded.
- `node scripts/db-adopt-baseline.mjs` — records the baseline as applied,
  refusing if the schema does not match or a real history already exists.

---

## The original note, for the reasoning

Status at the time: **not adopted.** Schema is synced with
`PAYLOAD_DB_PUSH=true`.

## Why it cannot just be run

The database was built entirely by push, so `payload_migrations` holds
nothing but the `batch -1 / dev` marker that push itself writes. With no
migration history to diff against, `migrate:create` describes the world
from nothing: a **baseline of all 78 tables**, in plain `CREATE TABLE`
without `IF NOT EXISTS`.

Running `migrate` against the existing database then fails on the very
first statement — in practice on `CREATE TYPE "public"."_locales"`,
before it reaches a table at all. Payload wraps a migration in one
transaction, so the failure rolls the whole thing back and nothing is
harmed. That is exactly what happened on 2026-08-07: data intact, no
migration recorded.

It is safe, but it is a trap, and the trap is armed for whoever runs the
script next without reading this.

## The order that works

1. **Stop pushing.** Freeze the schema; no field changes while adopting.
2. **Generate the baseline** — `npm run migrate:create`, name it
   `baseline`. Inspect it: it should describe the schema as it stands.
3. **Record it as already applied, without executing it.** Insert the row
   into `payload_migrations` by hand so Payload treats the current
   database as the baseline's result:
   ```sql
   INSERT INTO payload_migrations (name, batch, created_at, updated_at)
   VALUES ('<baseline file name, no extension>', 1, now(), now());
   ```
4. **Prove it** — `npm run migrate:status` should list the baseline as
   applied, and `npm run migrate` should report nothing to run.
5. **Test the next one for real.** Add a trivial field, run
   `migrate:create` again, and confirm the new migration contains only
   that change. That is the proof the baseline took.
6. **Set `PAYLOAD_DB_PUSH=false` everywhere** and never set it again
   outside a throwaway local database. The environment assertion in
   `src/config/env.ts` already refuses to boot with push enabled under
   `NODE_ENV=production`.

## Verify against a copy first

Restore a dump into a scratch database and run steps 2–5 there before
touching anything that matters:

```bash
pg_dump "$DATABASE_URL" > backup.sql
createdb hason_migration_test
psql hason_migration_test < backup.sql
# point DATABASE_URL at hason_migration_test and rehearse
```

## Until then

Local schema changes go through `PAYLOAD_DB_PUSH=true` in dev. That is
the correct workflow for a database you can rebuild at will; migrations
exist to protect one you cannot.
