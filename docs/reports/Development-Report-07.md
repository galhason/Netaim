# Development Report 07 — Master Sprint 04 & Release 0.7

Period: 2026-07-14 → 2026-07-15
Scope: Architectural Purity (Master Sprint 04) and Studio Core (Release 0.7)
Constitution reference: §22

## 1. What was delivered

### Master Sprint 04 — Architectural Purity

Payload was demoted to infrastructure. A composition root (`src/infrastructure/index.ts`) now wires every product interface to its Payload adapter; application services import the root and nothing deeper. The dependency law is written (Dependency-Rules.md, Infrastructure-Boundaries.md, Studio-Application-Layer.md, Repository-Architecture.md, DTO-Strategy.md) and enforced by a grep audit that is a standing review gate. The audit passes with zero violations.

### Release 0.7 — Studio Core

The complete organizer loop, end to end, without the Payload admin:

- Event management: create (derived Hebrew-safe slug, optional date), duplicate, archive, phase transitions — all through `EventRepository`, all governed by the lifecycle engine.
- Event workspace: Overview (health, required actions, transitions), Composer, People, Venue (bilingual content form with explicit content locale), Media (search/upload/grid), Launch (findings review, blocker-gated action).
- Organization settings and creator profile.
- Studio bilingual UI: cookie-based locale, instant he/en switching, `dir` per request, every string a bilingual constant.
- Mobile-intentional surfaces: wrap-first layouts, 44px+ targets, sentence-based status language.

New CMS fields this release: `events.startsAt` (date), `events.phase` (select, default `draft`), `events.capabilities` (multi-select), `speakers.role` (localized text), `scenes.content` retained as the S4-bound json field. `payload-types.ts` regenerated.

## 2. Verification

| Gate | Result |
| --- | --- |
| `tsc --noEmit` | clean |
| `eslint .` | clean |
| `vitest run` | 70 passed, 5 skipped (DB-gated integration) |
| `next build` | success |
| Dependency audit | zero Payload imports above infrastructure |

New tests: `tests/unit/studio-core.test.ts` — slug derivation (Latin, Hebrew, fallback), duplicate-slug uniqueness, launch gate on blockers. The launch gate moved to a pure utility (`src/features/events/utils/launch.ts`) so the rule is testable without infrastructure; `launch-service` re-exports it, so the feature's public API is unchanged. The integration isolation test now supplies the required `phase` on event creation.

## 3. Decisions taken inside approved boundaries

- `isLaunchable` extracted to `utils/launch.ts` (pure-domain testability; no API change).
- Home prefers the first non-archived real event and falls back to the demo event only in demo mode — consistent with the approved demo-content substitution pattern.
- Venue content writes target the venue scene through `SceneContentRepository`, keeping the composer the only other scene writer.

## 4. Risks and debts

- ComposerPersistence is still a reserved contract; composing is in-memory until S4. This is the top S4 item.
- Media uploads use Payload local storage; production storage strategy is an open question (Open-Questions.md).
- The raw json `scenes.content` field remains until per-type structured fields land (S4).
- Development-environment note (not product): the sandbox↔Windows file mirror intermittently truncates recently written files; the working folder remains authoritative and verification re-runs from restored sources.

## 5. Next

Per roadmap: S3 (Registration Engine v1 and attendee identity) or S4 (Composer persistence and structured fields) — ordering awaits Product Owner direction; Open-Questions.md lists the decisions that unblock each.
