# Hason — Experience Composer v1 (Master Sprint 03)

The creative heart. Route: `/studio/events/[slug]/composer` (auth-gated by the Studio boundary). No new engines; everything composes the existing platform.

## Architecture Review

Three columns, one state, one renderer:

```
Server page      loads the experience for every enabled locale through the
                 existing application service (draft state, ContentSource)
Composer         one immutable reducer owns the draft (scenes per locale,
('use client')   selection, device, locale, identity) — no duplicated state
Timeline         chapter list over the same scene array
Stage            THE ExperienceRenderer — preview IS production, no iframe,
                 no second engine; device width + dir/lang wrap the frame
Panel            contextual fields resolved from a per-scene-type registry;
                 dispatches updateField → reducer → renderer re-renders
```

- **No business logic in React**: the reducer and path utilities are pure and fully tested (11 tests); components only dispatch.
- **Structural edits are locale-wide** (reorder/duplicate/hide affect the experience), **content edits are locale-scoped** (typing in Hebrew never touches English) — the localization semantics of the platform, enforced in one reducer.
- **Reserved persistence boundary**: `ComposerPersistence` (saveDraft / history / restore / submitForReview / launch) is the declared contract for S4 versioning; the Composer composes against in-memory state today and says so honestly in one quiet sentence — no fake save buttons, no dead code.
- **Field registry** (`SCENE_FIELDS`): each scene type declares its creative vocabulary (path, kind, bilingual label). No JSON, no IDs, no technical options ever reach the panel. Collections inside chapters (sessions, people, questions) belong to the Program area (S4) by design.

## Creative Review

The Composer speaks the experience language: chapters (Arrival, Purpose, Flow, People, Venue, FAQ, Join), a journey — not a tree, not blocks. The chrome is the platform's own stone-and-ink: hairline borders, tracked labels, display-serif chapter names, the bronze accent only on selection and active states. Identity is edited in purely creative words (dusk / ceremonial / monumental / calm / balanced / human) with an honest note that its full effect arrives with resolution (S4). Selecting nothing shows Identity — the experience itself is the default context.

## UX Review

Everything visible, nothing modal. Click a chapter → the stage glides to it and the panel becomes its content. Typing updates the real render instantly. Device (desktop/tablet/mobile), language (which also flips direction), all one press, all client-side, all the same engine. Reorder/duplicate/hide/rename appear only on the selected chapter — quiet until needed. Search filters chapters. Keyboard-first: every control is a real button/input/select with visible focus (global ring), min 44px targets, `aria-current`/`aria-pressed` states, sr-only labels where visuals carry meaning; motion is one soft panel reveal under `MotionConfig reducedMotion="user"`.

## Performance Review

One state tree, one renderer instance, zero duplicated rendering: an edit re-renders only through React's normal path into the memoized resolver. Scene components remain lazy chunks (loaded once per type). Composer route first-load 200 kB (shares the platform baseline). Build/typecheck/lint clean; 64 unit tests pass. Hydration surface unchanged — the composer is a single client boundary fed serializable props.

## Quality Review (the brief's questions)

Beside Figma — the three-zone direct-manipulation shape is native to that world. Notion users — chapters and a quiet panel read instantly. Framer users — live real rendering is the familiar promise, kept stricter. Government employees — no jargon, bilingual, nothing destructive without visibility. Non-technical organizers — the panel asks for a headline and a photograph, never for structure. The interface disappears: the largest thing on screen is always the experience itself.

## Known Boundaries (honest, by design)

In-memory draft (persistence contract reserved for S4); image fields accept a photograph address until the Media Library (S4); chapter collections edited in the Program area (S4); adding new chapters from the scene library arrives with per-type CMS modeling (S4); identity edits are kept state pending resolution (S4). Each boundary is stated in the UI in one quiet sentence — no placeholders pretending otherwise.
