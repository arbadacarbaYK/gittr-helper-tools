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

1. **Always use the relay(s) in the NWC URI — not your app relay pool.**  
   Many clients only publish/subscribe NWC traffic on a **fixed app relay pool** and/or **ignore `?relay=`**. That locks out wallets that only listen on the URI relay.  
   **gittr:** parse **all** `relay=` values (`getAll("relay")`) and open a **direct WebSocket** to those URLs for `23194`/`23195`. Alby often emits two (`relay.getalby.com` + `relay2.getalby.com`) — we try them in order. We do **not** require them in Settings → Relays and do **not** fall back to damus/primal for payments.
2. **NWC ≠ Nostr Connect.** `nostr+walletconnect://` is **payments** (Settings → Account). `bunker://` / `nostrconnect://` is **login** (Pair Remote Signer / Amber). Pasting an Alby NWC string into Amber’s “Nostr Connect” paste shows **“Invalid nostr connect URI”** — correct for Amber; wrong place for NWC.
3. **Request kind `23194`**: encrypt `{ method, params }` to the **wallet pubkey**, tag `["p", walletPubkey]`, sign with the URI **`secret`**.
4. **Response kind `23195`**: from the wallet; must include `["e", <request-event-id>]`. Ignore other responses.
5. Subscribe **before** publishing the request; filter client-side by `e`.
6. Prefer **NIP-04**; production may use NIP-44 when the wallet advertises it — this extract defaults to NIP-04.
7. Many wallets only implement **`pay_invoice`**. Treat missing `get_balance` as normal.

---

## Related payments in helper-tools

- [`nip34-issue-bounties`](../nip34-issue-bounties) — LNURL-withdraw bounties (not NWC)
- [`nip34-push-paywall`](../nip34-push-paywall) — `push_cost_sats` on `30617` (backend can be LNbits; payer may use NWC in the client)

---

## Spec

- **NIP-47:** https://nips.nostr.com/47  
- **nwc.dev:** https://docs.nwc.dev  
- Optional SDK: `@getalby/sdk` (gittr implements the wire protocol directly for control / fewer deps)
