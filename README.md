# Netaim / נטעים — Event Experience Platform

An event experience platform for public-sector and government organizations.
Not a conference website: a product that produces conference experiences.

The shape of the domain is **Event → Experience → Scenes**. Scenes are
data, ordered and configured from the CMS, rendered by one Runtime. No
conference is spelled into the source.

## Getting started

```bash
cp .env.example .env      # fill DATABASE_URL and PAYLOAD_SECRET at minimum
npm install
npm run dev               # http://localhost:3000
```

The database schema is currently synced by Payload rather than by
migrations. On a fresh local database set `PAYLOAD_DB_PUSH=true` in
`.env`, run `npm run dev` until it reports Ready, stop it, and remove the
line. **Read `docs/Adopting-Migrations.md` before doing anything with
migrations against a database you cannot rebuild.**

## The commands that matter

| Command | What it does |
|---|---|
| `npm run gates` | The full Definition of Done: generate types → typecheck → lint → tests → build. **This is the one that decides whether work is finished.** |
| `npm run dev` | Development server |
| `npm run test` | Unit tests (vitest). Passing tests say nothing about whether the app bundles — `gates` ends with `build` for that reason. |
| `npm run test:integration` | Organization-isolation gate against a real Postgres (docker compose brings one up on 5433) |
| `npm run generate:types` | Regenerates `src/payload-types.ts` from the collections |
| `npm run payload` | Payload CLI |

CI runs the same sequence on every push to `main` and every pull request
(`.github/workflows/gates.yml`).

## Where things live

| Path | What it is |
|---|---|
| `src/app/(frontend)` | The public and participant site, locale-prefixed |
| `src/app/(studio)` | The organizer Studio — `(console)` is the surviving one, `(classic)` is being retired into it |
| `src/app/(payload)` | Payload's own panel and API. Blocked in production unless explicitly opened |
| `src/experience-runtime` | The scene Runtime (v2). Everything public renders through it |
| `src/experience-engine` | The previous engine (v1). Retiring — see `docs/System-Status-2026-08.md` |
| `src/scenes` | Scene packages: what a scene type is and which component draws it |
| `src/*-engine` | Pure domain: event lifecycle, registration, permissions, notifications, networking. No framework, no database |
| `src/features/*` | Application features. Fixed folder shape: `components hooks services types schemas utils constants index.ts` |
| `src/infrastructure` | The composition root and every Payload adapter. The only place that knows Payload exists |
| `src/cms` | Collection and global definitions |
| `docs/` | All project documentation. Nothing goes anywhere else |

## Before you write code

Read `docs/CONSTITUTION.md` and `CLAUDE.md`. They are not decoration —
they define what "done" means here, and the checks in `npm run gates`
enforce parts of them mechanically.

Start each piece of work from `docs/System-Status-2026-08.md` (what
exists and what is open) and the most recent report in `docs/reports/`.

## Deployment

`DEPLOY.md` is the server runbook, in Hebrew, step by step.
