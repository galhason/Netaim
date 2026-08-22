# Development Report 17 — the brand, and the gate that graded the wrong thing

Period: 2026-08-08 → 2026-08-20
Scope: two undocumented slices from the previous period (SMTP delivery,
session revocation), the brand rename, and the readiness engine moved
onto the model the visitor is actually served.
Constitution reference: §22

---

## 0. What reports 15 and 16 left undocumented

Two pieces of work landed after Report 16 and were never written up.
Recording them here so the trail is continuous.

**Email delivery is built.** Report 16 closed with "organizers can now
write these emails; nothing sends them." That is no longer true.
`src/infrastructure/email/smtp-channel.ts` delivers over SMTP through
`nodemailer`, selected at the composition root by `smtpConfigured` with
the dev channel as the fallback. The reasoning is in
`docs/Email-Delivery.md`: every provider worth using speaks SMTP, and so
does a government mail relay, so **the provider is an environment
variable rather than a code change** — which matters twice here, because
the deployment target is unsettled and a public body may later be told
which server its mail must leave through.

The gap that had actually blocked delivery was not a missing provider:
`OutboxMessage` carried a `participantId` and no address, so only a
channel that sends nowhere could satisfy the contract. The recipient is
now resolved at the composition root and passed to `deliver` as a
separate argument, and the address deliberately never reaches the
persisted record — a test asserts it.

**Sessions can be ended.** Recorded in `docs/Session-Revocation.md`. The
cookie was `session:<accountId>`, signed and otherwise empty: it never
expired, signing out changed nothing on the server, and rotating the
secret was the only revocation available — which would have invalidated
entrance, connect and TOTP tokens at the same time. It now carries a
256-bit random session id and a signed expiry, stored only as a hash,
in an absolute rather than sliding window, one row per device.

Both of these introduce a table that does not exist yet. See §5.

---

## 1. The brand is נטעים / Netaim

`BRAND_NAME` already read `נטעים`, but it was a single string, so the
English site rendered a Hebrew wordmark and a scattering of surfaces
still said HASON.

`src/config/brand.ts` now holds the mark in both scripts and exposes
three things, because they answer three different questions:

- `brandFor(locale)` — the mark in the reader's own script. Every public
  surface that has a reader now calls this: both site layouts, the
  experience layout, the my-activities layout, the register page, the
  account home, and both descriptor builders.
- `BRAND_NAME` — the Hebrew mark, for a surface with no reader in hand.
  `he` is the routing fallback, so this is what the scene registry's
  `defaultContent` resolves to.
- `BRAND_LATIN` — for identifiers that **leave the platform** and are
  read by software whose Hebrew rendering cannot be relied on: the
  authenticator entry (`otpauth://` label and issuer), the vCard `NOTE`,
  and the tenant name on first boot.

`buildConferenceDescriptor` and `buildOpeningDescriptor` now take a
locale. All nine call sites already had one in scope — five in `src/`
and four in `tests/`, the latter found by typecheck after a manual sweep
that searched only `src/` reported the change complete. The lesson is
not about the sweep: it is that `npm run gates` is the check, and a
static reading of the code is a hypothesis until it has run.

### The rule that decided what not to rename

**Labels change with the brand. Stored keys do not.**

A stored key is not a name — it is what existing data is already filed
under, and giving it a new value abandons that data rather than renaming
it. Left deliberately unchanged, each with the reason written at the
site:

- **`hason` as the organization slug.** A row already exists under it. A
  new default would create a second organization beside the real one.
- **`hason-favorites`, `hason-banner-*`, `hason-popup-*`,
  `hason-canvas-select`.** Renaming would silently empty every guest's
  saved activities and re-show banners they had dismissed.
- **`hason.log` and the rotation pattern.** The sweeper filters on that
  name; renaming would leave the existing files with nothing to remove
  them.
- **`support@hason.events`.** Moved behind `NEXT_PUBLIC_SUPPORT_EMAIL`
  with the working address as the default. A brand rename does not move
  a mailbox, and pointing a stuck guest's message at an unconfigured
  domain sends it nowhere.

**One-time effect:** an authenticator already holding a secret keeps
showing the old entry name. The name is not part of what it stores, so
nothing breaks; only new enrolments read `Netaim`.

---

## 2. Readiness was grading a model nobody renders

This is the substance of the period.

The public conference has rendered from the Runtime descriptor —
`EventOpening` plus `events.composition` — since Experience Engine v2.
`reviewLaunch` was still reading `getEventExperience`, the legacy
`scenes` collection. **The gate that decides whether a conference may go
live was judging a document no visitor is served.**

A previous session had noticed the symptom and patched it: forty lines
in `launch-service.ts` synthesised a venue scene and a join scene from
the v2 draft so the v1 inspector could see them. That patch is the
clearest evidence of the problem — it existed to translate between two
models, and it only applied when the v1 scene was *absent*. Where a v1
venue scene existed and was enabled, it shadowed the v2 record entirely.

The consequences were both directions of wrong:

- An organizer working only in the Console could be held at
  `safety/emergency-missing` with no screen able to clear it — the v1
  `venue.details` were writable only from the Classic venue page.
- A conference could pass readiness on v1 data while the experience the
  public would actually receive was empty.

### What it reads now

`src/features/events/utils/journey-facts.ts` — new, pure. Given the
composed journey, the opening draft and the program, it returns the
readiness facts. The journey is composed exactly as the Runtime will
compose it for a visitor: the authored `CONFERENCE_SCENE_SEQUENCE`,
reordered and hidden by `completeComposition` + `applyComposition` — the
same two functions the Console's Experience Map already uses. What the
gate judges and what the page renders can no longer drift, because they
are produced by the same code.

- `hasHero` / `hasJoin` / `venue.present` ask whether the **arrival**,
  **closing** and **venue** scenes survive the composition, by authored
  id — a conference has one of each, and a composition may move or hide
  them but never renames them.
- `heroHasImage`, and the venue's accessibility and emergency text, come
  from the opening record — the fields the Console already edits.
- `speakersWithoutPhoto` counts a speaker with neither their own
  portrait nor a linked account's. Either is a face.
- Sessions come from the real program (`listAgenda`), not from a v1
  agenda scene. A session missing either end is dropped rather than
  given a placeholder: the only rule that reads sessions looks for two
  overlapping in one room, and a substituted time would either invent a
  clash or hide one.

`toEventHealthInput` now takes those facts instead of an
`EventExperienceContent`, which removes the Event Engine adapter's
dependency on the scene model entirely — it no longer imports
`@/experience-engine` at all.

### The editorial notes got softer, on purpose

`inspectExperience` (v1) is replaced by `inspectJourney` (v2), which the
Console's rhythm assistant already runs. v1 raised `join-missing` and
`hero-anchor-missing` as **warnings**; v2's rules are advice by design —
"the Studio guides, the editor decides."

Severity is now assigned at the seam (`notesAsFindings`) rather than
inside the inspector, so the same note reads identically in the Studio
and in the gate, and **no editorial rule can become a reason a
conference cannot go live**. The blockers that matter — emergency
information, accessibility, overlapping sessions — come from
`evaluateReadiness` and are untouched.

### Expect statuses to move

This changes what "ready to launch" means. Conferences whose readiness
was computed from v1 data will be re-scored against the experience they
actually publish. Some blocked ones should become launchable; some that
passed on a well-filled v1 scene graph may not. That is the correction,
not a regression — but it is visible, and it is the first thing to look
at after this deploys.

---

## 3. A live data-loss bug in the Console

The Console's inline program editor passed `sessionType`, `capacity` and
`waitlistEnabled` through as hidden inputs, but not `track` or
`language`. `updateSessionAction` writes the whole session rather than a
patch, so `optionalText(undefined)` **cleared both fields on every save
made from that form**. Any track or language set in the Activity Studio
was destroyed by an unrelated edit to a session title.

Both are now carried through, with a note at the site explaining why the
hidden inputs exist — the next person to add a field to that form needs
to know that omitting it deletes data.

---

## 4. Classic no longer holds the Console up

Ten server actions lived in `(classic)/actions.ts` and were imported
across the route-group boundary — `setStudioLocaleAction` by
`ConsoleShell`, which every Console page renders, plus duplicate,
archive, launch, the homepage save, the event opening save, the program
day themes, and the three session actions.

The studio being retired was a hard dependency of the studio replacing
it. Nothing could be deleted in that state, and the first slice of the
retirement had to be a refactor that changes no behaviour at all.

- **`src/app/(studio)/studio/actions.ts`** — the ten shared actions,
  beside the two route groups rather than inside either.
- **`(classic)/actions.ts`** keeps the sixteen only Classic performs,
  and now says so at the top. It goes when the last one is ported.
- Imports in the new module are by full path, never the
  `@/features/studio` barrel — the barrel re-exports React components,
  and Report 15 §3 records what happens when a server module reaches
  them.

Two helper sets were about to become duplicated by the split, so they
moved to where they belong instead:

- **`authorized` and `actorFor`** now sit in
  `features/studio/services/studio-auth.ts`, beside `requireCapability`.
  Two copies of "may this person do this" is how two copies come to
  disagree, and the permissive one wins.
- **`optionalText`, `formText`, `toIsoDateTime`** are
  `features/studio/utils/form-values.ts`. They encode what a blank field
  means, and that answer has to be the same on every Studio form.

Verified by import analysis over both files: no unresolved identifier
and no unused import in either, and no module outside `(classic)` still
reaches into it — except `features/composer`, which is deleted together
with it.

**Still an inversion:** `console-shell.tsx` and `studio-sidebar.tsx` are
feature components importing a server action out of `app/`. That was
already true and is not made worse here, but it is backwards under
Dependency Rules §3 and should move into `features/studio/actions/`, as
`features/account/actions/choose-locale.ts` already does.

## 5. Two Console screens Classic was holding

Two of the twelve, taken in the agreed order — what blocks running a
conference first.

### Readiness, where the launch button is

The Console showed a blocker *count* and a link into the studio being
retired. A number alone tells an organizer they are blocked without
telling them by what.

`/studio/experiences/[slug]` now reviews readiness itself: the score sits
beside the launch button, and a panel under the header lists every
required action with its message and its remedy, blockers marked apart
from warnings. The link into Classic is gone. When the review cannot be
computed the panel says so rather than showing a confident zero.

This costs one extra review per workspace load, and it repeats four
reads the page already makes. Left as it is deliberately: the alternative
is passing pre-loaded data into `reviewLaunch` and giving the gate a
second way to be called, which is how a gate comes to be called the
cheap way in the place that matters.

The homepage inspector's "edit the event" link now points at the Console
workspace instead of the classic opening form — the same fields, on the
surviving screen.

### Registration, where the queue is

Approving, declining and promoting from the waitlist existed **only** in
Classic. An approval-mode conference could be watched from the Console
and not run from it: the pending list was visible and inert.

`/studio/insights?event=` now carries the moderation and the rules:

- Each registration offers the act its status allows — approve or decline
  when pending, promote when waitlisted, remove in any case.
- The capacity strip reads the registration engine's own situation: the
  public state in words, and places available against the limit.
  `capacity.reserved` is deliberately not shown — it counts the same
  people as `pending`, and two columns of one number reads as two facts.
- The settings — mode, capacity, open and close dates, waiting list,
  confirmation message, and which details to ask for — are a disclosure
  at the foot, open by default when the conference collects nothing yet,
  because that is the one case where the organizer certainly has
  something to do.

The five actions moved to `studio/actions.ts` beside the other shared
ones, and now revalidate `/studio/insights` as well as the classic path.
Both surfaces perform the same acts; approving cannot come to mean
something different depending on where it was clicked.

**Still missing here:** registrant status filters, name and email search,
and the attended count. Those are reporting, not operation, and they wait.

## 6. Housekeeping

- **`.env.example` rewritten.** It listed 13 keys; `src/config/env.ts`
  and `payload.config.ts` read 24. The SMTP block, the S3 block,
  `DISPATCH_SECRET`, `PAYLOAD_ADMIN`, `PAYLOAD_DB_PUSH`, `LOG_DIR` and
  the platform tenant variables were all undocumented — someone
  deploying from this file could not have configured email at all.
- **A README exists.** There was none; `CLAUDE.md` and `DEPLOY.md` were
  carrying that job.
- **`logs/` is ignored**, and `logs/hason.log` and
  `tsconfig.tsbuildinfo` need removing from the index (see §5 — a git
  lock blocked it here).
- **`docs/System-Status-2026-08.md`** replaces
  `docs/System-State-and-Gaps.md`, which was written on 2026-07-16 and
  had been overtaken: it lists Program, the public front door, the audit
  trail and check-in as unbuilt, and all four exist.

---

## 7. The marker was not the safeguard

`npm run build` passed. Its route table listed the personal pages —
`/[locale]/me`, `/me/badge`, `/me/messages`, `/me/networking`,
`/me/profile`, `/me/scan` — as `●`, prerendered, with `/he/...` and
`/en/...` under each.

Report 16 §4 ends: *"After this, the build lists these routes as `ƒ`
rather than `●`."* It does not, and never did. That report also contains
the correct explanation four paragraphs earlier — the marker describes
`generateStaticParams` on the locale segment, not a cached response — so
it contradicted itself and the wrong half was the conclusion.

**Nothing is leaked.** Checked against the build output rather than
argued: no `.html` on disk for any personal route, and no entry for one
in `prerender-manifest.json`.

But that is the second time this property has been settled by someone
reasoning carefully about a marker, and Report 16's own words on the
subject were *"that reasoning is not a safeguard, so it was replaced
with one."* The safeguard it added checks that each page **declares**
`force-dynamic` — a source-level promise, which is why it passed while
the report's claim about the build was false.

`tests/unit/personal-pages-are-dynamic.test.ts` now also checks the
receipt, using the same detector as the declaration check so the two
cannot come to disagree about which pages are personal. On a tree with
no build it returns rather than failing — the unit suite runs before
`build` in `gates` — so it is real on any second run and in CI, where a
build always precedes it.

**Its first version was wrong, and being wrong is what produced the
measurement.** It failed on `/he` and `/en`, because it treated any key
in `prerender-manifest.json` as a prerendered page. Rather than assume
either a leak or a false positive, the artifact was read:

- **Zero response bodies.** No `.html`, no `.rsc`, nowhere under
  `.next/server/app`. Nothing at all is prerendered in this build.
- The manifest entry for `/he` is the empty object `{}` — no
  `dataRoute`, no `initialRevalidateSeconds`.
- `dynamicRoutes['/[locale]']` is `{ fallback: null }`.

`routes: ['/he','/en']` is the enumeration `generateStaticParams`
produced for the locale segment. It records that the paths exist, not a
response anyone could be served.

The check now asks the question that matters — is there a stored body, or
a manifest entry that says where a cached response lives or how long it
lives for — and ignores a bare enumerated path. It also asserts its own
personal set is non-empty, so it cannot pass by matching nothing.

A correction has been added to Report 16 at the sentence itself. Reports
are the project's memory; one that is quietly wrong is worse than one
that is missing.

## 8. The venue, and two fields that blocked a launch and published nothing

The third slice, and the only remaining work that touches the schema —
so it lands before the migration adoption freezes it, not after.

### What was actually wrong

There were two venue systems. The classic Studio's venue page wrote
`address`, `mapUrl`, `mapLabel`, a description and four detail rows into
the legacy scene document. That document is rendered by the v1
`venue-scene.tsx`, which is reachable only from the old Composer's
preview. **An organizer could type a real street address and no visitor
would ever be shown it.**

Meanwhile the public information page built its Google Maps and Waze
links by concatenating the venue's name with the conference's `location`
field — usually a city. "Jerusalem" navigates nowhere.

And worse: `accessibilityInfo` and `emergencyInfo` have existed in the
CMS, been editable in the Console, and been **launch blockers** since the
readiness rules were written — and `toOpeningContent` dropped them. A
conference could not go live until an organizer wrote where the
accessible entrance is and what to do in an emergency, and writing them
published nothing to anyone.

### What it is now

Three fields added to `events.opening.venue` — `address` and `mapLabel`
localized, `mapUrl` not, because a URL is the same in both languages —
and the two existing ones carried through the boundary that was dropping
them. Threaded through `EventOpeningContent`, the draft shape, the
repository read and write, `VenueScene`, and the cinematic service.

**No fallback for any of the five.** The service invents plausible text
when the CMS is empty for narrative and image; it must not for these. An
invented address sends a visitor somewhere, and invented accessibility
or emergency information is worse than none at all.

On `/[locale]/info`:

- Navigation aims at the written address when there is one, and falls
  back to the old name-plus-location behaviour when there is not.
- A pinned `mapUrl` overrides the generated search, with the editor's own
  button text — supplied precisely for the cases the search gets wrong:
  a new building, a side entrance, a venue that shares a name.
- Accessibility and emergency information appear as their own section,
  on the page a guest opens before travelling.

The landing page's venue scene still shows only the city. That is
deliberate: the cinematic landing is brief by design, and the address
belongs on the directions page.

### The old editor redirects rather than disappears

`/studio/events/[slug]/venue` now redirects to the conference workspace
with the venue scene selected. A form that promises publication and
delivers none does not survive its replacement — but an organizer may
have that address bookmarked, and a bookmark should land somewhere true.

`updateVenueAction`, `updateVenueChapter` and `VenueDetailsInput` are
deleted; nothing references them.

### v1 is down to two readers

With the venue service gone, `getEventExperience` — the legacy scene
read — is reached from exactly two places: the classic Composer page,
which is on the same list, and the development-only demo digest on
Studio Home, which uses it for a title. That is the whole remaining
reach of Experience Engine v1.

## 9. Before this runs

**Three schema additions are waiting.** The `audit-log` (Report 16) and
`account-sessions` (§0) tables, and the three venue columns from §8 —
`address` and `mapLabel` in `events_locales`, `mapUrl` in `events`.
One-time: `PAYLOAD_DB_PUSH=true` in `.env`, `npm run dev` until Ready,
stop, remove the line.

**This is the last schema change before the freeze.** Everything left on
the Console list (§11) is interface only, so the migration adoption can
proceed immediately after.

**Everyone signed in will be signed out once** when the new session shape
goes live. Old-format tokens are refused rather than grandfathered —
they are precisely the permanent, account-naming tokens being closed.

**`npm run gates` ran on 2026-08-20, four times, once per slice, and is
green.**

It caught something on three of those runs, and each was a thing static
reading had reported as fine: five test call sites of the changed
descriptor signature (a manual sweep had searched only `src/`); the first
version of the prerender check, which was itself wrong (§7); and an
import left orphaned by deleting `updateVenueAction`.

That is the argument for running the gate after each slice rather than
accumulating two or three. The verification available while writing the
code — resolving imports by hand, checking call sites, reasoning about
boundaries — is a hypothesis. This is the measurement.

Two snapshots remain, both English, and the diff is exactly six
occurrences of `נטעים` becoming `Netaim` in the nav, the footer wordmark
and the copyright line of each experience. **Both Hebrew snapshots
pass**, which is the evidence that the change is locale-scoped rather
than a global replace. This is precisely the bug Report 15 flagged and
warned that updating the baseline would freeze in place; the baseline is
what is stale. `vitest -u` is the correct fix.

`npm run build` passed — compiled, 27 static pages generated, no module
resolution or edge-runtime failure, which is the class of fault Report 15
§3 records falling into five times in a row. What its route table did
show is §7.

**The full gate is green: types, typecheck, lint, 241 tests, build.**

`docs/Runbook-2026-08-20.md` has the ordered steps, including the
migration adoption, which remains the last P0 before a real deployment.

---

## 10. Decisions taken this period

Four, all with the Product Owner:

1. **Brand in English is `Netaim`** — Hebrew name, Latin transliteration
   in the English locale and in identifiers that leave the platform.
2. **The Console studio survives; Classic is retired into it.**
3. **`permission-engine` becomes the single truth on permissions**;
   `src/auth` becomes a thin adapter to Payload's access functions. Not
   started.
4. **Readiness moves to the v2 model** (§2), which is what made the
   Composer question answerable — see below.

### The Composer persistence gap is closed by deletion, not by building

The standing item since Report 15 — "order, enabled, title and
duplication still vanish on refresh" — will not be implemented.

The Classic Composer edits the `scenes` collection and the
`experiences.scenes` order: the v1 model. Its renderer,
`EventExperience`, is **exported and rendered by no route**. Building
persistence for it would mean adding repository writes, a scene-creation
path and a third source of truth for scene order, all onto a model that
is being retired and that no visitor is served.

The capability it represents — editing scene content, per locale — is
already in the Console for every conference scene (arrival, story,
quote, venue, moments, closing, speakers, program) and for the homepage,
and order and visibility there persist correctly through
`events.composition`. The gap closes when the last v1 consumers move and
`experience-engine` and `features/composer` are deleted.

---

## 11. Still open

Retiring Classic is **12 capabilities** with no Console equivalent, to be
taken one verifiable slice at a time. In the order agreed — what blocks a
launch first:

~~1. Readiness score and required actions~~ — done (§5).
~~2. Registration settings, approve, decline, promote~~ — done (§5).

~~3. The venue chapter~~ — done (§8), and with it the last schema change
before the migration adoption.

4. Sponsors, the global People directory, organization rename, profile
   rename, creating a teammate account, renaming a team member.
5. Partial losses to close: media search, registrant filters and search,
   the attended count.

All five are interface only. Nothing left on this list touches the
database, so the schema can be frozen and the migrations adopted.

The refactor that had to come first — untangling the ten shared actions
— is done (§4), so these can now be taken one at a time without the
Console breaking underneath.

Also open, unchanged: `totpSecret` is stored in clear; `connect` and
`entrance` tokens have no expiry; no screen lists a guest's live
sessions and expired rows are never swept; five services still fall back
to fabricated portraits from `pravatar`/`picsum`; `src/features/home/`
is an empty directory; and there is no e2e layer at all.
