# Phase 1 — Execution Order (Local Route Migration)

**Status:** approved to execute · **Branch:** `integration/phase-1-route-migration` · **Base:** `335d1b1` (= `main` = `origin/main`)
**Authority:** `docs/reports/conference-integration-plan.md` v2.1 · validated by `conference-integration-plan-validation.md`
**Written by:** the cloud session, which completed Phase 0 but **cannot run the gates** (see §0.2).
**Executed by:** Claude Code on Windows, which can.

---

## 0. Why this document exists

### 0.1 Phase 0 result — passed

| Check | Result |
|---|---|
| Branch | `integration/phase-1-route-migration`, descendant of `main` |
| HEAD | `c4394f0` — docs commit |
| Working tree | Clean. Only untracked: 4 PNGs in `Claude outputs/` (not code) |
| Rollback | `git switch main` — `main` == `origin/main` == `335d1b1` |
| Lint baseline | **`npx eslint .` → exit 0, clean** |
| Backups not web-served | `.env`, `/media/`, `/logs/` git-ignored; no dump in repo; backup dir is outside the repo |

### 0.2 What the cloud session could not do, and why

`node_modules` holds **Windows-only native binaries** (`@next/swc-win32-x64-msvc`, `@rolldown/binding-win32-x64-msvc`, `@tailwindcss/oxide-win32-x64-msvc`, `@swc/core-win32-x64-msvc`, `lightningcss-win32-x64-msvc`, `@img/sharp-win32-x64`). The cloud shell is `linux-x64` and shares the same folder.

Consequences there: **vitest cannot start** (`Cannot find module '../rolldown-binding.linux-x64-gnu.node'`), **`next build` cannot run**, and `tsc` runs but exceeds the 180 s per-call ceiling. `npm ci` was deliberately **not** run, because it would replace those binaries and break the Windows setup.

This blocker has nothing to do with Docker. It is a platform mismatch on a shared `node_modules`, and it is unaffected by anything running or not running on the host.

**On Windows all of this works.** Hence this handoff.

### 0.3 Outstanding Phase 0 item — the database backup

Not runnable from the cloud shell. Run it first, on Windows:

```bash
BACKUP_DIR="$HOME/hason-backups" npm run backup
BACKUP_DIR="$HOME/hason-backups" npm run backup:verify
```

`backup:verify` restores into a scratch database `hason_restore_test`; overwriting the live DB requires `--i-mean-the-live-database` explicitly, so the default is safe.

**Note on proportionality, not an excuse to skip it:** Phase 1 is code-only. It runs no migration, changes no Payload collection, and writes nothing to the database. The safety net that matches the actual risk is git, and that is already in place. Run the backup because it is a stated gate — but if it fails for an environment reason, that failure does not endanger Phase 1. Report it and continue.

**Why it cannot run from the cloud shell — three independent reasons, measured with Docker running:**

| | |
|---|---|
| `pg_dump` / `pg_restore` / `psql` | absent in that VM, and there is no sudo to install them |
| `localhost:5433` | not the host's localhost. That VM is a separate Linux machine |
| `host.docker.internal:5432` and `:5433` | **both answer** — so the route exists — but both refuse the connection: 5432 rejects the credentials, and 5433 returns `no pg_hba.conf entry for host "10.0.0.16"` |

That last line is a deliberate access control on the database, restricting it to local connections. **Do not loosen `pg_hba.conf` to let a backup run from elsewhere.** The backup's natural home is the machine the database is on, where the connection is local and already permitted.

**Observation, out of scope, do not fix here:** the dev database on 5433 is a native Windows Postgres (db `hason`, user `postgres`), not the `docker-compose.yml` stack — the compose `postgres` service on 5432 answers with different credentials than its yml declares, which is the usual sign of a `pgdata` volume initialised before the current values. Two Postgres instances coexisting, not a fault. Worth knowing when reading `.env`.

---

## 1. The move

Four route folders and one layout, by `git mv` so history follows.

```bash
cd "<repo>"
BASE='src/app/(frontend)/[locale]'
mkdir -p "$BASE/events/[slug]/(experience)"

git mv "$BASE/(experience)/layout.tsx"  "$BASE/events/[slug]/(experience)/layout.tsx"
git mv "$BASE/(experience)/program"     "$BASE/events/[slug]/(experience)/program"
git mv "$BASE/(experience)/speakers"    "$BASE/events/[slug]/(experience)/speakers"
git mv "$BASE/(experience)/info"        "$BASE/events/[slug]/(experience)/info"

rmdir "$BASE/(experience)"          # must now be empty; if it is not, stop and report what is left
git status --short
```

Ten tracked files travel: `layout.tsx`; `program/{page,actions,loading,program-experience,program-view}.tsx`; `speakers/{page,speakers-directory}.tsx`; `speakers/[id]/page.tsx`; `info/page.tsx`.

**The layout must land inside `(experience)`, never at `events/[slug]/layout.tsx`.** A layout at the `[slug]` level would also wrap `events/[slug]/page.tsx` — the cinematic landing — and put a second, light-chrome navigation on top of its dark chrome. The parenthesised group is invisible in the URL and inherits `params.slug` from the segment above. There is no alternative shape in Next 15.

### Resulting URLs

| Before | After |
|---|---|
| `/{locale}/program` | `/{locale}/events/{slug}/program` |
| `/{locale}/speakers` | `/{locale}/events/{slug}/speakers` |
| `/{locale}/speakers/{id}` | `/{locale}/events/{slug}/speakers/{id}` |
| `/{locale}/info` | `/{locale}/events/{slug}/info` |

The old paths are **removed, not redirected**. No redirect inside the platform; no WordPress redirect in this phase; no DNS or Cloudflare work.

---

## 2. Slug source: `params.slug`, not `activeConference`

Each moved file currently declares `params: Promise<{ locale: string }>` and calls `getActiveConferenceSlug(lang)`. Change both.

| File | Current | Target |
|---|---|---|
| `(experience)/layout.tsx` | `params: Promise<{ locale: string }>`, `getActiveConferenceSlug(lang)` at l.30 | `params: Promise<{ locale: string; slug: string }>`, use `slug` from params |
| `(experience)/program/page.tsx` | same, l.26 | same |
| `(experience)/speakers/page.tsx` | same, l.31 | same |
| `(experience)/info/page.tsx` | same, l.55 | same |
| `(experience)/speakers/[id]/page.tsx` | `params: Promise<{ locale: string; id: string }>` — **reads no slug at all** | add `slug` to the type; it may stay unused. See below |

`speakers/[id]` resolves a speaker by `id` platform-wide and never consults the conference. After the move it receives a `slug` it does not use. **That is intended** — the alternative is one route sitting outside the hierarchy. Do not invent a use for it, and do not delete the param. If lint objects to an unused destructured field, simply do not destructure it.

A page whose conference is now named in the URL should **404 on an unknown slug**, not silently fall back. Follow `events/[slug]/page.tsx`: resolve the event, and `notFound()` when it is absent.

**Do not remove `Site.activeConference`. Do not touch its schema.** Its eight internal uses stay exactly as they are: `me/page.tsx` (ll.122, 194, 243), `me/profile/actions.ts` (ll.88, 126), `me/notifications/route.ts` (l.49), `(studio)/studio/(console)/page.tsx` (l.39), and `(site)/layout.tsx` (l.29). Those use it as a sane default for chrome and internal flows, which is legitimate. Only its role as *the public conference selector* ends. `tests/unit/cache-safety.test.ts:90` asserts `cacheTags.activeConference` exists — it must keep existing.

Keep `export const dynamic = 'force-dynamic'` on every moved page **and on the layout**. `tests/unit/personal-pages-are-dynamic.test.ts` counts layouts too, and will fail if the declaration does not travel with the file.

---

## 3. New file: `src/config/wordpress.ts`

The English WordPress home has **no locale prefix**; the Hebrew one does. Verified against Polylang (`is_default: true`, `home_url: /`) and the live site.

```ts
import type { Locale } from './locales';

/*
 * Where the organisation's website lives, per language.
 *
 * Deliberately asymmetric, and verified against the running site:
 * Polylang serves English as the default language with no prefix, so the
 * English home is the bare root. Hebrew carries its prefix. Anything that
 * builds `/${locale}` produces `/en` for English — an address no system
 * serves, which is how signing out in English reached a 404.
 */
export const WORDPRESS_HOME: Record<Locale, string> = {
  he: '/he/',
  en: '/',
};
```

Do not create a WordPress `/en/` page. Do not modify Polylang.

---

## 4. `SITE_NAV_LINKS` becomes slug-aware

`src/features/cinematic/constants/cinematic-content.ts` ll.74–98 currently exports a fixed array whose `path` values are site-level singletons (`''`, `/program`, `/speakers`, `/info`, `/me/networking`). Both navigations render `` `${home}${link.path}` `` with `` home = `/${locale}` ``. That is the single origin of most of the broken links.

Replace the constant with a resolver that returns finished hrefs:

```ts
export const siteNavLinks = (
  locale: Locale,
  slug: string | null,
): { key: string; href: string; label: string }[] => [ /* … */ ];
```

Rules for the returned hrefs:

| key | href |
|---|---|
| `home` | `WORDPRESS_HOME[locale]` |
| `program` | `/{locale}/events/{slug}/program` |
| `speakers` | `/{locale}/events/{slug}/speakers` |
| `info` | `/{locale}/events/{slug}/info` |
| `networking` | `/{locale}/me/networking` — platform-level, **unchanged** |

When `slug` is `null`, omit the three conference entries rather than emitting a broken path. Keep `home` and `networking`.

Update both consumers, which keep their active-state logic but compare against `link.href` instead of recomputing:

- `src/features/cinematic/components/cinematic-nav.tsx` — ll.145–150 (render) and l.132 (logo → `WORDPRESS_HOME[locale]`)
- `src/features/conference/components/experience-nav.tsx` — ll.95 (render), 129 (logo), **and l.148**, a separate hardcoded `` `${home}/program` `` on the search affordance

Both layouts that supply the links (`events/[slug]/(experience)/layout.tsx` and `(site)/layout.tsx`) already resolve a slug, so they can pass it. `(site)` legitimately keeps using `activeConference` for this — its pages are platform-level and deferred.

---

## 5. Scene links: plumb hrefs through the descriptor

The scene components receive `locale` but **not** `slug`, and must not start resolving conferences themselves. Use the pattern the codebase already uses for `registerHref` and `meHref`: compute the href where the slug is known, and carry it on the scene's `content`.

**Step 1** — in `src/features/cinematic/services/cinematic-service.ts`, `assembleExperience()` (beside the existing `registerHref` at l.290 and `meHref` at l.304), add:

```ts
programHref:  `/${locale}/events/${slug}/program`,
speakersHref: `/${locale}/events/${slug}/speakers`,
infoHref:     `/${locale}/events/${slug}/info`,
```

Extend `ConferenceExperience` in `src/features/cinematic/types/cinematic.ts` accordingly.

**Step 2** — in `src/features/cinematic/services/conference-descriptor.ts`, pass them into the scene contents that need them, exactly as `registerHref` is passed today.

**Step 3** — replace the literals:

| File | Line | Current | Use |
|---|---|---|---|
| `arrival-scene.tsx` | 43 | `` const programHref = `/${locale}/program` `` | `programHref` from content |
| `closing-scene.tsx` | 59 | `` const programHref = `/${locale}/program` `` | `programHref` from content |
| `program-scene.tsx` | 204 | `` href={`/${locale}/program`} `` | `programHref` |
| `featured-sessions-scene.tsx` | 342 | `` href={`/${locale}/program`} `` | `programHref` |
| `featured-sessions-scene.tsx` | 369 | `` `/${locale}/program?activity=${session.id}` `` | `` `${programHref}?activity=${session.id}` `` |
| `speakers-scene.tsx` | 140 | `` speaker.id ? `/${locale}/speakers/${speaker.id}` : `/${locale}/speakers` `` | `` speaker.id ? `${speakersHref}/${speaker.id}` : speakersHref `` |
| `speakers-scene.tsx` | 348 | `` href={`/${locale}/speakers`} `` | `speakersHref` |

**Guard that constrains this:** `tests/unit/nav-viewer.test.ts` forbids `viewer`, `account`, `participant` and `signedIn` on `ConferenceNavContent`, because the descriptor is cached and shared. **A slug is not an identity**, so carrying it on content is permitted and does not trip the guard. Do not, however, move the *viewer* onto content while you are in there.

`tests/unit/architecture-guards.test.ts` also forbids `src/app/**` importing `@/features/*/components/<file>` directly, and forbids branching on `scene.type` in the render layer. Neither is needed here.

---

## 6. `me/page.tsx`

Two site-level links, and one home link.

| Line | Current | Target |
|---|---|---|
| 317 | `` `/${locale}/program?activity=${session.id}` `` | `/{locale}/events/{slug}/program?activity=…` |
| 381 | `` programHref: `/${locale}/program` `` | `/{locale}/events/{slug}/program` |
| 427 | `` href={`/${locale}`} `` | `WORDPRESS_HOME[locale]` |

The slug for 317 and 381 is the one this page already resolves — `chosen?.slug ?? activeSlug`, the same expression it uses at ll.387 and 402. Reuse it; do not resolve a second time. When it is null, omit the link rather than emitting a broken path.

---

## 7. Home and sign-out destinations

`src/features/account/actions/sign-out.ts` ll.31 and 41 both `redirect(`/${locale}`)`. For English that is `/en` — **which no system serves**. This is a live 404 on a path every English user takes.

```ts
import { WORDPRESS_HOME } from '@/config/wordpress';
// …
redirect(WORDPRESS_HOME[locale]);
```

`localeOf()` already narrows to a supported locale, so the index is safe. Apply to both actions.

Also: `(experience)/layout.tsx` l.33 and `(site)/layout.tsx` l.34 build `` `/${locale}` `` as the `registerHref` fallback when no conference is live. Same fix.

**One correction to the inventory in plan §24.4.** It listed `src/scenes/opening-scenes.tsx:135` (`href: '/'`) as a bug. **It is not.** That value is `defaultContent` for the `featuredHero` scene, and `opening-service.ts` (ll.95, 113) always supplies a real `href` before render, so the placeholder never reaches a page. **Leave it alone.** The inventory is 8 home-link sites, not 9.

---

## 8. `sitemap.ts`

`src/app/sitemap.ts` advertises `''`, `/program`, `/speakers`, `/info`, `/contact`, `/accessibility`, `/privacy`, `/terms` under a comment claiming every entry is openable without signing in. Three of those are behind `requireParticipant`, and four are moving to WordPress. Both halves of that comment are now false.

Target: **only genuinely public conference pages, with the conference list read from Payload.**

```ts
const events = await listPortalEvents(locale);   // published conferences only
// → `${base}/${locale}/events/${event.slug}`
```

`listPortalEvents` is the reader the landing page and portal already use, and it returns launched conferences only. No new query, no list to maintain: a conference enters the sitemap when it is published.

Rules:

- **include** `/{locale}/events/{slug}` for every published conference, both locales
- **exclude** every `requireParticipant` page: `program`, `speakers`, `info`
- **exclude** every session-gated page: `schedule`, `workshops`, `my-activities`, `me`, `networking`
- **exclude** the legal pages — WordPress owns that layer, and until it does, keeping both in an index is duplicate content on one domain (plan §21.5)
- keep the existing guard that emits nothing when `NEXT_PUBLIC_SERVER_URL` is absent or localhost
- `/{locale}/experiences/{slug}` — **leave out for now.** Whether document experiences should be indexable is still open (plan §32 item 2)

If a dedicated `/events-sitemap.xml` route is preferred over reusing `sitemap.ts`, that is compatible with the plan; either shape is acceptable in this phase.

---

## 9. `robots.ts`

Add the migrated and gated conference subpaths to `disallow`, keeping everything already there:

```
/he/events/*/program        /en/events/*/program
/he/events/*/speakers       /en/events/*/speakers
/he/events/*/info           /en/events/*/info
/he/events/*/schedule       /en/events/*/schedule
/he/events/*/workshops      /en/events/*/workshops
/he/events/*/my-activities  /en/events/*/my-activities
/he/events/*/me             /en/events/*/me
/he/events/*/networking     /en/events/*/networking
```

**Must stay crawlable:** `/{locale}/events/{slug}` and `/{locale}/events/{slug}/register`. Those are the public face.

robots.txt is a courtesy to crawlers, not access control — the real protection is `requireParticipant`, which is unchanged. Do not touch the WordPress sitemap or robots.

---

## 10. Do not touch

**Authentication, in full:** `participant_session`, `participant_locale`, the magic-link flow, HMAC token generation, `src/shared/security/token-namespace.ts`, TOTP, registration logic, `participant-gate.ts`, session services, Payload access control.

**Also:** `src/payload.config.ts` · `src/migrations/**` · any `src/cms/collections/**` · `src/cms/globals/site.ts` · `src/middleware.ts` · `src/i18n/**` · `src/config/env.ts` · `src/config/locales.ts` · the five engine modules (`experience-engine`, `experience-runtime`, `event-engine`, `registration-engine`, `networking-engine`) · `package.json` · `src/payload-types.ts` · `.github/workflows/gates.yml`.

**Routes that keep their names** (plan decisions 4 and 5 — four program contexts and two speaker contexts are distinct products, not duplication): `/workshops`, `/my-activities`, `/schedule`, `/networking`, `/me/profile`, `/enter`, `/register`, `/me/speakers`.

**Out of scope entirely:** `/{locale}/experiences/{slug}` and its Studio editor · legal pages (`privacy`, `terms`, `accessibility`, `contact`) and their footer links · `/brand/*`, `/demo/*`, `/placeholder/*`, `/videos/*`, `/icon.png`, `/apple-icon.png` and their URLs · design tokens · typography · any visual reskin · `.env` · `NEXT_PUBLIC_SERVER_URL` · Cloudflare · DNS · Nginx · WordPress · production.

`tests/unit/two-languages-stay-apart.test.ts` hardcodes two Studio paths — `(console)/homepage/page.tsx` and `(console)/experiences/[slug]/page.tsx`. **Do not move either.**

---

## 11. The locked snapshot

`tests/unit/__snapshots__/public-experience-snapshots.test.tsx.snap` — **142,948 bytes** — locks the server-rendered markup of both public experiences in both languages. It contains the `nav` scene, which renders `SITE_NAV_LINKS`. **It will change, and that is expected.**

The test file's own comment says *"Any migration of the composition model must leave these snapshots untouched — zero visual change for visitors."* This migration breaks that promise **deliberately**, because the links in the nav are changing. That is the one and only sanctioned reason.

**Do not regenerate it blindly.** Protocol:

```bash
npx vitest run tests/unit/public-experience-snapshots.test.tsx        # see it fail, read the failure
npx vitest run tests/unit/public-experience-snapshots.test.tsx -u     # then update
git diff -- tests/unit/__snapshots__/                                  # then READ it
```

The diff must contain **nothing but `href` values**. Specifically:

| Expected in the diff | |
|---|---|
| `/he/program` → `/he/events/{slug}/program` | and the `en` equivalents |
| `/he/speakers` → `/he/events/{slug}/speakers` | |
| `/he/info` → `/he/events/{slug}/info` | |
| `/he` → `/he/` and `/en` → `/` on home/logo links | the asymmetry is correct |

**Stop and report if the diff contains any of:** changed text or labels · changed class names · changed element structure, nesting or ordering · changed `aria-*` attributes · anything touching `registerHref`, `meHref` or `scheduleHref` · any change in the *opening* experience snapshots (that experience is not part of this migration — if its markup moved, something leaked).

Note the fixtures call `buildConferenceDescriptor(fallbackConference('he'), 'he')` **with no slug**. Decide deliberately how the fallback renders conference links when there is no slug — most likely by omitting them, per §4 — and make sure the snapshot reflects that choice rather than an accidental `undefined` in a path. **A path containing the literal `undefined` in the snapshot is a bug, not a new baseline.**

Commit the snapshot **in the same commit** as the link changes that caused it.

---

## 12. Verification

```bash
npm run gates     # generate:types → typecheck → lint → test → build
```

If `gates` fails, separate the causes honestly:

```bash
npm run typecheck
npx eslint .
npx vitest run
npm run build
```

**Baseline for comparison: `npx eslint .` was clean (exit 0) immediately before this work began.** A lint failure is therefore caused by this migration. Typecheck, tests and build have **no established baseline** — they could not run in the cloud shell — so if one of them fails, first determine whether it fails on `main` too:

```bash
git stash && git switch main && npm run typecheck ; git switch - && git stash pop
```

**Do not modify unrelated code to make a gate pass, and do not hide a pre-existing failure.** Name it, attribute it, and leave it.

Integration tests need Postgres:

```bash
npm run test:integration    # brings up the postgres-test container
```

These prove organisation scoping and are unaffected by routing. If the container will not start locally, say so; it is not a Phase 1 regression.

### Manual checks that no gate covers

`next build` validates imports and route collisions. **No gate validates that an internal link points at a route that exists.** That gap is documented in plan §24.6, and it is precisely the risk of this phase. So, with the dev server running:

| Check | Expected |
|---|---|
| `/he/events/{slug}/program` with a signed-in participant | renders, light `ExperienceNav` chrome |
| `/he/events/{slug}` | renders, **dark cinematic chrome, exactly one navigation** |
| `/he/program` | 404 from the platform — the old route is gone |
| Every nav and scene link on a conference page | resolves; no 404 |
| **Sign out in English** | lands on `/`, **not** `/en` |
| Sign out in Hebrew | lands on `/he/` |
| Logo on an English conference page | `/` |
| `/he/events/{unknown-slug}/program` | 404, not a silent fallback to another conference |

The chrome check is the one that catches the layout-placement mistake, and it is the reason the nested group is mandatory. Look at the page, not just the build output.

---

## 13. Multi-conference validation

**Non-negotiable, and the whole point of the phase.**

```bash
grep -rn "netaim-20" src/ --include=*.ts --include=*.tsx     # must return nothing
```

Then exercise **two different conference slugs** through the same code path. If local data has only one published conference, duplicate it in the Studio (`duplicateEvent` exists) or add a second row, and confirm:

- `/he/events/{slug-A}/program` and `/he/events/{slug-B}/program` both render, each showing **its own** programme
- neither page's content depends on which conference `Site.activeConference` points at — flip the pointer in the Studio and confirm both still resolve correctly
- an unknown slug 404s

The resolution chain must read: **URL slug → Payload `events` (unique, indexed) → event → experience → composition/runtime.** Never route → hardcoded conference.

---

## 14. Commit shape

Small, reviewable, each one green on lint:

1. `git mv` only — the move, no content edits. History stays legible.
2. Slug source: the four pages and the layout switch to `params.slug`.
3. `src/config/wordpress.ts` + the 8 home/sign-out sites.
4. `siteNavLinks` + both navigations.
5. Descriptor/service href plumbing + the 5 scene files + `me/page.tsx`.
6. **Snapshot, together with whatever caused it.**
7. `sitemap.ts` + `robots.ts`.

Do not squash 1 into 2 — a move mixed with edits reads as a rewrite in `git log`, and this is a migration someone will want to read in a year.

---

## 15. Final report

Report back on all thirteen, and stop. Do not begin Phase 2.

| | |
|---|---|
| **A** | Git checkpoint — branch, base, HEAD before and after |
| **B** | Backup verification — output of `backup` and `backup:verify`, or the exact reason either could not run |
| **C** | Files moved — `git log --follow` or `git show --stat` proving the 10 files kept their history |
| **D** | Files modified — full list |
| **E** | Routes before/after |
| **F** | Internal links changed — count and list |
| **G** | English home / sign-out fixes — and confirmation that English sign-out no longer reaches `/en` |
| **H** | Sitemap/robots changes |
| **I** | **Snapshot diff summary** — what changed, and confirmation that nothing beyond hrefs moved |
| **J** | Test results — typecheck, lint, unit, integration |
| **K** | Build result |
| **L** | Warnings and errors, including any pre-existing failure, named and attributed |
| **M** | Explicit confirmation that these were untouched: authentication · Payload schema · database schema · WordPress · production · Cloudflare/DNS/production Nginx · legal content · static asset URLs · design tokens · typography — **and that no conference slug was hardcoded** |

---

## 16. If something does not fit

The plan is validated but it is not omniscient. If the code contradicts this document — a link site that is not where §5 says, a guard that bites unexpectedly, a layout that behaves differently once rendered — **stop and report it** rather than working around it. That is `docs/CONSTITUTION.md` §21, and it is the rule that produced this document rather than a half-finished migration.

Two places where a surprise is most likely:

1. **`ConferenceExperience` is cached.** Adding `programHref`/`speakersHref`/`infoHref` puts them inside `cachedContent(...)` keyed on `['conference-experience', slug, locale]`. That is correct — they are derived from exactly those two values. But if you find yourself wanting to put anything *visitor-dependent* on that object, stop: `tests/unit/cache-safety.test.ts` will catch it, and it is right to.
2. **The `(site)` layout.** It keeps resolving `activeConference`, so after this change its nav will link into whichever conference is live. That is intended for now — those pages are platform-level and their ownership is deferred to the final legal migration. If it looks wrong while you are in there, it is not; leave it.
