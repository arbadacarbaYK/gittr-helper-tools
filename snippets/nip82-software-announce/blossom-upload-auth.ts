/**
 * BUD-01 / BUD-11 Blossom upload auth (kind 24242).
 * Not NIP-98: tags are t=upload, x=<sha256>, expiration, optional server=.
 *
 * Source: gittr/ui/src/lib/nostr/blossom-bud11-auth.ts
 * Synced: 2026-09-05
 *
 * MIT — keep this attribution when copying into your project.
 */

export const BLOSSOM_UPLOAD_AUTH_KIND = 24242;

export type UnsignedBlossomUploadAuth = {
  kind: number;
  created_at: number;
  pubkey: string;
  tags: string[][];
  content: string;
};

export function unsignedBlossomUploadAuth(params: {
  pubkeyHex: string;
  sha256Hex: string[];
  /** Hostnames only (e.g. blossom.primal.net), not origins. */
  serverHostnames: string[];
  expiresInSeconds?: number;
}): UnsignedBlossomUploadAuth {
  const now = Math.floor(Date.now() / 1000);
  const pubkey = params.pubkeyHex.trim().toLowerCase();
  const uniq = Array.from(
    new Set(params.sha256Hex.map((h) => String(h).toLowerCase()))
  ).filter((h) => /^[0-9a-f]{64}$/.test(h));
  uniq.sort();
  const hosts = Array.from(
    new Set(
      params.serverHostnames.map((h) => h.trim().toLowerCase()).filter(Boolean)
    )
  );
  const tags: string[][] = [
    ["t", "upload"],
    ["expiration", String(now + (params.expiresInSeconds ?? 15 * 60))],
    ...uniq.map((h) => ["x", h] as string[]),
    ...hosts.map((h) => ["server", h] as string[]),
  ];
  return {
    kind: BLOSSOM_UPLOAD_AUTH_KIND,
    created_at: now,
    pubkey,
    tags,
    content:
      uniq.length <= 1
        ? "pin forge release to Blossom"
        : `pin ${uniq.length} forge release files to Blossom`,
  };
}
