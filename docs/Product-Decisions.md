# Hason — Product Decisions (Studio Vision Sprint)

Decisions proposed by this sprint, each justified. Marked **[approved earlier]** where already ratified, **[pending]** where Product Owner approval is required (mirrored in Open-Questions.md).

## D1 — Event-centric information architecture **[approved 2026-07-13]**

Six top-level areas; the event is the workspace; entity types are not navigation. Justification: organizers think in events; fifteen peer areas reproduce the control-panel feeling the direction bans; libraries answer reuse without table-browsing.

## D2 — Studio is a custom application over Payload's APIs **[approved 2026-07-13 — resolves Component-Architecture §9.2]**

The organizer-facing Studio is built in the platform's own design system, consuming Payload Local/REST APIs; the generated Payload admin remains an internal operations tool (platform roles only), never shown to organizers. Justification: the direction ("never like a classic CMS") cannot be met inside another product's admin chrome; Payload still saves months as the content backend — schema, versions, drafts, localization, media. The earlier recommendation (customized Payload admin) predates the Studio's product ambition; this supersedes it with reasoning, per the constitution's change rules.

## D3 — Structured direct manipulation, not freeform canvas **[approved 2026-07-13]**

The builder edits scenes on the live rendered experience; no pixel canvas. Justification: the platform's promises — accessibility, performance, RTL, coherence across hundreds of events — are properties of the structure. Freeform editing would trade those guarantees for decoration, which the direction forbids anyway.

## D4 — Experience Preview is the real engine **[approved 2026-07-13]**

Experience Preview renders through the same Experience Engine with draft content — never screenshots, never approximations. Justification: one renderer means zero preview drift and instant device/locale/direction/state switching.

## D5 — Role matrix extended to eight roles **[approved 2026-07-13]**

Adds Volunteer Manager and Reviewer per the Studio brief. Reviewer formalizes the review gate as a grantable role (not only Event Managers). Volunteer Manager requires a small domain extension (volunteers as participant subtype with assignments) — flagged as a domain question.

## D6 — Attendee identity via magic link **[approved 2026-07-13]**

Passwordless email links as the participant authentication baseline; government SSO later as an Identity-Engine strategy. Justification: calm, no credentials to manage, fits the "companion" philosophy; the Domain Blueprint's User/Participant separation stays intact.

## D7 — Analytics are decision-support sentences **[approved 2026-07-13]**

Only metrics with an action attached (capacity pacing, attendance completion, session demand, arrival curve, translation completeness). Presented as editorial answers with the number as typography. No vanity dashboards — Home stays chartless.

## Reaffirmed (no change)

Templates copy-on-use, never live-linked **[approved earlier]**; organization isolation as structural default, cross-org sharing only by explicit platform-scope publication **[approved earlier]**; numbers-as-typography, people-as-faces, day-as-journey extend into the Studio's own surfaces **[Master Direction]**.
