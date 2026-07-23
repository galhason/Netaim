# Hason — State of the System (Built vs Missing)

A single map, cross-referencing the 21 spec volumes + Executive Blueprint against the actual codebase (2026-07-16). Legend: ✓ built · ◐ partial · ✗ missing.

## The short version — what actually blocks a real launch

These are substance, not polish. In priority order:

1. **✗ Real email delivery.** The Notification Engine, templates, outbox, and magic-link all exist — but the only channel is a dev channel that *records* messages without sending. Until a provider is wired, no participant can actually receive a confirmation or sign-in link. The whole participant loop is untestable end-to-end.
2. **◐ The Composer doesn't save.** The Experience Composer edits **in memory only** — `ComposerPersistence` is a reserved contract, never implemented. Reordering chapters and editing hero/story content is a live preview that vanishes on refresh. Today the *only* way to persist most scene content is Payload admin — the exact thing "Studio is the only editor" forbids. This is the single biggest gap for the Studio being a real product.
3. **✗ Program.** No session/day/track domain, repository, collection, route, or data. The entire Program module is unbuilt.
4. **✗ Public landing / Marketing.** `/` and `/he` have no page (this is the 404 you hit). Visitors arrive only via a direct event link; there is no front door.
5. **◐ Participants & check-in.** Participants exist as a registration list + approvals; a real Participants module (profiles, attendance, ticket history) and the operator check-in flow are missing.
6. **✗ Audit trail.** Modelled in the specs and blueprints; no audit-log collection or surfacing. Government/enterprise trust needs "who did what, when."

## Domain engines

- ✓ **Event Engine** — lifecycle/phases, capabilities graph, transitions. Frozen, tested.
- ✓ **Experience Engine** — renderer, scene registry, Inspector. Frozen.
- ✓ **Registration Engine** — status machine, capacity, mode→outcome, waitlist, data-protection, domain events, reserved integration seam. Tested.
- ✓ **Readiness Engine** — rules, findings, EventHealth (incl. registration rules).
- ✓ **Identity Engine** — roles (8), permissions, org-scoped grants, isolation, `actorContext`; participant magic-link identity.
- ◐ **Notification Engine** — templates + channel contract + outbox + in-process event bus **built**; real delivery **missing** (dev channel only).
- ✗ **Audit Engine** — not built.

## Studio modules (the spec's module list)

- ✓ **Home** — production: three questions, greeting, ready-to-launch rail, loading state.
- ◐ **Organizations** — single-org rename + your-profile only (as "Settings"). Missing: team/member management, roles UI, branding, reusable assets, multi-org switcher.
- ✓ **Events** — list, create, duplicate, archive.
- ◐ **Experience Composer** — three-column live preview, chapters, panel, Experience Identity, device/locale. **Missing: persistence** (save, versions, restore, launch-diff) and inline people/media editing + media picker.
- ◐ **Registration** — situation-first workspace, builder, capacity, participants + approvals; public register→confirm→success; magic-link `/me`. Missing: QR check-in scanner + offline verification, waitlist auto-promotion timer, retention purge sweep.
- ◐ **Participants** — only the per-event registration list + approvals. Missing: participant profiles, attendance, ticket/history views, check-in operator mode.
- ✓ **People** — editorial portrait grid + add. (Speakers only; volunteer subtype not built.)
- ✗ **Program** — not built (biggest module gap).
- ✓ **Venue** — bilingual venue form (name/address/access/emergency/parking/transit) writing the venue scene.
- ◐ **Media Library** — per-event upload/search of photographs. Missing: reusable org-level library, tagging/usage, and the Composer picking from it (Composer still takes a URL).
- ◐ **Notifications** — outbox collection + dev delivery + templates exist. Missing: a Studio Notifications surface (queue view, template management, announcements/reminders) and real delivery.
- ◐ **Settings** — production Organization + profile settings. Missing: localization dashboard, permissions/members, integrations, per-event settings surface.
- ✗ **Platform Administration** — no platform-scope admin UI (platform roles exist in the model; Payload admin is the ops tool today).

## Public, marketing & participant

- ✗ **Marketing Website** — none (landing, solutions, pricing, login page). `/` and `/he` are 404.
- ✓ **Public Experience** — event scenes at `/[locale]/events/[slug]` (Arrival→Purpose→Program→People→Venue→Join). No public index by design (privacy), but also no landing.
- ◐ **Participant Portal (`/me`)** — real entrance code (signed QR value) + registration status. Missing: real saved-day/program, networking, certificates/recordings/feedback/resources (mostly honest-empty today).

## Cross-cutting

- ✓ **Design System / Visual Language** — production, documented (Studio-Visual-Language.md), one language across surfaces.
- ✓ **Localization** — he/en, RTL/LTR, cookie locale; content-locale in forms.
- ◐ **Search & Command Palette** — action registry + one search service (foundation) built; **no live palette UI**.
- ✗ **Insights / Analytics** — deferred (no data surface).
- ✗ **AI / Copilot** — future (Vol XIII), not built.
- ✗ **Payments** — out of scope for v1 (reserved contracts).
- ◐ **Deployment / DevOps** — app builds; gates pass on your machine. Open: email provider, object storage (S3 vs local), deployment target, migrations/backups in prod.

## What I'd build next (a proposed order — your call)

Grouped so each step ships something real:

1. **Make the Studio actually save** — implement `ComposerPersistence` (draft save, versions, restore, launch-diff). Without this the Studio isn't a real editor. *(No new engine — it's the reserved contract + a repository.)*
2. **Close the participant loop** — wire a real email provider behind the existing channel adapter (one adapter, decision needed) so confirmations + magic-link actually send. Then check-in operator + QR verification.
3. **A front door** — a minimal Marketing/landing at `/` and `/he`, plus login entry to the Studio (fixes the 404 and gives the product a face).
4. **Program** — build the session/day/track model (Event Engine extension) + the editorial timeline. This is the largest *new* build.
5. **Participants & Media Library** as real modules; **Audit trail** surfaced; **Organizations/Settings** depth (teams, roles, branding).

## Decisions I need from you before some of these

- **Email**: which provider (Resend / SendGrid / SES / SMTP relay / gov mail), and the **deployment target** (cloud which, or on-prem) — this also decides media storage (local vs S3).
- **Program scope**: full sessions/tracks/rooms, or a lighter agenda first?
- **Marketing site**: real marketing pages, or just a redirect `/` → `/studio` + a simple public landing?

Nothing here is built yet. Tell me where to start (or add what I've missed), and I'll build it in one verified slice.
