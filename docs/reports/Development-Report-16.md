# Development Report 16 — accountability, honest limits, and the organizer's own words

Period: 2026-08-08
Scope: the audit trail, the silent caps, and registration email templates.
No change to the Composer, the scene schemas, the Experience Runtime or
anything the editor touches.
Constitution reference: §22

## The editor is untouched

Stated first because it was the constraint on this work. `git diff`
across `features/composer`, `features/experience/schemas`,
`experience-runtime`, `experience-engine` and `src/scenes` is empty. The
only line added to a Composer action is `publishedEvent(slug)` — a cache
invalidation, added so that saving in the Composer still updates the
public page now that published content is cached. It changes what the
platform does after a save, never what the save contains.

## 1. Audit trail

The platform could not answer "who launched this, and when". It can now.

- `audit-log` collection, **append-only by construction**: `create`,
  `update` and `delete` are all denied at the access layer, for an owner
  as much as for anyone. A record that can be rewritten proves nothing.
- The actor's name and email are **copied onto the entry**, not joined
  at read time. An account can be renamed, anonymised under GDPR or
  deleted; the trail must still say who acted at the time.
- **23 actions, all wired.** A closed union rather than free strings, so
  a typo cannot create a category nobody queries. A guard confirms every
  declared action has a label and records a real mutation — the first
  run of it found eight declared and unwired, which would have meant the
  history silently never showed content edits.
- `actorFor()` sits beside the existing `authorized()`: the same
  capability gate, keeping the actor. Permission and identity come from
  one call, so the trail cannot name the wrong person.
- The four registration decisions are recorded through the one factory
  they share, so a fifth cannot be added without an entry.
- **What is deliberately not recorded**: the body of an announcement
  (the trail is read by more people than the announcement was addressed
  to — only the audience is kept), and rejected door scans (an operator
  sweeps continuously; a trail of failures would bury the admissions).
- `/studio/history`, filterable by conference. Read-only: no control on
  the page at all.
- Recording never throws and never blocks. An audit failure must not
  undo a launch or refuse a check-in that already happened; it is logged
  at error level instead.

## 2. Silent caps

Sixteen reads were capped at 200/500/1000 with the caller treating the
result as complete. Thirteen became `pagination: false` — these were
**correctness** bugs: a 600-person conference silently lost 100
registrations from the Studio's list.

Three are genuinely feeds or per-person lists. Two of those became
`pagination: false` (bounded by one person, not by conference size); the
announcement feed keeps a ceiling, now named `ANNOUNCEMENT_FEED_LIMIT`
rather than a number nobody questions.

The four `.slice(0, 5)` on a guest's conferences are **real** limits —
each conference costs up to three queries, so thirty conferences would
be ninety queries for one page. They are now one named constant with the
trade-off written down, and `/me/messages` **tells the guest** when it
bites. A hidden bug became a visible limit. The honest fix is one
aggregate query instead of a fan-out, which needs a repository method
that does not exist yet; this is a bound, not a solution.

## 3. Registration email templates

An earlier audit claimed "100% of participant text is hardcoded" and
called it a breach of *nothing hardcoded — all content comes from the
CMS*. **That framing was wrong and is corrected here.** Of 272 bilingual
pairs, essentially all are interface copy and engine messages: Studio
chrome, readiness blockers, sign-in errors. Event content — titles,
scenes, agenda, speakers, sponsors, venue — was already CMS-driven and
editable in the Composer. Interface copy is not content, and moving it
to the CMS would turn the CMS into a translation console where an editor
can rewrite a button or delete an error message.

One genuine exception: the seven registration emails. An organizer
wanting to reword their own confirmation email needed a deploy.

- Optional localized fields on `registration-settings`, which is already
  per-conference.
- **Fallback is per field, not per message.** Rewriting only a subject
  keeps the platform's body; a moment never opened keeps its own words
  entirely. Blank and whitespace mean *not written*, never *send an
  empty email*. Seven cases assert exactly this.
- The engine still renders and never fetches: overrides arrive as an
  argument, resolved at the composition root — the shape the original
  author left a note for.
- A conference that customises nothing behaves identically to before.

## 4. Personal pages can no longer be prerendered

The build listed `/[locale]/me`, `/me/badge`, `/me/messages` and
`/me/networking` with `●` — *prerendered as static HTML*. On pages that
show one guest's entrance code and messages, that reads like the exact
leak the caching work risked.

It was not one: `/[locale]/me` declares `force-dynamic` and still showed
`●`, so the marker describes `generateStaticParams` producing `/he` and
`/en`, not a cached response. `/[locale]/contact` was the only route with
`Revalidate 1h · Expire 1y` — the numbers from `content-cache.ts` — and
the personal routes' columns were empty.

But that reasoning is not a safeguard, so it was replaced with one.

A detector at named-call precision — not barrel imports, which
over-report badly — found **44 pages whose answer depends on who is
asking, of which only 4 declared it.** The rest relied on Next inferring
it from a cookie read. That inference works, and it is the wrong thing
to depend on: it disappears the moment a refactor moves the read behind
a helper, and the failure mode is one guest served another guest's page
with nothing announcing it.

All 40 now declare `force-dynamic` explicitly.

`tests/unit/personal-pages-are-dynamic.test.ts` keeps it that way, and
guards itself: it asserts at least 30 personal pages are found, so a
broken detector fails loudly instead of passing over an empty set — the
failure that is easiest to miss. A fourth case covers the same property
from the other side: nothing wrapped in `cachedContent` may resolve the
visitor.

**Verified by breaking it on purpose**: removing the declaration from
`/me/badge` failed the check by name; restoring it passed.

After this, the build lists these routes as `ƒ` rather than `●`.

> **Correction, 2026-08-20.** It does not. The build still lists them as
> `●`, and this sentence was wrong — it also contradicts the paragraph
> four above it, which correctly explains that the marker describes
> `generateStaticParams` producing `/he` and `/en`.
>
> No page is leaked, and the evidence is stronger than a spot check:
> the 2026-08-20 build emitted **zero response bodies** — no `.html` and
> no `.rsc` anywhere under `.next/server/app` — and the manifest entry
> for `/he` is the empty object `{}`, with no `dataRoute` and no
> `initialRevalidateSeconds`. `routes: ['/he','/en']` is the enumeration
> `generateStaticParams` produced for the locale segment, not a stored
> page. But the sentence would have made a future
> reader treat a correct build as a regression, or an incorrect one as
> fine. `tests/unit/personal-pages-are-dynamic.test.ts` now checks the
> artifact rather than the marker. See Report 17 §6.

## Verification

`node_modules` is a Windows install, so the sandbox cannot run vitest or
`next build`. What did run: the four new pure modules typechecked under
`--strict --noUncheckedIndexedAccess`; seven template-fallback cases
executed and passing; and the standing checks — every named import
resolves against its barrel across 547 files in `src/` and `tests/`, no
client component reaches server- or node-only code, the edge bundle
reaches no Node built-in, and the constitution guards hold in both
directions.

Two scope bugs were caught by those checks during the work: an audit
call whose actor variable did not exist, and a venue action whose guard
did not match while its audit line did.

## Before this runs

The `audit-log` collection is a new table. Locally: `PAYLOAD_DB_PUSH=true`
in `.env`, `npm run dev` until Ready, stop, remove the line. Then
`npm run gates`.

## Still open

- **Email delivery.** Organizers can now write these emails; nothing
  sends them. The dev channel records and does not deliver.
- **The two experience engines.** Unchanged and undecided.
- **Composer persistence.** Order, enabled, title and duplication still
  vanish on refresh; only scene content is saved.
