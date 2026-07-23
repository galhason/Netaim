# Hason Platform — Experience Polish Sprint 01

Refinement only. No features added, no architecture touched, no dependencies changed.

## 1. Creative Review — what changed and why

**Rhythm between scenes (Priority 01).** The section-section-section feeling came from uniform paddings creating identical silences. The silences now vary by narrative role: the Day opens close on the heels of the Purpose numbers (pt-16/20 — a handoff, not a reset); People opens tall (a new movement) but closes short into Venue; FAQ shrank into a quiet coda (py-20/24); Join keeps the grandest silence of the journey (md:py-44). The page now breathes in phrases, not in equal bars.

**Signature moments (Priority 03) — five across the journey:**

1. The threshold dissolve — dusk photography melting into stone at the first scroll (existing, protected).
2. The Purpose numbers — now set on a single architectural hairline (`border-t`) with tabular figures: a ledge of monumental typography.
3. The People stagger — on wide screens, alternating portraits drop by a beat (lg:mt-12), turning a grid into a composition; the faces stand like figures, not cells.
4. The Venue nameplate — the venue name grew to display scale (3xl/4xl) set into the lower edge of the full-width photograph: the place introduces itself.
5. The returning threshold at Join — the bronze line that opened Arrival closes the journey (existing, protected).

**Typography (Priority 05).** The quote rose to 4xl on desktop — it now carries the emotional center of Purpose. Times and key numbers use tabular figures, so digits align like architecture. Everything else held: hierarchy was already h1→h2→h3→h4 clean.

**Motion (Priority 08) — quieter.** Reveal rise reduced 14→12px and 550→500ms (felt, barely seen); hero parallax reduced 48→32px over the same scroll distance; the scroll-hint pulse slowed to 3.2s. Nothing new moves; everything moves less.

**Navigation (Priority 07).** Reviewed and deliberately kept as part of the threshold: it lives inside the hero's letterbox and leaves with the scene. The journey itself carries no chrome — anchors glide (smooth scroll, reduced-motion-safe) when used. This is the calm, integrated behavior the direction asks for; a floating persistent bar would reintroduce "website".

## 2. Experience Review — the visitor journey

Arrival now hands the visitor to Purpose through the dissolve; Purpose closes on the numbers ledge that leans directly into the Day; the Day walks moment by moment and releases into the People, who stand in a staggered field; the place then presents itself full-width and close; the FAQ answers last doubts in a whisper; and the journey ends where it began — at the bronze line, with one door. Composition alternates every chapter (media/offset/path/centered-wide/full-band/narrow/centered), so no two consecutive scenes rhyme. Mobile keeps every hierarchy with recomposed stacking, full-bleed imagery, and thumb-level actions.

## 3. Technical Review

- **Performance**: build passes; event route first-load 193 kB; hero remains the only priority image (LCP), all other photography lazy with fixed aspect ratios (CLS-safe); animations transform/opacity only; no new dependencies; hydration surface unchanged.
- **Accessibility**: heading ladder intact; `<time>`, `dl/dt/dd`, `figure/blockquote` semantics preserved; contrast tokens unchanged; reduced motion honored globally and via MotionConfig; RTL/LTR verified by logical-property layout.
- **Code quality**: typecheck 0 errors; eslint 0 errors/warnings; all changes inside approved components; zero engine/CMS/architecture edits.

## 4. Remaining Opportunities (meaningful only)

1. **Real photography** — the single highest-leverage improvement left; every layout is composed to receive it.
2. **Experience Profile** (per-event atmosphere: photography style, accent, motion intensity) — the Master Direction's per-event dial, needs CMS modeling.
3. **Registration as experience** — the Join door currently points at a placeholder anchor; the real registration flow is the next emotional chapter, owned by the Registration Engine.
4. **Mobile navigation pattern** — the only journey capability absent on small screens.

## Quality Gate

One visual hero per scene — yes. One emotional objective per scene — yes. Uninterrupted — yes. Calm — yes. Memorable — the five moments are the answer, real photography will complete them. Proudly usable by a government organization — the language is civic, dignified, accessible. Remembered tomorrow — stone, bronze, and a day you can already imagine.
