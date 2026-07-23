# Hason — Event Lifecycle Engine (Master Sprint 02)

The event is a living object. Four pure domain engines (`src/event-engine/`) plus the Experience Inspector give every surface one brain to consult. No engine renders UI; no business logic lives in React.

## Lifecycle Engine

Eight phases: draft → planning → registrationOpen → registrationClosed → preparation → live → completed → archived. The lifecycle is a **declarative transition map** — every legal move is listed; everything else is impossible (typed and runtime-checked). No switch statements anywhere: extension means extending the map. `transitionEvent` (lifecycle-service) is the single owner of transitions; it returns an immutable result (`ok` with the new phase, or the allowed set on rejection). Archive is reversible (archived → completed). Registration phases exist only for events with the `registration` capability — capability-gated availability, computed, never branched.

CMS: Events gained `phase` (select, default draft) and `capabilities` (multi-select) — the persistence of the living object; the engine remains pure.

## Capability Engine

Eleven capabilities as data (`registration`, `payments`, `networking`, `certificates`, `checkIn`, `notifications`, `waitlist`, `liveUpdates`, `surveys`, `resources`, `streaming`). Dependencies are declarative (`waitlist`/`payments`/`checkIn`/`certificates` require `registration`); `resolveCapabilities` reports invalid combinations instead of silently enabling them. Capabilities shape lifecycle availability, Studio adaptation, and (later) participant surfaces — all by consuming the same resolution.

## Readiness Engine

`evaluateReadiness(input) → Finding[]`. The input is a **facts snapshot** extracted by the application layer (`features/events/utils/health-input.ts`), so the Event Engine depends on neither the Experience Engine nor the CMS (Objective 8 independence). Every finding carries id, severity (blocker/warning/advice), category, and bilingual human message + recommended action. Eight composable rules ship in v1: hero photography, missing venue, missing emergency information (blocker — safety first), missing accessibility information, incomplete translations, same-room agenda overlaps, speakers without portraits, registration closing after event start (capability-aware).

## Experience Inspector v1

`inspectExperience(scenes)` (`experience-engine/inspector/`) — editorial intelligence, read-only, never mutating. Five rules: consecutive media-heavy scenes (tiring rhythm), hero without emotional anchor, purpose chapter over the editorial length, missing/misplaced join chapter (a journey without a door), repeated consecutive scene types (broken rhythm). Findings use the shared contract (Experience → Event dependency, the declared direction). Identity-contradiction checks await Experience Identity modeling (S4) — documented deferral. Disabled scenes are ignored.

## EventHealth — the single source of truth

`computeEventHealth(input)` is the only aggregator on the platform: lifecycle phase + publish status + resolved capabilities (with violations) + readiness findings + inspector findings (passed in by the application layer, preserving engine independence) + translation/media completeness → sorted findings, blocker/warning counts, a weighted readiness score (blocker 15 / warning 5 / advice 1, named constants), required actions (advice excluded, blockers first), and the available transitions. Nothing else calculates health.

## Adaptive Studio & Home

`PHASE_ADAPTATION` (features/studio) declares per-phase creative focus, hidden actions, and read-only state — surfaces consult the table; components never branch on behavior. Home now renders EventHealth as editorial sentences: the event title under a threshold line, the phase's focus sentence, "starts in N days", the readiness score as monumental typography, blockers as one sentence, and the top three required actions as quiet hairline entries with their recommended next step. No charts, no widgets, no counters without consequence. Until the S2 event workspace lands, the demo event feeds Home in development; otherwise Home stays calm and empty.

## Architecture Review (Objective 8)

Dependency directions verified: Identity ← everything (unchanged); Event Engine imports only Foundation (config/locales); Experience Engine imports Event's finding contract (declared downward direction); Capability/Lifecycle/Readiness/Health are siblings inside Event Engine with one-way internal imports; the adapter and inspector composition live in the application layer (features). No cycles; each engine evolves independently. Registration Blueprint remains untouched by this sprint and plugs into `capabilities`/`registration` facts when built.

## Verification

53 unit tests pass (14 lifecycle/capability, 10 readiness, 8 inspector, 5 health, plus the S1 suites); integration isolation suite still DB-gated; typecheck 0; eslint 0/0; build exit 0.

## Final Review

A municipality with 5 events, a ministry with 200, an organization with 5,000 historical events — all hold: events are scoped rows; health is computed per event on demand; archived events are read-only data, not weight. The lifecycle stays understandable because it is eight words and one map. The Studio becomes simpler as features grow — capabilities and phases *remove* surface instead of adding it. The Experience remains the hero: every engine exists to protect and complete it, and the Inspector guards its rhythm editorially. A different event type is data — capabilities, scenes, program — not architecture. Five years from now: a declarative map, pure functions, one aggregate, and sentences instead of dashboards is the architecture we would still choose.
