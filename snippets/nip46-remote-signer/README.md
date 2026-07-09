# NIP-46 Remote Signer Integration

Code snippets for implementing **NIP-46** (remote signing) in a Nostr **web client**, so users can pair **Amber**, **Nowser**, **LNbits remote signer**, self-hosted **bunker**, etc., without putting the user’s **nsec** in the page.

**Canonical docs (keep in sync with production):**

- [gittr `NIP46_REMOTE_SIGNER_INTEGRATION.md`](https://gittr.space/npub1n2ph08n4pqz4d3jk6n2p35p2f4ldhc5g5tu7dhftfpueajf4rpxqfjhzmc/gittr?file=docs/NIP46_REMOTE_SIGNER_INTEGRATION.md&branch=main) — full architecture and URI notes  
- [gittr `NIPS_AND_EVENT_KINDS.md` § NIP-46](https://gittr.space/npub1n2ph08n4pqz4d3jk6n2p35p2f4ldhc5g5tu7dhftfpueajf4rpxqfjhzmc/gittr?file=docs/NIPS_AND_EVENT_KINDS.md&branch=main) — how gittr lists support  
- Source of truth: [`gittr/ui/src/lib/nostr/remoteSigner.ts`](https://gittr.space/npub1n2ph08n4pqz4d3jk6n2p35p2f4ldhc5g5tu7dhftfpueajf4rpxqfjhzmc/gittr?file=ui/src/lib/nostr/remoteSigner.ts&branch=main) + [`signer.ts`](https://gittr.space/npub1n2ph08n4pqz4d3jk6n2p35p2f4ldhc5g5tu7dhftfpueajf4rpxqfjhzmc/gittr?file=ui/src/lib/nostr/signer.ts&branch=main)

**Not in scope:** the **gitnostr bridge** does not speak NIP-46. Pairing is entirely between **browser ↔ signer** on relays; the bridge only consumes normal signed events.

---

## Files in this snippet

| File | Role |
|------|------|
| `remote-signer.ts` | Simplified pairing manager + NIP-07 adapter (reference extract) |
| `signer-resolver.ts` | **Unified signing** — use for push, issues, profile, SSH keys, etc. |

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

await manager.ensureBootstrapped(); // safe on page load and before signing
const { session, npub } = await manager.connect(uri);
const signedEvent = await window.nostr.signEvent(unsignedEvent);
```

---

## `signer-resolver.ts` — sign everywhere, not only at login

**Common bug:** login restores `pubkey` from `localStorage` immediately, but `window.nostr` (remote adapter) attaches **asynchronously** during `bootstrapFromStorage()`. Code that only checks `window.nostr` or `getNostrPrivateKey()` reports “No signing method” even though the user is logged in.

**Fix:** every auth action (push, issues, PRs, profile, SSH keys, import publish, …) should call **`resolveNostrSigner()`** first:

```typescript
import { resolveNostrSigner } from "./signer-resolver";

const signer = await resolveNostrSigner({ remoteSigner });
if (!signer) {
  alert("No signing method available");
  return;
}

setBusy(true); // show UI feedback *before* awaiting signer if connect is slow
const signed = await signer.signEvent(unsignedEvent);
```

The resolver:

1. Awaits `remoteSigner.ensureBootstrapped()` (single-flight — safe to call from push while page is still pairing)
2. Uses `window.nostr` when present (extension **or** remote adapter)
3. Falls back to stored **nsec** in Settings

---

## URI formats (read carefully)

### `bunker://`

- **Host** = **remote signer** pubkey (64-hex).
- Client generates a **new** ephemeral keypair for the session.

### `nostrconnect://`

- **Host** = **client** pubkey for this pairing session **(not the signer’s pubkey)**.
- **Signer** pubkey is unknown until you receive the first valid **`24133`** addressed to the client (`#p` = client pubkey); the **author** of that event becomes `remotePubkey`.
- Treat `secret` as an opaque **challenge** (not a private key). Store the ephemeral client key locally (indexed by client pubkey), then require `result === secret` on the first decrypted `24133` before trusting signer identity.

Wrong mental model (breaks Amber / QR): treating `nostrconnect` host as the signer like `bunker`.

---

## QR / pairing relays (`getNip46PairingRelays`)

**Do not hardcode** a random relay list in the nostrconnect URI (e.g. only `oxtr` / `primal`). Login may work briefly; **`sign_event` then times out** because Amber listens on different relays.

Production pattern (gittr `remoteSigner.ts`):

1. Take **`NEXT_PUBLIC_NOSTR_RELAYS`** (operator relays first — e.g. `wss://git.shakespeare.diy`)
2. Add signer-friendly fallbacks (`wss://relay.damus.io`, `wss://nos.lol`)
3. Cap at ~8 relays so QR URIs stay scannable
4. After `connect`, call NIP-46 **`switch_relays`** with the merged list so client and signer agree where `24133` traffic flows

```typescript
// Pseudocode — see gittr getNip46PairingRelays()
const relays = getNip46PairingRelays(appRelaysFromEnv, 8);
// nostrconnect://<client-pubkey>?relay=...&secret=...&perms=...
```

---

## Permissions in QR / `connect`

Request **kind-specific** `sign_event` permissions for Nostr git clients, not generic `sign_event` only:

```
get_public_key,sign_event,sign_event:30617,sign_event:30618,sign_event:5,nip04_encrypt,nip04_decrypt,nip44_encrypt,nip44_decrypt
```

Without `sign_event:30617` / `30618`, Amber may reject or hang on repo push.

---

## NIP-46 `connect` params

Signers disagree on JSON-RPC param layout. Production gittr tries, in order:

- **nip46** spec: `[secret?, perms, metadata]` — client identity is the **event pubkey**, not a connect param
- **client-first** (Amber): `[clientPubkey, secret?, perms]`
- **remote-first**: `[remotePubkey, secret?, perms]`

**Bug to avoid:** passing `{ includeSecret: true }` as the “format” argument — that silently breaks connect on reload.

After page reload, many signers need a fresh **`connect`** RPC before `sign_event` works (`reestablishConnection`).

---

## Timeouts and UX

| RPC | Suggested timeout | Notes |
|-----|-------------------|--------|
| `connect` / `get_public_key` | ~25s | Retries with backoff |
| `switch_relays` | ~8s | Can run in background after login |
| **`sign_event`** | **~120s** | User must approve on phone; repo events are large |

**Repo push = two signatures** (NIP-34 kind `30617` announcement + kind `30618` state). Amber “auto-allow” / “always approve” often still shows **one prompt per `sign_event`** — that is normal.

Show **busy UI immediately** on button click; do not wait for `resolveNostrSigner()` before greying out the button (bootstrap can take tens of seconds).

Use **`ensureBootstrapped()`** with a single in-flight promise so push does not start a second concurrent bootstrap.

---

## Connection flow (simplified)

1. Parse URI → relays, mode (`bunker` | `nostrconnect`), keys.
2. **Add relays** and **subscribe** to `kind: 24133` with `#p` = **client** pubkey (for nostrconnect, before you know the signer).
3. Send **`connect`** inside encrypted **`24133`** payloads (correct param layout).
4. **`switch_relays`** to merged app + signer relays.
5. Complete handshake → `userPubkey`, then replace `window.nostr` with adapter.
6. On every signing action → **`resolveNostrSigner()`**, not raw `window.nostr` checks alone.

---

## Implementation learnings (production, Jul 2026)

These are the issues that show up as “I approved on the phone and **nothing happened**” or **`sign_event timed out`**:

1. **Subscribe before the phone sends**  
   Start the session when you mint the QR, not only on a second button with stale state.

2. **React state vs token**  
   Keep the latest nostrconnect string in a **ref** for “Pair & Login”.

3. **`nostrconnect` host ≠ signer**  
   Encrypting to the wrong pubkey stalls pairing.

4. **Wrong relays in QR**  
   Pairing relays must overlap what **both** the browser and Amber use.

5. **JSON-RPC `id` mismatches**  
   Fuzzy-match pending `connect` when decrypt succeeds but `id` differs.

6. **`connect` without permissions / wrong format**  
   Yields `no permission` on `sign_event` until reconnect.

7. **Signing only via `getNostrPrivateKey()`**  
   Breaks remote-signer users who have no local nsec.

8. **Security**  
   Never place client private keys in the URI. `secret` is a one-time challenge.

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
4. **Re-sync snippet** from gittr when changing pairing behaviour — this folder is documentation + reference, not a published npm package.

---

## Compatibility

Targets **NIP-46** signers that use **`bunker://`** or **`nostrconnect://`** and kind **`24133`** on common relays. Tested with **Amber** (nostrconnect + bunker) on gittr.space production.

---

## References

- **NIP-46:** https://nips.nostr.com/46  
- **NIP-07:** https://nips.nostr.com/07  
- **NIP-04 / NIP-44:** encryption inside `24133` content  
- **NIP-34:** repo kinds `30617` / `30618` (two signatures per push)

**Extracted from:** `gittr/ui/src/lib/nostr/remoteSigner.ts` + `signer.ts` (Jul 2026 production fixes)
