# Hason — Opening Experience (Homepage Redesign)

Creative direction and implementation record for the homepage rebuild from first principles. Supersedes the previous homepage composition entirely. For the homepage only, this direction overrides Master-Direction.md's "no canvas animation / no heavy parallax" law by explicit Product Owner brief (2026-07-17); the event experience pages remain governed by Master-Direction as before.

## The principle

There are two different experiences that must never mix:

- **Experience A — Opening Experience** (the homepage): emotion, curiosity, atmosphere, anticipation, story. Never information first.
- **Experience B — Event Information** (`/events/[slug]` and its subpages): agenda, speakers, venue, registration, practical answers.

The homepage is a cinematic opening — the first ten minutes of the film. The visitor travels through scenes; scrolling moves the camera, not the page. Information begins only after emotional investment.

## Scene structure

One continuous film in eight scenes, in `src/features/cinematic`:

| # | Scene | Component | Composition |
|---|---|---|---|
| 01 | Arrival | `arrival-scene.tsx` | 200vh pinned frame; live WebGL atmosphere; one headline, one sentence, date · place, one CTA. Nothing else. |
| 02 | The Story | `story-scene.tsx` | Editorial split; photography holds half the frame; one paragraph — why the event exists, never how. |
| 03 | Why It Matters | `why-scene.tsx` | One human portrait, one large quote, at most one number rendered as typography. |
| 04 | Experience Preview | `moments-scene.tsx` | Edge-to-edge documentary moments with slow parallax and whispered captions; no agenda. |
| 05 | Speakers Reveal | `speakers-scene.tsx` | Magazine portraits in an offset editorial rhythm; hover draws the person closer; no carousel. |
| 06 | The Journey | `program-scene.tsx` | A living timeline drawn by scroll; day moments surface along a single line; no tables. |
| 07 | The Place | `venue-scene.tsx` | Massive photography carries the venue name; practical facts follow as quiet typography. |
| 08 | Registration | `closing-scene.tsx` | The emotional conclusion: one line, one action, no distractions. |

Removed permanently from the homepage (they belong to Experience B): the speakers carousel, the program timeline table, the gallery grid, the venue split card, statistics blocks, the sponsors strip. Deleted components: `cinematic-experience.tsx`, `hero-atmosphere.tsx`, `program-timeline.tsx`, `speakers-carousel.tsx`.

## Approved decisions (Product Owner, 2026-07-17)

1. **WebGL — pure shaders, no new dependency.** `arrival-atmosphere.tsx` renders one fragment shader (volumetric light shafts, drifting fog, three depth layers of dust, perpetual camera drift) in a single draw call. DPR capped at 1.5, low-power context, paused when offscreen or hidden, context-loss aware. Reduced motion draws one still frame; without WebGL the CSS gradient layers beneath remain as the fallback. Three.js was considered and rejected for weight.
2. **Scroll choreography — `motion` only.** Pinning via sticky + `useScroll`/`useTransform`; `parallax-image.tsx` is the single photographic parallax gesture; the program line draws with a spring. No GSAP, no Lenis.
3. **Content — hybrid, as before.** `getOpeningExperience` pulls the featured event, agenda and speakers from the CMS and falls back to the cinematic copy in `constants/cinematic-content.ts`. A follow-up sprint should add dedicated CMS fields for the opening scenes (story paragraph, quote, moments, closing line) so no copy lives in code.

## Accessibility and performance

Reduced motion collapses every scroll transform, the shader, and the word reveals to static presentation. The canvas is `aria-hidden`; heading hierarchy is h1 (arrival) → h2 per scene; captions are real text. Images go through `next/image` with explicit sizes. The shader is the only continuous animation and it stops when not visible.

## Verification

`typecheck` 0 errors · `eslint` 0 errors/warnings · `next build` exit 0 (homepage prerenders on fallback when no DB) · vitest 92 passed, 5 skipped. Visual pacing pass on a real browser (scene rhythm, shader intensity, mobile recomposition) is still pending — placeholders (picsum/pravatar) remain until production photography arrives.

## Open items

- Replace placeholder photography with CMS-managed production stills.
- Decide where (if anywhere) sponsors appear inside the opening — currently they appear only in Experience B.
- CMS authoring fields for opening-scene copy (follow-up sprint).
- Pacing/tuning pass on `/he` and `/en` across desktop, tablet, mobile, landscape.
