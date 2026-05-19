# NIP-46 Remote Signer Integration

Code snippets for implementing **NIP-46** (remote signing) in a Nostr **web client**, so users can pair **Amber**, **Nowser**, **LNbits remote signer**, self-hosted **bunker**, etc., without putting the user’s **nsec** in the page.

**Canonical docs (keep in sync with production):**

- [gittr `NIP46_REMOTE_SIGNER_INTEGRATION.md`](https://github.com/arbadacarbaYK/gittr/blob/main/docs/NIP46_REMOTE_SIGNER_INTEGRATION.md) — full architecture and URI notes  
- [gittr `NIPS_AND_EVENT_KINDS.md` § NIP-46](https://github.com/arbadacarbaYK/gittr/blob/main/docs/NIPS_AND_EVENT_KINDS.md) — how gittr lists support  
- Source of truth: [`gittr/ui/src/lib/nostr/remoteSigner.ts`](https://github.com/arbadacarbaYK/gittr/blob/main/ui/src/lib/nostr/remoteSigner.ts)

**Not in scope:** the **gitnostr bridge** does not speak NIP-46. Pairing is entirely between **browser ↔ signer** on relays; the bridge only consumes normal signed events.

---

## `remote-signer.ts` (snippet)

Classes and functions for pairing via NIP-46 and exposing a **NIP-07-compatible** adapter.

**What it does:**

- Parses **`bunker://`** and **`nostrconnect://`** URIs (different host semantics — see below)
- Manages client keys, subscriptions, encrypted kind **`24133`** RPC
- Exposes NIP-07-shaped `window.nostr` (signEvent, nip04, nip44, getPublicKey, …)
- Persists session in `localStorage` for reconnection

**Usage:**

```typescript
import { RemoteSignerManager, parseRemoteSignerUri } from "./remote-signer";

const config = parseRemoteSignerUri("bunker://<remote-hex>?relay=wss://...");

const manager = new RemoteSignerManager({
  publish: (event, relays) => {
    /* publish to relays */
  },
  subscribe: (filters, relays, onEvent) => {
    /* subscribe */
    return () => {};
  },
  addRelay: (url) => {},
  removeRelay: (url) => {},
});

const { session, npub } = await manager.connect(uri);
const signedEvent = await window.nostr.signEvent(unsignedEvent);
```

---

## URI formats (read carefully)

### `bunker://`

- **Host** = **remote signer** pubkey (64-hex).
- Client often generates a **new** ephemeral keypair for the session (unless your product standardizes otherwise).

### `nostrconnect://`

- **Host** = **client** pubkey for this pairing session **(not the signer’s pubkey)**.
- **Signer** pubkey is unknown until you receive the first valid **`24133`** addressed to the client (`#p` = client pubkey); the **author** of that event becomes `remotePubkey`.
- Treat `secret` as an opaque **challenge** (not a private key). Store the ephemeral client key locally (indexed by client pubkey), then require `result === secret` on the first decrypted `24133` before trusting signer identity.

Wrong mental model (breaks Amber / QR): treating `nostrconnect` host as the signer like `bunker`.

---

## Connection flow (simplified)

1. Parse URI → relays, mode (`bunker` | `nostrconnect`), keys.
2. **Add relays** and **subscribe** to `kind: 24133` with `#p` = **client** pubkey (for nostrconnect, before you know the signer).
3. Send **`connect`** (and follow-up RPC) inside encrypted **`24133`** payloads.
4. Complete handshake → `userPubkey`, then replace `window.nostr` with adapter.

---

## Implementation learnings (production)

These are the issues that show up as “I approved on the phone and **nothing happened**”:

1. **Subscribe before the phone sends**  
   If the user scans the QR and the signer publishes the first reply **before** your client subscribes (or connects relays), you miss the event. **Start the session as soon as you mint the URI** (e.g. when showing QR), not only on a second button press with stale state.

2. **React state vs token**  
   If “Pair & Login” reads only React state, it can run **one tick** before `setState` fills the token. Keep the latest nostrconnect string in a **ref** (or pass the token directly into `connect()`).

3. **`nostrconnect` host ≠ signer**  
   Using the URI host as `remotePubkey` encrypts to the wrong key; pairing stalls or timeouts.

4. **JSON-RPC `id` mismatches**  
   Some wallets reply with an `id` that does not match the pending request. A strict `pending.get(message.id)` never resolves even when decrypt succeeds. You may need a **careful** fuzzy match (e.g. single pending `connect`, success-shaped `result`).

5. **Relays**  
   NIP-46 needs a path on **WSS** between client and signer. If your app’s relay list is dead or blocks `24133`, pairing fails silently apart from reconnect logs.

6. **Permissions / “create new connection”**  
   Wallets may ask to create a **new** NIP-46 connection for each URI; that is normal when the client pubkey is new.

7. **Security**  
   Never place client private keys in the URI. Keep them local, treat `secret` as a challenge string, and only accept signer identity after explicit challenge match.

---

## NIP-07 adapter

After pairing, the adapter should implement what your app already calls:

- `getPublicKey()`, `signEvent`, `getRelays?`, `nip04`, `nip44`, etc.

Preserve the previous `window.nostr` and restore it on disconnect so extension users are not broken permanently.

---

## Critical notes (tooling)

1. Use **`generatePrivateKey()`** from `nostr-tools` when generating ephemeral keys (returns hex; aligns with `nip04` helpers).
2. **Preserve original `window.nostr`** before patching; restore on teardown.
3. **Synchronous session read** from `localStorage` on boot avoids login flicker.

---

## Compatibility

Targets **NIP-46** signers that use **`bunker://`** or **`nostrconnect://`** and kind **`24133`** on common relays.

---

## References

- **NIP-46:** https://nips.nostr.com/46  
- **NIP-07:** https://nips.nostr.com/07  
- **NIP-04 / NIP-44:** encryption inside `24133` content  

**Extracted from:** `gittr/ui/src/lib/nostr/remoteSigner.ts` (keep snippet aligned when porting)
