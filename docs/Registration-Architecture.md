# Hason — Registration Architecture (Milestone S3)

Status: Approved for implementation 2026-07-16
Owner: Senior Product Architect
Extends: Registration-Engine-Blueprint.md, Platform-Engines.md §2.9, Domain-Blueprint.md §Registration, Attendee-Experience.md
Product decisions this milestone (Product Owner, 2026-07-16):
- **Registration scope: hybrid.** In-platform is the system of record; an explicit integration seam (inbound import / outbound push) is designed now and stubbed, not retrofitted (Open-Questions #2).
- **Payments: out of scope for v1.** The `PaymentProvider` contract and a reserved `paymentPending` status stay on paper; free events only (Open-Questions #3).
- **Email: architecture + outbox + dev adapter.** The Notification Engine and magic-link ship as architecture with a pluggable channel, an outbox, and a dev/log adapter; a real provider drops in at deployment (Open-Questions #5).
- **Delivery: engine + core surfaces this milestone;** tickets/QR check-in scanner and waitlist auto-promotion timers sequenced next.

Registration is the first conversation between organizer and participant. It is an experience, not a database. This document is the frozen reference the code follows.

## 1. Ownership and boundaries (unchanged architecture)

The **Registration Engine** (`src/registration-engine/`) owns Participant, Registration, Waitlist, capacity and attendance rules. It follows the Event Engine pattern exactly: a pure domain core with a typed public contract in `index.ts`; no rendering, no notifications, no Payload. It **reads** Event facts (capacity targets, start time) and **emits** domain events; it never writes to Event Management and never sends a message.

```
Public Join scene / Studio          → Application service (features/registration/services)
  → Registration Engine (pure rules) → Repository (infrastructure/payload) at the composition root
  → emits domain events              → Notification + Audit subscribe (never called directly)
```

Nothing above `src/infrastructure` imports Payload; every write passes `overrideAccess: false` with the acting user, inheriting the S1 isolation layer (organization scoping) exactly as the Studio does. No second authorization system.

## 2. Status lifecycle (the single state machine)

```
pending ──approve──▶ confirmed ──scan──▶ attended
   │                    │
   └──decline──▶ declined│
                         └──cancel──▶ cancelled        (frees capacity → promotion)
waitlisted ──promote──▶ confirmed
   └──offer-expires──▶ expired
confirmed/attended ──(post-event, derived)──▶ noShow when not scanned
```

`RegistrationStatus = pending | confirmed | waitlisted | cancelled | declined | attended | expired | noShow`. `paymentPending` is reserved (payments deferred) and intentionally absent from the v1 union — added with the PaymentProvider, no other change. Transitions are a pure allow-map (`registration-engine/registration/transitions.ts`); every applied transition is the seam where the application layer emits the matching domain event. No surface writes status directly; only `applyTransition` does.

## 3. Modes and outcome

Per event, CMS configuration (not code): **open** (instant confirm until capacity, then waitlist or closed), **approval** (every registration enters `pending` for the Registration Manager queue), **invitation** (pre-issued personal links; registration confirms a held place). `decideOutcome(mode, capacity)` is pure and returns `confirmed | pending | waitlisted`. Mode changes never rewrite existing registrations.

## 4. Capacity as experience (Objective 5)

Capacity lives on the registrable target (event now; workshop-type session later — the engine takes a target-agnostic count set). `computeCapacity({ limit, confirmed, pending, waitlisted })` returns the **availability experience**, never raw numbers alone:

```
CapacityView = {
  limit: number | null,        // null = unlimited
  confirmed, reserved (pending), waiting (waitlisted),
  available: limit === null ? null : max(0, limit - confirmed - pending),
  state: 'unlimited' | 'open' | 'limited' | 'full'
}
```

`limited` is a threshold band (default: ≤10% or ≤10 places, whichever larger — a constant, not a magic number). The organizer reads the situation instantly; the participant sees "places remaining" only when it changes their decision. No charts, no widgets.

## 5. Public registration states (Objective 4)

`deriveRegistrationState({ mode, opensAt, closesAt, capacity, published, now })` → `Draft | Open | LimitedAvailability | Waitlist | Closed | Cancelled | Completed`. One derivation, consumed by three surfaces (Studio badge-as-sentence, the public Join scene, the participant `/me` status) and by readiness — **no duplicated logic**. State is a function of settings + capacity + time + lifecycle, computed, never stored redundantly.

## 6. Waitlist

An ordered queue per target (polymorphic target id, as approved). Pure helpers: `nextInLine`, `promotable(freedSlots)`, `offerExpired(offer, now)`. Promotion policy per event: **automatic** (first in line receives an offer with an expiry window; on expiry the place passes to the next) or **managed** (Registration Manager promotes). v1 ships the pure policy and manual promotion action; the **timer that auto-expires offers** is the sequenced follow-up (documented seam: a scheduled sweep calls `promotable`).

## 7. Participant identity — magic link (D6, approved)

Participants are **not** CMS Users (Domain Blueprint: separate lifecycles, separate data protection). Flow: email → signed, single-use, expiring link → participant session → `/me` becomes personal. The signing secret is env (`REGISTRATION_LINK_SECRET`); tokens carry `{ participantId, purpose, exp }` and a signature. Government SSO later is an Identity-Engine strategy — this contract does not change. Passwords are never introduced for attendees. In development the dev channel logs the link; production swaps the email adapter only.

## 8. Confirmation experience (Objective 6) & Notifications

The engine emits; the **Notification Engine** (`src/notification-engine/`, reactive) owns localized templates, the channel contract, and an **outbox**. v1 delivery: `ChannelAdapter` with a `devChannel` (logs / writes outbox rows) — real SMTP/provider is a one-adapter swap at deployment. Templates are bilingual constants first, CMS-managed later. Emitted events the engine reacts to: `registration.confirmed | .pending | .approved | .declined | .waitlisted | .promoted | .cancelled`. Confirmation is calm and reassuring: screen confirmation + queued email + preparation/next-steps + entrance code stub. Failure to notify never blocks the registration transaction (outbox, async).

## 9. Tickets & attendance

A ticket is the projection of a confirmed registration: a signed token (`registrationId + event + signature`) rendered as the QR already present in the attendee Entrance scene. v1 issues the token and shows it; **offline gate scanning and the revocation-list sync are the sequenced follow-up** (blueprint §Tickets). Attendance is the `confirmed → attended` transition; `noShow` is derived post-event, never stored as a decision.

## 10. Data protection (Domain Blueprint risk 4 — build gate)

Designed into the first tables: per-organization **retention** policy; participant **export** (their own data, through the participant session); **deletion** as anonymization — `anonymizeRegistration` strips identity (name/email → tombstone) while attendance statistics survive without a person. Pure `anonymizeRegistration` and `retentionExpired(registeredAt, policy, now)` live in the engine; the scheduled purge is a sequenced sweep calling them. No participant PII leaves the organization scope.

## 11. Readiness integration (Objective 8)

`ReadinessInput.registration` gains facts (mode present, capacity set, confirmation message present) alongside the existing window fields. New pure rules (severity): registration configuration missing when the `registration` capability is declared (**blocker**), capacity unset for a non-invitation mode (**warning**), confirmation message missing (**warning**), plus the existing closes-after-start (**warning**) and venue emergency/accessibility (**blocker/warning**). Launch stays gated on zero blockers — registration blockers now participate. One health aggregate; no surface recomputes.

## 12. CMS schema (extends the approved skeletons)

`registrations` gains: `status` (extended options), `mode`-independent fields captured at submit (`answers` json for CMS-defined questions), `waitlistPosition`, `offerExpiresAt`, `cancelledReason`, timestamps. `participants` gains: `phone?`, `accessibilityNeeds?`, `dietary?`, data-protection fields (`anonymizedAt?`), and the magic-link `session` handled by a `participant-sessions` collection (token hash, purpose, expiry). New `registration-settings` live on the event (mode, capacity, opensAt/closesAt, waitlist policy, approval, confirmation message, form questions, emergency/accessibility prompts) — modeled as an event-scoped settings document, edited only through the Studio Registration workspace, never raw JSON. A `notifications` outbox collection records queued/sent messages. All fields organization-scoped through the single grants resolver; `registrationManager` already holds `registrations:manage`.

`payload generate:types` must run after these field additions (as in Report 07).

## 13. Studio Registration workspace (Objectives 1, 2, 9)

A new **Registration** area in the event workspace side journey (inserted after Venue, before Launch), visible when the `registration` capability is enabled (absence of capability = absence of surface). It is not forms; it is welcoming participants. Sub-surfaces:

- **Registration builder** — product-language questions only: *Who can attend? How many places? When does registration close? Approval required? Waiting list? Confirmation message? Emergency information? Accessibility requests? Dietary requirements?* No JSON, no schema editing. Each answer writes the event `registration-settings`.
- **Capacity** — the availability experience of §4 in sentences.
- **Participants** — people as names with states in sentences; the approvals queue (approve / decline with note) for approval mode; a check-in mode stub for event day. Never a CRM grid.

Adaptive: desktop manages fully; tablet edits; mobile monitors with quick actions (approve, open/close registration, capacity glance). Not a shrunk desktop.

## 14. Public registration experience (Objective 3)

One journey at `/[locale]/events/[slug]/register`, not separate pages: **Arrival** (the event's threshold and why-attend, inherited editorial grammar) → **Registration** (the CMS-defined questions, calm, typography-first, one primary action, accessible validation) → **Confirmation** (reassurance, entrance code stub, next steps) → **Success**. Server validation with a **transactional capacity check** (the platform's single high-write path). Outcome routes to confirmed / pending / waitlisted, each with its own calm copy. Fully accessible (keyboard, screen reader, RTL/LTR, reduced motion, clear validation) and fast (server components; the form island is the only client code).

## 15. Attendee `/me` becomes real

The Registration Engine is the first real `AttendeeContentSource`: outside demo mode, a participant session resolves the real registration → the existing `AttendeeExperienceContent` contract (unchanged — Attendee-Experience.md guaranteed this). Saved sessions, ticket and the pending-resource flips light up from real data.

## 16. Hybrid integration seam (Open-Questions #2 decision)

A declared boundary, stubbed now: `RegistrationInboundGateway.importRegistrations(source)` and `RegistrationOutboundGateway.publish(event)` interfaces in the engine's contract, with no implementation and no live wiring — so an external/government system can be attached later as an adapter (a sibling of Notification, per Platform-Engines §6) without reshaping the engine. In-platform remains the system of record.

## 17. What v1 delivers vs sequences

**This milestone**: the pure engine (this document's §2–§6, §10 logic), readiness integration (§11), and — built against runnable gates — the CMS schema (§12), application services + repository, the Studio Registration workspace (§13), the public register→confirm→success journey (§14), magic-link identity and the real `/me` source (§7, §15), and the Notification outbox with the dev channel (§8).

**Sequenced next** (explicit seams above): offline QR gate scanning + revocation sync (§9), waitlist auto-promotion timer and retention purge sweep (§6, §10), a real email provider (§8), and the hybrid integration adapters (§16).

## 18. Frozen

No engine boundary, existing repository interface, access rule, DTO, or approved Studio/public contract changes. Registration extends the platform along the seams the blueprints already cut.
