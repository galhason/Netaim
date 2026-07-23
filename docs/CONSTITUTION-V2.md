# HASON Constitution v2

Status: Supreme law of the project. Where v2 and v1 conflict, v2 wins; v1's engineering law (clean code, gates, documentation discipline, decision policy) remains in force beneath it.

## Identity

Hason is an **Experience Platform**. Not a CMS — it does not manage content. Not a builder — it does not build pages. It manages the **full lifecycle of an organization's digital experiences**.

The defining sentence: **The website is the canvas. The Studio is the creative environment.**

A visitor never browses a website — they walk toward something important. An editor never fills forms — they direct an experience.

## Vocabulary (locked)

- **Experience** — the only top-level thing. A homepage, a conference, a webinar, an exhibition, a kiosk, a participant portal: all Experiences, all equal. There are no Pages.
- **Experience DNA** — identity separated from content: lighting, atmosphere, typography, motion, photography, plus Lifecycle Rules. Duplicate with DNA + replace content = a new experience that belongs to the organization in minutes.
- **Experience Lifecycle** — the life of an experience, not its publishing: Draft → Planning → Building → Review → Scheduled → Live → In Progress → Completed → Archive. An experience is never replaced; it matures.
- **Experience Capabilities** — what an experience can do, derived from its type. Capabilities filter the Composer: a webinar editor never sees "Venue".
- **Scene** — the only unit of composition. There are no Blocks.
- **Scene Package** — a scene is a self-contained package: definition, renderer, editor, validator, defaults, preview, migrations, its own README. Scenes carry their own version; the Migration Runner upgrades scenes, not experiences.
- **Experience Runtime** — the single renderer of the platform, in four modes: Read / Preview / Edit / Presentation.
- **Scene Registry** — the open catalog of scene packages. The core knows the contract, never the scenes.
- **Experience Composer** — the single editor for every experience. There is no Homepage Editor, no Hero Editor.
- **The Guiding Light** — the global motion signature; one motivated light that quietly connects every scene, toned by the experience's DNA.
- **Content Engine** — Payload's only role: auth, database, media, versions, drafts, localization. An implementation detail.

## Fundamental Laws

1. **There is only one Runtime.** Every surface — public site, Studio preview, inline editing, mobile, kiosk, presentation — renders through it. A second renderer is forbidden, forever.
2. **Everything is an Experience.** No hardcoded experience types; no special homepage.
3. **Scenes are the only composition unit.** No Blocks. A scene needing internal flexibility solves it inside its own package.
4. **The Studio never exposes infrastructure.** No collection, field, document, locale-key or version-id ever reaches an editor's eyes or vocabulary.
5. **The website is the Canvas; the Studio is the Creative Environment.** Direct editing happens on the rendered experience; panels are assistants for what has no visual form.
6. **No editor without live rendering.** Editing blind is forbidden.
7. **Payload is an implementation detail.** It may be replaced without the Studio noticing. `/admin` is blocked in production; developer access only.
8. **Lifecycle is life, not publishing.** The runtime responds to lifecycle; Completed is a transformation, not an archive page.
9. **DNA is behavior, not decoration.** Atmosphere, motion and lifecycle rules are declared presets — never code per event.
10. **Animate the environment, never the UI.** Light, atmosphere, depth and dust live; the interface stays calm.
11. **Every feature must improve the experience.** If it doesn't help someone build a better conference experience, it does not belong.
12. **Runtime First.** No public experience, Studio feature, or editing capability may bypass the Experience Runtime. If a feature cannot be rendered by the Runtime, it does not exist.
13. **Data is Declarative.** Experiences describe what they are — DNA, scenes, settings. The Runtime decides how they are rendered. An experience never draws itself.
14. **Composition over Conditions.** Prefer composition through Scene Packages, Registries and Capabilities over conditional logic. Never `if (type === 'conference')`; always `capabilities.includes(...)` or `registry.resolve(...)`.

## Architecture (locked)

```
Studio (the product)
   ↓
Application Layer
   ↓
Domain Engines            ← Experience Engine: types, lifecycle, capabilities
   ↓
Content Services
   ↓
Payload Adapter           ← the last line Payload vocabulary may reach
   ↓
Payload (Content Engine)
   ↓
PostgreSQL
```

The Experience Graph starts minimal — `parent` and `continuesTo` — and grows only when a new surface consumes it.

## Build Plan (locked order)

- **Phase 1 — Core Runtime.** Experience Runtime (four modes), Scene Registry + SceneDefinition contract, Scene Package layout, Experience Types / Lifecycle / Capabilities (generalized from the Event Engine), Composer skeleton, Payload Adapter, `/admin` blocked in production. No inline editing yet. Exit criterion: the public site runs through the new Runtime.
- **Phase 2 — Public Experience Migration.** Every hardcoded public composition (homepage scenes, opening experience, conference experience) becomes a registered Scene Package. Exit criterion: not one public component renders outside the Runtime.
- **Phase 3 — Studio Evolution.** Canvas, inline editing, live preview, the real Composer, persistence, editorial publishing flow. Forms become assistants.
- **Phase 4 — Experience DNA.** The identity layer, lifecycle rules, Duplicate-with-DNA.
- **Phase 5 — Expansion.** Graph, plugins, mobile runtime, presentation mode, kiosk, AI.

Each phase ships only through the full gates: types, typecheck, lint, build, tests, documentation.

### Phase 1 — Definition of Done

Phase 1 is complete only when every condition holds:

- Exactly one Runtime exists in the system.
- Every public experience renders through that Runtime.
- The Scene Registry replaces every manual scene wiring.
- Experience Types, Lifecycle and Capabilities are part of the core model.
- Payload is fully hidden behind the Adapter.
- `/admin` is blocked in production.
- No additional renderer exists in the Studio.
- All tests and the full build pass.

If any condition fails — Phase 1 is not finished.

### Phase 2 — Definition of Done

Phase 2 is complete only when every condition holds:

- No hardcoded public compositions remain.
- Every Hero, Portal Wall, Story, Moments and CTA is a Scene.
- Opening and Conference are full Experiences.
- Every Scene arrives through the Registry only.
- No direct import of public components outside the Runtime.
- No `if (experience.type === ...)` logic in the render layer.
- Snapshot tests confirm there is no visual change.

Phase 2 ends with a demo, not a claim: create a new Experience, order its
scenes differently, change the Hero Scene — in JSON only — and watch it
render fully with zero code change. If the demo needs code, Phase 2 is not
finished.

### Architecture Review (every phase)

A phase ends with an Architecture Review, not only QA. Before the next phase begins, all answers must be "no":

- Was another renderer added?
- Was a direct Payload dependency created above the Adapter?
- Did the Studio expose an infrastructure concept?
- Was any Constitution law broken?

## The Test

Before merging anything, ask: does the visitor feel they are walking toward something important? Does the editor feel they are directing, not administering? Does the code still allow replacing the Content Engine tomorrow morning? If any answer is no — it is not done.
