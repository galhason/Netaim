# Development Report 09 — Milestone S3, Increment 1 (Registration Engine core)

Period: 2026-07-16
Scope: Registration domain engine and readiness integration; the S3 architecture and its product decisions
Constitution reference: §22

## 1. Summary

The Registration milestone opened with the Product Owner resolving three blocking open questions (registration scope, payments, email delivery) and choosing the delivery slice. This increment lands the load-bearing foundation: the **pure Registration Engine** (`src/registration-engine/`) — the domain heart the rest of the milestone builds on — and its **readiness integration** into Event Health, plus the full **Registration Architecture** specification. Surfaces (CMS schema, services, Studio workspace, public journey, magic-link, notification outbox) are specified and sequenced against runnable gates.

## 2. Product decisions taken (recorded in Open-Questions)

- **#2 Registration scope — hybrid.** In-platform system of record; an explicit inbound/outbound integration seam (`RegistrationInboundGateway` / `RegistrationOutboundGateway`) is declared now and reserved, so an external/government system attaches later as an adapter without reshaping the engine.
- **#3 Payments — out of scope for v1.** `PaymentProvider` and a `paymentPending` status stay reserved; the status union deliberately omits `paymentPending` until then.
- **#5-adjacent Email — architecture + outbox + dev adapter.** The Notification Engine and magic-link ship as architecture with a pluggable channel and outbox; a real provider is a one-adapter swap at deployment.

## 3. Completed this increment

- **Registration Architecture** (`docs/Registration-Architecture.md`): engine boundaries, the single status machine, modes→outcome, capacity-as-experience, public registration states, waitlist, magic-link identity, confirmation/notification outbox, tickets/attendance, data protection, readiness integration, CMS schema, Studio + public + `/me` surfaces, the hybrid seam, and the v1-vs-sequenced split.
- **Registration Engine** (`src/registration-engine/`), pure and contract-only like the Event Engine:
  - status set + terminal set; the legal transition machine (`applyTransition` is the only status mover, the event-emission seam).
  - `computeCapacity` — the availability experience (unlimited/open/limited/full) with a declared "limited" band, not magic numbers.
  - `decideOutcome(mode, capacity)` — open/approval/invitation.
  - waitlist ordering, `nextInLine`, `promotable`, `offerExpired`.
  - `deriveRegistrationState` — one derivation of the public state (draft/open/limited/waitlist/closed/cancelled/completed) for Studio, Join scene and `/me`.
  - data protection: `anonymizeParticipant`, `retentionExpired` (Domain-Blueprint risk 4, designed in).
  - domain events + `eventForOutcome` / `eventForTransition`; the reserved hybrid integration gateways.
- **Readiness integration (Objective 8)**: `ReadinessInput.registration` extended with fact primitives (no cross-engine import — Event Engine stays independent of Registration Engine); three rules added — registration configured-missing (blocker), capacity-missing (warning), confirmation-missing (warning). Launch now gates on registration blockers through the existing single health aggregate.

## 4. Architecture decisions

- **Registration Engine mirrors the Event Engine**: pure domain core, typed `index.ts` contract, zero infrastructure — testable with no Payload, as the constitution's engine pattern requires.
- **Dependency direction preserved**: readiness consumes registration *facts* as primitives, so `event-engine` does not import `registration-engine` (Registration reads Event, never the reverse — Platform-Engines §2.3/§2.9).
- **One state derivation, no duplication** (Objective 4): `deriveRegistrationState` is the single source consumed by every surface and by readiness.
- **`applyTransition` as the emit seam**: no surface writes status; the event-emission point is the transition, keeping Notification/Audit reactive-only.

## 5. New components

None (UI surfaces are the next increment). New engine modules only.

## 6. CMS changes

None this increment. The `registrations`/`participants` field extensions and the `registration-settings`, `participant-sessions` and `notifications` collections are specified in Registration-Architecture §12 and land with the services increment (they require `payload generate:types`, which must run on the authoritative machine).

## 7. Database changes

None this increment (see §6).

## 8. Verification

| Gate | Result |
| --- | --- |
| Pure-logic suite (ported, isolated) | 36/36 passing — mirrors `tests/unit/registration-engine.test.ts` |
| Static type review vs `noUncheckedIndexedAccess` | clean (record access keyed by finite unions; `?? null` on indexed lookups) |
| `tsc` / `eslint` / `next build` / `vitest` full run | deferred to the authoritative machine — see Known issues |

New tests: `tests/unit/registration-engine.test.ts` — transitions/events, capacity bands, mode outcome, waitlist order/promotion/expiry, public state derivation, anonymization/retention, and the three registration readiness rules.

## 9. Known issues

- **Environment (not product)**: as in Reports 07–08, this session's sandbox cannot run the full gates — the Windows↔sandbox mirror truncates files and `node_modules` holds Windows-native binaries (rolldown) the Linux sandbox can't load. The engine is pure, so its logic was verified independently (36/36). The four gates must run on the authoritative machine: `npm run typecheck && npm run lint && npm run test && npm run build`.
- The three registration readiness rules are wired but stay dormant on existing events until the Studio builder supplies the facts (`configured`/`capacitySet`/`hasConfirmationMessage`) — by design; the health-input adapter passes them with the services increment.

## 10. Risks

- The high-write transactional capacity path (the 600-user planning centre) lands with the repository/service increment; the engine's capacity logic is pure and ready, but the transactional guarantee is an infrastructure concern to validate under load in S6.
- Participant PII: the data-protection primitives exist; the scheduled purge/export surfaces must be built before real participant data is accepted (build gate — tracked for the services increment).

## 11. Next increment (S3, increment 2)

Against runnable gates: CMS schema (§12) + `generate:types`; the registration application service + repository (register/cancel/approve/promote, transactional capacity); the Studio Registration workspace (builder/capacity/participants+approvals); the public register→confirm→success journey; magic-link identity and the real `/me` source; the Notification outbox with the dev channel; and wiring the readiness facts through `health-input`. Sequenced after: offline QR gate scanning, waitlist auto-promotion timer, retention purge sweep, a real email provider, the hybrid integration adapters.
