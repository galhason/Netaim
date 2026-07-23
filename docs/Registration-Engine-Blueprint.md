# Hason — Registration Engine Blueprint

Architecture only. Extends Platform-Engines §2.9 and the Domain Blueprint's Registration context. The engine owns Participants, Registrations, Waitlist, capacity and attendance; it emits domain events and never renders or notifies directly.

## Registration flow

```
Visitor at Join (public)  →  Registration form (CMS-defined fields per event)
  → validate (server; capacity check transactional)
  → outcome: confirmed | pending-approval | waitlisted
  → domain event emitted (registration.confirmed / .pending / .waitlisted)
  → Notification engine reacts (confirmation, next steps, attendee link)
  → attendee identity established → /me becomes personal
```

Modes per event: **open** (instant confirm until capacity), **approval** (Registration Manager queue), **invitation** (pre-issued personal links). Mode is CMS configuration, not code.

## Participant identity (decision required — options)

The attendee journey needs sign-in without administrative feel. Recommended: **magic link** (email → signed link → session) — no passwords, government-friendly, calm; SSO (gov identity providers) as an authentication strategy later inside the Identity Engine. Alternative: OTP codes. Password accounts are explicitly not recommended for attendees. Pending Product Owner approval (Open-Questions.md).

## Status lifecycle

```
pending → confirmed → attended
   ↘ declined            ↘ no-show (post-event, derived)
confirmed → cancelled (by participant or manager; frees capacity → waitlist promotion)
waitlisted → confirmed (promotion) | expired (offer window passed)
```

Every transition is an emitted domain event; the Audit engine records all of them; notifications react to the meaningful ones.

## Capacity & waitlist

Capacity lives on the registrable target (event, workshop-type session). Waitlist is an ordered queue per target (polymorphic, as approved in the Domain Blueprint). Promotion policy per event: automatic (first in line, offer window with expiry) or managed. All capacity mutations are transactional — the single high-write path the 600-user target planning centers on.

## Tickets & QR lifecycle

A ticket is the projection of a confirmed registration. Its QR encodes a **signed token** (registration id + event + signature), enabling **offline verification** at the gate — scanners validate signatures without connectivity and sync attendance later.

```
issued (on confirm) → active (event window) → scanned (attendance recorded;
re-scan flagged, not blocked — human at the gate decides) → expired (post-event)
cancelled registrations invalidate the token immediately (revocation list synced to devices)
```

## Payments (hooks only)

Payment is an optional gate between "submit" and "confirmed": the engine defines a **PaymentProvider contract** (initiate, confirm-webhook, refund) and a `payment-pending` status. No processor is chosen; free events bypass entirely. Whether payments are in scope at all is an open product question.

## Cancellation

Participant self-cancel until a per-event cutoff; manager cancel anytime with reason (audited). Cancellation frees capacity, triggers waitlist promotion, revokes the ticket, and emits events for notification.

## Notifications (reactive only)

The engine never sends. It emits: confirmed, pending, approved, declined, waitlisted, promoted, cancelled, reminder-window-entered, event-updated. The Notification engine owns templates (localized, CMS-managed), channels, and preferences.

## Data protection

Participants are personal data of public-sector organizations: retention policy per organization, participant export (their own data), deletion with registration anonymization (attendance statistics survive without identity). Designed in from the first table — this was flagged as Domain Blueprint risk 4 and is a build-gate for the engine.

## Studio surface

Registration settings (mode, capacity, form fields, cutoff, waitlist policy) live in the event workspace; the Participants area shows people as names with states in sentences, a check-in mode for event day, and the approvals queue. Never a CRM table as the primary view.
