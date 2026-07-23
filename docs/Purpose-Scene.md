# Hason Platform — Purpose Scene (Chapter Two)

Director's Cut 02. The `story` scene type evolved from placeholder into the editorial Purpose chapter. Extension only: every new content field is optional, so existing story documents remain valid.

## Intent

Arrival creates anticipation; Purpose creates connection. The chapter reads like an editorial article, not an About section: the visitor should leave it understanding why the event matters — through meaning, not information density.

## CMS Contract (`storyContentSchema`)

| Field | Required | Notes |
|---|---|---|
| paragraphs | yes (min 1) | short narrative, never a wall of text |
| label | no | section eyebrow ("why we gather") |
| heading | no | h2, display serif |
| quote | no | `{ text, attribution? }` — part of the story, not a testimonial |
| keyNumbers | no (max 4) | `{ value, label }[]` — typographic, no cards |
| image | no | shared `imageMediaSchema`; the visual hero of the chapter |
| cta | no | quiet underlined link leading to the next chapter |

## Composition

Desktop: header block (label + heading, max-w-2xl) → asymmetric editorial grid — narrative and quote in a 5-column start-side column, portrait photograph (3:4, rounded) across 7 columns on the end side → key numbers as a bare typographic row (display-serif values, quiet labels, invisible container) → single text-link CTA. Generous vertical rhythm (py-28/40, gap-16/20).

Mobile recomposition: heading → photograph (4:5) leads → narrative → quote → numbers wrap in a flexible row → CTA. Same hierarchy, article rhythm, thumb-friendly link target.

RTL/LTR both come from logical grid order and properties — the grid mirrors automatically with `dir`.

The single accent use in this chapter is the short bronze rule above the quote — consistent with Arrival's one-accent law (the threshold line).

## Motion

Shared reveal grammar extracted to `features/experience/utils/scene-motion.ts` (`sceneSequence`/`sceneItem`); the hero re-exports it, so the whole experience shares one motion rhythm — no duplicated variants. Blocks reveal once on scroll (`whileInView`, `once: true`), soft 14px rise; numbers stagger inside their row; `MotionConfig reducedMotion="user"` governs the scene. No parallax, no attention-seeking effects.

## Performance & Accessibility

Below-the-fold image lazy-loads (`next/image` fill with sizes, no priority); aspect-ratio containers prevent layout shift; reveals are transform/opacity only. Semantics: `h2` under the hero's `h1`, `figure/blockquote/figcaption` for the quote, `dl/dt/dd` for numbers (visual value-first order, semantic label intact), localized alt from CMS.

## Verification

Demo purpose chapter validates through the engine (quote, 3 numbers, image, CTA) in both locales; typecheck 0; eslint 0/0; build exit 0. Demo image is a generated placeholder pending real photography.

**Final review — does the scene create understanding, strengthen the story, and lead forward?** Yes: the label answers "why", the narrative stays short and human, the quote carries the emotional core, the numbers give quiet scale, and the CTA hands the visitor to the agenda — chapter three's door.
