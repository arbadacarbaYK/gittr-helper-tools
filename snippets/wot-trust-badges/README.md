# Web of Trust trust badges (viewer-relative)

Implementation profile for showing **hop distance** next to Nostr identities in a Nostr Git client.

**Production reference:** [gittr `docs/WOT.md`](https://github.com/arbadacarbaYK/gittr/blob/main/docs/WOT.md) · [gittr.space](https://gittr.space)

## Problem

Users need a lightweight signal: *“How close is this person to me in the follow graph?”* without a global reputation score.

## Scope

- **UI only** — does not replace gittr-native trust (merges, bounties paid, contributions).
- **Viewer-relative** — badge text is from the logged-in user's perspective.
- **Optional oracle** — do not hard-depend on third-party WoT servers.

## Data source priority

1. **`window.nostr.wot.getDistance()`** — [nostr-wot extension](https://nostr-wot.com/download) when installed ([NIPs discussion #2236](https://github.com/nostr-protocol/nips/issues/2236))
2. **Kind 3 follow list** — direct follows → 1 hop (“In your network”)
3. **WoT Oracle REST** (optional) — proxied server-side to avoid CORS; public `wot-oracle.mappingbitcoin.com` is often down — treat as enhancement only

## Badge labels

| Hops (viewer → target) | Label |
| ---------------------- | ----- |
| 1 | In your network |
| 2+ | N hops from you |
| unreachable | Outside your network |
| viewer = target (own profile) | Followers see: In their network |

Hide badge when logged out (or show em dash if you want).

## Where to show (gittr Phase 1)

- Profile header `/{npub}`
- Repo owner name
- Issue author, `/apps` publisher, bounty-hunt author
- **Not** on explore/home repo cards (noise)

## Relay / host notes

- No new event kinds required for Phase 1.
- Oracle is **not** required for “In your network” when you already load the viewer's kind 3.

## Adoption reality (2026)

WoT tooling (extension, oracle, SDK) is **real but niche** (~7 GitHub stars on meta repo; public oracle documented as dev/test). Mapping Bitcoin is the main listed adopter besides clients that inject badges via the extension.

gittr publishes trust badges using extension + kind 3 first; oracle is best-effort.

## Optional future

- Self-hosted oracle on your infra
- NIP-85 kind `10040` when standardized
- Labeled third-party providers (not primary)

## Files

| File | Role |
| ---- | ---- |
| `wot-labels.ts` | Pure label + CSS class helpers (copy into your app) |

## References

- [nostr-wot.com docs](https://nostr-wot.com/docs)
- [gittr TrustBadge component](https://github.com/arbadacarbaYK/gittr/blob/main/ui/src/components/ui/trust-badge.tsx)
