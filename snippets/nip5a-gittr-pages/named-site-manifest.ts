/**
 * Build an unsigned NIP-5A named site manifest (kind 35128).
 *
 * Source: gittr/ui/src/lib/gittr-pages/publish-named-site-manifest.ts (tag shape)
 * Synced: 2026-07-18
 *
 * MIT — keep this attribution when copying into your project.
 *
 * Blossom upload (24242) and gateway URL assembly are host-specific — see README.
 */

export const KIND_NSITE_NAMED = 35128;

export type NamedSitePathEntry = {
  /** Web-absolute path, e.g. `/index.html` */
  webPath: string;
  /** Lowercase hex SHA-256 of the uploaded bytes */
  sha256: string;
};

export type BuildNamedSiteManifestInput = {
  dTag: string;
  paths: NamedSitePathEntry[];
  /** Blossom HTTP origin, e.g. https://blossom.example */
  server: string;
  title: string;
  description?: string;
  sourceUrl?: string;
  /** wss:// relays for the gateway (singular `relay` tags) */
  relays?: string[];
  pubkey: string;
  createdAt?: number;
};

/**
 * Returns an unsigned event ready for getEventHash + signEvent.
 * Content is always empty per NIP-5A / gittr Pages.
 */
export function buildUnsignedNamedSiteManifest(
  input: BuildNamedSiteManifestInput
): {
  kind: number;
  created_at: number;
  tags: string[][];
  content: string;
  pubkey: string;
  id: string;
  sig: string;
} {
  const dTag = (input.dTag || "").trim();
  if (!dTag || dTag.length > 13) {
    throw new Error("dTag must be 1–13 characters (see slugToNsiteDTag)");
  }
  if (!input.paths?.length) {
    throw new Error("At least one path entry is required");
  }
  const hasIndex = input.paths.some(
    (p) => p.webPath.replace(/\/+/g, "/").toLowerCase() === "/index.html"
  );
  if (!hasIndex) {
    throw new Error("Manifest must include /index.html");
  }

  const tags: string[][] = [
    ["d", dTag],
    ...input.paths.map((u) => [
      "path",
      u.webPath.startsWith("/") ? u.webPath : `/${u.webPath}`,
      u.sha256.toLowerCase(),
    ]),
    ["server", input.server.replace(/\/$/, "")],
    ["title", (input.title || dTag).slice(0, 200)],
  ];

  if (input.description?.trim()) {
    tags.push(["description", input.description.trim().slice(0, 500)]);
  }
  if (input.sourceUrl?.trim() && /^https?:\/\//i.test(input.sourceUrl.trim())) {
    tags.push(["source", input.sourceUrl.trim()]);
  }
  for (const r of input.relays || []) {
    const url = (r || "").trim();
    if (url.startsWith("wss://") || url.startsWith("ws://")) {
      tags.push(["relay", url]);
    }
  }

  return {
    kind: KIND_NSITE_NAMED,
    created_at: input.createdAt ?? Math.floor(Date.now() / 1000),
    tags,
    content: "",
    pubkey: input.pubkey.toLowerCase(),
    id: "",
    sig: "",
  };
}
