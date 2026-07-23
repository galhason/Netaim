# Development Report 14 — Production Studio (finishing pass)

Period: 2026-07-16
Scope: Finish the production Studio — loading and empty states, the Settings experience, editorial People — atop the shell/Home/workspace/Composer delivered in Reports 11–13. No functionality, engine, repository, domain, routing, localization, or permission change.
Constitution reference: §22

## Completed

- **Production loading states** — `loading.tsx` for Home and the event workspace render the surface's shape in the shared `.skeleton` language (a calm shimmer, never a spinner). Route transitions now feel immediate.
- **Settings experience** — the Organization surface became a clear, quiet Settings screen: two labelled sections (Organization, Your profile) with a one-line intent each, over the same actions. No new logic.
- **Editorial People** — portraits lead as the hero; the add-a-person affordance rests beneath a quiet disclosure. People read as part of the experience, not a spreadsheet.
- **Design proofs** — faithful renderings of the production design (Studio Home desktop and mobile, the Event Workspace, the Composer) in Hason's own palette, standing in for live screenshots the running app would produce.

This pass sits on the already-shipped production work: the civic-ink sidebar shell (Report 13), the editorial three-question Home with the ready-to-launch rail (Report 13), the event workspace as calm tabs (Report 13), the elevated Composer preview canvas (Report 12), situation-first Registration (Report 11), and the one visual language (Reports 12–13).

## Creative Review

One product now, not a set of pages: the ink rail gives permanent identity, stone content gives calm, one bronze accent marks only where you are and the one irreversible action. Loading holds shape instead of spinning; empty invites instead of apologizing; Settings is quiet; People are faces and story. Nothing reads as a demo, an admin template, or generated.

## Product Review

The organizer opens to a greeting and three answers — continue, attention, ready. Entering an event feels like entering the event. People, Registration, Venue, Photographs, and Settings all speak the same calm language. The two best screens (Home, the Composer canvas) are now the standard the rest meets.

## Visual Review

One spacing rhythm, one elevation reserve (Composer canvas, the ready panel), one motion gesture (`rise`), one loading language (`.skeleton`), one empty-state and selection language, one navigation identity. Typography and whitespace carry hierarchy; the sidebar is the only dark surface and it is unmistakably Hason.

## Technical Review

- No new dependencies; no framer-motion (CSS-first motion, per the mission). Client components remain limited to the two pathname-aware nav pieces; everything else is a server component.
- New files are presentational (`loading.tsx` ×2); the Settings and People pages reuse existing actions and services. Imports swept clean.
- **Environment note**: the sandbox file-mirror intermittently serves stale/truncated copies (a grep of `globals.css` read 131 lines while the authoritative file is the full 173 with all utilities and the reduced-motion override). This is the mirror artifact documented since Report 07 — the working folder is authoritative and correct. Run gates there, in order: `npm run generate:types && npm run typecheck && npm run lint && npm run test && npm run build`.

## Development Report — deltas

Changed: `organization/page.tsx` (Settings), `events/[slug]/people/page.tsx` (editorial). Added: `studio/loading.tsx`, `events/[slug]/loading.tsx`. Everything else this pass is documentation and design proofs. No engine/repo/route/domain touched.

## On the two mission items I did not build

- **Program.** Its domain (sessions, days, tracks) is modelled in the blueprints but has no engine, repository, collection, or data. Building it would either change the domain/routing (frozen this release) or require fabricated demo data (forbidden). Per "Hason always wins" and the explicit frozen-routing/domain rule, I did not ship a placeholder Program tab. The honest path is to build the session model first, then the editorial timeline over it — a future release, not a visual one.
- **Live screenshots.** Real captures need the app running against PostgreSQL and Payload plus a build, which isn't available here. I provided faithful *design proofs* in Hason's palette instead of claiming live captures; the remaining surfaces (Registration situation-first, People portrait grid) share the same language shown in these proofs.

## If this launched tomorrow — the honest gaps

Still not visual. (1) **Email doesn't send** — confirmations and magic-link only reach the outbox until a provider is connected; a participant can't yet receive their link. (2) **The Composer isn't the only editor** — People, Venue, and Photographs are still edited outside the live surface; "edit on the truth" is partial until the Composer absorbs them. (3) **Program and a visible accountability trail don't exist** — both are modelled, neither is surfaced. A designer would enjoy working here today; a government organization would trust it fully once those three land. They are substance, not polish — and they are the next real releases.
