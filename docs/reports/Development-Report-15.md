# Development Report 15 — the platform under load, and under attack

Period: 2026-08-07
Scope: two slices of infrastructure work — identity and boot hardening,
then caching, query shape and observability. No product, UX, engine
contract, domain rule or route changed. The detailed security record is
in `docs/Security-Hardening-01.md`.
Constitution reference: §22

## Why this, before anything visible

An audit of the running code against the specs found the platform's real
gap was not features. It was that a printed badge could be pasted in as a
session cookie; that a missing secret signed everything with `''`; that
abuse counters reset on every deploy; that every public page went to the
database on every request against a 600-user target; and that the gate
proving organization isolation had never once run.

None of those are visible in a screenshot. All of them decide whether the
platform can be deployed.

## Slice 1 — identity and boot

Recorded in full in `Security-Hardening-01.md`. In short:

- **Token purposes are now part of the signed payload.** The entrance QR
  and the session cookie shared a construction; because participants and
  registrations draw from separate sequences, a printed badge
  authenticated the account whose id matched. `src/shared/security/token-namespace.ts`
  is the only way to mint or read a signed token, so a new token type
  cannot forget to declare itself. Signature comparison moved to
  `timingSafeEqual`. A duplicate copy of the same check in
  `payload-context.ts` — with `??` where the original had `||` — now
  calls the same module. **Existing sessions are invalidated once.**
- **`assertServerEnv()` runs at boot** from `src/instrumentation.ts`.
  The schema existed and was never called. `PAYLOAD_DB_PUSH=true` in
  production is now a boot failure.
- **Abuse counters live in Postgres**, keyed by a hash of the subject.
  The in-memory `Map` is deleted. A blocked caller hammering a closed
  door does not extend its own block, so an attacker cannot lock a victim
  out by attacking them.
- **Security headers** on every response; there were none.
- **The gates run.** `vitest` covered only `tests/**`, so a colocated
  engine test had never executed. The isolation suite skipped silently
  without `TEST_DATABASE_URL`; on CI that is now a failure.
  `.github/workflows/gates.yml` runs the sequence against real Postgres.

## Slice 2 — caching, queries, observability

### Published content is cached; personalised pages stay dynamic

The five public pages were `force-dynamic`, so every visitor triggered a
full assembly of the conference from the CMS. They are dynamic for a
reason — the guest's own announcements and sign-in state are on them —
so the page was left alone and the expensive part was moved behind a
cache instead.

- `src/shared/cache/content-cache.ts` — `cachedContent()` plus the tag
  vocabulary. `getConferenceExperience` (five reads per call),
  `getActiveConferenceSlug` (resolved on every request to the front
  door) and `getDocumentExperience` now share one result across visitors.
- **Every cached reader was verified to be free of `cookies()`,
  `currentParticipant` and `requireActor`** — the whole tree runs on
  `getSystemPayload`. `tests/unit/cache-safety.test.ts` fails if that
  ever stops being true, and if a locale-taking reader omits the locale
  from its key.

### Writes name their subject instead of their URLs

Twelve Studio actions called `revalidatePath('/', 'layout')` — which
discarded the cache of every conference on the platform because one of
them was edited, and required each action to know which URLs a change
touched. `src/shared/cache/publish.ts` replaces them: `publishedEvent(slug)`,
`publishedHomepage()`, `publishedSpeakers()`, `publishedSponsors()`,
`publishedActiveConference()`. No blanket call remains.

Ten writes that changed public content but revalidated only Studio paths
— the Composer save, venue, sessions, sponsors, people, the speaker
lists — now publish. They were correct only because there was no cache.

### Queries

- `broadcastAnnouncement` awaited one insert per recipient per locale, in
  sequence: a 600-person workshop in two languages was 1,200 serial round
  trips with the organizer's request held open. Messages are now built
  first and written in bounded batches of 25 — bounded, because releasing
  1,200 at once would drain the connection pool.
- Event deletion issued one delete per connection; it is now a single
  delete over all of them.
- Two `limit: 1000` reads in the deletion cascade became `pagination: false`.
  These were **correctness** bugs, not just performance: a conference
  with more than a thousand connections left orphaned rows, and the
  foreign key then blocked the conference from being deleted at all.

### Observability, on this server only

Per the decision to keep data on the box: no Sentry, no APM.

- `file-transport.ts` — JSON lines to disk, rotated at 16 MB, seven
  generations kept. Writes are serialised through one promise chain;
  without it concurrent requests interleave partial lines and the file
  stops being parseable. Verified: ordering held and rotation bounded
  across 400 concurrent writes.
- The transport was swappable from the beginning and nothing had ever
  been installed in it. Every line the platform wrote lived only as long
  as the process did.
- `unhandledRejection` and `uncaughtException` are captured; they used to
  vanish.
- `GET /api/health` reaches the database rather than proving the process
  is alive. The body carries no configuration, versions or counts — it is
  public, and a health endpoint should not be reconnaissance.
- A correlation id is stamped on every response for matching against the
  reverse proxy's log. Server code that needs it inside its own call
  stack wraps in `withRequestId`; the edge runtime cannot carry it
  further, which is a real limit and not a finished story.

## What the first gate run found (pre-existing, not from this work)

Running the gates for the first time since 23–25 July surfaced seven
failures, all in files untouched by these two slices. This is the CI gap
paying for itself on its first run.

- **Two real Rule 3 violations, fixed here.** `info/page.tsx` imported
  `Glyph` and `activity-image-picker.tsx` imported `SessionCover`
  straight out of `features/cinematic/components/`. Both are now
  exported from the feature's public index and imported from there.
- **Two false positives from the guard itself.** The `.type ===` pattern
  was a bare regex, so an agenda screen filtering its own sessions by
  `talk | workshop | break` read as an experience-type branch. The rule
  is about composition, not domain data. The guard now matches a subject
  named like a scene *or* a comparison against a scene-type literal, so
  `s.type !== 'nav'` still fails and `a.type !== 'break'` does not. Two
  new cases assert it in both directions — a guard narrowed to silence a
  false positive has to prove it still bites, or narrowing it is just a
  way of switching it off.
- **Four stale snapshots.** The brand was renamed and the hero,
  speakers, program, venue and closing sections were redesigned. The
  baseline predates that work; it needs `vitest -u` on the authoritative
  machine. **Worth a look first:** in the English snapshot the brand now
  renders as `נטעים` in the header and footer, where it previously read
  `HASON`. If English should keep a Latin wordmark, that is a bug the
  snapshot update would freeze in place.

## Three build failures this work caused, and what they taught

The unit suite and typecheck passed while `next build` did not. All
three were the same underlying mistake — putting server-only code where
client code can reach it — and none of them can be caught by a test that
never bundles.

1. **The `@/shared` barrel was poisoned.** `publish.ts` and
   `content-cache.ts` import `next/cache`. Exporting them from
   `src/shared/index.ts` meant every client component that imports
   *anything* from `@/shared` — and there are many — pulled server-only
   code into the browser bundle. Both are now imported by their full
   path (`@/shared/cache/publish`) and the barrel says why they are
   absent, so the next person does not helpfully re-add them.
2. **The Rule 3 fix broke a client component.** Repointing
   `activity-image-picker.tsx` from `features/cinematic/components/session-cover`
   to the feature barrel was architecturally right and practically
   wrong: the barrel re-exports `cinematic-service`, which reaches
   `next/headers`. The direct import had been accidentally correct. The
   answer is neither — `features/cinematic/components/index.ts` is now a
   client-safe entry, and the guard's trailing slash (which already
   permitted `.../components` while forbidding `.../components/x`) is
   documented as deliberate rather than left as an accident.
3. **`instrumentation.ts` is bundled for the edge runtime too.** A
   runtime guard plus a dynamic import was not enough: a static
   `import … from 'node:fs/promises'` anywhere in that graph fails to
   resolve for edge, even on an unreachable path. `file-transport.ts`
   now loads `fs` and `path` lazily inside the write and caches them.
   Ordering, rotation and bounds were re-verified across 400 concurrent
   writes after the rewrite.

Fixing those surfaced two more of the same kind, and the second one was
the real root:

4. **`logger.ts` was pulled into the client bundle by its own barrel.**
   Adding `currentRequestId()` to the logger core meant `@/shared` —
   which ninety-six client components import — now reached
   `async_hooks` and `crypto`. The correlation id is now stamped by the
   transport in `install.ts`, which only ever runs on the server, and
   `logger.ts` knows nothing about it. `request-context` left the barrel
   for the same reason.
5. **The runtime guard was written in the form webpack cannot use.**
   `if (NEXT_RUNTIME !== 'nodejs') return;` followed by imports leaves
   those imports at the top of the module graph. Next substitutes
   `NEXT_RUNTIME` as a literal per bundle, so the eliminable form is the
   positive one — imports *inside* `if (… === 'nodejs') { … }`. With
   that, the edge bundle drops the branch and never resolves `fs`.
   The `node:` prefix was also wrong here: webpack's edge target
   rejects the scheme outright (`UnhandledSchemeError`), so bare
   specifiers are the safer choice.

The lesson worth keeping: **`npm run test` passing says nothing about
whether the app bundles.** `npm run gates` ends with `build` for exactly
this reason, and the sandbox could not run it. Four rounds of this were
spent fixing the file the error named instead of the class of fault, so
the checks now walk `src/` *and* `tests/`, follow imports transitively,
understand that `'use server'` is a bundle boundary, and model the edge
bundle separately from the node one.

## Technical Review

No new dependencies. Rule 1 audit (Payload words outside `infrastructure`
and `cms`) returns zero. New engine code is pure and colocated with the
engine it belongs to; the two new repository contracts are declared by
the application layer and implemented at the infrastructure seam, as the
existing ones are.

`node_modules` in the working folder is a Windows install, so the sandbox
could not run vitest or `next build`. The pure modules were typechecked
under `--strict` and executed standalone: 13 cases for token namespacing,
13 for the rate-limit policy, 6 for cache safety, 6 for the log
transport. All pass. **The full gates have not run.**

## Before this can be called done

1. `npm run generate:types` — done.
2. `npm run gates` — **green**: types, typecheck, lint, tests and build.
3. **`rate_limits` now exists** (created by push, verified 2026-08-07 —
   data intact, 78 tables, correct columns). The limiter is live.
   Migrations remain unadopted: the database has no migration history,
   so `migrate:create` emits a baseline of all 78 tables and `migrate`
   fails on the first statement and rolls back. `package.json` now says
   so at the scripts, and `docs/Adopting-Migrations.md` has the order
   that works. This is the last P0 before a real deployment.
4. Point a monitor at `/api/health` and set `LOG_DIR` on the server.
5. Nothing here has run against a live database yet. The build proves it
   compiles, not that the boot assertion, the log transport, the cache
   tags or the limiter behave.

## Open decisions

- **Session revocation.** The cookie is still a bearer credential with no
  expiry, nonce or version inside it: there is no sign-out-everywhere. A
  version column on `participants` fixes it in a few lines, but it
  changes what a session means.
- **`totpSecret` is stored in clear.** Encryption at rest needs a key
  management decision.
- **Demo photographs.** Five services fall back to `i.pravatar.cc` and
  `picsum.photos` when CMS content has no photograph, so the hosts could
  not simply be removed from `remotePatterns` — real pages would break.
  What a portrait without a photograph should render is a product
  decision, and until it is made a real event can still show a
  fabricated face.
- **The two experience engines.** `experience-runtime` serves everything
  public; `experience-engine` serves only the old Composer's preview. The
  recommendation is to keep the runtime and port two things the older
  generation has and it lacks — Zod content validation, which fits the
  `validate` slot already in the contract, and lazy scene loading. That
  migration belongs with the Composer persistence work, so the Composer
  is moved once rather than twice. Not started; awaiting approval.
