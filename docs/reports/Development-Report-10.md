# Development Report 10 — Milestone S3, Increment 2 (Registration surfaces)

Period: 2026-07-16
Scope: The full registration vertical slice on top of the approved engine — CMS schema, repositories, application services, notification outbox, Studio workspace, public journey, magic-link identity, readiness wiring
Constitution reference: §22

## 1. Summary

Increment 2 builds the surfaces the engine was designed for, changing no engine boundary. An organizer designs registration in the Studio; a participant registers through a calm public journey, receives a confirmation, signs in passwordlessly, and reaches a real personal area with a real entrance code. Registration now participates in Event Health, and every confirmation is queued through the Notification outbox.

## 2. Completed

- **CMS schema**: `registrations` and `participants` extended; new `registration-settings`, `participant-sessions`, `notifications` (outbox) collections; all organization-scoped through the single grants resolver and registered in `payload.config.ts`.
- **Repositories** (Payload behind product interfaces, composition-root wired): `RegistrationRepository`, `RegistrationSettingsRepository`, `ParticipantSessionRepository`, `NotificationOutboxRepository`. Access policy is explicit: aggregate counts and public/participant paths are system-level (`overrideAccess: true`, always scoped to the resolved event's organization — there is no CMS user); Studio manager reads/writes carry the acting creator (`overrideAccess: false`), inheriting S1 isolation.
- **Application services**: registration settings; the submission service (`registerForEvent`) — reads live counts, `computeCapacity`, `decideOutcome`, persists, emits; manager transitions (approve/decline/promote/cancel) through `applyTransition`; capacity/situation; magic-link identity (mint → hash → outbox link → consume → signed session cookie).
- **Notification Engine** (`src/notification-engine/`) + **Foundation event bus** (`src/foundation/event-bus.ts`): the engine emits registration events on the bus; the notifier (subscribed once at the composition root, keyed for HMR safety) renders bilingual templates and records to the outbox via a `devChannel`. A real provider is a one-adapter swap.
- **Studio Registration workspace**: a capability-gated area in the side journey (absent unless the event enables `registration`) with the product-language builder (*Who can attend? How many places? When does it close? Waiting list? Confirmation message? Ask for phone/accessibility/dietary?*), the capacity picture in words, and the participants list with the approvals queue.
- **Public registration journey**: `/[locale]/events/[slug]/register` — arrival → calm form (fields conditional on settings) → outcome confirmation (confirmed/pending/waitlisted) → personal-area link, plus a sign-in prompt. Server-validated; typography-first; RTL/LTR.
- **Magic-link `/me`**: the `enter` route consumes the token and establishes the signed session; the attendee source now resolves the real registration first (real entrance code = signed registration token), falling back to the demo source only when no one is signed in.
- **Readiness integration**: `reviewLaunch` now feeds real registration facts (configured, capacity, confirmation) into Event Health, so the S3-increment-1 rules activate and launch gates on registration blockers.

## 3. Architecture decisions (within approved boundaries)

- **Engine frozen**: no change to `src/registration-engine`. Surfaces consume its pure functions; `applyTransition` remains the only status mover and the emit seam.
- **overrideAccess policy** documented above — the one deliberate deviation from "always `false`", justified because public registration and participant sign-in have no CMS user; writes are still organization-scoped by construction.
- **Application-level events→registration read**: `launch-service` reads `getRegistrationSettings` to supply readiness facts. This is application orchestration (a feature service composing two contexts), not an engine dependency — `event-engine` still never imports `registration-engine` (readiness consumes primitives).
- **In-process event bus** in Foundation; a durable queue is a future swap with no emitter change.

## 4. New collections / CMS changes

`registration-settings`, `participant-sessions`, `notifications`; extended `registrations` (status union, answers, waitlistPosition, offerExpiresAt, cancelledReason, submittedAt) and `participants` (phone, accessibilityNeeds, dietary, anonymizedAt).

**Required before typecheck/build**: run `npm run generate:types` (or `payload generate:types`) so `payload-types.ts` includes the new collections/fields — the repositories reference them. Optional env: `REGISTRATION_LINK_SECRET` (falls back to `PAYLOAD_SECRET`).

## 5. Verification

| Gate | Result |
| --- | --- |
| Registration engine pure suite (ported) | 36/36 |
| Readiness registration rules (ported) | 6/6 |
| Brace/structure sanity on new surface files | balanced, no truncation |
| `generate:types` → `tsc` / `eslint` / `test` / `build` | to run on the authoritative machine (see §6) |

## 6. Known issues / order of operations

- **Environment**: as in Reports 07–09, this sandbox cannot run the gates (mirror truncation; Windows-native `node_modules`). The pure logic is verified independently. On the authoritative machine, run in order: `npm run generate:types` **first** (new collections), then `npm run typecheck && npm run lint && npm run test && npm run build`. The repositories intentionally reference the not-yet-generated types; typecheck is only meaningful after regeneration.
- Where Payload's generated shapes are uncertain from here, adapters normalize documents through narrow local row interfaces; expect at most minor field-name reconciliations after `generate:types`.

## 7. Sequenced next (unchanged from the architecture)

Offline QR gate scanning + revocation sync; waitlist auto-promotion timer and retention purge sweep; a real email provider; participant self-cancel from `/me`; and the hybrid integration adapters. The seams for all of these are in place.
