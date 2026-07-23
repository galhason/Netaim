# Hason Platform — Experience Engine

Milestone 1 — Task 1.3. Implementation documentation for `src/experience-engine/`. Architecture per Platform-Engines.md §2.4; contracts approved in Sprint 0 and extended here.

## Engine Overview

The Experience Engine renders CMS-driven experiences as ordered scenes. It is pure infrastructure: it knows scene *definitions*, never scene *implementations*, and contains zero business logic. Every public event page will render through it.

Every scene type is a plugin. Adding one requires exactly two steps — create the scene component, register its definition. The renderer never changes (open for extension, closed for modification; no switch statements, no type conditionals).

## Rendering Pipeline

```
SceneData[] (from CMS, typed contract)
  → resolveScenes()            pure, framework-free
      ├─ disabled scenes        skipped
      ├─ unknown types          collected as failures
      ├─ contentSchema.parse    invalid content collected as failures
      └─ valid scenes           ResolvedScene[]
  → ExperienceRenderer
      per scene: SceneErrorBoundary → Suspense → React.lazy(definition.load)
      failures: logged via platform logger, fallback rendered, rendering continues
```

## Registry Architecture

`SceneTypeDefinition<TContent>` is the plugin contract:

| Field | Role |
|---|---|
| `type` | unique scene type id (open string until the scene catalog is approved) |
| `contentSchema` | Zod schema — the engine boundary guard for CMS content |
| `load` | dynamic import of the scene component — enables per-type code splitting |

`createSceneRegistry()` returns an isolated registry (used in tests); `sceneRegistry` is the platform singleton. Duplicate registration throws — one source of truth per type. Content generics are erased at the registry boundary and restored by schema validation at resolve time; this is the one sanctioned type-erasure point in the engine.

## Scene Lifecycle

1. **Registration** (module init): feature module registers its definitions.
2. **Resolution** (per render, memoized): enabled check → registry lookup → content validation.
3. **Loading** (first render of a type): `React.lazy` triggers the dynamic import; lazy components are cached per definition so Suspense never remounts on re-render.
4. **Render**: the scene component receives `{ scene, context }` — structured, validated data only. Scenes never query Payload and never contain business rules (constitution).
5. **Failure**: at any step, the scene degrades to the fallback; remaining scenes are unaffected.

## Error Handling

- **Unknown type / invalid content**: collected by the resolver (never thrown), logged as warnings with scene id, type, and validation issues; fallback rendered.
- **Runtime render failure**: `SceneErrorBoundary` per scene catches, logs via the platform logger with component stack, renders the fallback. One failing scene can never break the experience.
- **Logging**: the engine uses `createLogger('experience-engine')` from the platform logging strategy (`src/shared/logging/`) — a transport-based logger; `setLogTransport` redirects all platform logging to monitoring without touching call sites. Console usage exists in exactly one sanctioned place (the default transport).

## Extension Guide

Adding a scene type (nothing else is required — no renderer changes):

```ts
import { z } from 'zod';
import { sceneRegistry } from '@/experience-engine';

const heroContentSchema = z.object({
  headline: z.string(),
});

sceneRegistry.register({
  type: 'hero',
  contentSchema: heroContentSchema,
  load: () => import('./components/hero-scene'),
});
```

The scene component default-exports a `SceneComponent<HeroContent>` receiving validated `scene.content` and the render context (locale, event slug). Rules: no Payload queries, no business logic, direction-agnostic styling, reduced-motion rendering defined.

## Performance Considerations

- **Code splitting per scene type**: an event using five scene types ships five chunks, not the whole library.
- **Lazy component caching** (WeakMap per definition) prevents Suspense remount churn.
- **Pure memoized resolution** — no re-validation on unrelated re-renders.
- **Fallbacks are `null` by default** — no layout shift from failed scenes; a styled fallback can be injected by the caller when the design system lands.
- Scene data arrives as serializable props (client component boundary), keeping the engine compatible with SSR page shells and future offline snapshots (Platform-Engines §6).

## Testability

Resolution (`resolveScenes`), validation (`validateSceneContent`), and registration (`createSceneRegistry`) are pure and framework-free — testable without rendering. The renderer accepts an injected registry, so tests never depend on the global singleton. A test framework is not yet part of the approved toolchain (open question for the Product Owner).

## Changes to Sprint 0 Contracts

The Sprint 0 registry stub (`registerSceneType(type, component)`) was superseded by definition-based registration. Justification (Constitution §20 — architecture requires it): lazy loading and content validation, both mandated by this task, are impossible with bare component registration. The type contracts (`SceneData`, `SceneRenderContext`, `SceneComponentProps`, `SceneComponent`) are unchanged, only extended.

## Scene Library (Task 1.4)

The first production scene library lives in `src/features/experience/` (feature template: components, schemas, types, constants, services, index.ts). Ten registered scene types: `hero`, `story`, `content`, `agenda`, `session-list`, `speaker-grid`, `venue`, `sponsor-grid`, `faq`, `registration-cta`.

- Content contracts are Zod schemas (`schemas/`), types are inferred from them (`types/scene-content.ts`) — one source of truth, no duplicated types. `session` is a shared sub-schema used by both `agenda` and `session-list`.
- Components render semantic, unstyled placeholder markup from validated CMS content only — no hardcoded user-facing text, no business logic, no Payload access. Final presentation arrives with the design system; raw `img` placeholders are explicitly marked for replacement by the Image primitive.
- `registerExperienceScenes()` (services/) is the single registration entry point; it is idempotent because module re-evaluation (dev HMR) must not trip the registry's duplicate guard. Page shells call it once at module scope.
- Runtime verification: 10 types registered; double registration safe; unknown types and invalid content degrade to collected failures while valid scenes render; disabled scenes are skipped. The renderer was not modified.

## Acceptance Criteria — Verification

| Criterion | Status |
|---|---|
| New scene types require registration only | ✓ (extension guide above) |
| Renderer unchanged by new types | ✓ registration-based resolution, no type conditionals |
| Scene failures isolated | ✓ per-scene error boundary + collected resolution failures |
| Lazy loading works | ✓ React.lazy per definition, cached |
| Type safety complete | ✓ zero `any`; one documented type-erasure boundary |
| No architectural violations | ✓ engine imports Foundation only; no Payload access |
| Build passes | ✓ `next build` exit 0 |
| Typecheck passes | ✓ `tsc --noEmit` — 0 errors |
| Lint passes | ✓ `eslint .` — 0 errors, 0 warnings |
