# NIP-34 issue bounties (kind 9806)

Implementation profile for **Lightning bounties on git issues** — portable discovery on relays, settlement on the **host** (not relays).

**Synced:** 2026-07-18 — content JSON includes `invoice` + `paymentHash` (legacy) alongside LNURL-withdraw fields.  
**Production reference:** [gittr `NIPS_AND_EVENT_KINDS.md` §9806](https://github.com/arbadacarbaYK/gittr/blob/main/docs/NIPS_AND_EVENT_KINDS.md) · [help / bounty flow](https://gittr.space/help) · [gittr.space/bounty-hunt](https://gittr.space/bounty-hunt)

## Relationship to other NIPs

| Spec | Status | Fit with gittr |
| ---- | ------ | -------------- |
| **[NIP-34](https://github.com/nostr-protocol/nips/blob/master/34.md)** | Merged | Issues `1621`, PRs `1618` — bounty **references** an issue |
| **[NIP-43 Bounties PR #865](https://github.com/nostr-protocol/nips/pull/865)** | **Closed, not merged** (Resolvr) | Different model: replaceable bounty board, assignment states, pledge flow — **not the same** as gittr's LNURL-withdraw on NIP-34 issues |
| **This profile (9806)** | gittr production | Issue-scoped bounty, PR merge releases withdraw link |

**Where to discuss standardization:** open a **new** [nostr-protocol/nips issue](https://github.com/nostr-protocol/nips/issues) titled *“NIP-34 companion: issue bounties (kind 9806)”* and link here — do not assume NIP-43 will merge. Comment on #865 only to cross-link the two approaches.

## Design principles

1. **Discovery on Nostr** — publish kind `9806` to repo relays.
2. **Enforcement on host** — LNURL-withdraw creation, merge detection, cancel on close-without-PR are **client/host** responsibilities (like `push_cost_sats`).
3. **Payment rail is pluggable** — gittr uses **LNbits LNURL-withdraw** today; spec should describe **LNURL-withdraw semantics**, not a single wallet brand.
4. **Link to NIP-34 PR merge** — bounty releases when maintainer merges a PR linked to the issue (trust model: repo owner decides validity).

## Event kind

- **Kind:** `9806` (gittr custom; request relay `allowed_kinds` inclusion)
- **Replaceable:** keyed by issue — use `e` tag (issue event id) + `repo` scope; publish updates on status changes

## Canonical shape (gittr)

```json
{
  "kind": 9806,
  "pubkey": "<bounty-creator-hex>",
  "content": "{\"amount\":50000,\"status\":\"paid\",\"withdrawId\":\"…\",\"lnurl\":\"…\"}",
  "tags": [
    ["e", "<issue-event-id-hex>", "", "issue"],
    ["repo", "<entity>", "<repo-name>"],
    ["status", "paid"],
    ["p", "<creator-hex>", "creator"],
    ["p", "<claimer-hex>", "claimed_by"]
  ],
  "created_at": 1710000000
}
```

### Status lifecycle

| Status | Meaning |
| ------ | ------- |
| `pending` | Bounty created; funding in progress |
| `paid` | Funds reserved; hunters can work |
| `released` | Maintainer merged linked PR; withdraw link active for claimer |
| `claimed` | Claimer received sats via LNURL-withdraw |

Cancel path: issue closed **without** linked PR → withdraw link deleted, bounty cancelled (host notifies creator).

### Issue / PR linking

- Bounty `e` tag → NIP-34 issue (`1621`) event id (preferred) or client-local id during offline import (hosts should normalize to event id when known).
- PR (`1618`) links to issue via NIP-34 PR tags (see gittr issue/PR UI).
- On merge: host updates bounty to `released`, sets `claimed_by` to PR author.

## Client UX expectations

Any client implementing this profile should:

1. Show bounty amount + status on issue detail.
2. Publish signed `9806` on create / status change.
3. Subscribe to `{"kinds":[9806],"#e":[issueId]}` (and/or `#repo`) for cross-client sync.
4. Global bounty index: aggregate `9806` + open `1621` (gittr bounty-hunt is moving toward relay subscription).

## Relay configuration

Add `9806` to `allowed_kinds` (see gittr `NIPS_AND_EVENT_KINDS.md` for strfry / nostr-rs-relay examples).

## Host API (reference — gittr / LNbits)

gittr server routes (implementation-specific):

- `POST /api/bounty/create` — reserve funds, create LNURL-withdraw
- `POST /api/bounty/claim-withdraw` — claimer redeems after `released`

Other hosts may use different backends if they honor the same **status + withdraw** semantics on events.

## Compatibility notes

- **Not** NIP-57 zaps — zaps are tips/receipts on `9735`; bounties are escrowed work rewards.
- **Not** the same as NIP-43 Resolvr replaceable bounty states.
- Works **on top of** NIP-34; does not replace issue or PR kinds.

## Optional future standardization

If a second git client implements this profile:

- Propose optional section in NIP-34 **or** small companion NIP `9806`.
- Until then, this README is the stable interop document.

## Files

| File | Role |
| ---- | ---- |
| `bounty-event.ts` | Minimal event builder (reference) |

## References

- [NIP-34 issues / PRs](https://github.com/nostr-protocol/nips/blob/master/34.md)
- [NIP-57 zaps](https://github.com/nostr-protocol/nips/blob/master/57.md) (different use case)
- [gittr `createBountyEvent`](https://github.com/arbadacarbaYK/gittr/blob/main/ui/src/lib/nostr/events.ts)
