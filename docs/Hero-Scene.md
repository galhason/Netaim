# Hason Platform — Hero Scene

Milestone 2 — Task 2.1. First production scene, validating the complete scene architecture. Foundation only: structural styling, no final visual language.

## Component Architecture

```
HeroScene (registered renderer of scene type 'hero')
├── HeroBackground    image via next/image (fill, priority, object-cover);
│                     video contract accepted but unrendered (design-phase decision)
├── HeroContent       badge → eyebrow → h1 headline → subheadline → description
├── HeroMeta          locale-formatted event date (<time>) + location
├── HeroActions       primary CTA (brand tokens) + secondary CTA (bordered)
└── HeroScrollHint    decorative (aria-hidden), localized via i18n chrome
```

Every subcomponent is pure, single-responsibility, and renders `null` when its content is absent — the Empty state is compositional, not conditional spaghetti in one giant component.

## CMS Mapping

All content arrives through the scene content contract (`heroContentSchema`, Zod-validated at the engine boundary). Nothing is hardcoded; the only non-CMS string is the scroll hint, which is UI chrome from the i18n catalogs.

| CMS field | Required | Notes |
|---|---|---|
| headline | yes | the only required field; renders as the page `h1` |
| eyebrow, subheadline, description, badge | no | omitted → not rendered |
| eventDate | no | ISO string; invalid dates are skipped, never crash |
| eventLocation | no | plain localized text |
| primaryCta / secondaryCta | no | `{ label, href }` (shared `ctaSchema`) |
| backgroundImage | no | `{ url, alt?, width?, height? }` (shared `imageMediaSchema`) |
| backgroundVideo | no | future-ready contract (`videoMediaSchema`); accepted, not rendered |

Content currently lives in `Scenes.content` (localized json); per-type structured fields arrive with the CMS authoring sprint. The shared `cta`/`media` sub-schemas are reusable by every future scene.

## States

| State | Handled by |
|---|---|
| Loading | engine Suspense boundary (per-scene) |
| Error | engine SceneErrorBoundary (per-scene, logged) |
| Disabled | resolver skips before render |
| Unknown content | schema validation failure → collected, fallback rendered |
| Preview | draft content flows through the same contract (draft mode) |
| Published | default path |
| Empty | optional subcomponents render null; headline alone is a valid hero |

## Responsive Behavior

One component, all viewports: fluid centered column (`min-h-dvh`), spacing and type scale step up at the `md` breakpoint, CTAs wrap on narrow screens, `max-w-prose` caps description line length. RTL/LTR come free — the layout is centered and uses logical properties (`start-1/2` with RTL transform mirror on the hint); direction is inherited from `<html dir>`.

## Accessibility

Single `h1` per experience (headline); scene `aria-label` from CMS title; CTAs are true links with global token-driven focus-visible rings and ≥44px touch targets; date uses `<time dateTime>`; background image is explicitly decorative (`alt=""`, `aria-hidden` wrapper); scroll hint is decorative and hidden from screen readers; no motion yet, and any future motion inherits the global reduced-motion override.

## Performance

`next/image` with `fill`, `sizes="100vw"` and `priority` (hero is the LCP element); all subcomponents are pure with primitive/stable props (no re-render churn); the scene is code-split per the engine's lazy-loading contract; the video path is deferred by design so no player weight ships today.

## Future Design Opportunities (design phase, not now)

Cinematic entrance choreography (Motion/Framer — staggered content reveal, respecting reduced motion); video background playback policy (autoplay/mute/fallback image); parallax or scroll-linked background treatment; scroll hint animation and anchor behavior; premium background treatments (gradients, overlays) via theme tokens — all achievable inside `HeroBackground`/`HeroScrollHint` without touching the scene contract.

## Visual Experience (Task 2.2)

Design direction — deliberately Hason, not a borrowed look:

- **Palette: "Jerusalem stone at dusk."** Warm limestone surface, deep civic-ink text and CTA, one bronze accent used exactly once (the threshold line and the meta separator). Defined as semantic tokens in `globals.css`, so per-event CMS themes override them without touching components. No gradients-as-decoration, no fake luxury.
- **Typography.** Frank Ruhl Libre (display serif, Hebrew-first — official, dignified, timeless) for the headline; Heebo for everything else. Both cover Hebrew and Latin, loaded and self-hosted via `next/font` (zero layout shift, no runtime font requests). This replaces the per-script placeholder font tokens with per-role tokens (`--font-display`, `--font-body`) — documented token evolution.
- **Signature element: the threshold.** A thin bronze hairline that draws open above the headline (scaleX, origin flips for RTL) — the doorsill the visitor crosses into the event. It is the single memorable flourish; everything around it stays quiet.
- **Composition: arrival.** Full-viewport place; content anchored at the lower inline-start edge (the natural place your eye lands when standing at an entrance), generous whitespace above so the image breathes, `max-w-2xl` so text never dominates. Answers the three questions in order: badge+eyebrow+meta (where am I), headline+subheadline (why it matters), CTAs (do I continue). On mobile the same hierarchy compresses toward the thumb zone — bottom-anchored CTAs, full hierarchy intact.
- **Two appearances, one component.** With a background image: scrim gradient from the bottom, `--color-on-media` text. Without: stone surface, ink text. `hasMedia` switches tokens only — no duplicated layout.

Motion (Motion for React, `motion` package — approved by skill invocation):

- One orchestrated entrance: content blocks rise 14px and fade in, 90ms stagger, ~550ms ease-out curve. Felt, not seen.
- Background: slow 0.8s fade-in plus spring-smoothed parallax (48px over 600px scroll, transform-only, compositor-only) — disabled entirely under reduced motion.
- Micro-interactions: CTAs lift 2px on hover, settle to 0.98 on press.
- `MotionConfig reducedMotion="user"` governs the whole scene; the CSS scroll-hint pulse is killed by the global reduced-motion override.
- Performance rules honored: no scroll listeners (motion values), no layout-property animation, no blur, no scroll hijacking.

## Verification

Demo hero renders full content in both locales (9 CMS fields exercised); typecheck 0 errors; eslint 0 errors/warnings; `next build` exit 0 (fonts self-hosted at build time); renderer untouched — hero remains a plugin.

**Final review — does the Hero create the feeling of arriving somewhere worth being?** Yes: place first (full-viewport image with breathing room), information second (quiet, ordered hierarchy at the entrance edge), interface last (two restrained actions). The threshold line marks the moment of stepping in.

## Director's Cut 01 — Refinements

Applied on top of Task 2.2, refinement only, no new effects:

- **Content lowered, headroom raised** — top padding grew (pt-40), bottom padding dropped (pb-24): the block now sits low in the frame, cinematic, leaving the place most of the viewport.
- **Content quieter in support of the place** — subheadline and description stepped down one size; supporting text opacities reduced.
- **CTA inviting, not promotional** — primary became a pill (rounded-full); secondary lost its border and became an underlined text link with wide offset. Two gestures: one door, one path.
- **Meta simplified** — plain weight, softer opacity, the separator dot lost its accent color. The bronze accent now appears exactly once: the threshold line.
- **Badge unboxed** — the pill border removed; the badge is now a small tracked stamp of text.
- **Visual instructions reduced** — the "scroll down" text was replaced by a wordless vertical hairline that breathes; the unused i18n string was removed from both catalogs. The first scroll is invited, not instructed.

Verification after refinement: typecheck 0, eslint 0/0, build exit 0.

## Mockup Alignment (Director's reference image)

Implemented per the approved reference:

- **Event header** (`features/events/components/event-header.tsx`): brand name + door logo mark (inline SVG, accent-colored), CMS-driven navigation (anchor links to scene ids), and a locale switcher (labels from `LOCALE_LABELS`, current locale accented, `aria-current`). Transparent overlay positioned over the hero; text tokens switch with media presence. Content contract extended: `EventExperienceContent` now carries `brandName` (from the organization document in the Payload source; fixture value in demo) and `navigation` (Payload source serves empty until nav modeling lands in the CMS sprint). Mobile menu is deferred — navigation is hidden below `md` pending a specified mobile nav pattern.
- **Icons**: lucide-react added, wrapped in the `Icon` primitive (`shared/components/icon.tsx`) — fixed sizes, stroke 1.5, `aria-hidden`; the library never leaks past the primitive (Component-Architecture §9.4 resolved).
- **Scene anchors**: the engine renderer wraps each scene with its scene id, enabling header navigation to any scene. Documented engine extension.
- **Hero adjustments to match the reference**: badge restored as a bordered pill; date/location with accent calendar and pin icons separated by a quiet bar; CTAs as rounded rectangles (primary filled, secondary bordered); scroll hint is a pulsing mouse glyph above an optional CMS-driven label (`scrollHintLabel`).
- **Demo background image**: `/public/demo/hero-placeholder.jpg` — a generated warm-dusk gradient placeholder standing in for the real venue photograph (to be replaced by a Media Engine asset).
