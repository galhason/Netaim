# Conference Experience Engine v2 — Acts & the Experience Map

Status: Approved direction (creative & architecture spec received 2026-07-19).
Governing law: docs/CONSTITUTION.md, docs/CONSTITUTION-V2.md. This document
maps the v2 spec onto the existing system and locks the build order.

## The idea in one paragraph

A conference page is not a stack of sections — it is a story told in Acts.
The model becomes Conference → Acts → Scenes → Experience. Acts are
**organizational containers for the editor only**: the Runtime keeps
rendering the same flat, composed scene list it renders today
(Constitution v2 §1, §12–§14 unchanged). What changes is how the editor
*thinks*: the Studio's conference workspace presents the experience as a
map of a participant's journey, not a list of components.

## Vocabulary (added to the locked set)

- **Act** — a named chapter of the conference journey. An Act contains
  flow Scenes. Acts can be reordered or hidden as a whole; Scenes keep
  being the only rendering unit. An Act is never a component and never
  reaches the Runtime.
- **Experience Map** — the editor's side panel: the journey shown as
  Acts with their Scenes, replacing the flat filmstrip. It reminds the
  editor they are building a participant's journey.

## The five Acts of a conference

Fixed for the current conference scene set (ids are stable):

| Act id       | Voice (he)  | Contains (scene instance ids) |
|--------------|-------------|-------------------------------|
| `invitation` | ההזמנה      | arrival                       |
| `story`      | הסיפור      | story, quote, moments         |
| `people`     | האנשים      | speakers                      |
| `experience` | החוויה      | program, venue                |
| `join`       | ההצטרפות    | closing                       |

`nav` (overlay) and `footer` (closing placement) are stage chrome — part
of the map for honesty, outside every Act, never movable or hidable.

## Rules of the Act model

1. **Composition stays flat.** Persistence remains the existing
   `CompositionEntry[]` (`{scene, hidden, variant}`) — no new collection,
   no schema change. Acts are derived: membership is static by scene id;
   an Act's position is where its scenes currently sit.
2. **Act operations are scene operations.** Moving an Act reorders its
   member scenes as one block inside the flat composition. Hiding an Act
   hides all its member scenes. An Act is "hidden" when every member is.
3. **Scene moves stay inside their Act.** The map groups by Act, so a
   scene swap across Act borders would be invisible and dishonest;
   the editor moves the Act instead.
4. **Deny the unknown.** An unknown act id, an impossible move, an empty
   act — every operation returns null and the action refuses quietly.
5. **Capability-gated.** All act/scene composition writes require
   `experiences:manage` scoped to the conference (Identity Build Brief
   WP5 discipline).

## What this release does NOT change

The Runtime, scene registry, placements, variants, persistence contract,
readiness/launch, routing, permissions, localization. No new dependency.

## v3 — the three presentation axes and the cinematic hero (2026-07-19)

Every scene now speaks three presentation axes, all chosen by the
composition, declared by the package, denied when unknown, and never
touching content: **Variant** (the layout), **Density** (how tightly it
breathes), **Emphasis** (how loudly it speaks). The composition entry
grew two columns (`density`, `emphasis`) — a CMS schema addition, so
`npm run generate:types` must run before the other gates. The workspace
inspector shows one chooser per declared axis.

Declared today: arrival — variants split/minimal, density compact,
emphasis cinematic; speakers — variant editorial, densities tight/airy,
emphasis featured (the first voice opens large); moments — variant
grid, densities tight/airy; sponsors — variant community ("who is
already on the way?" social-proof band); story mirrored and quote
minimal as before.

The hero became the invitation itself (v3 reference): a full-bleed
cinematic photograph as the sky, badge, headline, tagline, icon meta
row, two doors in, and a glass panel carrying the ticking countdown and
the at-a-glance numbers — so the standalone countdown and facts scenes
fold back to born-hidden (still available from the map). A scroll
whisper closes the frame. The public markup changed deliberately —
refresh snapshots once with `npx vitest -u`.

## The reference design pass (2026-07-19)

The conference page was redesigned to the approved visual reference
(dark navy + gold, card language): a split hero with a floating info
card, badge and icon meta row; countdown cards and the at-a-glance band
directly beneath it; the story as a framed editorial spread; speakers
as a snap-scrolling card rail; the program as one card with day tabs
over a golden timeline; moments as a horizontal gallery strip (the
"quiet grid" variant remains); partners as a logo strip; the closing as
a framed CTA band with the place beside the words. Content contracts
did not change — every scene edits exactly as before in the Studio, and
the canvas reflects the new design live. Countdown, facts and sponsors
are part of the reference design and now play by default (each is
silent without data). **The public markup changed deliberately: refresh
the locked snapshots once with `npx vitest -u` after this pass.**

## Scenes born hidden

New scenes enter the sequence with `hidden: true` authored on the
instance. Existing conferences do not change by surprise: the public
markup stays byte-identical (locked snapshots stay green) until an
editor invites a scene in from the map. Because a stored composition
predates every scene added after it was saved, `completeComposition`
inserts the strangers at their authored slot — after their nearest
authored predecessor the composition knows — carrying their authored
visibility. The Runtime itself is untouched.

## Build order (each increment ships whole, gates green)

1. **Acts + Experience Map** — *shipped.* Act constants, pure
   act-composition helpers + unit tests, act-level move/hide actions,
   the map replacing the filmstrip in the conference workspace.
2. **Missing scenes & variants** — *shipped.* Countdown (client tick,
   silent for past dates), At-a-glance facts (derived from program and
   people; cinematic fallback voice otherwise), Partners strip (from the
   sponsors module; no partners, no scene), Moments "quiet grid"
   variant. All born hidden. Deferred: video story (needs a CMS field —
   schema decision), gallery masonry/carousel variants.
3. **Act chapter intros** — *shipped.* A typographic interstitial scene
   package (`conference-act-intro`), one instance before each act after
   the first, toggled per act from the map. Born hidden.
4. **Rhythm Assistant** — *shipped (v1).* `inspectJourney` — four quiet
   rules (no door, too short, media back-to-back, no breath) surfaced in
   the map. Advisory only; thresholds are constants awaiting tuning.
5. **Derived navigation** — *shipped (derivation).* The nav's chapter
   links now derive from the visible journey (a hidden venue drops its
   link). Deferred: the scroll progress indicator (changes public nav
   markup — ship together with a deliberate snapshot refresh).
6. **Experience Templates** — open. Act arrangements as reusable
   starting points (One Day, Summit, Workshop…).

## Open decisions (do not guess)

- Video story scene — where the video URL lives (CMS schema addition).
- Whether templates live in code (presets) or CMS documents.
- Rhythm rule thresholds — current numbers are first sensible defaults.
- The scroll progress indicator's visual language + snapshot refresh.
