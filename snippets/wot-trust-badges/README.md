# Web of Trust trust badges (viewer-relative)

Implementation profile for showing **hop distance** next to Nostr identities in a Nostr Git client.

Hop distance comes from [Leon Acosta](https://github.com/leonacostaok)’s [Nostr Web of Trust](https://github.com/nostr-wot/nostr-wot): the [browser extension](https://github.com/nostr-wot/nostr-wot-extension) (`window.nostr.wot`) and the [oracle](https://github.com/nostr-wot/nostr-wot-oracle). gittr only shows that distance.

**Synced:** 2026-10-06 — label helpers copied from gittr's integration. This folder is not the source of Web of Trust.

**Where the logic lives (gittr):**

- [`ui/src/lib/nostr/wot.ts`](https://gittr.space/npub1n2ph08n4pqz4d3jk6n2p35p2f4ldhc5g5tu7dhftfpueajf4rpxqfjhzmc/gittr?file=ui/src/lib/nostr/wot.ts&branch=main) — distance resolution and labels (`wotLabel`, `wotResultLabel`, `wotBadgeClassName`)
- [`ui/src/lib/nostr/useWoTDistance.ts`](https://gittr.space/npub1n2ph08n4pqz4d3jk6n2p35p2f4ldhc5g5tu7dhftfpueajf4rpxqfjhzmc/gittr?file=ui/src/lib/nostr/useWoTDistance.ts&branch=main) — React hook
- [`ui/src/components/ui/trust-badge.tsx`](https://gittr.space/npub1n2ph08n4pqz4d3jk6n2p35p2f4ldhc5g5tu7dhftfpueajf4rpxqfjhzmc/gittr?file=ui/src/components/ui/trust-badge.tsx&branch=main) — badge UI
- [`ui/src/pages/api/wot/distance.ts`](https://gittr.space/npub1n2ph08n4pqz4d3jk6n2p35p2f4ldhc5g5tu7dhftfpueajf4rpxqfjhzmc/gittr?file=ui/src/pages/api/wot/distance.ts&branch=main) — oracle proxy
- Write-up: [gittr `docs/WOT.md`](https://github.com/arbadacarbaYK/gittr/blob/main/docs/WOT.md) · [gittr.space](https://gittr.space)

## Problem

Users need a lightweight signal: *“How close is this person to me in the follow graph?”* without a global reputation score.

## Scope

- **UI only** — does not replace gittr-native trust (merges, bounties paid, contributions).
- **Viewer-relative** — badge text is from the logged-in user's perspective.
- **Optional oracle** — do not hard-depend on third-party WoT servers.

## Data source priority

Same order as gittr `wot.ts` / `docs/WOT.md`:

1. **Kind 3 follow list** — direct follows → 1 hop (“In your network”), including the local backup the Follow button uses. No oracle wait.
2. **`window.nostr.wot.getDistance()`** — [nostr-wot extension](https://nostr-wot.com/download) when installed and the active identity matches the login ([NIPs discussion #2236](https://github.com/nostr-protocol/nips/issues/2236)). A successful `null` is **Distance unknown**, not Outside.
3. **WoT Oracle REST** (optional) — proxied server-side to avoid CORS; public `wot-oracle.mappingbitcoin.com` is often down. A failure stays **Distance unknown**.

## Badge labels

| Hops (viewer → target) | Label |
| ---------------------- | ----- |
| 1 | In your network |
| 2+ | N hops from you |
| unreachable (oracle found no path) | Outside your network |
| lookup down, or extension returned null | Distance unknown |
| viewer = target (own profile) | Followers see: In their network |

Hide badge when logged out (or show em dash if you want).

## Where to show (gittr Phase 1)

- Profile header `/{npub}`
- Repo owner name
- Issue author, `/apps` publisher, `/pages` author, bounty-hunt author
- **Not** on explore/home repo cards (noise)

## Relay / host notes

- No new event kinds required for Phase 1.
- Oracle is **not** required for “In your network” when you already load the viewer's kind 3.

## What to copy

`wot-labels.ts` is only the label helpers (`wotLabel`, `wotResultLabel`, `wotBadgeClassName`). Hop lookup, the kind-3 backup, the extension identity check, and the oracle proxy stay in the gittr files listed at the top. Direct follows and `window.nostr.wot` are primary. The oracle is optional.

## Optional future

- Self-hosted oracle on your infra
- NIP-85 kind `10040` when standardized
- Labeled third-party providers (not primary)

## Files

| File | Role |
| ---- | ---- |
| `wot-labels.ts` | Label helpers copied from gittr `wot.ts`. Not the distance lookup. |

## References

- [Leon Acosta](https://github.com/leonacostaok) — [Nostr Web of Trust](https://github.com/nostr-wot/nostr-wot), [extension](https://github.com/nostr-wot/nostr-wot-extension), [oracle](https://github.com/nostr-wot/nostr-wot-oracle)
- [nostr-wot.com docs](https://nostr-wot.com/docs)
- [gittr TrustBadge component](https://github.com/arbadacarbaYK/gittr/blob/main/ui/src/components/ui/trust-badge.tsx)
