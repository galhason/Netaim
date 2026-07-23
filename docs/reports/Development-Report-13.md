# Development Report 13 — Studio as a Product (shell, Home, workspace)

Period: 2026-07-16
Scope: Transform the Studio into a production workspace — the permanent sidebar shell, an editorial Home, and the event workspace as one continuous space. Design references studied for principles only. No functionality, engine, routing, or business change.
Constitution reference: §22

## Completed

- **The permanent shell** — a deep civic-ink sidebar (`StudioSidebar`) beside one stone content column, replacing the old top-header chrome. Text-only global nav (Home, Events, Organization) with the current place marked; language and the creator at the foot; a slim top-bar variant on mobile. Deleted `studio-nav`.
- **Event workspace as one space** — the workspace layout leads with the event's name and its moment in language, then its areas as calm underline **tabs** (`WorkspaceJourney` restyled). The breadcrumb and its component are deleted; the sidebar plus the event header answer "where am I."
- **Editorial Home** — a greeting by name, then the three questions: Continue creating (the active event, editorial), Needs attention (only when present), and Ready to launch resting on a calm rail (only when blockers are zero). No dashboard, no widgets, no counters, no fabricated feeds.
- **Visual language extended** — dark civic-ink sidebar tokens (`--color-sidebar*`) mapped into the theme; the elevation/motion/skeleton language from Report 12 unchanged. One language across shell, Home, workspace, and Composer (whose preview canvas remains the elevated hero).
- **Deletions** — `studio-nav`, `studio-breadcrumb`, the `Crumb` type and `scope` message; the capability-gate remnants were already gone. Less UI, not more.

## Architecture Review

Nothing structural changed. Engines, repositories, services, contracts, DTOs, routing, and business rules are untouched. The shell change is presentation: a new client component (`StudioSidebar`, client only for `usePathname` active state) and layout composition. No route was added or moved; the sidebar links to the same URLs.

## Technical Review

- **No framer-motion added.** Having loaded the motion library's guidance, I deliberately chose CSS-first motion (the `rise` reveal + CSS state transitions) — the mission's "no unnecessary client components / invisible motion." The only client components are those that need `usePathname` (sidebar, tabs); everything else stays a server component. No hydration regression, no new dependency.
- Dead-code sweep clean (no references to the deleted components/messages).
- Gates to run on the authoritative machine, in order: `npm run generate:types && npm run typecheck && npm run lint && npm run test && npm run build`. Risk is presentation-level; watch for any Tailwind token-utility name (the sidebar utilities derive from the new `--color-sidebar*` theme tokens).

## Creative Review

The Studio now reads as a workspace with a permanent identity, not a set of pages. The ink rail gives it gravity; the stone content gives it calm; the one bronze accent marks only where you are and what is irreversible. Entering an event feels like entering the event — its name fills the top, its areas are quiet tabs, the global rail recedes.

## Product Review

First open: a greeting, one clear event to continue, what needs attention, and — when it's ready — a confident launch on the rail. Nothing asks the organizer to think about the tool. The two best screens (Home, the Composer canvas) now set the standard the rest meets.

## Visual Review

One spacing rhythm, one elevation reserve (the Composer canvas, the ready-to-launch panel), one motion gesture, one button grammar, one empty-state and selection language, and now one navigation identity. Typography and whitespace carry hierarchy; the sidebar is the only dark surface and it is unmistakably Hason.

## Performance Review

Server components everywhere except the two pathname-aware nav pieces. No framer-motion, no new client bundles, no charts. `backdrop-blur` was removed with the old header; the sidebar is flat paint. The `rise` reveal is a one-shot transform. No CLS risk (no async layout without reserved space). The Studio stays fast.

## Accessibility Review

Text-only nav with `aria-current` on the active item; sidebar text/surface pairs clear AA (verified by lightness separation) in the one dark surface; focus ring unchanged and visible on the ink rail; touch targets ≥44px (`min-h-11`); logical `border-s`/`border-e` keep RTL correct; the tab row wraps and scrolls on narrow widths; `prefers-reduced-motion` still collapses `rise` via the global override. Keyboard order follows visual order.

## Open Questions (meaningful only)

- **Composer height constant.** The Composer frame uses `h-[calc(100dvh-9rem)]`, tuned to the old top header. With the sidebar it may run slightly tall inside the event workspace; it still scrolls correctly, but a follow-up should make the canvas height derive from its container rather than a magic constant.
- **Event context in the rail.** The sidebar stays global by design; the event's identity lives in the content header. If "inside the event" should feel even stronger, a future pass could let the rail reflect event context — a client-data decision, deliberately not taken here to avoid new plumbing.

## If this launched today, what would still keep it from world-class?

Honestly: three things, none of them visual.
1. **No real email.** Confirmations and magic-link only reach the outbox until a provider is connected — a participant can't actually receive their link. This is the single biggest gap between "looks finished" and "is finished."
2. **The Composer can't yet add people or photographs inline, or pick from uploaded media.** Editing still leaves the live surface for a form in two areas (People, Photographs). Until the Composer absorbs them, the "edit on the truth" promise is partial.
3. **Phases are hidden but not derived, and there's no visible accountability trail.** For a government buyer, "who approved this, when" and automatic lifecycle progression are table stakes; both are modelled but unsurfaced.

The interface is now world-class-adjacent. What remains is not polish — it is these three pieces of *substance*. A designer would enjoy working here today; they would trust it fully once email sends, the Composer is the only editor, and accountability is visible.
