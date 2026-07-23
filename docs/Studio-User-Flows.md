# Hason Studio — User Flows

Extends the role model of CMS-Blueprint §9 with two roles from the Studio brief (Volunteer Manager, Reviewer). Permissions remain code-defined; grants are scoped (platform / organization / event).

## Roles

| Role | Scope | Responsibilities | Studio surface | Daily workflow | Approval role |
|---|---|---|---|---|---|
| Platform Owner | Platform | Provisioning organizations, locale registry, platform health | Platform area + read-everything | Reviews platform activity; rarely daily | none (governance) |
| Organization Admin | Org | Team, roles, brand, libraries, all events | Full org Studio | Morning: Home "needs attention"; manages members, approves publishing when configured | final approver |
| Event Manager | Event(s) | The event end to end: build, program, publish, run | Full event workspace | Lives in Experience + Program; publishes; watches readiness | approves content submissions |
| Content Editor | Event(s) | Content and translations | Experience, Program (content), Library (media, people) | Writes, translates, submits for review | submits |
| Registration Manager | Event(s) | Registrations, capacity, waitlist, check-in | Registration, Participants, Updates | Reviews approvals queue, resolves waitlist, runs check-in | approves registrations |
| Volunteer Manager | Event(s) | Volunteer staffing and assignments | Participants (volunteers view), Program (assignments) | Assigns shifts/rooms, tracks presence | approves volunteer sign-ups |
| Reviewer | Org or Event | Quality gate before publish | Read of drafts + review actions | Reviews queue: approve / return with note | approves content |
| Read Only | Org or Event | Oversight | Everything visible, nothing editable | Reads Insights and Overviews | none |

Volunteer Manager introduces a domain extension (volunteers as participant subtype with assignments) — recorded in Open-Questions.md for domain approval.

## Event lifecycle (challenged)

The brief's ten steps compress to six organizer moments — venue configuration and profile selection are properties of creation, not stages; "registration opens" is a publishing property, not a step:

```
Create   name, dates, template, experience profile (one screen, all optional but name)
Build    experience + program + people + venue (the workspace; any order)
Preview  the real experience, all devices/locales/draft states
Review   optional per organization (approved earlier); Reviewer or Event Manager
Launch   the experience goes live; registration opens per its own schedule setting
Run      during-event mode; then Archive (automatic after end date, reversible)
```

## Experience Composer flow (the heart)

One screen, three zones: **the journey** (a start-side column of scene chapters — reorder by drag, add from the scene library, disable without deleting), **the stage** (the real rendered experience, scrolled to the selected scene), **the panel** (the selected scene's content — only relevant controls; content fields first, presentation variant second, never technical config).

- **Editing**: changing a field updates the stage instantly (draft state). Photography is chosen from the Library with focal-point control.
- **Ordering**: drag in the journey column; the stage reflows. No layout mathematics exposed.
- **Localization**: a language switch at the top of the panel; per-scene completion shown as quiet dots in the journey column; "outdated" flagged when the source locale changed (CMS-Blueprint §8).
- **History**: every save is a version; the panel offers "history" per scene and per experience — restore creates a new draft, never rewrites.
- **Templates**: "Start from template" at creation; "Save as template" from any experience (copy-on-use, never live-linked — approved).
- **Launch**: launching the experience is one confident action from the composer; it shows what will change (diff in human language: "3 scenes updated, hero photo replaced"); respects the review gate when enabled.

Why this shape: the composer's journey column keeps the narrative visible (scenes as chapters, the Master Direction's own grammar); the live stage removes the CMS preview gap; the single panel prevents form-forests.

## Experience Preview (beyond preview)

A dedicated mode from anywhere in the workspace: instant switching of device frame (desktop/tablet/mobile), direction (RTL/LTR via locale), locale, and content state (draft/published) — all client-side against the same engine, so switching is immediate. Shareable preview links use the existing draft-mode foundation with expiring tokens.

## Approval flow

Content: Editor submits → Reviewer/Event Manager sees it in Home "needs attention" → approve (moves to publishable) or return with a note (returns to the editor's Continue). Registration: automatic or managed per event — managed mode routes each registration to the Registration Manager's queue with one-line context. All approvals are sentences with two actions, never grids.
