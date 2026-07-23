# Hason Platform — The Day Ahead (Chapter Three)

Director's Cut 03. The `agenda` scene type evolved from placeholder into the editorial day chapter. Extension only — every new field is optional; `session` gained an optional `description` shared with the session-list scene.

## Intent

The visitor walks through the day; they do not scan a timetable. No tables, no calendar UI, no dashboard. Time is typography; sessions are moments. Finished reading, the visitor should think: "I can already imagine my day."

## CMS Contract

`agendaContentSchema`: optional `label`, `heading`, `intro`, and `days[]` (min 1) of `{ id, label, sessions[] }`. `sessionSchema` gained `description?` — the texture that turns a slot into a moment.

## Composition

- **Chapter header**: shared `SceneHeader` (extracted to `components/common/` — the Purpose header now uses the same component; no duplicated code) plus an optional intro paragraph.
- **Day**: a short bronze rule above the day label (`h3`, display serif) — the accent marks where the day begins, echoing the hero threshold. One accent element per scene, as established.
- **The path**: moments hang on a single quiet start-side hairline (`border-s`) with soft dividers — a walking line, not a grid.
- **Moment**: start time as large display typography (`<time>`, the hero of the row), end time quiet beneath it; title in display serif (`h4`), short description in secondary ink, place/track as a whisper (`room · track`). Desktop: 3/8 asymmetric columns; mobile: time and content stack on the same path, hierarchy unchanged.
- **Time formatting**: `formatSessionTime` (utils) — locale-aware, pinned to UTC so displayed time equals authored wall-clock time. Event-timezone modeling is an Event Engine concern (documented open item).

## Motion — walking rhythm

Each moment reveals individually as it enters the viewport (`whileInView`, `once`, 35% visible) using the shared scene-motion grammar — the day literally unfolds while scrolling. Header and day labels reveal the same way. Transform/opacity only; `MotionConfig reducedMotion="user"`.

## Accessibility

Heading ladder h2 (chapter) → h3 (day) → h4 (moment); real `<time dateTime>` elements; `article` per moment; contrast on stone maintained via ink/secondary tokens; dividers are decorative and low-contrast by design.

## Verification

Both locales serve 4 moments with descriptions through engine validation; typecheck 0; eslint 0/0; build exit 0. The Purpose scene was re-verified after the shared-header consolidation.

**Final review — does the visitor experience the day, or read it?** Experience: the path line carries them downward, each moment arrives when they do, time reads like chapter numbers rather than table cells, and the descriptions speak about what will happen between people — not logistics.
