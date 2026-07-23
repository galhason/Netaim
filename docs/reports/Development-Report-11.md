# Development Report 11 — Refinement Release (Audit implementation)

Period: 2026-07-16
Scope: Implement the approved Director's Audit (Product-Audit-01.md). Removal and surfacing only — no features, no new engines, no architecture change.
Constitution reference: §22

## Completed

The audit's P0–P3 items, in full where safe:

- **Participant dead-end fixed (Obj 1).** Successful registration now establishes the passwordless session (`establishSession` at confirmation, using the approved magic-link identity — no parallel auth). "To my personal area" now continues into a real `/me`. `RegisterResult` carries `participantId`; the register action signs the participant in before redirecting.
- **Registration reachable (Obj 2).** The Registration area is a normal workspace stop, always present; configuring it *is* enabling it. The capability gate (and its `CAPABILITY_GATED_AREAS` mechanism, the journey filter, and the layout prop) is deleted. Readiness now treats registration as optional-when-unset, configured-when-set — no capability flag required, no unreachable screen.
- **Unfinished areas hidden (Obj 3).** Library and Insights removed from the top navigation, the command registry, the empty-state copy, and their route pages deleted. No "coming soon," no empty destinations.
- **Launch folded into Overview (Obj 5, 7).** Launch is no longer a navigation stop; its route is deleted. The launch action lives on Overview, where readiness already lives — the organizer arrives at launch, never navigates to it.
- **The machine is hidden (Obj 6).** The manual "Move to {phase} / Next in the lifecycle" controls are removed from Overview, and the dead `movePhaseAction` (plus its `isEventPhase`/`moveEventPhase` imports) deleted. Phase is shown only as human language in the workspace header ("Planning," "Registration open"). The lifecycle engine is untouched.
- **Venue de-duplicated (Obj 4).** The Composer's Venue chapter no longer carries duplicate venue-fact fields (name, address, directions, description); those are edited once, in the Venue area (which is also the only place accessibility/emergency — both launch-gating — can be entered). The Composer keeps the venue chapter's presentation (label, heading, photograph). Shared data architecture preserved; one entry point for venue facts.
- **Language & consistency (Obj 8, 9).** "Media" → "Photographs" (area label and search), matching the "photography is the interface" direction and the "upload a photograph" actions inside it. Composer reorder verbs plainer (למעלה/למטה). Registration workspace reordered: the *situation* leads; settings sit behind a "Registration settings" disclosure (the form is no longer the hero); an unconfigured event opens the disclosure with a one-line invitation.

## Architecture Review

No engine, repository, contract, DTO, or access rule changed. Every change is deletion (routes, nav entries, a capability-gate mechanism, a dead server action, duplicate composer fields, dead copy) or surfacing (launch on Overview, session at confirmation). The one judgment call: the audit said "delete the standalone Venue area," but that area is the only entry point for accessibility/emergency info, which are launch blockers — deleting it would break readiness and data entry. Implementing the *intent* (one door for venue), I instead removed the **duplicate** door (the Composer's venue-fact fields) and kept the superset editor. This honors the finding without breaking the product.

## Technical Review

- Dangling-reference sweep clean: no remaining references to the deleted `movePhaseAction`, `CAPABILITY_GATED_AREAS`, `moveTo`/`transitions`/`phase` messages, `EMPTY_STATES.library`/`.insights`, `notEnabled`, or the deleted routes.
- Engine and readiness logic unchanged (verified pure suites this session remain valid; `STUDIO_COMMANDS` length assertions are dynamic and unaffected by removing two commands).
- Gates to run on the authoritative machine: `npm run typecheck && npm run lint && npm run test && npm run build`. Expect at most a stray unused-import if a deleted usage left one behind; the sweep suggests none.

## Creative Review

The Studio is quieter and more inevitable. The top navigation is three honest rooms (Home, Events, Organization) instead of five with two empty. The event workspace is six stops with no repeats, and the organizer arrives at launch inside Overview. The machine no longer shows through. The Registration screen leads with the situation, not a form.

## Product Review

Walked both journeys again. Organizer: Create → (inside the event) Experience → Registration (reachable, situation-first) → Participants/approvals → Launch (on Overview). Participant: Register → Confirmation (now signed in) → Personal area (real entrance code) → Arrival. The two dead ends the audit named are gone; nothing advertises the unfinished.

## Deletion Report

Removed outright: Library nav + route + command + empty-state; Insights nav + route + command + empty-state; Launch nav stop + route (action retained on Overview); the phase-transition UI + `movePhaseAction` + its imports; `CAPABILITY_GATED_AREAS` + the journey capability filter + the layout capabilities prop; the Composer's duplicate venue-fact fields; the `moveTo`/`transitions`/`phase`/`notEnabled` copy. Net: five top-level areas → three; seven workspace stops → six (no repeats); one dead server action and one gate mechanism gone.

## Product Critique (challenge my own work)

- **What still feels like software:** the People and Photographs areas are still separate form-shaped stops. They are *single* entry points (not duplicated), so they were correctly not deleted here — but fully honoring "edit from the Experience" means the Composer absorbing add-a-person and pick-a-photograph inline. That is a build, not a deletion, and belongs to a later release; I did not smuggle it into this one.
- **What still feels administrative:** the registration settings, even behind a disclosure, are still a form. It is now correctly secondary, but the truly Hason version composes registration as the experience's closing chapter.
- **What still asks the organizer to think:** dates still drive nothing automatically — phases are hidden but not yet *derived*, so an event's phase simply stops advancing. That is acceptable (nothing depends on it in the participant path), but a future release should let dates and completeness move the phase so the header narration stays true.
- **What still breaks the illusion:** in development, confirmation and magic-link emails only reach the outbox, so the passwordless promise is invisible until a provider is connected. That remains a deployment decision, flagged since S3.

## Open Questions (meaningful only)

- **Phase derivation.** Phases are now hidden from the organizer but still only change via archive. Should a future (non-scope) release derive phase progression from dates/completeness so the header narration stays accurate? Recommended, not urgent.
- **Composer absorption of People/Photographs.** The remaining single-entry form stops (People, Photographs) are the last "edit outside the experience" surfaces. Collapsing them into the Composer is the next real simplification — a build to schedule, deliberately not done here.
