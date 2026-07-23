# Studio Core — Release 0.7

Status: Delivered 2026-07-15
Owner: Lead Software Engineer
Depends on: S1-Foundation.md, Event-Lifecycle.md, Experience-Composer.md, Dependency-Rules.md, Studio-Application-Layer.md

## 1. Purpose

Release 0.7 completes the promise of Product Decision D2: an organizer creates an organization's event, configures it, composes its experience, manages its people, venue and media, and launches it — without ever opening the Payload admin. Payload remains infrastructure; the Studio is the product.

## 2. Architecture

Every screen follows one path and only one path:

Studio surface (server component) → server action (`src/app/(studio)/studio/actions.ts`) → Application Service (`src/features/*/services`) → repository interface (`src/features/events/types/event-repository.ts`, `src/features/studio/types/creator.ts`) → Payload adapter (`src/infrastructure/payload/*`) wired at the composition root (`src/infrastructure/index.ts`).

Three consequences of this shape are load-bearing:

- Surfaces speak Product Language. No surface imports Payload, mentions collections, or handles `Where` clauses. The dependency audit (Dependency-Rules.md) verifies this on every review.
- Isolation is inherited, not re-implemented. Every adapter write passes `overrideAccess: false` with the acting user, so the S1 access layer (row-level organization isolation, grant guarding) governs the Studio exactly as it governs the API. The Studio adds no second authorization system.
- The actor is resolved once. `actorContext()` (`src/infrastructure/payload/payload-context.ts`) resolves the Payload instance, the authenticated user and the first organization the user may write to. Services never carry credentials.

## 3. Surfaces

### 3.1 Home (`/studio`)

Health-driven, phase-adaptive (PHASE_ADAPTATION): the active event's title, days-to-event as a sentence, readiness as a single number, and at most three required actions. Real events lead; the demo event carries development when no data connection exists.

### 3.2 Events (`/studio/events`)

Create (title + optional date — the slug is derived, Hebrew-safe, by `toEventSlug`), open, duplicate (`duplicateSlug`), archive. The list shows phase and launch state as words, not badges.

### 3.3 Event workspace (`/studio/events/[slug]`)

A persistent chrome (event title, phase, area navigation) around six areas:

- Overview — readiness score, required actions, available lifecycle transitions (each a single action; `transitionEvent` remains the sole phase mover).
- Composer — the three-column live workspace delivered in Master Sprint 03.
- People — portrait grid over the production `SpeakerPortrait`; add by name and role.
- Venue — a bilingual content form (explicit content-locale switch, independent of UI locale) writing the venue scene: name, address, description, map link, accessibility, emergency, parking, transit.
- Media — search, upload with required description, photograph grid.
- Launch — full findings review; the launch action renders only when `isLaunchable` (zero blockers) confirms. Launch is `eventRepository.launchEvent`, never a raw status write.

### 3.4 Organization (`/studio/organization`)

Rename the organization; update the creator's own display name. Both through `OrganizationRepository` / `ProfileRepository`.

## 4. Studio localization

The Studio UI language is a creator preference, not content state:

- Stored in the `studio-locale` cookie; read by `getStudioLocale`, written by `setStudioLocaleAction` via `writeStudioLocale`.
- The `(studio)` root layout derives `lang` and `dir` per request; switching is instant and affects every label.
- All Studio strings are `Record<Locale, string>` constants (`STUDIO_MESSAGES`, `WORKSPACE_MESSAGES`, `PHASE_LABELS`, `HOME_SENTENCES`) — nothing hardcoded, no third rendering path.
- Content locale is a separate, explicit choice inside content forms (Venue), so a Hebrew-speaking organizer can edit English content and vice versa.

## 5. Responsive and accessible

Every surface is single-column-first: forms wrap, navigation wraps below the wordmark on narrow screens, touch targets hold min-height 44px (`min-h-11`) and up. Landmarks (`main#main-content`, labelled `nav` and `section`), `aria-current` on active areas, `aria-pressed` on the locale switch, visible focus and reduced-motion inheritance come from the platform baseline. Approving a launch from a phone is a first-class path, not a fallback.

## 6. Verification

- 70 unit tests passing (identity, isolation factories, resolution, lifecycle, readiness, health, inspector, composer, studio core), 5 integration tests DB-gated.
- `tsc --noEmit`, `eslint .`, `next build` clean.
- Dependency audit: zero Payload tokens above `src/infrastructure`, `src/cms`, `src/payload.config.ts`, `src/app/(payload)`.

## 7. Deferred (with owners in the roadmap)

ComposerPersistence implementation (S4, first item), per-type structured CMS fields (S4), Media Library replacing address fields (S4), Program area (S4), registration and attendee identity (S3).
