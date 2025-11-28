/**
 * NIP-46 Remote Signer Integration
 * 
 * Extracted from gittr.space - implements NIP-46 (Remote Signing) for pairing with hardware signers
 * (LNbits Remote Nostr Signer, Nowser bunker, etc.) without exposing private keys to the browser.
 * 
 * NIP-46: https://nips.nostr.com/46
 * 
 * Usage:
 * ```typescript
 * import { RemoteSignerManager, parseRemoteSignerUri } from './remote-signer';
 * 
 * // Parse a bunker:// or nostrconnect:// URI
 * const config = parseRemoteSignerUri('bunker://<pubkey>?relay=wss://...');
 * 
 * // Initialize manager
 * const manager = new RemoteSignerManager({
 *   publish: (event, relays) => { /* publish to relays */ },
 *   subscribe: (filters, relays, onEvent) => { /* subscribe to relays */ return () => {}; },
 * });
 * 
 * // Connect to remote signer
 * const { session, npub } = await manager.connect(uri);
 * 
 * // Sign events via remote signer (NIP-07 compatible)
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
  type Kind
} from "nostr-tools";

// Storage key for session persistence
const STORAGE_KEY = "nostr:remote-signer-session";
const REQUEST_TIMEOUT_MS = 15000;
const KIND_NIP46 = 24133 as Kind; // NIP-46 request/response events

export interface RemoteSignerConfig {
  remotePubkey: string;  // Remote signer's pubkey (from bunker:// or nostrconnect:// URI)
  relays: string[];      // Relays the remote signer uses
  secret?: string;        // Optional shared secret for authentication
  permissions?: string[]; // Requested permissions (e.g., ["sign_event", "nip44_encrypt"])
  label?: string;        // Optional label for the connection
}

export interface RemoteSignerSession {
  remotePubkey: string;
  relays: string[];
  clientSecretKey: string;  // Ephemeral client secret key (hex)
  clientPubkey: string;     // Ephemeral client pubkey
  userPubkey: string;        // User's pubkey (from remote signer)
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
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
  timeout: ReturnType<typeof setTimeout>;
}

const randomRequestId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

const bytesToHex = (bytes: Uint8Array) =>
  Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

/**
 * Parse bunker:// or nostrconnect:// tokens
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
    const relays = params.getAll("relay").map((relay) => relay.trim()).filter(Boolean);
    if (relays.length === 0) {
      throw new Error("Remote signer token missing relay query param");
    }
    const secret = params.get("secret") || undefined;
    const label = params.get("name") || params.get("label") || undefined;
    return {
      remotePubkey: pubkeyPart.toLowerCase(),
      relays,
      secret,
      label,
    };
  }

  if (trimmed.startsWith("nostrconnect://")) {
    const withoutScheme = trimmed.replace(/^nostrconnect:\/\//i, "");
    const [clientPubkey, query = ""] = withoutScheme.split("?");
    if (!clientPubkey || clientPubkey.length !== 64) {
      throw new Error("Invalid nostrconnect URI: missing client pubkey");
    }
    const params = new URLSearchParams(query);
    const relays = params.getAll("relay").map((relay) => relay.trim()).filter(Boolean);
    if (relays.length === 0) {
      throw new Error("nostrconnect URI missing relay");
    }
    const secret = params.get("secret") || undefined;
    const permissions = params.get("perms")?.split(",").map((p) => p.trim()).filter(Boolean);
    const label = params.get("name") || undefined;
    return {
      remotePubkey: clientPubkey.toLowerCase(),
      relays,
      secret,
      permissions,
      label,
    };
  }

  throw new Error("Unsupported remote signer URI. Use bunker:// or nostrconnect://");
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

export function persistRemoteSignerSession(session: RemoteSignerSession | null) {
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
  onStateChange?: (state: RemoteSignerState, session: RemoteSignerSession | null, error?: string) => void;
  private lastError?: string;

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
   * Attempt to rehydrate existing session from storage.
   */
  async bootstrapFromStorage() {
    const stored = loadStoredRemoteSignerSession();
    if (!stored) return;
    try {
      console.log("[RemoteSigner] Restoring session from storage");
      await this.activateSession(stored);
      this.notifyState("ready");
    } catch (error: any) {
      console.error("[RemoteSigner] Failed to resume session:", error);
      this.clearSession();
      this.notifyState("error", error?.message || "Failed to resume remote signer session");
    }
  }

  /**
   * Pair using bunker/nostrconnect URI
   */
  async connect(uri: string) {
    const config = parseRemoteSignerUri(uri);
    this.notifyState("connecting");

    const clientSecretKey = generatePrivateKey();
    const clientPubkey = getPublicKey(clientSecretKey);
    
    const session: RemoteSignerSession = {
      remotePubkey: config.remotePubkey,
      relays: config.relays,
      clientSecretKey: bytesToHex(clientSecretKey),
      clientPubkey,
      userPubkey: "",
      secret: config.secret,
      permissions: config.permissions,
      label: config.label,
      lastConnected: Date.now(),
    };

    try {
      await this.ensureRelays(session.relays);
      await this.startSubscription(session);

      const connectParams: any[] = [session.remotePubkey];
      if (session.secret) {
        connectParams.push(session.secret);
      }
      if (session.permissions && session.permissions.length > 0) {
        connectParams.push(session.permissions.join(","));
      }
      await this.sendRequest(session, "connect", connectParams, 20000);

      const remotePubkeyHex = await this.sendRequest(session, "get_public_key", []);
      if (!remotePubkeyHex || typeof remotePubkeyHex !== "string") {
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
      this.notifyState("error", error?.message || "Remote signer pairing failed");
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

  private async ensureRelays(relays: string[]) {
    for (const relay of relays) {
      this.deps.addRelay?.(relay);
    }
  }

  private async activateSession(session: RemoteSignerSession) {
    this.session = session;
    persistRemoteSignerSession(session);
    this.applyNip07Adapter();
  }

  private clearSession() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = undefined;
    }
    this.pending.forEach((req) => {
      clearTimeout(req.timeout);
      req.reject(new Error("Session disconnected"));
    });
    this.pending.clear();
    this.session = null;
    persistRemoteSignerSession(null);
    this.restoreOriginalNostr();
  }

  private notifyState(state: RemoteSignerState, error?: string) {
    this.state = state;
    this.lastError = error;
    this.onStateChange?.(state, this.session, error);
  }

  private async startSubscription(session: RemoteSignerSession) {
    if (this.unsubscribe) {
      this.unsubscribe();
    }

    const filters = [
      {
        kinds: [KIND_NIP46],
        "#p": [session.clientPubkey],
      },
    ];

    this.unsubscribe = this.deps.subscribe(
      filters,
      session.relays,
      (event: NostrEvent) => {
        this.handleIncomingEvent(session, event);
      }
    );
  }

  private async handleIncomingEvent(session: RemoteSignerSession, event: NostrEvent) {
    if (event.pubkey !== session.remotePubkey) return;

    try {
      const decrypted = await this.nip04Decrypt(
        session.clientSecretKey,
        session.remotePubkey,
        event.content
      );
      const response = JSON.parse(decrypted);

      const pending = this.pending.get(response.id);
      if (pending) {
        clearTimeout(pending.timeout);
        this.pending.delete(response.id);
        if (response.error) {
          pending.reject(new Error(response.error.message || "Remote signer error"));
        } else {
          pending.resolve(response.result);
        }
      }
    } catch (error) {
      console.error("[RemoteSigner] Failed to handle incoming event:", error);
    }
  }

  private async sendRequest(
    session: RemoteSignerSession,
    method: string,
    params: any[],
    timeoutMs: number = REQUEST_TIMEOUT_MS
  ): Promise<any> {
    const id = randomRequestId();
    const request = { id, method, params };

    const encrypted = await this.nip04Encrypt(
      session.clientSecretKey,
      session.remotePubkey,
      JSON.stringify(request)
    );

    const unsignedEvent: UnsignedEvent = {
      kind: KIND_NIP46,
      created_at: Math.floor(Date.now() / 1000),
      tags: [["p", session.remotePubkey]],
      content: encrypted,
      pubkey: session.clientPubkey,
    };

    const eventId = getEventHash(unsignedEvent);
    const sig = signEvent(unsignedEvent, session.clientSecretKey);

    const event: NostrEvent = {
      ...unsignedEvent,
      id: eventId,
      sig,
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Request timeout: ${method}`));
      }, timeoutMs);

      this.pending.set(id, { resolve, reject, timeout });

      this.deps.publish(event, session.relays);
    });
  }

  private async nip04Encrypt(secretKey: string, pubkey: string, plaintext: string): Promise<string> {
    // Convert hex secret key to Uint8Array
    const secretKeyBytes = new Uint8Array(
      secretKey.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
    );
    return nip04.encrypt(secretKeyBytes, pubkey, plaintext);
  }

  private async nip04Decrypt(secretKey: string, pubkey: string, ciphertext: string): Promise<string> {
    // Convert hex secret key to Uint8Array
    const secretKeyBytes = new Uint8Array(
      secretKey.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
    );
    return nip04.decrypt(secretKeyBytes, pubkey, ciphertext);
  }

  private applyNip07Adapter() {
    if (typeof window === "undefined") return;

    const originalNostr = this.originalNostr;

    window.nostr = {
      getPublicKey: async () => {
        return this.session?.userPubkey || "";
      },

      signEvent: async (event: UnsignedEvent) => {
        if (!this.session) throw new Error("Remote signer not connected");
        const signed = await this.sendRequest(this.session, "sign_event", [event]);
        return signed;
      },

      nip04: {
        encrypt: async (pubkey: string, plaintext: string) => {
          if (!this.session) throw new Error("Remote signer not connected");
          return await this.sendRequest(this.session, "nip04_encrypt", [pubkey, plaintext]);
        },
        decrypt: async (pubkey: string, ciphertext: string) => {
          if (!this.session) throw new Error("Remote signer not connected");
          return await this.sendRequest(this.session, "nip04_decrypt", [pubkey, ciphertext]);
        },
      },
    };
  }

  private restoreOriginalNostr() {
    if (typeof window === "undefined") return;
    if (this.originalNostr) {
      window.nostr = this.originalNostr;
    } else {
      delete (window as any).nostr;
    }
  }
}

