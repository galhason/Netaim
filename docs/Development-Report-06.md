# Development Report 06

Covering: Master Sprint 04 — Architectural Purity (Studio/Payload isolation)
Date: 2026-07-15

## Summary

Nothing changed visually; everything changed underneath. Payload is now infrastructure: a dependency audit driven to zero violations, a composition root wiring product interfaces to Payload adapters, storage-to-product mapping at one boundary, and the Identity Engine split into pure domain (`src/auth`) and its Payload-facing access factories (`src/cms/access.ts`). The Composer, Studio, public and attendee experiences work exactly as before — 67 unit tests pass, build/typecheck/lint clean.

## Completed Features

`src/infrastructure/` (composition root, pure source selection, Payload content-source adapter, Payload identity gateway); `StudioCreator` DTO + `StudioIdentityGateway` interface; `getStudioCreator` application service replacing direct Payload auth in the Studio; event application service now resolves its ContentSource through the composition root; identity-engine purification (access factories relocated beside the collections); dependency audit command established as a review gate; 3 new boundary tests.

## Changed Files

New: `src/infrastructure/**` (4), `features/studio/types/creator.ts`, `tests/unit/composition.test.ts`, five architecture documents. Moved: `features/events/services/payload-content-source.ts` → infrastructure; `auth/access.ts` → `cms/access.ts` (importers updated: access-presets, users, organizations, platform-settings, isolation tests). Updated: event-experience-service, studio-auth, studio index, studio layout (creator language).

## Architecture Decisions

The composition root is the single exemption point where infrastructure meets product; application services import infrastructure only through it; the demo source is recognized as a first-class alternative implementation (substitutability exercised daily); the access factories are infrastructure by definition (they emit storage query constraints) and now live with the storage layer; audit-by-grep is part of Definition of Done for any sprint touching data access.

## New Components

None — by design. Zero visual change was an acceptance criterion.

## CMS / Database Changes

None.

## Known Issues

`ComposerPersistence`, Registration/Participant/Media services remain reserved contracts (S4/S3 as planned); the attendee live source still awaits the Registration Engine; auth `Where`-emitting factories are tested via unit shape-tests plus the DB-gated integration suite.

## Risks

The composition root must not accumulate logic (wiring only — review-guarded); future adapters must pass the isolation integration suite before wiring; grep-audit must run in CI once CI exists.

## Final Review (the brief's questions)

Can Payload be replaced? Yes — two adapter files and one wiring line, proven by the coexisting demo implementation. Can the Studio continue working? It already does, unchanged, on top of the new seam. Can a mobile app reuse the application services? Yes — they are plain async functions returning serializable DTOs. Can AI interact without React? Yes — the test suite is exactly such a consumer. Can APIs reuse the services? Yes — transport-agnostic by construction. Can another storage provider replace Payload? Yes — implement the interfaces, satisfy the isolation acceptance tests, rewire the root.

## Next Sprint

S4 unchanged (persistence first). Open-Questions.md unchanged.
