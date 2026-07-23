# Hason Studio — Release 0.8 Reviews

Companion to Studio-Workspace-Architecture.md and Development-Report-08.md. Four reviews against the twelve objectives of the Studio Experience brief.

## Navigation Review (Objectives 1, 2, 4)

Before 0.8 the Studio had two flat navs: a global row of areas and, inside an event, a wrapping row of tabs with no active state. Both were correct and both read as "software with menus."

After 0.8 navigation is a journey:

- The **global chrome** stays as *place* (five areas, language, creator). It is intentionally quiet and rarely returned to.
- The **event workspace** is entered through a **scope line** — `Studio › Events › {event}` — that answers "where am I" on every workspace surface and gives one-tap return to each ancestor. It is a reading line, not a menu.
- The workspace's **stable side journey** (Overview → Experience → People → Venue → Media → Launch) replaces the tab row. Order is fixed and chronological; the active area is now marked with `aria-current` (previously absent — a real accessibility gap, now closed). The phase's creative focus sits above the journey so the surface always states its purpose.

Judgement: the organizer moves *through* an event rather than *between* screens. The one remaining navigation cost — no in-workspace search yet — is intentional (foundation only, §5). Home is now a place one leaves and rarely re-enters, which is the brief's Objective 4.

## Workflow Review (Objective 11)

Walking the full organizer journey — create → build → people → place → prepare → launch:

- **Create → build**: creating an event already redirects straight into its workspace (server action `createEventAction` → `redirect`). No extra click; unchanged and kept.
- **Home → continue**: Home's "Continue creating" links directly to the active event; "Needs attention" states the exact next step in a sentence with its destination. The organizer's morning is one glance, one click.
- **Within the workspace**: the side journey removes the "return to a hub to switch area" round-trip. Every area is one tap from every other.
- **Launch**: unchanged and deliberately so — one confident action, gated on zero blockers, reachable from a phone.

Friction removed: the dead-end generic empty states ("Quiet for now.") that told the organizer nothing. Every empty surface now names the next step. Friction *not* added: no new modals, no wizards, no confirmation interstitials.

Remaining friction, logged not fixed (needs its engine): switching between events still routes through the Events list; the command palette will collapse that to a keystroke when its UI lands (§5).

## Creative Review (Objective 12)

Against the four questions the brief asks:

- *Comfortable after eight hours?* The surfaces hold the same stone/serif/one-accent restraint; the side journey is calm typography, not a control panel; nothing blinks or counts. Reduced tiredness is the design intent, preserved.
- *Calm for a first-timer?* Empty states teach rather than confront; the scope line means one is never lost; the phase focus line says what this moment is for.
- *Fast for an expert?* The journey is stable muscle memory; Home surfaces the exact next action; the (coming) palette is architected. 0.8 makes the expert faster structurally without cluttering the novice.
- *Does the interface disappear?* Closer. The remaining visible seams — no live search, no cross-event jump — are the honest edges of a foundation-only release, not clutter.

No icons were added for decoration (Constitution). Hierarchy is carried by type and whitespace; status is language, never badges.

## Product Review (Objectives 3, 7, 8, 9, 10)

- **Home (3)**: answers only its four questions; no charts, no widgets. "Recently" is honest — it teaches until the Audit engine gives it a real source, rather than faking a feed.
- **Empty states (7)**: first-class, teaching, bilingual constants, one quiet component. The generic "no data" line is deleted from the codebase.
- **Notifications (8)**: no center, no bell. Decision-changing information lives where the decision is made (Home attention, Overview, Launch). Silence is the default. Documented as doctrine in the architecture.
- **Adaptive Studio (9)**: desktop creates, tablet edits, mobile manages — expressed structurally (side rail ↔ wrapping row, 44px targets, single-column-first), not by shrinking. Launch-from-phone stays first-class.
- **Studio language (10)**: the workspace "Composer" is renamed **Experience** to match the approved IA; no technical vocabulary reaches the surface; every string bilingual. Full audit found no "collection/record/field/slug" leakage in organizer-facing copy.

Verdict: 0.8 delivers the experience layer the IA promised, adds no engine, and touches no approved contract. It reads as one continuous workspace with two honest, documented gaps (search UI, palette UI) that are architected and scheduled.
