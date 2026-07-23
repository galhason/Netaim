# Hason Platform — Folder Structure

```
hason/
├── docs/                        All project documentation (only location)
├── src/
│   ├── app/
│   │   └── (frontend)/
│   │       └── [locale]/
│   │           └── layout.tsx   Root layout: lang, dir, providers
│   ├── auth/                    RBAC: roles, permissions, access factories
│   ├── cms/
│   │   ├── collections/         Payload collections (users, media, events,
│   │   │                        experiences, scenes, speakers, sponsors)
│   │   ├── globals/             Payload globals (platform-settings)
│   │   └── index.ts
│   ├── config/                  locales.ts, env.ts
│   ├── experience-engine/
│   │   ├── types/               Scene/Experience contracts
│   │   ├── registry/            Scene type registry
│   │   └── index.ts
│   ├── features/                Feature modules (empty until Sprint 1)
│   ├── i18n/
│   │   ├── messages/            he.json, en.json (UI chrome only)
│   │   ├── request.ts
│   │   └── routing.ts
│   ├── providers/               AppProviders composition point
│   ├── shared/                  Cross-feature utilities
│   ├── styles/                  globals.css (design tokens)
│   ├── middleware.ts            Locale routing
│   └── payload.config.ts
├── next.config.ts
├── package.json
├── tsconfig.json
├── postcss.config.mjs
├── eslint.config.mjs
├── .env.example
└── .gitignore
```

## Feature Module Template (mandatory)

Every feature under `src/features/` follows exactly this structure:

```
src/features/<feature-name>/
├── components/
├── hooks/
├── services/
├── types/
├── schemas/
├── utils/
├── constants/
└── index.ts        Public API — nothing is imported from feature internals
```

Rules:

- Features import from `shared/`, `config/`, and other features' `index.ts` only.
- No feature imports another feature's internals.
- Empty folders are not committed; a folder is created when its first file exists.
- `app/` routes are thin — they compose features, they contain no business logic.

## Route Groups

- `(frontend)` — public experience routes, locale-prefixed.
- `(payload)` — reserved for the Payload admin/API routes, generated on installation (see Development Report, next task).
