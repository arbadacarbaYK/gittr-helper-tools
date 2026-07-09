/**
 * NIP-46 Remote Signer Integration
 *
 * Extracted from gittr.space - implements NIP-46 (Remote Signing) for pairing with
 * Amber, nak bunker, bunker46, LNbits Remote Nostr Signer, etc. without exposing
 * private keys to the browser.
 *
 * NIP-46: https://nips.nostr.com/46
 *
 * ── PROTOCOL FACTS (verified against real signer source code) ─────────────────
 *
 * 1. `connect` params are POSITIONAL and every real signer parses them the same:
 *        [remote-signer-pubkey, optional_secret, optional_requested_perms, optional_client_metadata]
 *    - Amber/quartz `BunkerRequestConnect.parse`: params[0]=remoteKey, params[1]=secret
 *    - bunker46 `bunker-rpc.handler.ts`:          secret = params[1]
 *    - nostr-tools `nip46.ts` BunkerSigner:       sends [remoteSignerPubkey, secret]
 *    Any other layout makes the signer read a non-secret string as the secret
 *    → Amber answers "invalid secret".
 *
 * 2. Signers identify your app by the CLIENT KEY on the kind-24133 event.
 *    Reuse the same client key per bunker URI: Amber then answers re-connects
 *    with a silent "ack" (no popup) and does NOT create a new app entry.
 *
 * 3. NEVER call `switch_relays` with your own relay list. Per Amber's source the
 *    signer IGNORES your params, answers with ITS relays and rebinds the app to
 *    those — you desync both sides and sign_event times out. NIP-46 transport
 *    stays on the URI relays; publish signed events to app relays yourself.
 *
 * 4. Encryption: modern signers (Amber, nak) reply NIP-44. Encrypt requests with
 *    NIP-44 and accept NIP-04 only as legacy fallback on decrypt.
 *
 * 5. Connect result may be "ack" OR an echo of the pairing secret (bunker46,
 *    nostrconnect responses per spec). "already connected" error = success.
 *
 * Dependencies (same split gittr uses):
 *   "nostr-tools": "^1.7.4"                      — main API (generatePrivateKey etc.)
 *   "nostr-tools-v2": "npm:nostr-tools@^2"       — nip44 only
 *
 * Usage:
 * ```typescript
 * import { RemoteSignerManager, parseRemoteSignerUri } from './remote-signer';
 *
 * const manager = new RemoteSignerManager({
 *   publish: (event, relays) => { /* publish to relays *\/ },
 *   subscribe: (filters, relays, onEvent) => { /* subscribe *\/ return () => {}; },
 * });
 *
 * await manager.bootstrapFromStorage();          // automatic re-login
 * const { session, npub } = await manager.connect(uri); // new pairing
 * const signedEvent = await window.nostr.signEvent(unsignedEvent);
 * ```
 */

import {
  type UnsignedEvent,
  generatePrivateKey,
  getPublicKey,
  getEventHash,
  signEvent,
  nip19,
  nip04,
  type Event as NostrEvent,
} from "nostr-tools";
import { nip44 as nip44v2 } from "nostr-tools-v2";

declare global {
  interface Window {
    nostr?: any;
  }
}

// Storage keys for session persistence + stable per-bunker client identity
const STORAGE_KEY = "nostr:remote-signer-session";
const BUNKER_CLIENT_KEYS_KEY = "nostr:bunker-client-keys";
const REQUEST_TIMEOUT_MS = 15000;
const CONNECT_TIMEOUT_MS = 25000;
const KIND_NIP46 = 24133; // NIP-46 request/response events

const HEX_64_RE = /^[0-9a-f]{64}$/i;

export const DEFAULT_REMOTE_PERMISSIONS = [
  "get_public_key",
  "sign_event",
  "nip04_encrypt",
  "nip04_decrypt",
  "nip44_encrypt",
  "nip44_decrypt",
];

export interface RemoteSignerConfig {
  remotePubkey: string; // Remote signer's pubkey (bunker://) or client pubkey (nostrconnect:// — see parse notes!)
  relays: string[]; // Relays the remote signer listens on
  secret?: string; // Pairing secret from the URI (position 2 of connect params)
  permissions?: string[]; // Requested permissions (e.g. ["sign_event", "nip44_encrypt"])
  label?: string; // App name shown in the signer (e.g. "gittr.space")
}

export interface RemoteSignerSession {
  remotePubkey: string;
  relays: string[];
  clientSecretKey: string; // hex string from generatePrivateKey
  clientPubkey: string;
  userPubkey: string; // user's pubkey (from remote signer get_public_key)
  secret?: string;
  permissions?: string[];
  label?: string;
  lastConnected: number;
}

export type RemoteSignerState = "idle" | "connecting" | "ready" | "error";

type PublishFn = (event: any, relays: string[]) => void;
type SubscribeFn = (
  filters: any[],
  relays: string[],
  onEvent: (event: any, isAfterEose: boolean, relayURL?: string) => void,
  maxDelayms?: number,
  onEose?: (relayUrl: string, minCreatedAt: number) => void,
  options?: any
) => () => void;
type RelayMutator = (url: string) => void;

interface RemoteSignerDeps {
  publish: PublishFn;
  subscribe: SubscribeFn;
  addRelay?: RelayMutator;
  removeRelay?: RelayMutator;
}

interface PendingRequest {
  method: string;
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
  timeout: ReturnType<typeof setTimeout>;
}

const randomRequestId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

function hexToBytes(hex: string): Uint8Array {
  const normalized = hex.replace(/^0x/i, "").toLowerCase();
  const out = new Uint8Array(normalized.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(normalized.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

/** Encrypt a NIP-46 request. Prefer NIP-44 (what Amber/nak reply with). */
async function encryptForRemoteSigner(
  clientSecretKey: string,
  remotePubkey: string,
  plaintext: string
): Promise<string> {
  try {
    const key = nip44v2.getConversationKey(
      hexToBytes(clientSecretKey),
      remotePubkey
    );
    return nip44v2.encrypt(plaintext, key);
  } catch {
    // Legacy signers only speak NIP-04.
    return nip04.encrypt(clientSecretKey, remotePubkey, plaintext);
  }
}

/** Decrypt a NIP-46 response: try NIP-44 first, fall back to NIP-04. */
async function decryptFromRemoteSigner(
  clientSecretKey: string,
  remotePubkey: string,
  ciphertext: string
): Promise<string> {
  try {
    const key = nip44v2.getConversationKey(
      hexToBytes(clientSecretKey),
      remotePubkey
    );
    return nip44v2.decrypt(ciphertext, key);
  } catch (nip44Err) {
    try {
      return await nip04.decrypt(clientSecretKey, remotePubkey, ciphertext);
    } catch (nip04Err) {
      throw new Error(
        `Decrypt failed (nip44: ${
          nip44Err instanceof Error ? nip44Err.message : String(nip44Err)
        }; nip04: ${
          nip04Err instanceof Error ? nip04Err.message : String(nip04Err)
        })`
      );
    }
  }
}

/**
 * Build the canonical NIP-46 `connect` params (see PROTOCOL FACTS above).
 * Metadata must sit at index 3, so secret/perms are back-filled with ""
 * exactly like Amber's quartz library does.
 */
export function buildConnectParams(session: RemoteSignerSession): string[] {
  const perms =
    session.permissions && session.permissions.length > 0
      ? session.permissions.join(",")
      : DEFAULT_REMOTE_PERMISSIONS.join(",");

  const metadata = JSON.stringify({
    name: session.label || "my-app",
    url: typeof window !== "undefined" ? window.location.origin : undefined,
  });

  return [session.remotePubkey, session.secret || "", perms, metadata];
}

/**
 * Stable client key per bunker URI (remotePubkey + secret): signers identify
 * apps by this key. A fresh key per Pair press = a new app entry in Amber
 * every time, and no silent-ack re-login.
 */
export function rememberBunkerClientKey(
  remotePubkey: string,
  secret: string | undefined,
  clientSecretKey: string
) {
  if (typeof window === "undefined") return;
  if (!HEX_64_RE.test(remotePubkey) || !HEX_64_RE.test(clientSecretKey)) return;
  try {
    const raw = localStorage.getItem(BUNKER_CLIENT_KEYS_KEY);
    const map = raw ? JSON.parse(raw) : {};
    map[`${remotePubkey.toLowerCase()}:${(secret || "").toLowerCase()}`] = {
      clientSecretKey: clientSecretKey.toLowerCase(),
      clientPubkey: getPublicKey(clientSecretKey).toLowerCase(),
      createdAt: Date.now(),
    };
    localStorage.setItem(BUNKER_CLIENT_KEYS_KEY, JSON.stringify(map));
  } catch {
    // Ignore storage errors (quota/private mode).
  }
}

export function getStoredBunkerClientKey(
  remotePubkey: string,
  secret?: string
): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = localStorage.getItem(BUNKER_CLIENT_KEYS_KEY);
    if (!raw) return undefined;
    const map = JSON.parse(raw);
    const entry =
      map[`${remotePubkey.toLowerCase()}:${(secret || "").toLowerCase()}`];
    if (entry && HEX_64_RE.test(entry.clientSecretKey || "")) {
      return entry.clientSecretKey.toLowerCase();
    }
  } catch {
    /* ignore */
  }
  return undefined;
}

/**
 * Parse bunker:// or nostrconnect:// tokens
 *
 * IMPORTANT — different host semantics:
 * - bunker://<host>       → host is the REMOTE SIGNER's pubkey
 * - nostrconnect://<host> → host is YOUR OWN client pubkey; the signer pubkey is
 *   only learned from the author of the first inbound kind-24133 response.
 *   This snippet's `connect()` implements the bunker flow; for nostrconnect you
 *   must wait for the signer's inbound connect response first (see gittr's
 *   production remoteSigner.ts for the full discovery flow).
 */
export function parseRemoteSignerUri(input: string): RemoteSignerConfig {
  if (!input || typeof input !== "string") {
    throw new Error("Remote signer token required");
  }
  const trimmed = input.trim();

  if (trimmed.startsWith("bunker://")) {
    const withoutScheme = trimmed.replace(/^bunker:\/\//i, "");
    const [pubkeyPart, query = ""] = withoutScheme.split("?");
    if (!pubkeyPart || pubkeyPart.length !== 64) {
      throw new Error("Invalid bunker token: missing remote signer pubkey");
    }
    const params = new URLSearchParams(query);
    const relays = params
      .getAll("relay")
      .map((relay) => relay.trim())
      .filter(Boolean);
    if (relays.length === 0) {
      throw new Error("Remote signer token missing relay query param");
    }
    // Secret is OPTIONAL per NIP-46 (but Amber URIs always carry one and it is
    // single-use: consumed on the first successful pairing).
    const secret = params.get("secret")?.trim() || undefined;
    const permissions = params
      .get("perms")
      ?.split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    const label = params.get("name") || params.get("label") || undefined;
    return {
      remotePubkey: pubkeyPart.toLowerCase(),
      relays,
      secret,
      permissions,
      label,
    };
  }

  if (trimmed.startsWith("nostrconnect://")) {
    // nostrconnect://<client-pubkey>?relay=wss://...&secret=...&name=...&perms=...
    const withoutScheme = trimmed.replace(/^nostrconnect:\/\//i, "");
    const [clientPubkey, query = ""] = withoutScheme.split("?");
    if (!clientPubkey || clientPubkey.length !== 64) {
      throw new Error("Invalid nostrconnect URI: missing client pubkey");
    }
    const params = new URLSearchParams(query);
    const relays = params
      .getAll("relay")
      .map((relay) => relay.trim())
      .filter(Boolean);
    if (relays.length === 0) {
      throw new Error("nostrconnect URI missing relay");
    }
    const secret = params.get("secret") || undefined;
    const permissions = params
      .get("perms")
      ?.split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    const label = params.get("name") || undefined;
    return {
      // NOTE: for nostrconnect this is the CLIENT pubkey, not the signer!
      remotePubkey: clientPubkey.toLowerCase(),
      relays,
      secret,
      permissions,
      label,
    };
  }

  throw new Error(
    "Unsupported remote signer URI. Use bunker:// or nostrconnect://"
  );
}

export function loadStoredRemoteSignerSession(): RemoteSignerSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RemoteSignerSession;
    if (!parsed.remotePubkey || !parsed.clientSecretKey || !parsed.userPubkey) {
      return null;
    }
    return parsed;
  } catch (error) {
    console.warn("[RemoteSigner] Failed to load stored session:", error);
    return null;
  }
}

export function persistRemoteSignerSession(
  session: RemoteSignerSession | null
) {
  if (typeof window === "undefined") return;
  try {
    if (!session) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    }
  } catch (error) {
    console.error("[RemoteSigner] Failed to persist session:", error);
  }
}

/**
 * Handles pairing with a remote signer (NIP-46) and exposes a NIP-07 compatible adapter.
 */
export class RemoteSignerManager {
  private deps: RemoteSignerDeps;
  private session: RemoteSignerSession | null = null;
  private state: RemoteSignerState = "idle";
  private pending = new Map<string, PendingRequest>();
  private unsubscribe?: () => void;
  private originalNostr: typeof window.nostr | undefined;
  private adapter: any;
  onStateChange?: (
    state: RemoteSignerState,
    session: RemoteSignerSession | null,
    error?: string
  ) => void;
  private lastError?: string;
  private bootstrapInFlight: Promise<void> | null = null;

  constructor(deps: RemoteSignerDeps) {
    this.deps = deps;
    if (typeof window !== "undefined") {
      this.originalNostr = window.nostr;
    }
  }

  getSession() {
    return this.session;
  }

  getState() {
    return this.state;
  }

  getUserPubkey() {
    return this.session?.userPubkey;
  }

  /**
   * Single-flight bootstrap — safe to call from any auth action (push, issue,
   * profile save, …) while page load may still be pairing. This is what the
   * signer-resolver relies on so `window.nostr` is attached before signing.
   */
  ensureBootstrapped(): Promise<void> {
    if (this.state === "ready" && this.session?.userPubkey) {
      return Promise.resolve();
    }
    if (this.bootstrapInFlight) {
      return this.bootstrapInFlight;
    }
    if (!loadStoredRemoteSignerSession()) {
      return Promise.resolve();
    }
    this.bootstrapInFlight = this.bootstrapFromStorage().finally(() => {
      this.bootstrapInFlight = null;
    });
    return this.bootstrapInFlight;
  }

  /**
   * Attempt to rehydrate existing session from storage.
   * This enables automatic login - users stay logged in after initial pairing.
   */
  async bootstrapFromStorage() {
    const stored = loadStoredRemoteSignerSession();
    if (!stored) return;
    try {
      console.log("[RemoteSigner] Restoring session from storage");
      await this.activateSession(stored);
      // Re-send connect: with the same client key Amber answers a silent "ack"
      // (no popup) — required by some signers before sign_event works again.
      try {
        await this.sendRequest(
          stored,
          "connect",
          buildConnectParams(stored),
          CONNECT_TIMEOUT_MS
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (!/already connected|timed out/i.test(msg)) throw err;
      }
      this.notifyState("ready");
    } catch (error: any) {
      console.error("[RemoteSigner] Failed to resume session:", error);
      this.clearSession();
      this.notifyState(
        "error",
        error?.message || "Failed to resume remote signer session"
      );
    }
  }

  /**
   * Pair using a bunker:// URI.
   */
  async connect(uri: string) {
    const config = parseRemoteSignerUri(uri);
    this.notifyState("connecting");

    // Reuse the stored client key for this bunker URI so the signer recognizes
    // the app (single entry, silent-ack re-login). Only generate on first pair.
    const storedClientKey = getStoredBunkerClientKey(
      config.remotePubkey,
      config.secret
    );
    const clientSecretKey = storedClientKey || generatePrivateKey();

    const session: RemoteSignerSession = {
      remotePubkey: config.remotePubkey,
      relays: config.relays,
      clientSecretKey,
      clientPubkey: getPublicKey(clientSecretKey),
      userPubkey: "",
      secret: config.secret,
      permissions: config.permissions,
      label: config.label,
      lastConnected: Date.now(),
    };
    rememberBunkerClientKey(
      config.remotePubkey,
      config.secret,
      clientSecretKey
    );

    try {
      // Session must be set before subscribing so responses are routable.
      this.session = session;
      await this.ensureRelays(session.relays);
      await this.startSubscription(session);

      try {
        await this.sendRequest(
          session,
          "connect",
          buildConnectParams(session),
          CONNECT_TIMEOUT_MS
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (/already connected/i.test(msg)) {
          // This client key is already paired — session is live.
        } else if (/invalid secret/i.test(msg)) {
          throw new Error(
            "The signer rejected this bunker secret. Create a fresh bunker connection in your signer app and paste the new token — each secret pairs once."
          );
        } else {
          throw err;
        }
      }

      const remotePubkeyHex = await this.sendRequest(
        session,
        "get_public_key",
        []
      );
      if (
        !remotePubkeyHex ||
        typeof remotePubkeyHex !== "string" ||
        !HEX_64_RE.test(remotePubkeyHex)
      ) {
        throw new Error("Remote signer did not return a pubkey");
      }
      session.userPubkey = remotePubkeyHex.toLowerCase();
      session.lastConnected = Date.now();

      await this.activateSession(session);
      this.notifyState("ready");

      return {
        session,
        npub: nip19.npubEncode(session.userPubkey),
      };
    } catch (error: any) {
      console.error("[RemoteSigner] Pairing failed:", error);
      this.clearSession();
      this.notifyState(
        "error",
        error?.message || "Remote signer pairing failed"
      );
      throw error;
    }
  }

  /**
   * Disconnect and restore original NIP-07 provider (if any)
   */
  disconnect() {
    this.clearSession();
    this.notifyState("idle");
  }

  /**
   * Sign event through remote signer (NIP-46 sign_event).
   * Per spec the param is a JSON string of {kind, content, tags, created_at}.
   */
  async signEvent(event: UnsignedEvent): Promise<NostrEvent> {
    const session = this.requireSession();
    const payload = JSON.stringify({
      kind: event.kind,
      content: event.content,
      tags: event.tags,
      created_at: event.created_at,
    });
    const result = await this.sendRequest(session, "sign_event", [payload]);
    const parsed = typeof result === "string" ? JSON.parse(result) : result;
    return parsed as NostrEvent;
  }

  async nip04Encrypt(pubkey: string, plaintext: string) {
    const session = this.requireSession();
    return this.sendRequest(session, "nip04_encrypt", [pubkey, plaintext]);
  }

  async nip04Decrypt(pubkey: string, ciphertext: string) {
    const session = this.requireSession();
    return this.sendRequest(session, "nip04_decrypt", [pubkey, ciphertext]);
  }

  async nip44Encrypt(pubkey: string, plaintext: string) {
    const session = this.requireSession();
    return this.sendRequest(session, "nip44_encrypt", [pubkey, plaintext]);
  }

  async nip44Decrypt(pubkey: string, ciphertext: string) {
    const session = this.requireSession();
    return this.sendRequest(session, "nip44_decrypt", [pubkey, ciphertext]);
  }

  private requireSession(): RemoteSignerSession {
    if (!this.session) {
      throw new Error("Remote signer not paired");
    }
    return this.session;
  }

  private notifyState(state: RemoteSignerState, message?: string) {
    this.state = state;
    this.lastError = message;
    this.onStateChange?.(state, this.session, message);
  }

  private async activateSession(session: RemoteSignerSession) {
    this.session = session;
    persistRemoteSignerSession(session);
    await this.ensureRelays(session.relays);
    await this.startSubscription(session);
    this.applyNip07Adapter();
  }

  private clearSession() {
    this.session = null;
    persistRemoteSignerSession(null);
    this.unsubscribe?.();
    this.unsubscribe = undefined;
    this.pending.forEach(({ reject, timeout }) => {
      clearTimeout(timeout);
      reject(new Error("Remote signer disconnected"));
    });
    this.pending.clear();
    if (typeof window !== "undefined") {
      if (this.originalNostr) {
        window.nostr = this.originalNostr;
      } else {
        delete (window as any).nostr;
      }
    }
  }

  private async ensureRelays(relays: string[]) {
    if (!relays || relays.length === 0) return;
    relays.forEach((relay) => {
      if (this.deps.addRelay) {
        this.deps.addRelay(relay);
      }
    });
  }

  private async startSubscription(session: RemoteSignerSession) {
    this.unsubscribe?.();
    this.unsubscribe = this.deps.subscribe(
      [
        {
          kinds: [KIND_NIP46],
          "#p": [session.clientPubkey],
        },
      ],
      session.relays,
      (event) => this.handleIncomingEvent(event)
    );
  }

  private async handleIncomingEvent(event: any) {
    const session = this.session;
    if (!session) return;
    if (!event || event.kind !== KIND_NIP46) return;
    const pTags = event.tags
      ?.filter((tag: any) => Array.isArray(tag) && tag[0] === "p")
      .map((tag: any) => tag[1]);
    if (!pTags || !pTags.includes(session.clientPubkey)) return;
    try {
      const plaintext = await decryptFromRemoteSigner(
        session.clientSecretKey,
        event.pubkey,
        event.content
      );
      const message = JSON.parse(plaintext);
      const pending = message?.id ? this.pending.get(message.id) : undefined;
      if (!pending) {
        return;
      }
      this.pending.delete(message.id);
      clearTimeout(pending.timeout);
      if (message.error) {
        // "already connected" is success for connect — surfaced to callers who
        // check the message; other errors reject.
        pending.reject(new Error(message.error));
      } else {
        // Result may be "ack" OR an echo of the pairing secret — both resolve.
        pending.resolve(message.result);
      }
    } catch (error) {
      console.error("[RemoteSigner] Failed to decrypt response:", error);
    }
  }

  private async sendRequest(
    session: RemoteSignerSession,
    method: string,
    params: unknown[],
    timeoutMs = REQUEST_TIMEOUT_MS
  ): Promise<any> {
    await this.ensureRelays(session.relays);
    const id = randomRequestId();
    const payload = JSON.stringify({
      id,
      method,
      params,
    });
    const ciphertext = await encryptForRemoteSigner(
      session.clientSecretKey,
      session.remotePubkey,
      payload
    );
    const unsignedEvent: any = {
      kind: KIND_NIP46,
      created_at: Math.floor(Date.now() / 1000),
      content: ciphertext,
      tags: [["p", session.remotePubkey]],
      pubkey: getPublicKey(session.clientSecretKey),
    };
    unsignedEvent.id = getEventHash(unsignedEvent);
    const sig = signEvent(unsignedEvent, session.clientSecretKey);
    this.deps.publish({ ...unsignedEvent, sig }, session.relays);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Remote signer request ${method} timed out`));
      }, timeoutMs);
      this.pending.set(id, { method, resolve, reject, timeout });
    });
  }

  private applyNip07Adapter() {
    if (typeof window === "undefined") return;
    const adapter = createRemoteNip07Adapter(this);
    this.adapter = adapter;
    window.nostr = adapter;
  }
}

/**
 * Creates a NIP-07 compatible adapter for the remote signer
 * Includes getRelays and nip44 support for complete NIP-07 compatibility
 */
function createRemoteNip07Adapter(manager: RemoteSignerManager) {
  return {
    getPublicKey: async () => {
      const pubkey = manager.getUserPubkey();
      if (!pubkey) {
        throw new Error("Remote signer not paired");
      }
      return pubkey;
    },
    signEvent: (event: UnsignedEvent) => manager.signEvent(event),
    getRelays: async () => {
      const session = manager.getSession();
      if (!session) return {};
      return session.relays.reduce<
        Record<string, { read: boolean; write: boolean }>
      >((acc, relay) => {
        acc[relay] = { read: true, write: true };
        return acc;
      }, {});
    },
    nip04: {
      encrypt: (pubkey: string, plaintext: string) =>
        manager.nip04Encrypt(pubkey, plaintext),
      decrypt: (pubkey: string, ciphertext: string) =>
        manager.nip04Decrypt(pubkey, ciphertext),
    },
    nip44: {
      encrypt: (pubkey: string, plaintext: string) =>
        manager.nip44Encrypt(pubkey, plaintext),
      decrypt: (pubkey: string, ciphertext: string) =>
        manager.nip44Decrypt(pubkey, ciphertext),
    },
  };
}
