/**
 * NIP-47 Nostr Wallet Connect — URI parse helpers (teaching extract)
 *
 * Format:
 *   nostr+walletconnect://<wallet-pubkey>?relay=wss://...&secret=<hex>&lud16=...
 *
 * Alby (and some others) emit **multiple** `relay=` params, e.g.
 *   ?relay=wss://relay.getalby.com&relay=wss://relay2.getalby.com
 * Always use `getAll("relay")` and try them in order — `get("relay")` alone
 * only returns the first.
 *
 * The `secret` is a **wallet-connection client key** (hex). It is NOT the user's
 * Nostr nsec and is NOT the NIP-46 remote-signer key. Sign NWC requests with this
 * secret only.
 *
 * Do not paste this URI into Amber's "Nostr Connect" / bunker paste — that expects
 * `bunker://` or `nostrconnect://` (NIP-46 login). NWC belongs in payment settings.
 *
 * Source of truth in gittr:
 *   ui/src/lib/payments/nwc-uri.ts
 *   ui/src/lib/payments/nwc-balance.ts
 *   ui/src/lib/payments/nwc-connection-test.ts
 *   ui/src/components/ui/payment-qr.tsx
 *
 * Spec: https://nips.nostr.com/47
 */

export type ParsedNwcUri = {
  /** Wallet service pubkey (64-hex) — host of the URI */
  walletPubkey: string;
  /** First / preferred relay (compat) */
  relay: string;
  /** All relays from the URI (deduped). Try in order if the first is down. */
  relays: string[];
  /** Client secret (hex) — derives the client pubkey used to sign requests */
  secret: string;
  /** Optional Lightning address advertised on the URI */
  lud16?: string;
};

/**
 * Parse a `nostr+walletconnect://…` URI.
 * Throws if wallet pubkey, relay, or secret is missing.
 */
export function parseNwcUri(nwcUri: string): ParsedNwcUri {
  const trimmed = nwcUri.trim();
  if (
    !trimmed.startsWith("nostr+walletconnect://") &&
    !trimmed.startsWith("nostr+walletconnect:")
  ) {
    throw new Error("NWC URI must start with 'nostr+walletconnect://'");
  }

  // URL() does not understand the custom scheme; normalize to http for parsing.
  const normalized = trimmed.replace(/^nostr\+walletconnect:/, "http:");
  const uri = new URL(normalized);

  const walletPubkey = (
    uri.hostname || uri.pathname.replace(/^\/+/, "").replace(/\/$/, "")
  ).toLowerCase();
  const secret = uri.searchParams.get("secret") || "";
  const lud16 = uri.searchParams.get("lud16") || undefined;

  const relays = [
    ...new Set(
      uri.searchParams
        .getAll("relay")
        .map((r) => r.trim())
        .filter((r) => r.startsWith("wss://") || r.startsWith("ws://"))
    ),
  ];

  if (!walletPubkey || walletPubkey.length !== 64) {
    throw new Error("Invalid NWC URI: missing or invalid wallet pubkey");
  }
  if (relays.length === 0) {
    throw new Error("Invalid NWC URI: missing relay");
  }
  if (!secret) {
    throw new Error("Invalid NWC URI: missing secret");
  }

  return {
    walletPubkey,
    relay: relays[0]!,
    relays,
    secret,
    lud16: lud16 || undefined,
  };
}

/** Soft check used by settings UIs before saving. */
export function isLikelyNwcUri(value: string): boolean {
  try {
    parseNwcUri(value);
    return true;
  } catch {
    return false;
  }
}
