# Hason Studio — Roadmap

Phased so every milestone ships a usable whole. Order is dependency-driven: identity and scoping guard everything; the builder is the heart; registration makes the platform real.

## Milestone S1 — Foundations (gate for everything)

Full role matrix implementation (8 roles, scoped grants) in the Identity Engine; organization scoping enforced at the repository layer with dedicated isolation tests (Domain Blueprint risk 1 — the platform's highest risk closes here); Studio application shell (custom front-end over Payload APIs, per Product-Decisions D2) with Home skeleton, navigation, search foundation; local/dev PostgreSQL story resolved.

Exit gate: two organizations with distinct teams cannot see each other's anything, proven by tests.

## Milestone S2 — Event Workspace & Experience Composer v1

Event creation flow (one screen), the event workspace chrome, and the composer's three zones: journey column (order/add/disable), live stage (the real engine rendering drafts), scene panel with per-type structured fields (replacing the raw json `Scenes.content` — the CMS-Blueprint §3 modeling lands here). Versions and restore. Experience Preview mode (device/direction/locale/state switching). Launch with human-language diff; review gate per organization.

Exit gate: a non-technical event manager builds and publishes the demo event without help — the CMS-Blueprint final-review promise, now measured.

## Milestone S3 — Registration Engine v1 & Attendee Identity

Per Registration-Engine-Blueprint: open + approval modes, capacity, cancellation, waitlist v1 (automatic promotion), magic-link participant identity (pending approval), tickets with signed QR, the attendee `/me` journey switching from demo fixture to the real source, Notification engine v1 (email confirmations, localized templates). Program/People/Venue workspace areas feed the attendee day.

Exit gate: a real person registers, receives a working entrance code, and sees their personal day.

**In progress (2026-07-16).** Product Owner decisions taken: registration is **hybrid** (in-platform system of record, integration seam reserved — Open-Questions #2), **payments out of scope for v1** (#3), email as **Notification architecture + outbox + dev adapter** (#5-adjacent). Increment 1 delivered: the pure Registration Engine (`src/registration-engine/` — status machine, capacity, modes, waitlist, public-state derivation, data protection, domain events, reserved integration seam) and its readiness integration (Objective 8). See Registration-Architecture.md and Development-Report-09.md. Increment 2 delivered (2026-07-16): CMS schema (registration-settings, participant-sessions, notifications outbox + extended registrations/participants), repositories + composition-root wiring, application services (register/cancel/approve/decline/promote, capacity, magic-link identity), the Notification Engine + Foundation event bus + dev channel, the Studio Registration workspace (builder/capacity/participants+approvals, capability-gated), the public register→confirm→success journey, magic-link `/me` with a real entrance code, and readiness wiring so launch gates on registration blockers. See Registration-Architecture.md and Development-Report-10.md. Run `generate:types` before the gates. Sequenced after: offline QR gate scanning, waitlist auto-promotion timer, retention purge, real email provider, hybrid integration adapters.

## Milestone S3.5 — delivered early (Master Sprints 02–03)

The Event Lifecycle Engine, Readiness Engine, EventHealth, Experience Inspector v1, adaptive-Studio contract, health-driven Home, and Experience Composer v1 (three-column live composition over the production renderer, in-memory drafts) shipped ahead of schedule. S4 absorbs their completion items below.

## Master Sprint 04 — delivered (Architectural Purity)

Payload isolated as infrastructure: composition root, Payload adapters behind product interfaces (ContentSource, StudioIdentityGateway), DTO boundary, pure Identity Engine, zero-violation dependency audit as a standing review gate (see Dependency-Rules.md). No visual changes.

## Release 0.7 — delivered (Studio Core)

The complete organizer loop without ever opening Payload: event creation, duplication and archive; the event workspace (Overview, Composer, People, Venue, Media, Launch) driven by EventHealth; launch gated on zero blockers; organization and profile settings; bilingual Studio UI with instant Hebrew/English switching independent of content language; phone-comfortable surfaces throughout. All writes flow through Application Services and the S1 access layer (`overrideAccess: false`). See Studio-Core.md and Development-Report-07.md. The bulk of S2's event-workspace scope is hereby delivered; the composer's per-type structured CMS fields and versions/restore remain with S4.

## Release 0.8 — delivered (Studio Experience)

The experience layer over Studio Core, realizing the approved Information Architecture: journey navigation with a scope breadcrumb and a stable event-workspace side journey (`aria-current` active state); a four-question Home (Continue / Needs attention / Upcoming / Recently) over real data, with honest teaching states where no source exists yet; first-class teaching empty states replacing generic "no data"; and the command-palette and global-search foundation (action registry, one search language, pure matcher) as integration points only — no widget. Accessibility primitive decided: React Aria, adopted when the first composed widget ships (Open-Questions #11 resolved). No engine, repository, access rule or application-service contract changed. See Studio-Workspace-Architecture.md, Studio-Experience-Reviews.md and Development-Report-08.md. Full quality gates run on the authoritative machine before Done (Development Report 08 §8–9).

## Milestone S4 — Persistence, Program, Localization, Templates & Experience Identity

Composer persistence first (implement the reserved ComposerPersistence contract: drafts, history, restore, review, launch with human-language diff) and per-type structured CMS fields generated from the composer field registry; then the Program area (days/sessions/tracks/rooms as journey editing), Media Library (replacing photograph-address fields), localization dashboard (completion, outdated flags), experience/event templates (save-as, start-from), organization brand themes with the contrast launch-gate (Theme engine), and Experience Identity modeling with its resolution into theme, motion and tone (see Experience-Identity.md) — unlocking the Inspector's identity checks.

## Milestone S5 — Insights & Run-mode

Meaningful analytics only (see brief): registrations over time to capacity, attendance and check-in completion, session saves as popularity, arrival curve — each presented as an editorial answer, not chart soup. During-event mode for `/me` (now/next) and check-in flow for managers. Activity feeds (Audit engine surface). Exploration begins on the Experience Inspector — quality-of-experience evaluation over the same content contracts (see Experience-Identity.md).

## Milestone S6 — Hardening & Scale

Load validation against the 600-concurrent target on the registration path; offline snapshot strategy for attendee entrance; accessibility audit across the Studio; performance budget enforcement; Development Reports and documentation debt closed.

## Standing rules

Every milestone: DoD (typecheck/lint/build/tests once approved), Development Report per two sprints, no scope creep from Future-Platform items without explicit approval.
