/**
 * Unified Nostr signing resolver.
 * Supports NIP-07 extensions, NIP-46 remote signers, and stored nsec keys.
 *
 * Source: gittr/ui/src/lib/nostr/signer.ts
 * Synced: 2026-07-18
 *
 * MIT — keep this attribution when copying into your project.
 */
import type { Event as NostrEvent, UnsignedEvent } from "nostr-tools";

import {
  type RemoteSignerManager,
  loadStoredRemoteSignerSession,
} from "./remote-signer";

/**
 * STUB: replace with your app's secure key storage.
 * gittr uses encryptedStorage.getNostrPrivateKey() — do not copy that coupling here.
 */
async function getStoredPrivateKey(): Promise<string | null> {
  // Integrator: return hex/nsec private key from your vault, or null.
  return null;
}

export const NO_SIGNING_METHOD_MESSAGE =
  "No signing method available.\n\nPlease use a NIP-07 extension (like Alby or nos2x), pair with a remote signer (NIP-46 bunker/nostrconnect), or configure a private key in Settings.";

export type NostrSignerSource = "nip07" | "remote" | "nsec";

export interface ResolvedNostrSigner {
  source: NostrSignerSource;
  signEvent: (event: UnsignedEvent | NostrEvent) => Promise<NostrEvent>;
  getPublicKey: () => Promise<string>;
  /** Set when signing via stored nsec */
  privateKey?: string;
  /** True when `window.nostr` is the active signing backend */
  usesWindowNostr: boolean;
}

export function isRemoteSignerReady(
  remoteSigner?: RemoteSignerManager | null
): boolean {
  if (!remoteSigner?.getSession()?.userPubkey) return false;
  // Prefer live RPC health when available (cached pubkey alone is not enough).
  if (typeof (remoteSigner as any).isRpcHealthy === "function") {
    return (remoteSigner as any).isRpcHealthy();
  }
  return remoteSigner.getState() === "ready";
}

export function hasStoredRemoteSignerSession(): boolean {
  if (typeof window === "undefined") return false;
  return !!loadStoredRemoteSignerSession()?.userPubkey;
}

/**
 * Wait for a stored remote signer session to finish bootstrapping
 * (`window.nostr` adapter attached and ready).
 */
export async function waitForRemoteSigner(
  remoteSigner?: RemoteSignerManager | null,
  maxWaitMs = 20000
): Promise<boolean> {
  if (!remoteSigner || !hasStoredRemoteSignerSession()) {
    return false;
  }

  if (isRemoteSignerReady(remoteSigner)) {
    return true;
  }

  try {
    await Promise.race([
      remoteSigner.ensureBootstrapped(),
      new Promise<void>((resolve) => setTimeout(resolve, maxWaitMs)),
    ]);
  } catch {
    // Bootstrap may leave session cached but unhealthy — that is OK.
  }

  return isRemoteSignerReady(remoteSigner);
}

export interface ResolveSignerOptions {
  remoteSigner?: RemoteSignerManager | null;
  /** Wait for remote signer bootstrap when a session exists (default true) */
  waitForRemote?: boolean;
  maxWaitMs?: number;
}

/**
 * Resolve the best available signing method for the current session.
 * Prefer manager API over window.nostr when a remote session exists.
 */
export async function resolveNostrSigner(
  options: ResolveSignerOptions = {}
): Promise<ResolvedNostrSigner | null> {
  const { remoteSigner, waitForRemote = true, maxWaitMs = 8000 } = options;

  const hasRemoteSession = hasStoredRemoteSignerSession();

  if (hasRemoteSession && waitForRemote) {
    await waitForRemoteSigner(remoteSigner, maxWaitMs);
  }

  if (remoteSigner && isRemoteSignerReady(remoteSigner)) {
    return {
      source: "remote",
      getPublicKey: async () => {
        const pubkey = remoteSigner.getUserPubkey();
        if (!pubkey) {
          throw new Error("Remote signer not paired");
        }
        return pubkey;
      },
      signEvent: (event) => remoteSigner.signEvent(event),
      usesWindowNostr: true,
    };
  }

  if (hasRemoteSession && remoteSigner) {
    const pubkey = remoteSigner.getUserPubkey();
    if (pubkey) {
      return {
        source: "remote",
        getPublicKey: async () => pubkey,
        signEvent: (event) => remoteSigner.signEvent(event),
        usesWindowNostr: true,
      };
    }
  }

  if (hasRemoteSession && typeof window !== "undefined" && window.nostr) {
    try {
      const getPublicKey = () => window.nostr!.getPublicKey();
      const pubkey = await getPublicKey();
      if (pubkey) {
        return {
          source: "remote",
          getPublicKey,
          signEvent: (event) => window.nostr!.signEvent(event),
          usesWindowNostr: true,
        };
      }
    } catch (error) {
      console.warn(
        "[Signer] Remote session present but window.nostr adapter not usable:",
        error
      );
    }
  }

  if (typeof window !== "undefined" && window.nostr && !hasRemoteSession) {
    try {
      const getPublicKey = () => window.nostr!.getPublicKey();
      await getPublicKey();
      return {
        source: "nip07",
        getPublicKey,
        signEvent: (event) => window.nostr!.signEvent(event),
        usesWindowNostr: true,
      };
    } catch (error) {
      console.warn("[Signer] window.nostr is present but not usable:", error);
    }
  }

  const privateKey = await getStoredPrivateKey();
  if (privateKey) {
    const {
      getEventHash,
      getPublicKey: ntoolsGetPublicKey,
      signEvent: ntoolsSignEvent,
    } = await import("nostr-tools");
    return {
      source: "nsec",
      privateKey,
      getPublicKey: async () => ntoolsGetPublicKey(privateKey),
      signEvent: async (event) => {
        const pubkey = event.pubkey || ntoolsGetPublicKey(privateKey);
        const unsigned = { ...event, pubkey } as UnsignedEvent;
        const id =
          "id" in event && typeof event.id === "string"
            ? event.id
            : getEventHash(unsigned);
        const toSign = { ...unsigned, id, sig: "" };
        return {
          ...toSign,
          sig: ntoolsSignEvent(toSign as UnsignedEvent, privateKey),
        } as NostrEvent;
      },
      usesWindowNostr: false,
    };
  }

  return null;
}

export async function requireNostrSigner(
  options: ResolveSignerOptions = {}
): Promise<ResolvedNostrSigner> {
  const signer = await resolveNostrSigner(options);
  if (!signer) {
    throw new Error(NO_SIGNING_METHOD_MESSAGE);
  }
  return signer;
}

/**
 * Back-compat helper for UI code that branches on `hasNip07` + `privateKey`.
 */
export async function resolveSigningCredentials(
  options: ResolveSignerOptions = {}
): Promise<{
  hasNip07: boolean;
  privateKey?: string;
  signer: ResolvedNostrSigner;
} | null> {
  const signer = await resolveNostrSigner(options);
  if (!signer) {
    return null;
  }
  return {
    hasNip07: signer.usesWindowNostr,
    privateKey: signer.privateKey,
    signer,
  };
}
