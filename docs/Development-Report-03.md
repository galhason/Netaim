# Development Report 03

Covering: Studio Vision Sprint, Product Direction Addendum, Milestone S1
Date: 2026-07-13

## Summary

The Studio was designed as a product (eight vision documents), the product language shifted to experience terminology, two future concepts (Experience Identity, Experience Inspector) were reserved with clean boundaries, and Milestone S1 delivered the technical foundation: the eight-role Identity Engine with single-point organization isolation, Vitest as platform architecture with 24 passing unit tests and a DB-gated integration suite proving the isolation exit gate, Docker-Compose PostgreSQL parity, and the Studio application shell (boundaries only).

## Completed Features

Role matrix (8 roles × 11 permissions, declarative); grant model on users (role/organization/event) with integrity hook; access factories + three collection access presets; row-level organization isolation; draft-read protection; Studio route group with identity boundary, five-area navigation and editorial Home skeleton; middleware exclusion for /studio; Vitest configuration and suite; docker-compose (dev + test databases); experience-language and identity/inspector documentation.

## Changed Files

`src/auth/*` (rewritten: types, permissions, grants, access, index), `src/cms/access-presets.ts` (new), all collections adopted presets (users and organizations rewritten; events/experiences/scenes/media/speakers/sponsors/participants/registrations swapped to presets; platform-settings to platformOnly), `src/middleware.ts`, `src/features/studio/*` (new), `src/app/(studio)/*` (new), `vitest.config.ts`, `docker-compose.yml`, `.env.example`, `package.json` (test scripts, vitest, vite-tsconfig-paths), `tests/*` (new), regenerated `payload-types`. Docs: Studio suite (8), Experience-Identity, Experience-Language, S1-Foundation, this report.

## Architecture Decisions

D1–D7 approved and recorded. S1 additions: isolation resolved at one function with query-level constraints; access presets over per-collection rules; Studio always request-rendered (`force-dynamic`); Studio chrome bilingual-in-code until S2 localization; integration tests DB-gated by `TEST_DATABASE_URL`; event-level grant narrowing stored now, enforced at service layer in S2.

## New Components

StudioShell, StudioNav, Studio sign-in boundary, Home/area skeleton pages. No visual polish by design.

## CMS Changes

Users: `roles` replaced by `grants[]` (breaking for the pre-S1 skeleton; no production data exists). Organizations/users access fully scoped. No other schema changes.

## Database Changes

None applied yet (schema materializes on first run against compose PostgreSQL).

## Known Issues

1. Integration suite requires `docker compose up` + `TEST_DATABASE_URL` (sandbox has no PostgreSQL) — runs on the local machine.
2. First-user bootstrap ungated (development convenience; production blocker tracked).
3. Studio sign-in links to the Payload admin login as the interim door; the Studio's own sign-in arrives with S2.
4. Standing local-machine actions: `npm install`, `git init`, Docker Desktop for compose.

## Risks

Grant-model migrations once real users exist (mitigate: land the role matrix before production data — done); Payload version pinning against access API changes; event-level narrowing must not be forgotten in S2 (tracked in S1-Foundation security review).

## Next Sprint

Milestone S2 — Event Workspace & Experience Composer v1, per Studio-Roadmap. Requires no further decisions to start.

## Questions Before Next Task

Open-Questions.md is current; S1 added: production bootstrap hardening for the first platform user. Deployment target beyond "PostgreSQL + object storage + CDN" (which cloud/on-prem) remains the main outstanding infrastructure decision.
