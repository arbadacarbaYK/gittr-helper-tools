/**
 * NIP-47 Nostr Wallet Connect — client RPC (teaching extract)
 *
 * Browser-side only: the NWC `secret` must NEVER leave the client.
 * Connect WebSocket directly to the wallet's relay; encrypt with NIP-04
 * (or NIP-44 when the wallet advertises it on its info event).
 *
 * Event kinds:
 *   23194 — request  (client → wallet, tagged ["p", walletPubkey])
 *   23195 — response (wallet → client, tagged ["e", requestEventId])
 *
 * CRITICAL: always match the response `e` tag to your request event id.
 *
 * This is NOT NIP-46. Remote signer (NIP-46, kind 24133) is for signing Nostr
 * identity events. NWC is for controlling a Lightning wallet. Same “encrypted
 * RPC over relays” shape; different URI, keys, and kinds.
 *
 * Depends on: nostr-tools (getEventHash, getPublicKey, nip04, signEvent)
 * Optional:   nip44 for wallets that advertise nip44_v2
 *
 * Source of truth in gittr:
 *   ui/src/lib/payments/nwc-balance.ts
 *   ui/src/lib/payments/nwc-connection-test.ts
 *   ui/src/components/ui/payment-qr.tsx (pay_invoice)
 */

import { getEventHash, getPublicKey, nip04, signEvent } from "nostr-tools";
import { parseNwcUri, type ParsedNwcUri } from "./nwc-uri";

export type NwcMethod =
  | "pay_invoice"
  | "get_balance"
  | "get_info"
  | "make_invoice";

export type NwcRpcResult = {
  /** Decrypted wallet result object (shape depends on method) */
  result?: Record<string, unknown>;
  error?: { code?: number; message?: string };
};

export type NwcPayResult = {
  preimage?: string;
  fees_paid?: number;
};

export type NwcBalanceResult = {
  /** Balance in millisats */
  balance: number;
  balanceSats: number;
};

type EncryptFn = (
  secretHex: string,
  walletPubkey: string,
  plaintext: string
) => Promise<string>;

type DecryptFn = (
  secretHex: string,
  walletPubkey: string,
  ciphertext: string
) => Promise<string>;

const defaultEncrypt: EncryptFn = (sk, pk, text) => nip04.encrypt(sk, pk, text);
const defaultDecrypt: DecryptFn = (sk, pk, text) => nip04.decrypt(sk, pk, text);

/**
 * Low-level NIP-47 RPC over a single relay WebSocket.
 * Subscribe first, then publish the request; wait for kind 23195 with matching `e`.
 *
 * Relay policy (gittr): ALWAYS use `parsed.relay` from the NWC URI.
 * Do not substitute the app's Nostr relay pool. Clients that only talk to a
 * fixed pool (and skip/ignore URI `relay=`) lock out wallets on uncommon relays.
 */
export async function nwcRpc(options: {
  nwcUri: string;
  method: NwcMethod;
  params?: Record<string, unknown>;
  timeoutMs?: number;
  encrypt?: EncryptFn;
  decrypt?: DecryptFn;
}): Promise<NwcRpcResult> {
  const parsed = parseNwcUri(options.nwcUri);
  const encrypt = options.encrypt ?? defaultEncrypt;
  const decrypt = options.decrypt ?? defaultDecrypt;
  const timeoutMs = options.timeoutMs ?? 30_000;

  const sk = parsed.secret;
  const clientPubkey = getPublicKey(sk);
  const payload = {
    method: options.method,
    params: options.params ?? {},
  };

  const encryptedContent = await encrypt(
    sk,
    parsed.walletPubkey,
    JSON.stringify(payload)
  );

  const requestEvent: Record<string, unknown> = {
    kind: 23194,
    content: encryptedContent,
    tags: [["p", parsed.walletPubkey]],
    created_at: Math.floor(Date.now() / 1000),
    pubkey: clientPubkey,
  };
  requestEvent.id = getEventHash(requestEvent as any);
  requestEvent.sig = signEvent(requestEvent as any, sk);

  return new Promise<NwcRpcResult>((resolve, reject) => {
    const ws = new WebSocket(parsed.relay);
    const subId = `nwc-${options.method}-${Date.now()}`;
    const since = Math.floor(Date.now() / 1000);
    let settled = false;

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        ws.close();
      } catch {
        /* ignore */
      }
      fn();
    };

    const timer = setTimeout(() => {
      finish(() =>
        reject(
          new Error(
            `NWC ${options.method} timed out after ${timeoutMs}ms (relay=${parsed.relay})`
          )
        )
      );
    }, timeoutMs);

    ws.onopen = () => {
      ws.send(
        JSON.stringify([
          "REQ",
          subId,
          {
            kinds: [23195],
            authors: [parsed.walletPubkey],
            since,
          },
        ])
      );
      // Brief delay so the subscription is live before the request lands
      setTimeout(() => {
        ws.send(JSON.stringify(["EVENT", requestEvent]));
      }, 300);
    };

    ws.onmessage = async (message) => {
      try {
        const data = JSON.parse(String(message.data));

        if (
          Array.isArray(data) &&
          data[0] === "OK" &&
          data[1] === requestEvent.id &&
          data[2] === false
        ) {
          finish(() =>
            reject(new Error(`Relay rejected NWC request: ${data[3] || "unknown"}`))
          );
          return;
        }

        if (!(Array.isArray(data) && data[0] === "EVENT" && data[1] === subId)) {
          return;
        }

        const event = data[2];
        if (!event || event.kind !== 23195 || event.pubkey !== parsed.walletPubkey) {
          return;
        }

        // NIP-47: response MUST reference the request id via `e` tag
        const eTag = event.tags?.find((t: string[]) => t[0] === "e");
        if (!eTag || eTag[1] !== requestEvent.id) {
          return; // not our response
        }

        const decrypted = await decrypt(sk, parsed.walletPubkey, event.content);
        const response = JSON.parse(decrypted) as NwcRpcResult;

        finish(() => resolve(response));
      } catch (err: any) {
        finish(() =>
          reject(new Error(`Failed to handle NWC response: ${err?.message || err}`))
        );
      }
    };

    ws.onerror = () => {
      finish(() => reject(new Error(`WebSocket error talking to ${parsed.relay}`)));
    };
  });
}

/** Pay a BOLT11 invoice via NWC `pay_invoice`. */
export async function payInvoiceWithNwc(
  nwcUri: string,
  invoice: string,
  timeoutMs = 60_000
): Promise<NwcPayResult> {
  const clean = invoice.trim().toLowerCase().replace(/^lightning:/, "");
  const response = await nwcRpc({
    nwcUri,
    method: "pay_invoice",
    params: { invoice: clean },
    timeoutMs,
  });

  if (response.error) {
    throw new Error(
      response.error.message ||
        `NWC pay_invoice failed (code ${response.error.code ?? "?"})`
    );
  }

  return (response.result || {}) as NwcPayResult;
}

/** Read wallet balance (millisats). Many wallets only implement pay_invoice. */
export async function getBalanceWithNwc(
  nwcUri: string,
  timeoutMs = 20_000
): Promise<NwcBalanceResult> {
  const response = await nwcRpc({
    nwcUri,
    method: "get_balance",
    params: {},
    timeoutMs,
  });

  if (response.error) {
    const msg = response.error.message || "";
    if (
      response.error.code === -32601 ||
      /method|not supported/i.test(msg)
    ) {
      throw new Error(
        "get_balance is not supported by this wallet. Many wallets only support pay_invoice."
      );
    }
    throw new Error(msg || "NWC get_balance failed");
  }

  const balance = Number((response.result as any)?.balance);
  if (!Number.isFinite(balance)) {
    throw new Error(`Unexpected get_balance result: ${JSON.stringify(response)}`);
  }

  return {
    balance,
    balanceSats: Math.floor(balance / 1000),
  };
}

/**
 * Light connectivity probe: try get_info then get_balance.
 * Useful for Settings → “Test NWC” without requiring a real invoice.
 */
export async function probeNwcConnection(nwcUri: string): Promise<{
  ok: boolean;
  parsed: ParsedNwcUri;
  method?: NwcMethod;
  error?: string;
}> {
  const parsed = parseNwcUri(nwcUri);
  for (const method of ["get_info", "get_balance"] as NwcMethod[]) {
    try {
      const response = await nwcRpc({
        nwcUri,
        method,
        params: {},
        timeoutMs: 10_000,
      });
      // Even a "method not found" error proves the wallet answered
      if (response.result || response.error) {
        return { ok: true, parsed, method };
      }
    } catch (err: any) {
      // try next
      if (method === "get_balance") {
        return {
          ok: false,
          parsed,
          error: err?.message || String(err),
        };
      }
    }
  }
  return { ok: false, parsed, error: "No response from wallet" };
}
