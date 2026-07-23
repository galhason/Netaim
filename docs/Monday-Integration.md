# Hason — monday.com Integration

Status: v1 (outbound) delivered 2026-07-16. Built on the reserved `RegistrationOutboundGateway` seam (Registration-Architecture §16) — no engine or architecture change.

## What it does today (outbound: Hason → monday)

When someone registers for an event, Hason creates an **item on your monday board** for that registration. It runs entirely through the existing registration event bus — the Registration Engine emits, the monday subscriber reacts, exactly like the notification outbox. It never blocks or slows a registration; if monday is unreachable, the registration still succeeds.

- One item per registration, created on the initial outcome (registered / awaiting approval / waiting list).
- The item name is `{participant name} · {event slug}`; an update note carries the status and email.
- Works with **any** board — no column mapping needed for v1.

## How to enable

Set two environment variables (leave blank to keep it off):

```
MONDAY_API_TOKEN=<your monday API v2 token>
MONDAY_BOARD_ID=<the target board id>
```

Get the token from monday: Avatar → Developers → My access tokens. The board id is in the board URL. With these unset, the integration is completely inert — the platform behaves identically.

## Boundaries and the open decision

- **Direction.** v1 is **outbound** (registrations flow *into* monday for the organization to operate). Your request — "register for lectures through monday" — could also mean **inbound** (people register *inside* monday and it syncs into Hason). Inbound is buildable on the reserved `RegistrationInboundGateway`, but it needs your board's structure (which columns map to name / email / event / status) and a sync trigger (a monday webhook, or a scheduled import). Tell me the board layout and direction and I'll wire it.
- **Status updates.** Later status changes (approved / declined / promoted / cancelled) don't yet update the same item — that needs the monday item id stored on the registration. A small following increment.
- **Per-event board.** v1 uses one board (env). Per-event or per-organization board selection is a natural next step once you decide how you want events mapped to boards.

## Where it lives

- `src/infrastructure/monday/monday-client.ts` — the GraphQL client (create item, post update).
- `src/infrastructure/monday/monday-registration-subscriber.ts` — the event handler.
- Wired at the composition root (`src/infrastructure/index.ts`) alongside the notification subscriber.

Nothing above `src/infrastructure` knows monday exists — it's an infrastructure adapter behind the domain event, so it can be replaced or removed without touching the product.
