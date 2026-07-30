# NIP-47 Nostr Wallet Connect (NWC)

Code snippets for **Lightning payments over Nostr** using **NIP-47** (`nostr+walletconnect://…`).

**Synced:** 2026-07-30 — teaching extract from gittr’s browser NWC path (not a full wallet SDK).

**Canonical docs / source in gittr:**

- [gittr `NWC_IMPLEMENTATION_NOTES.md`](https://gittr.space/npub1n2ph08n4pqz4d3jk6n2p35p2f4ldhc5g5tu7dhftfpueajf4rpxqfjhzmc/gittr?file=ui/NWC_IMPLEMENTATION_NOTES.md&branch=main)
- [gittr `NIPS_AND_EVENT_KINDS.md` § NIP-47](https://gittr.space/npub1n2ph08n4pqz4d3jk6n2p35p2f4ldhc5g5tu7dhftfpueajf4rpxqfjhzmc/gittr?file=docs/NIPS_AND_EVENT_KINDS.md&branch=main)
- Production: `ui/src/lib/payments/nwc-balance.ts`, `nwc-connection-test.ts`, `ui/src/components/ui/payment-qr.tsx`, Settings → Account

**Not in scope:** the **gitnostr bridge** does not speak NWC. Payments stay **browser ↔ wallet relay**.

---

## NIP-46 vs NIP-47 (do not merge these)

| | **NIP-46 remote signer** | **NIP-47 NWC** |
|---|---|---|
| Job | Sign Nostr events (login, push, issues) | Control a Lightning wallet (`pay_invoice`, …) |
| URI | `bunker://` / `nostrconnect://` | `nostr+walletconnect://` |
| Envelope kinds | **24133** | **23194** (req) / **23195** (resp) |
| Key in URI | Pairing / ephemeral client session | Wallet **`secret`** (client key for the wallet only) |
| gittr UI | Login → Pair Remote Signer | Settings → Account (`gittr_nwc_send` / `gittr_nwc_recv`) |
| Helper snippet | [`nip46-remote-signer`](../nip46-remote-signer) | **this folder** |

They look similar (encrypted JSON-RPC on relays). They are **different protocols**. Products like **LNbits** can offer both — that is product adjacency, not a shared session in gittr.

**Zap overlap:** NIP-46 / NIP-07 may **sign** a NIP-57 zap request; NWC then **pays** the BOLT11 invoice with the NWC secret. Auth signs, wallet pays.

---

## Files in this snippet

| File | Role |
|------|------|
| `nwc-uri.ts` | Parse / validate `nostr+walletconnect://…` |
| `nwc-rpc.ts` | `nwcRpc`, `payInvoiceWithNwc`, `getBalanceWithNwc`, `probeNwcConnection` |

---

## Quick start

```typescript
import { parseNwcUri } from "./nwc-uri";
import { payInvoiceWithNwc, getBalanceWithNwc, probeNwcConnection } from "./nwc-rpc";

const uri = "nostr+walletconnect://<wallet-hex>?relay=wss://…&secret=<hex>";

const { ok, error } = await probeNwcConnection(uri);
if (!ok) throw new Error(error);

const { balanceSats } = await getBalanceWithNwc(uri); // may fail if wallet lacks get_balance
await payInvoiceWithNwc(uri, "lnbc1…");
```

Stub storage yourself (gittr uses secure storage / `localStorage` keys `gittr_nwc_send` and `gittr_nwc_recv`). **Never** send the NWC secret to your app server.

---

## Protocol facts (from production)

1. **Always use the relay in the NWC URI — not your app relay pool.**  
   Many clients only publish/subscribe NWC traffic on a hard-coded or “known good” relay set, and/or ignore `?relay=` from the connection string. That silently **locks out** wallets whose service only listens on a private/self-hosted/less-common relay (LNbits instances, Umbrel, custom bunkers, etc.).  
   **gittr does the opposite:** parse `relay` from `nostr+walletconnect://…` and open a **direct WebSocket to that URL** for kind `23194`/`23195`. We do **not** require that relay to be in Settings → Relays, and we do **not** fall back to damus/primal/etc. for payments. The URI is the source of truth for wallet transport (same idea as keeping NIP-46 on bunker URI relays).
2. **Request kind `23194`**: encrypt `{ method, params }` to the **wallet pubkey**, tag `["p", walletPubkey]`, sign with the URI **`secret`**.
3. **Response kind `23195`**: from the wallet; must include `["e", <request-event-id>]`. Ignore other responses.
4. Subscribe **before** publishing the request; filter client-side by `e` (relays often cannot filter `e` well).
5. Prefer **NIP-04**; if the wallet info event advertises `nip44_v2`, production gittr may use NIP-44 — this extract defaults to NIP-04 for simplicity.
6. Many wallets only implement **`pay_invoice`**. Treat missing `get_balance` as normal, not a broken URI.

---

## Related payments in helper-tools

- [`nip34-issue-bounties`](../nip34-issue-bounties) — LNURL-withdraw bounties (not NWC)
- [`nip34-push-paywall`](../nip34-push-paywall) — `push_cost_sats` on `30617` (backend can be LNbits; payer may use NWC in the client)

---

## Spec

- **NIP-47:** https://nips.nostr.com/47  
- **nwc.dev:** https://docs.nwc.dev  
- Optional SDK: `@getalby/sdk` (gittr implements the wire protocol directly for control / fewer deps)
