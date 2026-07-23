# Hason Platform — Architecture

Sprint 0, Task 0.1. Governed by CONSTITUTION.md.

## Approved Stack (Product Owner, Sprint 0)

| Layer | Decision |
|---|---|
| Framework | Next.js 15 (App Router, SSR/SSG) |
| CMS | Payload CMS 3 (embedded in the Next.js app, self-hosted) |
| Database | PostgreSQL (via @payloadcms/db-postgres) |
| Styling | Tailwind CSS v4 + CSS Variables design tokens |
| Auth | Payload built-in auth (users, sessions) + RBAC layer |
| i18n | next-intl (UI chrome) + Payload localization (content) |
| Validation | Zod (environment, runtime schemas) |

## System Overview

Payload runs inside the Next.js application. One deployable unit serves the frontend, the admin panel, and the content API against PostgreSQL. This removes a network hop between frontend and CMS, shares one TypeScript type system end to end (generated payload-types.ts), and simplifies self-hosting for government environments.

```
Browser
  └── Next.js (App Router)
        ├── (frontend)/[locale]/...   Experience rendering (SSR/SSG)
        ├── /admin                    Payload admin panel
        └── /api                      Payload REST/GraphQL
              └── Payload Core ── PostgreSQL
```

## Domain Model

Event is the aggregate root:

```
Event (slug, defaultLocale, localized title)
  └── Experience (ordered composition)
        └── Scenes[] (type, localized content, enabled flag)
```

Scene order lives on the Experience relationship, not on the Scene, so scenes are reusable across experiences. Supporting collections: Media, Speakers, Sponsors. Global: PlatformSettings.

## Experience Engine

CMS-driven scene rendering with zero hardcoded sequences:

```
CMS (Scenes collection)
  → ExperienceData (typed contract, experience-engine/types)
  → Scene Registry (type id → SceneComponent)
  → Renderer (later sprint) resolves and renders in configured order
```

- Scene type identifiers are open strings resolved at render time against the registry. The approved scene type catalog will be modeled per type in a later sprint without changing the engine contract.
- Unknown or disabled scene types degrade gracefully (resolve to null) rather than breaking the experience.
- Registering the same type twice throws — one source of truth per scene type.

## Internationalization

Two complementary layers, deliberately separated:

1. **Content localization (Payload)** — every content field that users see is `localized: true` in the CMS. Locales: `he`, `en`. Adding a language means adding a locale entry — no architectural change.
2. **UI chrome (next-intl)** — validation messages, accessibility labels, system strings live in `src/i18n/messages/{locale}.json`.

Routing is locale-prefixed (`/he/...`, `/en/...`) via middleware. Direction (`rtl`/`ltr`) derives from the locale in one place (`config/locales.ts`) and is applied on `<html dir>`; styling uses logical properties so RTL works structurally, not via overrides.

**Default locale is per-event** (CMS field `defaultLocale` on Event). `FALLBACK_LOCALE = 'he'` exists only as a technical routing fallback for non-event routes.

## Authentication & Authorization

- Authentication: Payload local auth strategy (Users collection, `auth: true`).
- Authorization: RBAC expressed as role → permission mapping (`src/auth/permissions.ts`). Collections declare access through permission factories (`requirePermission('content:write')`), never inline role checks — the entire authorization model lives in one module.
- Baseline roles: `admin`, `editor`. The full role matrix requires Product Owner approval (see Development Report, open questions).

## Theming & Design Tokens

Tokens are CSS variables in `src/styles/globals.css`, mapped into Tailwind via `@theme inline`. Semantic tokens (surface, text, brand, focus) can be reassigned at runtime per event from CMS theme settings — this is the mechanism for event-specific branding without code changes. Reduced-motion and focus-visible handling are global.

## Performance & Scale (600 concurrent users)

- SSR/SSG with static generation for locale routes (`generateStaticParams`).
- Published content is cacheable at the CDN/edge layer; drafts bypass cache.
- Postgres connection pooling via the adapter.
- Image optimization through Next/Image (AVIF/WebP) and sharp.
- Detailed caching strategy is defined when the first rendering sprint begins.

## Security

- Environment validated at startup with Zod (`config/env.ts`) — fail fast.
- All mutations require permissions; public access is explicit (`isPublic`), never a default.
- No secrets in the repository; `.env` is git-ignored, `.env.example` documents required variables.
- Draft/versioned content requires authentication to read.
