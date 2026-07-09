/**
 * Unified signing resolver pattern (extracted from gittr `ui/src/lib/nostr/signer.ts`).
 *
 * Use this anywhere your app signs events — not only at login. Remote signer users
 * have `pubkey` in context before `window.nostr` is attached (async bootstrap).
 */
import type { Event as NostrEvent, UnsignedEvent } from "nostr-tools";

import type { RemoteSignerManager } from "./remote-signer";

export const NO_SIGNING_METHOD_MESSAGE =
  "No signing method available. Use NIP-07, pair a remote signer (NIP-46), or configure nsec in Settings.";

export interface ResolvedNostrSigner {
  source: "nip07" | "remote" | "nsec";
  signEvent: (event: UnsignedEvent | NostrEvent) => Promise<NostrEvent>;
  getPublicKey: () => Promise<string>;
  usesWindowNostr: boolean;
  privateKey?: string;
}

export async function resolveNostrSigner(options: {
  remoteSigner?: RemoteSignerManager | null;
  getStoredPrivateKey?: () => Promise<string | null>;
  maxWaitMs?: number;
}): Promise<ResolvedNostrSigner | null> {
  const { remoteSigner, getStoredPrivateKey, maxWaitMs = 8000 } = options;

  if (remoteSigner?.ensureBootstrapped) {
    try {
      await Promise.race([
        remoteSigner.ensureBootstrapped(),
        new Promise<void>((resolve) => setTimeout(resolve, maxWaitMs)),
      ]);
    } catch {
      // Continue — adapter may still be ready.
    }
  }

  if (typeof window !== "undefined" && window.nostr) {
    try {
      await window.nostr.getPublicKey();
      return {
        source: remoteSigner?.getState?.() === "ready" ? "remote" : "nip07",
        getPublicKey: () => window.nostr!.getPublicKey(),
        signEvent: (event) => window.nostr!.signEvent(event),
        usesWindowNostr: true,
      };
    } catch {
      // Fall through.
    }
  }

  if (remoteSigner?.getState?.() === "ready" && remoteSigner.getUserPubkey?.()) {
    return {
      source: "remote",
      getPublicKey: async () => {
        const pk = remoteSigner.getUserPubkey?.();
        if (!pk) throw new Error("Remote signer not paired");
        return pk;
      },
      signEvent: (event) => remoteSigner.signEvent(event),
      usesWindowNostr: false,
    };
  }

  const privateKey = getStoredPrivateKey ? await getStoredPrivateKey() : null;
  if (privateKey) {
    const { getEventHash, getPublicKey, signEvent } = await import("nostr-tools");
    return {
      source: "nsec",
      privateKey,
      getPublicKey: async () => getPublicKey(privateKey),
      signEvent: async (event) => {
        const pubkey = event.pubkey || getPublicKey(privateKey);
        const unsigned = { ...event, pubkey } as UnsignedEvent;
        const id =
          "id" in event && typeof event.id === "string"
            ? event.id
            : getEventHash(unsigned);
        const toSign = { ...unsigned, id, sig: "" };
        return {
          ...toSign,
          sig: signEvent(toSign as UnsignedEvent, privateKey),
        } as NostrEvent;
      },
      usesWindowNostr: false,
    };
  }

  return null;
}
