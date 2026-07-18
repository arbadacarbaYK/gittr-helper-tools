# Issue bounties — offer & take (kind 9806)

Implementation profile for **Lightning bounties on git issues**: **offer** (fund) and **take** (claim after merge) — discovery on relays, settlement on the **host**.

**Synced:** 2026-07-18 — matches gittr.space production happy path (`paid` → `released`; bounty-hunt still localStorage-only).  
**Production reference:** [gittr `NIPS_AND_EVENT_KINDS.md` §9806](https://github.com/arbadacarbaYK/gittr/blob/main/docs/NIPS_AND_EVENT_KINDS.md) · [help / bounty flow](https://gittr.space/help) · [gittr.space/bounty-hunt](https://gittr.space/bounty-hunt)  
**Ecosystem discussion:** [nostr-protocol/nips#2414](https://github.com/nostr-protocol/nips/issues/2414) (open) — **not** Resolvr [NIP-43 PR #865](https://github.com/nostr-protocol/nips/pull/865) (closed, not merged; different model).

## Relationship to other NIPs

| Spec | Status | Fit with gittr |
| ---- | ------ | -------------- |
| **[NIP-34](https://github.com/nostr-protocol/nips/blob/master/34.md)** | Merged | Issues `1621`, PRs `1618` — bounty **references** an issue |
| **[NIP-43 Bounties PR #865](https://github.com/nostr-protocol/nips/pull/865)** | **Closed, not merged** (Resolvr / ChristianChiarulli — **not** a gittr PR) | Replaceable bounty board + assignment/pledge — **not** LNURL-withdraw on NIP-34 issues |
| **[nips#2414](https://github.com/nostr-protocol/nips/issues/2414)** | Open (gittr) | Discussion for a NIP-34 companion / this profile |
| **This profile (9806)** | gittr production | Issue-scoped bounty; PR merge releases withdraw link |

**Where to discuss standardization:** [#2414](https://github.com/nostr-protocol/nips/issues/2414). Keep #865 as historical contrast only.

## Design principles

1. **Discovery on Nostr** — publish kind `9806` to repo relays (issue/PR pages do this).
2. **Enforcement on host** — LNURL-withdraw create/delete and merge detection are **client/host** responsibilities (like `push_cost_sats`).
3. **Payment rail is pluggable** — gittr uses **LNbits LNURL-withdraw** today; interop should describe withdraw semantics, not a wallet brand.
4. **Link to NIP-34 PR merge** — bounty releases when maintainer merges a PR linked to the issue.

## Event kind

- **Kind:** `9806` (gittr custom; relays need `allowed_kinds` inclusion)
- **Updates:** republish on status changes (same `e` issue + `repo` scope)
- **Settlement fields** live in **content JSON**, not in tags

## Canonical shape (gittr)

```json
{
  "kind": 9806,
  "pubkey": "<bounty-creator-hex>",
  "content": "{\"amount\":50000,\"status\":\"paid\",\"withdrawId\":\"…\",\"lnurl\":\"…\",\"withdrawUrl\":\"…\"}",
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

`claimed_by` appears after merge (release), not at offer time.

### Status lifecycle (production)

| Status | Meaning in gittr today | Who |
| ------ | ---------------------- | --- |
| `pending` | Mostly **cancel / cleared** path (issue closed without linked PR); offer rarely stays here | Offeror / host |
| `paid` | **Happy-path start:** LNURL-withdraw created; funds reserved; hunters can work | Offeror |
| `released` | Maintainer merged a linked PR; claimer may open `withdrawUrl` | Maintainer (merge) |
| `claimed` | Typed / optional UI; **not** the normal Nostr publish after redeem today | — |

**Happy path in production:** `paid` → `released` → claimer redeems the LNURL-withdraw URL (Sponsors / wallet). No required final `claimed` event.

Cancel: issue closed **without** linked PR → `DELETE` withdraw on host; local bounty cleared; often republish `9806` as `pending`.

### Offer (create bounty)

1. User has a Lightning wallet on the host (gittr: Settings → Account → LNbits).
2. On an issue, choose amount → host `POST /api/bounty/create-withdraw`.
3. Publish kind `9806` with **`status: "paid"`** immediately; content holds `amount`, `lnurl` / `withdrawUrl` / `withdrawId` (plus optional legacy `invoice` / `paymentHash`).
4. Tags: `e` → issue event id, `repo`, `status`, `p` creator.

### Take (claim after work)

1. Hunter opens a **PR** linked to the issue (NIP-34 `1618`).
2. Maintainer **merges** → client republishes `9806` with `status: "released"` and `["p", "<pr-author-hex>", "claimed_by"]`. Withdraw URL stays in content.
3. Claimer opens/redeems `withdrawUrl` (needs Lightning receive path / `lud16` as their wallet requires). gittr UI uses redeem URL + `check-withdraw`; `claim-withdraw` API exists but is not the primary UI path.

### Issue / PR linking

- Bounty `e` tag → NIP-34 issue (`1621`) event id.
- PR (`1618`) links to issue via NIP-34 tags.
- On merge: `released` + `claimed_by` = PR author.

## Client UX expectations

1. **Offer:** amount + fund CTA on issue detail; publish signed `9806` as `paid`.
2. **Take:** after merge, show released / claim for `claimed_by`; open LNURL-withdraw URL.
3. Per-issue sync: subscribe `{"kinds":[9806],"#e":[issueId]}` (and/or `#repo`).
4. **Global index:** gittr [bounty-hunt](https://gittr.space/bounty-hunt) is still **localStorage-only** today (reads `gittr_repos` / issue caches). A relay-wide `9806` index is planned — do not assume hunt UI discovers foreign bounties from relays yet.

## Relay configuration

Add `9806` to `allowed_kinds` (see gittr `NIPS_AND_EVENT_KINDS.md` for strfry / nostr-rs-relay examples).

## Host API (reference — gittr / LNbits)

Routes that matter in production:

- `POST /api/bounty/create-withdraw` — **offer:** reserve funds, LNURL-withdraw
- `POST /api/bounty/delete-withdraw` — cancel path
- `GET`/`POST` check-withdraw helpers — see whether withdraw was redeemed

Also present (optional / not primary UI):

- `POST /api/bounty/claim-withdraw`
- `POST /api/bounty/release`

Other hosts may use different backends if they honor the same **status + withdraw** semantics on events.

## Compatibility notes

- **Not** NIP-57 zaps — zaps are tips/receipts on `9735`; bounties are escrowed work rewards.
- **Not** the same as NIP-43 Resolvr replaceable bounty states (#865).
- Works **on top of** NIP-34; does not replace issue or PR kinds.

## Optional future standardization

If a second git client implements this profile:

- Propose optional section in NIP-34 **or** small companion NIP `9806` via [#2414](https://github.com/nostr-protocol/nips/issues/2414).
- Until then, this README is the stable interop document.

## Files

| File | Role |
| ---- | ---- |
| `bounty-event.ts` | Minimal event builder (reference) |

## References

- [nips#2414 — NIP-34 companion discussion](https://github.com/nostr-protocol/nips/issues/2414)
- [NIP-34 issues / PRs](https://github.com/nostr-protocol/nips/blob/master/34.md)
- [NIP-57 zaps](https://github.com/nostr-protocol/nips/blob/master/57.md) (different use case)
- [NIP-43 PR #865](https://github.com/nostr-protocol/nips/pull/865) (closed prior art; Resolvr)
- [gittr `createBountyEvent`](https://github.com/arbadacarbaYK/gittr/blob/main/ui/src/lib/nostr/events.ts)
