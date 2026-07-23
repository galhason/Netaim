# Hason Platform — Phase 2: Attendee Experience (Master Sprint 01)

Scenes 07–12 as one journey at `/[locale]/events/[slug]/me`. Public Experience v1.0 untouched (verified — zero edits to public scenes or routes; only public-API exports were added to `features/experience`).

## Creative Review

The attendee journey inherits the full editorial language and continues it personally. **Welcome Back (07)** opens with the threshold line and a greeting by name; the visual hero is the countdown — one monumental tabular number, not a widget. One primary action (to my day). **My Event (08)** is the Purpose grammar personalized: end-bleed venue photograph, a human summary, registration status as a quiet typographic pair, updates as hairline editorial entries — no admin table. **My Day (09)** reuses the walking-path grammar: saved sessions carry a single bronze dot (with screen-reader text), breaks recede typographically, one recommendation appears as a whispered note — personal journey, not agenda software. **Networking (10)** reuses the staggered portrait field; each face carries one human sentence of *why* ("registered for the same workshop") — no business cards, no CRM. **Your Entrance (11)** is the confidence chapter: a real QR (SVG, tiny dependency `react-qr-code`) on a raised stone surface, ticket status, and arrival/gate/help/emergency as the established quiet detail pairs; an offline note closes it. **After (12)** is closure: the threshold returns, resources wait as hairline rows with honest pending notes — an ending, not an archive.

## Experience Review

The flow reads: I'm ready (countdown) → this is my event (place + confirmation) → this is my day (path with my choices) → these are my people (faces + reasons) → this is my door (QR + certainty) → this stays with me (closure). Every scene keeps one emotional objective, one visual hero, one primary action. Rhythm alternates: tall start-aligned opening → offset split → path → centered wide → centered narrow → narrow editorial. Mobile recomposes each: countdown remains the hero at thumb reach, portraits pair in twos, QR centered at natural hand height.

## Architecture Review

- New feature module `features/attendee` (fixed template) with a typed `AttendeeExperienceContent` contract and the established ContentSource pattern.
- **Identity boundary (documented decision):** participant auth depends on the open registration-model question. The demo source serves the journey in development; outside demo mode the route resolves 404. The identity-bound Payload source is the Registration Engine's first deliverable — the contract will not change.
- Cross-feature reuse only via public APIs: `features/experience` now exports SceneHeader, SpeakerPortrait, VenueDetails, formatSessionTime and the motion grammar; `features/events` exports `isDemoContentEnabled` and the header. No duplicated UI, motion, or typography.
- **Studio preparation:** `Participants` and `Registrations` collections added as access-guarded skeletons (organization-scoped, relational contract only) — the Registration context boundary from the Domain Blueprint now exists in the CMS with no exposed UI.

## Performance Review

Route first-load 206 kB (shares the public chunk baseline; QR adds ~4 kB). No priority images on the attendee page (no LCP media contention; the countdown is text). All reveals transform/opacity; aspect-ratio containers guard CLS; countdown renders day-granular with hydration suppression on the single number. Build, typecheck, lint: clean.

## Accessibility Review

Heading ladder h1 (welcome) → h2 (scenes) → h3 (moments/updates); saved-session markers carry sr-only text; `<time>` semantics throughout; QR is an SVG inside a `figure` with a text caption (the code value remains machine- and human-readable); details use `dl`; RTL/LTR via logical properties; reduced motion via the global override + MotionConfig; all touch targets ≥44px.

## Future Opportunities (meaningful only)

1. **Registration Engine** — the one dependency blocking real identity, saved sessions, tickets and the pending-resource flips in After.
2. **Offline readiness as a real capability** — the entrance promises offline; delivering it means a service worker + snapshot strategy (Platform-Engines already anticipates serializable projections).
3. **During-event state** — the same journey re-composed for the live day (now-next, room changes) is a content-state question, not new architecture.
4. **Networking actions** — the human suggestions want one action (suggest a meeting); belongs to the Notification/Registration contexts.

## Quality Gate

Every screen feels like Hason — same stone, serif, thresholds, silences. Nothing is a dashboard — no grids of widgets, no tables, no cards. Nothing generic — every element is the established language. The day before the conference this page answers excitement; during it, certainty; after it, memory. Definition of Done: all checks pass.
