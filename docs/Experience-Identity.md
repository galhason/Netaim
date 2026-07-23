# Hason — Experience Identity

A reserved architectural concept (Product Direction Addendum). Not a visual theme: the **creative identity of the experience**. It absorbs and supersedes the earlier "Experience Profile" naming from the Master Direction. **Not implemented in this phase** — this document reserves clean boundaries so implementation (Roadmap S4) requires no rework.

## Definition

Each event will eventually define its Experience Identity:

| Dimension | What it expresses | What it will influence |
|---|---|---|
| Photography Style | how the place is seen (dusk architectural, daylight human, documentary) | media guidance in the composer, scene image treatments (scrim strength, crops) |
| Atmosphere | the emotional register (ceremonial, warm, focused, festive) | semantic token resolution (Theme engine), spacing register |
| Venue Personality | how the place behaves as a character (monumental, intimate, modern) | venue and hero composition variants |
| Motion Intensity | how much the experience breathes (still, calm, present) | scene-motion grammar scaling, parallax on/off |
| Editorial Density | how much is said per silence (sparse, balanced, rich) | rhythm paddings, narrative lengths guidance |
| Content Tone | how the event speaks (official, human, inviting) | copy guidance in the composer; future Inspector checks |

Identity changes the *feeling* of an event. It never changes the platform, the scene contracts, or the design system's guarantees.

## Reserved boundaries (the architectural contract)

1. **Ownership**: Experience Identity is an Event-owned value object (Event Engine owns storage; defined in the event workspace Settings, chosen at creation alongside templates).
2. **Resolution**: a single resolver — `identity → { token overrides, motion scale, composition variants, guidance }` — lives with the Theme engine's resolution step. Scenes never read identity directly.
3. **Consumption**: the resolved result reaches scenes through the existing render context as an *optional* extension (`SceneRenderContext` gains an optional resolved-identity field later — non-breaking by construction, since every scene today renders without it).
4. **Defaults**: absence of identity is a complete, valid identity (today's platform look). Identity is always additive.
5. **CMS modeling**: fields land in S4 after approval (Open-Questions #12); until then no collection changes.
6. **Templates**: an experience template may carry an identity suggestion; instantiation copies it (copy-on-use holds).

## The Experience Inspector (exploration reserved)

The Inspector evaluates **experience quality**, not technical quality: is every scene fulfilling its emotional objective? Examples of future checks — a hero without photography, a purpose chapter whose narrative exceeds editorial density, missing translations on enabled locales, two consecutive scenes with identical composition emphasis, motion intensity exceeding the declared identity, a join chapter reached before any people or place were shown.

Why the architecture already supports it naturally: experiences are validated structured content (Zod contracts) rendered through one engine — the Inspector is a **pure read-only analyzer** over `ExperienceData` + resolved Experience Identity, exactly like the resolver: no new seams, no engine changes. Scene type definitions can later carry optional quality hints (e.g., "this scene's hero is the image") as metadata on the existing registry entry. Inspector findings surface in the composer and before Launch as quiet editorial sentences — guidance, never gates, unless an organization enables strict mode.

Exploration is scheduled in Roadmap S5; no implementation now.
