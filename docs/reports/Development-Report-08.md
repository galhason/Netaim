# Development Report 08 — Release 0.8 (Studio Experience)

Period: 2026-07-15
Scope: Studio Experience — turning Studio Core's correct screens into one continuous workspace
Constitution reference: §22

## 1. Summary

Release 0.8 adds the experience layer approved in Studio-Information-Architecture.md but shipped as flat stubs in Studio Core (0.7): a journey-based navigation model with a scope breadcrumb and a stable side journey, a four-question Home over real data, first-class teaching empty states, and the command-palette/search foundation. No engine, repository, access rule, application-service contract, or DTO changed. The reference document is Studio-Workspace-Architecture.md; the four reviews are in Studio-Experience-Reviews.md.

## 2. Completed features

- **Journey navigation**: the event workspace gains a scope breadcrumb (`Studio › Events › {event}`) and a stable side journey (Overview → Experience → People → Venue → Media → Launch) with `aria-current` active state (previously missing). Responsive: side rail on desktop, wrapping row on narrow widths.
- **Four-question Home**: Continue creating / Needs attention / Upcoming / Recently, driven by `getStudioHome` over the existing services. "Recently" is an honest teaching line until the Audit engine exists — no fabricated feed. Home cost stays one readiness review + one event list.
- **Command & search foundation** (integration points only, no widget): a searchable action registry (`STUDIO_COMMANDS`), one search language (`searchStudio`) spanning Events/People/Media (Venue reserved in-contract), and a shared pure matcher (`matchCommands`/`scoreText`).
- **Teaching empty states**: Home sections, Events, Library, Insights, People, Media now teach or encourage; the generic "Quiet for now." string is deleted.
- **Studio language**: workspace "Composer" renamed **Experience** to match the IA; key-coverage audit clean.
- **Adaptive & notifications**: documented as doctrine (desktop creates / tablet edits / mobile manages; no notification center — decision-changing info only, at the point of decision).

## 3. Changed files

New:
- `src/features/studio/types/command.ts` — command & search contracts.
- `src/features/studio/utils/command-match.ts` — pure matcher (`scoreText`, `matchCommands`).
- `src/features/studio/utils/home-digest.ts` — pure `buildHomeDigest` and Home model types.
- `src/features/studio/constants/commands.ts` — `STUDIO_COMMANDS` registry.
- `src/features/studio/constants/empty-states.ts` — `EMPTY_STATES` (bilingual, `satisfies`-typed).
- `src/features/studio/services/studio-search.ts` — `searchStudio` (foundation).
- `src/features/studio/components/{empty-state,studio-breadcrumb,workspace-journey}.tsx`.
- `docs/Studio-Workspace-Architecture.md`, `docs/Studio-Experience-Reviews.md`, this report.
- `tests/unit/studio-experience.test.ts`.

Modified:
- `src/features/studio/services/studio-home.ts` — now returns the four-question digest; pure logic extracted to `utils/home-digest.ts`.
- `src/features/studio/index.ts` — new exports; `StudioHomeModel` replaced by `StudioHomeDigest`.
- `src/features/studio/constants/navigation.ts` — added `scope` message; removed the now-unused `emptySection` (dead code).
- `src/features/studio/constants/workspace.ts` — "Composer" → "Experience"; added `noMatch`; `WORKSPACE_MESSAGES` tightened with `satisfies`.
- `src/app/(studio)/studio/page.tsx` — four-question Home.
- `src/app/(studio)/studio/events/[slug]/layout.tsx` — breadcrumb + side journey shell.
- `src/app/(studio)/studio/{library,insights}/page.tsx`, `events/page.tsx`, `events/[slug]/{people,media}/page.tsx` — teaching empty states.

## 4. Architecture decisions

- **Accessibility primitive: React Aria** (behavior hooks), resolving Open-Questions #11. Decided as the standard for future composed widgets (the palette combobox). Not installed in 0.8 because no widget consumes it yet; adding an unused dependency would violate the zero-dead-code rule. The foundation is built React-Aria-ready.
- **Palette/search are foundation only** (per Objective 5): registry + one search service + pure matcher, callable and tested, no UI.
- **Home stays honest**: "Recently" has no source, so it teaches rather than fabricates. Pure grouping (`buildHomeDigest`) is separated from I/O so it is testable without infrastructure, matching the slug/launch-gate pattern.
- **`satisfies` on `EMPTY_STATES`/`WORKSPACE_MESSAGES`**: preserves literal keys so access is definite under `noUncheckedIndexedAccess`; every accessed key was verified present.

## 5. New components

`StudioBreadcrumb` (scope line), `WorkspaceJourney` (client, active-aware side journey), `EmptyState` (quiet teaching surface). All typography-first, no decorative icons.

## 6. CMS changes

None. 0.8 is presentation, navigation and two read-only foundation services.

## 7. Database changes

None.

## 8. Verification

| Gate | Result |
| --- | --- |
| Pure-logic suite (ported, isolated) | 14/14 passing — mirrors `tests/unit/studio-experience.test.ts` |
| Static type review vs `noUncheckedIndexedAccess` | clean (constant access tightened with `satisfies`; key coverage verified) |
| `tsc` / `eslint` / `next build` / `vitest` full run | **deferred to the authoritative machine** — see Known issues |

New tests: `tests/unit/studio-experience.test.ts` covers command ranking (exact/prefix/substring, bilingual keyword match, empty-query = full registry) and Home grouping (continue/attention, future-only non-archived upcoming excluding the active event, no-active empty).

## 9. Known issues

- **Environment, not product**: this session's sandbox could not run the full gates. The Windows↔sandbox file mirror truncated many source files (including pre-existing ones untouched by 0.8), and `node_modules` holds Windows-native binaries (rolldown/esbuild) incompatible with the Linux sandbox, so `vitest`/`next build` cannot load. This is the condition flagged in Development Report 07 §4. The authoritative working folder is intact; **the four gates must be run there before this release is marked Done** (Constitution §19). The pure logic was verified independently; the type review was performed statically against the authoritative sources.
- Command palette and global search render no UI yet (foundation only, by decision).

## 10. Risks

- Until the gates run on the authoritative machine, a type error in a surface file cannot be fully excluded despite the static review. Mitigation: the risk is concentrated in JSX/prop wiring, which the static review covered; the pure logic (the only novel algorithms) is test-verified.
- The side-journey grid places the composer beside an 11rem rail on desktop; at the composer's three-column width this is comfortable at `md+`, but the composer's own responsive behaviour should be spot-checked on the authoritative build.

## 11. Next sprint

Per roadmap, S4 remains next: ComposerPersistence (drafts/history/restore/launch diff), per-type structured CMS fields, Program area, Media Library, localization dashboard, templates, Theme engine, Experience Identity. The command-palette and global-search **UI** attach to the 0.8 foundation within S4/S5 and adopt React Aria at that point. First action on the authoritative machine: run `npm run typecheck && npm run lint && npm run test && npm run build`.
