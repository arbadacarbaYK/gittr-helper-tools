# NIP-46 Remote Signer Integration

Code snippets for implementing NIP-46 (Remote Signing) in a Nostr client, enabling users to pair hardware signers (like LNbits Remote Nostr Signer, Nowser bunker, Amber bunker) without exposing private keys to the browser.

## `remote-signer.ts`

Classes and functions for pairing with remote signers via NIP-46 and exposing a NIP-07 compatible adapter.

**What it does:**
- Parses `bunker://` and `nostrconnect://` URIs
- Manages NIP-46 client-side connection flow
- Handles encrypted request/response events (Kind 24133)
- Exposes NIP-07 compatible `window.nostr` adapter
- Persists sessions in localStorage for reconnection
- Provides automatic login after initial pairing

**Usage:**
```typescript
import { RemoteSignerManager, parseRemoteSignerUri } from './remote-signer';

// Parse a bunker:// or nostrconnect:// URI
const config = parseRemoteSignerUri('bunker://<pubkey>?relay=wss://...');

// Initialize manager
const manager = new RemoteSignerManager({
  publish: (event, relays) => { /* publish to relays */ },
  subscribe: (filters, relays, onEvent) => { /* subscribe */ return () => {}; },
  addRelay: (url) => { /* add relay */ },
  removeRelay: (url) => { /* remove relay */ },
});

// Connect to remote signer
const { session, npub } = await manager.connect(uri);

// Sign events via remote signer (NIP-07 compatible)
const signedEvent = await window.nostr.signEvent(unsignedEvent);
```

## Key Features

- **NIP-07 Compatible**: Overrides `window.nostr` with adapter that routes to remote signer
- **Session Persistence**: Stores session in localStorage for automatic reconnection
- **Automatic Login**: User stays logged in after initial pairing
- **Complete NIP-07 Support**: Includes `getRelays()`, `nip04`, and `nip44` methods
- **Original Extension Preservation**: Preserves and restores original `window.nostr` on disconnect

## Implementation Details

### URI Formats

**bunker:// Format:**
```
bunker://<remote-pubkey>?relay=wss://relay.example.com&secret=optional&name=MySigner
```

**nostrconnect:// Format:**
```
nostrconnect://<remote-pubkey>?relay=wss://relay.example.com&secret=optional&name=MySigner&perms=sign_event:1,nip44_encrypt
```

### Connection Flow

1. Parse URI to extract remote pubkey, relays, and optional secret/permissions
2. Generate ephemeral client keypair
3. Connect to remote signer's relays
4. Send encrypted "connect" request (Kind 24133)
5. Receive user's pubkey from remote signer
6. Create session and persist to localStorage
7. Apply NIP-07 adapter to `window.nostr`
8. User is now logged in and can sign events

### Session Persistence

Sessions are stored in localStorage with key `nostr:remote-signer-session`. On app load:
1. Check localStorage synchronously for stored session
2. If found, set user's pubkey immediately (prevents UI flickering)
3. Bootstrap async connection in background
4. Restore `window.nostr` adapter

### NIP-07 Adapter

The adapter provides full NIP-07 compatibility:
- `getPublicKey()` - Returns user's pubkey from remote signer
- `signEvent(event)` - Signs events via remote signer
- `getRelays()` - Returns relays from remote signer session
- `nip04.encrypt/decrypt()` - Encryption via remote signer
- `nip44.encrypt/decrypt()` - NIP-44 encryption via remote signer

## Critical Notes

1. **`generatePrivateKey()` returns hex string directly** - no conversion needed
2. **`nip04.encrypt()` accepts hex secret keys directly** - nostr-tools handles hex strings
3. **Always use `generatePrivateKey()`** (not `generateSecretKey()`) from nostr-tools
4. **Preserve original `window.nostr`** - capture before applying adapter, restore on disconnect
5. **Synchronous pubkey restoration** - check localStorage during initialization

## Compatibility

Compatible with all NIP-46 compliant remote signers:
- Hardware signers (LNbits, BoltCard)
- Mobile apps (Nowser Bunker, Amber Bunker)
- Self-hosted servers (Bunker)
- Any signer using `bunker://` or `nostrconnect://` URI format

## References

- **NIP-46**: https://nips.nostr.com/46
- **NIP-07**: https://nips.nostr.com/07
- **NIP-04**: https://nips.nostr.com/04 (Encryption)
- **NIP-44**: https://nips.nostr.com/44 (Encryption v2)

**Extracted from:** `gittr/ui/src/lib/nostr/remoteSigner.ts`
