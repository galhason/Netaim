# Phase 1 — Completion Report

**Branch** `integration/phase-1-route-migration`
**Head** `64ae009`
**Baseline** `be6a8ac` (last documentation commit before any code was touched)
**Scope** Local Conference Platform repository only.

---

## A. What Phase 1 was for

Before this phase the four authenticated experience routes — programme,
speakers, a speaker's profile, and participant information — lived at
`/{locale}/program`, `/{locale}/speakers`, `/{locale}/speakers/{id}` and
`/{locale}/info`, and resolved their conference from `Site.activeConference`,
a single pointer in Settings.

That is one conference's worth of addresses for a platform that runs a
sequence of conferences. Under the rotation model the operator confirmed —
one conference published at a time, the next prepared as a draft, then the
two swapped — the failure is not hypothetical. The moment September moves to
draft and October is published, every bookmark and every emailed link to
`/he/program` silently starts showing October's programme. Nothing tells the
reader they are looking at a different conference.

After this phase the address names the conference. `/he/events/september/program`
shows September or returns 404. It does not lie.

## B. What moved

Ten files, moved with `git mv` so history is preserved, into
`src/app/(frontend)/[locale]/events/[slug]/(experience)/`:

| From | To |
| --- | --- |
| `[locale]/(experience)/layout.tsx` | `[locale]/events/[slug]/(experience)/layout.tsx` |
| `[locale]/(experience)/program/{page,actions,loading,program-experience,program-view}` | `…/events/[slug]/(experience)/program/…` |
| `[locale]/(experience)/speakers/{page,speakers-directory}` | `…/events/[slug]/(experience)/speakers/…` |
| `[locale]/(experience)/speakers/[id]/page.tsx` | `…/events/[slug]/(experience)/speakers/[id]/page.tsx` |
| `[locale]/(experience)/info/page.tsx` | `…/events/[slug]/(experience)/info/page.tsx` |

The `(experience)` group sits **below** the `[slug]` segment, as approved. A
route group in parentheses contributes nothing to the URL, so the group
inherits `params.slug` without appearing in the address. The group layout was
not lifted above `events/[slug]/page.tsx`; the cinematic landing keeps its own
chrome.

Nothing was deleted. One file was added: `src/config/wordpress.ts`.

## C. The conference now comes from the address

Every page under the group reads `params.slug`. A single existence check sits
in the group layout rather than being repeated four times:

```ts
const event = await findPortalEvent(slug, lang).catch(() => null);
if (!event) { notFound(); }
```

This is the *same predicate* the conference landing uses — `findPortalEvent`,
which requires `_status = 'published'`. The group is therefore neither
stricter nor looser than the landing: `/he/events/x` and `/he/events/x/program`
become reachable and unreachable together.

**Verified statically:** `grep -rn 'activeConference' 'src/app/(frontend)/[locale]/events'`
returns nothing. Not one file under the conference tree reads the pointer.

`Site.activeConference` remains in the schema untouched — same name, type and
`relationTo`, no column change, no migration. It still decides the site
landing, the `(site)` chrome and contact page, the personal area under
`/{locale}/me`, the site spotlight, and the Studio's default working
conference. Its Studio description was corrected, because it still claimed to
decide "its landing, program, speakers and information", which is no longer
true. Copy only.

## D. Links

Every internal link to a programme, a cast or participant information now
carries the conference. Thirteen link sites in seven files beyond the original
inventory were found and fixed during the work, including two clipboard-share
URLs.

One of these was a real bug of the class this migration exists to remove:
`me/page.tsx` built a session card using `activeSlug` inside a builder that
already received its own `slug`, so a card belonging to a 2027 conference
would have opened 2026's programme. Fixed in `95d7579`.

## E. Leaving the platform

`/${locale}` produces `/en`, an address neither system serves — which is how
signing out in English reached a 404. `src/config/wordpress.ts` states the
asymmetry read off the running WordPress site: Polylang serves English with no
prefix, so `en → '/'` and `he → '/he/'`.

A defect in this phase's own work was found late, by reading the rendered DOM
in a browser rather than by any test, and fixed in `64ae009`. The links that
leave for WordPress were `next/link`. Two faults, both of which bite only once
the systems share a domain:

1. `next/link` resolves the click against this application's routes, so `/he/`
   would render this app's not-found instead of loading WordPress.
2. Next rewrites the rendered href to the `trailingSlash` setting, unset here
   and therefore `false`. `/he/` was reaching the browser as `/he`.

Every snapshot showed `/he/` throughout, because the tests mock `next/link`
with a component that renders the href verbatim. The snapshots could not have
caught this. A source guard was added in their place.

## F. Old routes

`/he/program`, `/he/speakers`, `/he/info` and `/en/program` return 404. No
redirect was added from inside the platform, as instructed — redirects for the
old addresses belong to the routing layer, not to the application.

## G. Sitemap and robots

`sitemap.ts` was rewritten to read conferences from `listPortalEvents(locale)`
per request rather than from a hardcoded list, and to advertise only the three
public paths per conference: the landing, `/register` and `/info`.

`robots.ts` gained `/admin`, `/admin/` and fourteen wildcard disallows for the
gated subpaths.

**Correction to the approved plan:** `info/page.tsx` has no `requireParticipant`.
It is a public page. It therefore stays in the sitemap and out of robots. The
plan had it listed as gated.

## H. Gates

| Gate | Result |
| --- | --- |
| `tsc --noEmit` (whole project) | **0** |
| `eslint .` (whole project) | **0** |
| `next build` | **passed** |
| `vitest run` | 516 passed, 5 skipped — see below |

`npm run gates` cannot be used: it hangs on `generate:types`, which boots
Payload and waits on a database connection.

Four test failures were reported and separated into two categories, and the
separation was **proved rather than asserted**:

*Three were mine.* `who-may-read-the-conference.test.ts` read the four
experience routes off disk at their old paths and failed with ENOENT. Fixed in
`5616069` by introducing an `EXPERIENCE` constant. No assertion was weakened:
the three guarded pages must still contain both `await requireParticipant(`
and `export const dynamic = 'force-dynamic'`, and `info/page.tsx` and the group
layout must still contain no gate at all. All 27 paths the file reads were
verified to exist.

*One was pre-existing.* `architecture-guards.test.ts` flagged the two nav
components. The guard's logic was reproduced and run against the baseline
commit and against HEAD, under both path separators:

| | separator `/` | separator `\` |
| --- | --- | --- |
| baseline `be6a8ac` | 0 offenders | **2 offenders** |
| HEAD | 0 offenders | **2 offenders** |

Identical. The test builds paths with `path.join`, which yields `\` on Windows,
but excludes files by comparing against the literals `'src/features/'` and
`'src/scenes/'`. The exclusion never matched on Windows, and
`import NavBell from '@/features/notifications/components/nav-bell'` — present
in both files long before this phase — was caught. Fixed on request in
`21570fa`, in a separate commit whose subject states it is not part of Phase 1.

## I. Runtime verification

Performed against the running development server by reading the DOM directly.

| Address | Result |
| --- | --- |
| `/he` | landing renders the published conference in full |
| `/he/events/brkt` | renders, cinematic chrome, conference content present |
| `/he/events/brkt/info` | renders, light chrome, exactly one navigation |
| `/he/events/brkt/program` | gate fires, redirects to `/he/me` |
| `/he/events/222` (draft) | not found |
| `/he/events/222/program` (draft) | not found |
| `/he/events/no-such-thing/program` | not found |
| `/he/program`, `/he/speakers`, `/he/info`, `/en/program` | 404 |

Header hrefs, read from the live DOM after the `64ae009` fix:

* Hebrew — logo `/he/`, home `/he/`, then `/he/events/brkt/{program,speakers,info}`, `/he/me/networking`, `/he/events/brkt/register`
* English — logo `/`, home `/`, then `/en/events/brkt/{program,speakers,info}`, `/en/me/networking`, `/en/events/brkt/register`
* Footer legal unchanged in both: `/{locale}/{privacy,terms,accessibility,contact}` — deferred, as instructed

Signing in was not attempted; no credentials were used.

## J. Multi-conference validation — partial

The runtime rotation test is **not complete**. The database holds four
conferences of which one is published, which is correct for the product: the
site serves one conference at a time.

What is proved: a published conference resolves under its own address and
serves its own content; a drafted conference and an unknown slug both return
not found; and no file under the conference tree reads `activeConference`.

What is not yet proved at runtime: that flipping which conference is published
moves the content with the address. The operator's own rotation — publish
`222`, verify, then return `brkt` — remains outstanding and is the last item
before this phase can be called verified end to end.

## K. Not touched

Production, `netaim26.org`, `netaimolami.org`, Cloudflare, DNS, WordPress,
production Nginx, production PostgreSQL, `.env`, `NEXT_PUBLIC_SERVER_URL`,
tokens, typography, design tokens, the visual design, `/{locale}/experiences/{slug}`,
static assets under `public/`, the authentication architecture, the Payload
schema, and the legal pages and their footer links.

A temporary `debug: true` was added to `payload.config.ts` during the
diagnosis described below and then removed; the file is byte-identical to its
committed version.

## L. Incident: the database was three migrations behind

Mid-verification the site showed "coming soon", every conference returned 404
and the Studio list was empty, though SQL showed all four conferences intact.

Unmasking Payload's error handler showed `Failed query` on a select naming
`events.hero_video_id`. `npm run migrate:status` confirmed three migrations
had never been applied: `20260915_102537_email_verifications`,
`20260915_122225_hero_video`, `20260916_190000_site_logo`. Postgres fails the
whole statement on one missing column, and every read in the application is
wrapped in `.catch(() => null)`, so the failure surfaced as "no data" rather
than as an error.

All three `up()` functions were read before running and are additive and
idempotent: `CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`,
`CREATE INDEX IF NOT EXISTS`, constraints wrapped in
`EXCEPTION WHEN duplicate_object`. No `DROP`, no `DELETE`. The only
non-additive statements are three `ALTER COLUMN … SET DEFAULT` on
`participants`, which affect future rows only. A fresh backup was taken first.
`npm run migrate` resolved it.

**This was not caused by Phase 1.** The three migrations were authored on
15–16 September, before any code in this phase was touched, and this phase
changed neither `payload.config.ts` nor the migrations nor the data layer. The
root cause is recorded in `payload.config.ts` itself: the schema was
historically shaped by `PAYLOAD_DB_PUSH` running silently, and once push was
deliberately turned off the local database stopped keeping up.

## M. Open items

**Blocking sign-off**

1. The rotation test in §J.
2. `npx vitest run` after `64ae009`, to confirm the new source guard passes
   and the suite is 56/56.

**Product decisions, recorded not acted on**

3. A conference that has ended currently returns 404 at every address. The
   operator proposed a designed "the conference has ended" page linking to the
   organisation's site. This needs a third explicit state — `archived` — because
   `draft` currently means both "retired" and "not yet announced", and a blanket
   ended-page would announce an unreleased conference. Requires a schema field
   and a migration. Three sub-decisions: what happens to the personal area of a
   finished conference; a page with a button rather than an automatic redirect
   (recommended); and `noindex`, which changes both `sitemap.ts` and `robots.ts`.
4. Whether the routing layer must treat `/he` and `/he/` identically. The
   platform now emits `/he/`, but a bare `/he` arriving from an old link must
   still reach WordPress.

**Housekeeping**

5. `generate:types` has not been re-run; `payload-types.ts` was hand-edited to
   keep one JSDoc comment in step with `site.ts`, so the next run should
   produce no diff.
6. Left over from earlier work and not cleaned up: `hason_restore_test`,
   `_to_delete/`, `_to_delete_files/`, `_probe_delete_test`, empty
   `app/(studio)/console/**`, empty `(site)/info` and `(site)/speakers`.
