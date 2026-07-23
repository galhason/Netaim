# Hason Platform — Experience Sprint 01

Scenes 04–06 implemented per Master-Direction.md; Scene 03 (Experience Flow) was already live as the Day chapter. FAQ was refined for journey cohesion. All schema changes are optional-field extensions — no existing content breaks.

## Scene 04 — People ("I trust the people behind this event")

`speaker-grid` evolved: schema gained `label`, `heading`, `intro`. Composition breaks rhythm deliberately — the first centered chapter: centered header (SceneHeader gained a `centered` variant), then a wide portrait field (2 columns mobile, 4 desktop). People are faces: sharp 3:4 portraits, name in display serif, role as a whisper — no cards, no borders, no corporate grid feeling. Missing photos degrade to a quiet stone block. Portraits reveal individually on scroll.

## Scene 05 — Venue ("I know where I am going")

`venue` evolved: `label`, `heading`, `description`, `image`, `mapUrl` + `mapLabel` (CMS-driven link text), `details[]` (max 6 label/value pairs). Composition is the image-emphasis chapter: editorial intro, then the photograph at full viewport width (16:9 → 21:9) with the venue name and address set into its lower edge over a familiar scrim — an echo of Arrival, the place seen up close. Logistics (parking, transit, accessibility, doors) render as quiet typographic pairs — the numbers grammar, not info-cards; directions are a single underlined gesture opening in a new tab.

## Scene 06 — Join ("I am ready to attend")

`registration-cta` evolved: `eyebrow`, `text`, `note` joined `heading`/`label`/`href`. The emotional conclusion: a narrow centered column, the bronze threshold line reappearing (the same line that opened Arrival — the journey's bookend), a large display heading, one reassuring sentence, one substantial primary action, and a whispered note. No urgency mechanics; confidence, not conversion pressure.

## Journey cohesion pass

- FAQ restyled into the language (narrow column, SceneHeader, hairline-divided `details/summary`) so no placeholder interrupts the journey; schema gained `label`/`heading`.
- Demo hero primary CTA now lands on the Join scene (`#demo-cta`) — the first door and the last door are the same door.
- Demo navigation gained Venue; demo carries 4 speakers with generated portrait placeholders and a wide venue placeholder.
- `sceneThreshold` moved into the shared motion grammar (`utils/scene-motion.ts`); the hero re-exports it — one motion vocabulary, zero duplication.

## Rhythm across the journey (Master Direction: no two consecutive scenes identical)

Arrival: full-bleed media, offset-start → Purpose: offset editorial split, image end-bleed → Day: narrow start-side path → People: centered wide grid → Venue: full-width image band → FAQ: narrow quiet column → Join: centered narrow conclusion.

## Verification

Both locales render all seven chapters through engine validation with the `spotlight` fixture still degrading gracefully; navigation carries five anchors; typecheck 0; eslint 0/0; build exit 0.

**Final questions** — One continuous experience? Yes: the dissolve carries Arrival into Purpose, the story hands to the day, the day to its people, the people to their place, and the threshold line closes what it opened. Memorable tomorrow? The image of stone at dusk, a line of bronze, and a day you can already imagine — that is the intended residue.
