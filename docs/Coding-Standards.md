# Hason Platform — Coding Standards

Derived from CONSTITUTION.md §§7–11, 19 and the Coding Standards Update (Milestone 1, effective immediately). Enforced by ESLint, TypeScript strict mode, and code review.

## Clean Code Philosophy

Code is documentation. Well-written code explains itself. Prefer expressive names over comments. If a comment explains WHAT the code does, remove the comment and improve the code instead. Comments explain WHY, never WHAT. When choosing between impressive and simple, always choose simple — consistency matters more than cleverness. The codebase should feel like it was written by one experienced engineer.

## Language & Types

- TypeScript strict mode, `noUncheckedIndexedAccess` enabled.
- No `any` (ESLint error). Use `unknown` and narrow.
- Domain values are derived from `as const` arrays (see `SUPPORTED_LOCALES`, `ROLES`) so the value list and the type never drift.
- Exhaustive switches use `assertNever` from `shared/`.

## Forbidden (build fails or review rejects)

- `console.log` (ESLint `no-console`: error)
- TODO comments in committed code
- Dead code, unused imports (ESLint error)
- Inline styles
- Magic numbers — use design tokens or named constants
- Emoji, banner comments, ASCII art, decorative comments
- Duplicated types or utilities — one source of truth
- Hardcoded user-facing text — CMS content or i18n messages only

## Comments

Comments explain architectural decisions, business rules, or non-obvious technical constraints — nothing else. Self-explanatory code is not commented. Temporary comments require explicit approval. If in doubt, remove the comment. Files begin naturally (imports → code → export) — no decorative headers, no large descriptive paragraphs before code. Explanatory documentation belongs in /docs as markdown, never inside source files.

## Naming

- Components: `PascalCase`, descriptive (`RegistrationForm`, not `Form2`)
- Files: `kebab-case.ts` for modules, `PascalCase` reserved for exported component names
- Hooks: `use` prefix
- Constants: `SCREAMING_SNAKE_CASE`
- No abbreviations that hide meaning

## Imports

- Absolute imports via `@/` alias; no deep relative chains (`../../..`).
- Features expose a public API through `index.ts`; internals are never imported across module boundaries.

## Styling

- Tailwind utilities backed by CSS-variable tokens; no raw color/size literals in components.
- Logical properties (`ms-`, `me-`, `ps-`, `pe-`) — never `left`/`right` utilities that break RTL.
- Motion respects `prefers-reduced-motion` (handled globally, never bypassed).

## Accessibility Checklist (per component)

- Keyboard operable, visible focus state
- Semantic HTML first, ARIA only where semantics are insufficient
- Contrast meets WCAG AA
- Announced state changes where relevant

## Components and Functions

Small, focused, single responsibility, composable. If a component becomes difficult to read, split it. Never build a component for one screen — every public component has a clean, minimal API. Functions are small and pure whenever possible; no deeply nested logic; reusable logic is extracted.

## Code Review Checklist (per task)

No duplicated code, no unnecessary comments, no banner comments, no emoji, no console statements (log/warn included — platform logging strategy only), no dead code, no TODO, no unused imports or types, no unnecessary complexity, no architectural violations. Readable names, small functions, small components, single responsibility.

## Definition of Done (per Sprint)

No TypeScript errors, no ESLint errors, no duplicated/temporary/debugging code, code review checklist passed, documentation updated, architecture preserved, responsive verified, accessibility verified, QA completed.
