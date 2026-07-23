# Development Report 12 — Production Studio UI

Period: 2026-07-16
Scope: Elevate the existing Studio into one production visual language. No new functionality, no engine or architecture change, no new data.
Constitution reference: §22

## Completed

- **Visual language established** (`src/styles/globals.css`, Studio-Visual-Language.md): restrained elevation tokens (`--shadow-soft`/`--shadow-raised`), one content-enter gesture (`rise`), a reduced-motion-safe `skeleton` shimmer, accent `::selection`, and a refined focus ring — one language, documented.
- **Production shell**: `StudioShell` is now a calm sticky workspace chrome (translucent surface + backdrop blur), with tightened rhythm and a single content reveal. No floating panels, no dashboard.
- **Production Home**: three questions and nothing else — Continue creating (one clear focus, the event's name in the display serif and its readiness as typography), Needs attention (only when it exists), Ready to launch (only when blockers are zero). Upcoming and the permanently-empty Recently are removed, along with their now-unused copy.
- **Event workspace**: kept whitespace-separated (per "whitespace before borders"); it inherits the shell's calm chrome and reveal, and the earlier refinement that made Overview the event's home with launch surfaced there.
- **Composer**: the live preview frame is now a soft-elevated, rounded canvas resting on the workspace — the preview reads as the hero; the surrounding toggles stay quiet. Architecture, renderer, reducer and engines are untouched.
- **Consistency**: one button grammar (brand-filled primary, underlined secondary), one empty-state component, one motion gesture, one accent. Dead copy removed (`blockersNeedAttention`, `allClear`, `homeUpcoming`, `homeRecently`).

## Architecture Review

Nothing structural changed. All edits are presentation: CSS tokens/utilities, Tailwind classes, and copy. No engine, repository, service, contract, DTO, route, or state logic was modified. The Composer change is a single wrapper class on its frame; its reducer and renderer are byte-for-byte the same.

## Technical Review

- No new dependencies. Motion is CSS-only (`rise`/`skeleton`), so it adds no JS and respects the existing global reduced-motion override.
- Dead-code sweep clean: removed constants have no remaining references; `HOME_SECTIONS` and `EMPTY_STATES` trimmed to what the production Home renders.
- Performance: no hydration added (server components unchanged); `backdrop-blur` is GPU-cheap and scoped to one header; the reveal is a one-shot transform. No route-splitting regressions.
- Gates to run on the authoritative machine: `npm run typecheck && npm run lint && npm run test && npm run build`. Risk is low (presentation-only); watch for any Tailwind class typo, though all classes used are standard utilities or the new globals.css classes.

## Creative Review

The Studio reads as an editorial workspace, not an admin panel: one stone surface, one bronze accent, the display serif for what matters, whitespace as the primary separator, and a single soft shadow reserved for the Composer canvas. Motion almost disappears — one settle on enter, quiet transitions on interaction. Restraint before excitement throughout.

## Product Review

Home now delivers "one clear focus" on open — the organizer sees their event's name large, its readiness as a number, and exactly what to do next. The workspace is connected and calm; the Composer's preview is unmistakably the hero. Nothing advertises the unfinished; nothing feels like a CMS.

## Visual Review

Spacing, grid, typography, elevation, borders, motion, transitions, hover, focus, loading/skeletons, and empty states are now one documented language (Studio-Visual-Language.md). Elevation and motion are deliberately scarce; hierarchy is carried by type and whitespace.

## Final review — the mission's questions

- *Would this stand beside Figma / Linear?* It aims to read calmer than both — fewer affordances, more editorial air.
- *Eight hours a day?* Less tiring by design: no counters, no widgets, one accent, generous whitespace.
- *Does the interface disappear?* Closer than any prior release — the work (the event, the preview) is what remains on screen.
- *Premium creative tool?* The Composer canvas, the typographic Home, and the quiet chrome say yes.

## Open Questions (meaningful only)

- **Skeletons are defined but not yet placed.** The `.skeleton` language exists; wiring per-surface loading states (Suspense boundaries with skeletons matched to each list) is a natural, non-scope follow-up that would make navigation feel even more immediate.
- **Per-route reveal.** The `rise` gesture fires once on the shell; a keyed per-area reveal (client) would animate each workspace switch. Deliberately not added to avoid client state where none is needed — worth considering only if it reads as more continuous, not more animated.
