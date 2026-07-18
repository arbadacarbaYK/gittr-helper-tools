# Issue bounties — offer & take (kind 9806)

Implementation profile for **Lightning bounties on git issues**: **offer** (fund) and **take** (claim after merge) — discovery on relays, settlement on the **host**.

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

| Status | Meaning | Who |
| ------ | ------- | --- |
| `pending` | Created; funding in progress | Offeror |
| `paid` | Funds reserved (LNURL-withdraw ready); hunters can work | Offeror |
| `released` | Maintainer merged a PR linked to the issue; claimer may withdraw | Maintainer (merge) |
| `claimed` | Claimer received sats via LNURL-withdraw | Taker |

Cancel path: issue closed **without** linked PR → withdraw deleted; bounty cancelled / republished as `pending` (host-specific).

### Offer (create bounty)

1. User has a Lightning wallet on the host (gittr: Settings → Account → LNbits).
2. On an issue, choose amount → host creates **LNURL-withdraw** from that wallet.
3. Publish kind `9806` with `status: "paid"` (or `pending` then `paid`), content holding `amount`, `lnurl` / `withdrawUrl` / `withdrawId`.
4. Tags: `e` → issue event id, `repo`, `status`, `p` creator.

### Take (claim after work)

1. Hunter opens a **PR** linked to the issue (NIP-34 `1618`).
2. Maintainer **merges** the PR → client/host republishes `9806` with `status: "released"` and `["p", "<pr-author-hex>", "claimed_by"]`. Withdraw URL stays in content.
3. Claimer (PR author) redeems LNURL-withdraw (needs `lud16` / LNURL on kind 0 profile). Host API example: `POST /api/bounty/claim-withdraw`.
4. Optional final publish `status: "claimed"`.

### Issue / PR linking

- Bounty `e` tag → NIP-34 issue (`1621`) event id.
- PR (`1618`) links to issue via NIP-34 PR tags.
- On merge: update bounty to `released`, set `claimed_by` to PR author.

## Client UX expectations

1. **Offer:** show amount + fund CTA on issue detail; publish signed `9806`.
2. **Take:** show “released / claim” for `claimed_by` after merge; redeem LNURL-withdraw.
3. Subscribe to `{"kinds":[9806],"#e":[issueId]}` (and/or `#repo`) for sync.
4. Global index: aggregate `9806` + open issues (gittr [bounty-hunt](https://gittr.space/bounty-hunt)).

## Relay configuration

Add `9806` to `allowed_kinds` (see gittr `NIPS_AND_EVENT_KINDS.md` for strfry / nostr-rs-relay examples).

## Host API (reference — gittr / LNbits)

Implementation-specific routes:

- `POST /api/bounty/create` / `create-withdraw` — **offer:** reserve funds, LNURL-withdraw
- `POST /api/bounty/claim-withdraw` — **take:** claimer redeems after `released`
- `POST /api/bounty/delete-withdraw` — cancel path
- `POST /api/bounty/release` — optional host helper around merge release

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
