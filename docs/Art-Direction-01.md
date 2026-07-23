# Hason Platform — Art Direction Pass 01

Refinement only: no new dependencies, no effects, no architectural changes, no new visual language. Every change below is composition, spacing, color, or rhythm.

## 1. Transitions — the seam disappears

The hero now owns its exit: after the content, a quiet band dissolves the photograph into the page surface (`transparent → surface`), so the dark dusk image melts into Jerusalem stone exactly where Purpose begins. Because the hero keeps `min-h-dvh` plus the band, the dissolve peeks on the first scroll — the first step literally crosses the threshold. When a hero has no image, the band is invisible (surface into surface). Purpose's top padding was reduced so the chapter begins inside the dissolve. No cut; progression.

## 2. Depth — three planes

Background: the photograph (with parallax). Midground: the letterboxing — a new top scrim band anchors the navigation into the scene, and the exit band anchors the bottom. Foreground: the content column. In Purpose, the editorial image now bleeds past the container edge (full-bleed on mobile, over the end-side padding on desktop) — the text plane sits in front of an image plane that extends beyond the frame.

## 3. Purpose image — magazine cover

Sharp corners (rounding removed), taller ratio (2:3 on desktop), end-side bleed, text column vertically centered against it. The image is the cover of the chapter; the story sits beside it, not on top of it.

## 4. Typographic rhythm

Vertical spacing tightened across Purpose and the Day: section paddings reduced (~20–25%), inter-block gaps reduced (16/20 → 10/14), header gap tightened, moment padding 10 → 8. Whitespace now separates thoughts rather than stranding them.

## 5. Numbers — monumental

Values raised to 6xl/7xl display serif with `leading-none tracking-tight`; labels reduced to tracked whisper-size. The typography carries the impact; the layout stays invisible.

## 6. Navigation — part of the experience

The header sits inside the hero's top letterbox (composition, not a bar), slightly tighter and quieter (reduced padding, links at 75% until hover). It scrolls away with the scene rather than following the visitor. Anchor navigation now glides (`scroll-behavior: smooth`, killed under reduced motion by the existing override) and scenes reserve landing headroom (`scroll-margin-top`).

## 7. Arrival — more cinematic

Top letterbox scrim (in addition to the bottom one) frames the frame; the headline gained `tracking-tight` for a title-card feel; the scroll hint moved up above the dissolve so it lives inside the photograph.

## Verification

typecheck 0; eslint 0/0; build exit 0. No architectural changes; no dependencies added; scene contracts untouched — all changes are inside approved components.

**Final question — does this feel like one continuous journey?** Yes: the photograph dissolves into stone, the stone carries the story, the story hands off to the day, and one motion grammar breathes through all of it.
