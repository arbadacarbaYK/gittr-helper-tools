# NIP-46 Remote Signer Integration

Code snippets for implementing **NIP-46** (remote signing) in a Nostr **web client**, so users can pair **Amber**, **Nowser**, **LNbits remote signer**, self-hosted **bunker**, etc., without putting the user’s **nsec** in the page.

**Synced:** 2026-08-18 — teaching extract (not the full ~3200-line production file).  
APIs of note: `getNip46PairingRelays` (never put GRASP in NIP-46 URIs), `ensureBootstrapped` (hydrate + bunker sockets, **no Amber popup**), `ensureRpcHealthy` (warm sockets before Push), `isRpcHealthy`, kind-scoped `DEFAULT_REMOTE_PERMISSIONS`, prefer manager over `window.nostr` when a remote session exists.

**Canonical docs (keep in sync with production):**

- [gittr `NIP46_REMOTE_SIGNER_INTEGRATION.md`](https://gittr.space/npub1n2ph08n4pqz4d3jk6n2p35p2f4ldhc5g5tu7dhftfpueajf4rpxqfjhzmc/gittr?file=docs/NIP46_REMOTE_SIGNER_INTEGRATION.md&branch=main) — full architecture and URI notes  
- [gittr `NIPS_AND_EVENT_KINDS.md` § NIP-46](https://gittr.space/npub1n2ph08n4pqz4d3jk6n2p35p2f4ldhc5g5tu7dhftfpueajf4rpxqfjhzmc/gittr?file=docs/NIPS_AND_EVENT_KINDS.md&branch=main) — how gittr lists support  
- Source of truth: [`gittr/ui/src/lib/nostr/remoteSigner.ts`](https://gittr.space/npub1n2ph08n4pqz4d3jk6n2p35p2f4ldhc5g5tu7dhftfpueajf4rpxqfjhzmc/gittr?file=ui/src/lib/nostr/remoteSigner.ts&branch=main) + [`signer.ts`](https://gittr.space/npub1n2ph08n4pqz4d3jk6n2p35p2f4ldhc5g5tu7dhftfpueajf4rpxqfjhzmc/gittr?file=ui/src/lib/nostr/signer.ts&branch=main)

**Not in scope:** the **gitnostr bridge** does not speak NIP-46. Pairing is entirely between **browser ↔ signer** on relays; the bridge only consumes normal signed events. **gittr-mcp** signs with a local nsec and does **not** use NIP-46 or SSH.

Settings → SSH Keys uses NIP-46/Amber only if you publish a kind **52** key from the website. Laptop `gn ssh-key add` and MCP HTTPS skip that.

**Not the same as NWC:** Lightning wallet control is **NIP-47** (`nostr+walletconnect://`, kinds `23194`/`23195`). See [`nip47-nwc`](../nip47-nwc). LNbits can offer both a remote signer and an NWC connection — still two protocols, two secrets.

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

The **snippet** still calls Amber `connect` on reload (simpler demo). **Production gittr does not:** page load only hydrates the cached identity and opens bunker **WebSockets**. Amber is woken by **`sign_event`** (see flow below).

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

await manager.ensureBootstrapped(); // later visits: hydrate + bunker sockets (no Amber popup)
const { session, npub } = await manager.connect(uri); // first pairing only
await manager.ensureRpcHealthy?.(); // production: warm sockets before Push
const signedEvent = await window.nostr.signEvent(unsignedEvent);
```

---

## `signer-resolver.ts` — sign everywhere, not only at login

**Common bug:** login restores `pubkey` from `localStorage` immediately, but `window.nostr` (remote adapter) attaches **asynchronously** during `ensureBootstrapped()` / hydrate. Code that only checks `window.nostr` or `getNostrPrivateKey()` reports “No signing method” even though the user is logged in.

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

1. Awaits `remoteSigner.ensureBootstrapped()` (hydrate only — **does not** wait on the phone)
2. Uses `window.nostr` when present (extension **or** remote adapter)
3. Falls back to stored **nsec** in Settings

**Push / Save (production):** `ensureRpcHealthy()` opens bunker relays, then `sign_event` pops Amber. Do not block the click on a silent NIP-46 `connect` ack — Amber often ignores reconnect `connect` while still answering `sign_event`.

---

## URI formats (read carefully)

### `bunker://`

- **Host** = **remote signer** pubkey (64-hex).
- **Reuse the client key per bunker URI** (persist it in `localStorage` keyed by `remotePubkey:secret`). Signers identify your app by the client key on the kind-`24133` event: a fresh key per “Pair” press creates a **new app entry in Amber every time** and breaks silent-ack re-login. Only generate a new keypair on first pairing.
- The `secret` is **single-use**: consumed on the first successful pairing. A rejected re-pair returns `invalid secret` — the user must mint a fresh bunker token in the signer app.

### `nostrconnect://`

- **Host** = **client** pubkey for this pairing session **(not the signer’s pubkey)**.
- **Signer** pubkey is unknown until you receive the first valid **`24133`** addressed to the client (`#p` = client pubkey); the **author** of that event becomes `remotePubkey`.
- Treat `secret` as an opaque **challenge** (not a private key). Store the ephemeral client key locally (indexed by client pubkey), then require `result === secret` on the first decrypted `24133` before trusting signer identity.

Wrong mental model (breaks Amber / QR): treating `nostrconnect` host as the signer like `bunker`.

---

## QR / pairing relays (`getNip46PairingRelays`)

**Never put GRASP/git relays in NIP-46 URIs.** Relays like `relay.gittr.space`, `relay.ngit.dev`, `gitnostr.com`, `ngit-relay.nostrver.se` accept NIP-34 / forge traffic and often **reject** kind `24133`. Amber shows: *"Event must reference an accepted repository or accepted event"*.

Use **general** nostr relays only for login / remote signing. Production **AmberSettings order** (Damus last — browsers often fail it under Cloudflare):

- `wss://nostr.oxtr.dev`
- `wss://theforest.nostr1.com`
- `wss://relay.primal.net`
- `wss://nos.lol`
- `wss://relay.damus.io` (last resort)

(`wss://relay.gittr.space` is gittr’s forge/GRASP relay — great for repo events, **not** for bunker pairing.)

Repo browse/push still uses GRASP relays from `NEXT_PUBLIC_NOSTR_RELAYS`; that list is separate from NIP-46 transport.

Production pattern (gittr `remoteSigner.ts`):

1. Filter `isGraspServer(url)` out of every NIP-46 relay list
2. Keep Amber URI relays first; append oxtr / theforest / primal / nos.lol; **Damus last**
3. Cap dial expansion (~8). Cap nostrconnect QR ~5–6
4. **Never call `switch_relays` with your own relay list.** Per Amber's source the signer *ignores* your params, answers with *its* relays and rebinds the app to those — both sides desync and every later `sign_event` times out. NIP-46 transport stays on the URI relays; publish the signed events to your app relays yourself.

**Browser WebSocket slots:** the app’s main relay pool and the Amber `directPool` must not share hosts. `nostr-relaypool` `removeRelay(url)` matches the **exact** map key (trailing `/` counts). Closing the wrong key leaves discovery sockets up and bunker sockets stay CLOSED — Push then says “Could not open any bunker relay” even with Amber open. Close via the pool’s real keys, dial bunker sockets **before** file-fetch subscribe, and never reset the bunker pool while a socket is still CONNECTING.

```typescript
// Pseudocode — see gittr getNip46PairingRelays()
const relays = getNip46PairingRelays(appRelaysFromEnv, 8);
// nostrconnect://<client-pubkey>?relay=...&secret=...&perms=...
```

---

## Permissions in QR / `connect`

Request **kind-specific** `sign_event` permissions for Nostr git clients, not generic `sign_event` only:

```
get_public_key,sign_event,sign_event:30617,sign_event:30618,sign_event:10317,sign_event:5,nip04_encrypt,nip04_decrypt,nip44_encrypt,nip44_decrypt
```

Without `sign_event:30617` / `30618`, Amber may reject or hang on repo push.

---

## NIP-46 `connect` params — ONE canonical layout

There is exactly **one** layout every real signer parses (verified against Amber/quartz `BunkerRequestConnect.parse`, bunker46 `bunker-rpc.handler.ts`, and nostr-tools `nip46.ts`):

```
[remote-signer-pubkey, optional_secret, optional_requested_perms, optional_client_metadata]
```

- `params[0]` = remote signer pubkey (the bunker host)
- `params[1]` = the pairing **secret** — back-fill with `""` when absent so later slots don't shift
- `params[2]` = comma-joined permissions
- `params[3]` = JSON metadata `{"name": "your-app", "url": "https://…"}` — this is what Amber shows as the app name
- Client identity is the **event pubkey** on the kind-`24133` envelope, never a connect param

**Do NOT rotate through alternate layouts.** If the secret is not at `params[1]`, Amber reads whatever is there as the secret and answers **`invalid secret`**. (An earlier gittr build tried `[secret, perms, metadata]` first — that was the root cause of every `invalid secret` failure.)

Connect result handling:

- `"ack"` **or an echo of the pairing secret** = success (bunker46 and nostrconnect responses echo the secret per spec)
- error `"already connected"` = success (Amber: this client key is already paired)
- error `"invalid secret"` = the single-use secret was consumed — user needs a fresh bunker token

After page reload, **do not** require a blocking `connect` before `sign_event`. Production hydrates the cached pubkey, opens bunker WebSockets, and lets **`sign_event` wake Amber**. A silent reconnect `connect` is often ignored (no popup) and used to abort Push after a 25s timeout.

**Encryption:** Amber bunker still decrypts **NIP-04** RPC. Production sends **NIP-04 first** for `sign_event` (and encrypt/decrypt RPC) and dual-publishes NIP-44. NIP-44-only `sign_event` can land on Amber’s relays and never pop a prompt. Keep NIP-44 primary for pairing `connect` / `get_public_key`.

---

## Timeouts and UX

| RPC | Suggested timeout | Notes |
|-----|-------------------|--------|
| `connect` / `get_public_key` | ~25s | Retries only cover relay flakiness — never alternate param layouts |
| **`sign_event`** | **~120s** | User must approve on phone; repo events are large |

**Repo push = two signatures** (NIP-34 kind `30617` announcement + kind `30618` state). Amber “auto-allow” / “always approve” often still shows **one prompt per `sign_event`** — that is normal.

Show **busy UI immediately** on button click; do not wait for `resolveNostrSigner()` before greying out the button (bootstrap can take tens of seconds).

Use **`ensureBootstrapped()`** (hydrate) plus **`ensureRpcHealthy()`** before Push so bunker sockets are OPEN. Do not start a second concurrent dial (`bunkerDialInFlight`).

---

## Connection flow (production gittr)

**Pairing (once):**

1. Parse URI → relays, mode (`bunker` | `nostrconnect`), keys (reuse stored client key for bunker).
2. Open a **dedicated** bunker `SimplePool` (not the app discovery pool) and subscribe to `kind: 24133` with `#p` = **client** pubkey.
3. Send **`connect`** (canonical param layout). `get_public_key` → `userPubkey`, then NIP-07 adapter.
4. Keep NIP-46 transport on the **URI relays** — no `switch_relays`, no GRASP hosts.

**Every later page load:**

1. `ensureBootstrapped()` hydrates session + adapter (**no Amber popup**).
2. Claim bunker hosts so the main pool cannot steal them; close colliding sockets **by the pool’s real URL keys**.
3. Dial bunker WebSockets **immediately** (before file-fetch subscribe).

**Every Push / Save / issue:**

1. `resolveNostrSigner()` then **`ensureRpcHealthy()`** (need ≥1 OPEN bunker socket).
2. `sign_event` (NIP-04 first) — that is what pops Amber.
3. Never `resetDirectPool` while a bunker socket is still CONNECTING.

The teaching extract’s `bootstrapFromStorage()` still does connect-on-reload; copy production `remoteSigner.ts` for the live path.

---

## Implementation learnings (production, Aug 2026)

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

6. **`connect` without permissions / wrong param layout**  
   Wrong layout = `invalid secret`; missing perms = `no permission` on `sign_event` until reconnect.

7. **Fresh client key per Pair press**  
   Creates a new (undeletable) app entry in Amber every time and prevents silent-ack re-login. Persist the client key per bunker URI.

8. **`switch_relays` after login**  
   Signer ignores your list, rebinds to its own relays, and every later `sign_event` times out (~5-minute “eventually logs in” symptom).

9. **Signing only via `getNostrPrivateKey()`**  
   Breaks remote-signer users who have no local nsec.

10. **Security**  
    Never place client private keys in the URI. `secret` is a one-time challenge.

11. **Dead sockets = "push fails silently"**  
    `nostr-tools` v1 relay sockets never auto-reconnect. After a silent drop, `trySend` discards outgoing messages and the 24133 subscription is dead. Before each request: wait out CONNECTING, re-dial CLOSED, re-subscribe. **Do not** `resetDirectPool` (or drop `_conn`) while status is still 0 — that is how Push logs `No OPEN bunker sockets` with Amber sitting unlocked.

12. **Never `connect()` a CONNECTING socket**  
    `nostr-relaypool`'s `connect()` replaces the WebSocket whenever `readyState !== OPEN`. Calling it once per request (e.g. inside `addRelay`) kills every in-flight connection — the relay never reaches OPEN. Only dial when the socket is CLOSED.

13. **Fail loudly on `sign_event` timeout**  
    A silent second 120s retry only hides the failure. Throw an actionable error ("open your signer app, make sure it is online") so the UI can show it, and repair transport in the background for the next attempt.

14. **`removeRelay` is exact-key**  
    Trailing `/` mismatch means “Freed 7 sockets” can be a lie. Close via `getRelayStatuses()` keys. Dial bunker sockets before file-fetch, or discovery steals the browser slots.

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

Targets **NIP-46** signers that use **`bunker://`** or **`nostrconnect://`** and kind **`24133`** on common relays. Tested with **Amber** (nostrconnect + bunker) on gittr.space production, and this snippet end-to-end against fiatjaf's **`nak bunker`** over live relays (pair, sign, stable client-key re-pair).

---

## References

- **NIP-46:** https://nips.nostr.com/46  
- **NIP-07:** https://nips.nostr.com/07  
- **NIP-04 / NIP-44:** encryption inside `24133` content  
- **NIP-34:** repo kinds `30617` / `30618` (two signatures per push)

**Extracted from:** `gittr/ui/src/lib/nostr/remoteSigner.ts` + `signer.ts` (Aug 2026 production: hydrate-only boot, `ensureRpcHealthy` before Push, NIP-04-first `sign_event`)
