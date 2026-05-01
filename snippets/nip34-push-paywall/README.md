# NIP-34 Push Paywall Interop (`push_cost_sats`)

This snippet documents a practical, interoperable way to implement **pay-to-push** using existing Nostr primitives.

The goal is simple:
- discovery is done via Nostr events (portable across clients),
- enforcement is done by the repository host/bridge (not by relays).

## Scope

This is an **extension on top of NIP-34** repository metadata:
- base event kind: `30617` (repository announcement),
- optional tag: `push_cost_sats`.

It does **not** define a new NIP event kind for pull requests or payments.

## Canonical Event Surface

Publish push policy on the same replaceable repository event:

```json
{
  "kind": 30617,
  "pubkey": "<owner-hex-pubkey>",
  "content": "",
  "tags": [
    ["d", "my-repo"],
    ["name", "my-repo"],
    ["clone", "https://git.example/npub.../my-repo.git"],
    ["push_cost_sats", "2"]
  ]
}
```

### Tag semantics

- `push_cost_sats` missing: no push paywall.
- `push_cost_sats = 0`: no push paywall.
- `push_cost_sats > 0`: host requires payment authorization for each successful push.
- Value must be a base-10, non-negative integer string.

## Normalization Rules (important for interop)

When syncing to server policy storage:
- normalize owner pubkey to lowercase 64-char hex,
- use `d` tag value as repository identifier,
- reject missing/invalid `d` tag,
- treat invalid `push_cost_sats` as `0` (or reject update; document your choice).

## Recommended Host Enforcement Model

Relays do not enforce this. The git host/bridge must enforce:

1. Read latest owner-signed `30617` for repo.
2. Upsert policy into local storage, e.g.:
   - `RepositoryPushPolicy(OwnerPubKey, RepositoryName, PushCostSats, UpdatedAt)`.
3. During push (HTTP bridge push and/or SSH `git-receive-pack`):
   - if `PushCostSats <= 0`, allow,
   - if `PushCostSats > 0`, require a paid authorization intent,
   - consume one paid intent per successful push.

## Minimal HTTP API Pattern (reference)

You can expose host-specific endpoints such as:

- `GET /api/nostr/repo/push-payment?ownerPubkey=&repo=&payerPubkey=`
  - returns `pushCostSats`, `authorized`, and optional pending intent info.
- `POST /api/nostr/repo/push-payment` with `action=create_intent`
  - creates invoice and stores pending intent.
- push endpoint returns `402` when payment is required and no paid intent exists.

Example `402` shape:

```json
{
  "error": "Push payment required",
  "pushCostSats": 2,
  "details": "This repository requires a 2 sats payment for each push."
}
```

## Client UX Expectations

Any client that supports this extension should:
- read `push_cost_sats` from repo `30617`,
- pre-check authorization before push,
- present invoice QR when required,
- retry push after payment settles.

## Compatibility Notes

- This keeps repository compatibility anchored in NIP-34 (`30617`/`30618`).
- Legacy/custom PR kinds are unrelated; paywall is a **repository push policy**, not a PR protocol.
- Hosts may use different payment backends (LNbits, Blink, etc.) while preserving the same Nostr discovery tag.

## Optional Future Standardization

If the ecosystem converges, this extension can be proposed as:
- an "optional tags" addition to NIP-34 docs, or
- a small companion NIP describing `push_cost_sats` semantics + host enforcement expectations.

Until then, this document is a stable implementation profile other clients can adopt.
