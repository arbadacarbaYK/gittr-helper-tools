/**
 * Public Blossom hosts gittr may pin NIP-82 installers to.
 * gittr Pages Blossom (blossom.gittr.space) is never an Apps pin target.
 *
 * Source: gittr/ui/src/lib/nostr/nip82-blossom-hosts.ts
 * Synced: 2026-09-05
 *
 * MIT — keep this attribution when copying into your project.
 */

export const APPS_BLOSSOM_ORIGINS = [
  "https://blossom.primal.net",
  "https://blossom.ditto.pub",
  "https://haven.danconwaydev.com",
] as const;

const GITTR_PAGES_BLOSSOM_HOST = "blossom.gittr.space";

const SHA256_PATH = /^\/[0-9a-f]{64}(?:\.[a-z0-9]{1,12})?$/i;

function hostnameOf(originOrUrl: string): string | null {
  try {
    return new URL(originOrUrl).hostname.toLowerCase();
  } catch {
    return null;
  }
}

export function isGittrPagesBlossomHostname(hostname: string): boolean {
  const h = (hostname || "").toLowerCase();
  if (!h) return false;
  if (h === GITTR_PAGES_BLOSSOM_HOST) return true;
  if (h.includes("blossom") && h.endsWith(".gittr.space")) return true;
  return false;
}

export function appsBlossomHostnames(): string[] {
  return APPS_BLOSSOM_ORIGINS.map((o) => hostnameOf(o)).filter(
    (h): h is string => Boolean(h)
  );
}

/** Kind 3063 `url` override — HTTPS blob on an allowlisted host only. */
export function allowedAppsBlossomAssetUrl(url: string): string | null {
  const raw = (url || "").trim();
  if (!raw) return null;
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:") return null;
  if (parsed.search || parsed.hash) return null;
  const host = parsed.hostname.toLowerCase();
  if (isGittrPagesBlossomHostname(host)) return null;
  if (!appsBlossomHostnames().includes(host)) return null;
  if (!SHA256_PATH.test(parsed.pathname)) return null;
  return `https://${host}${parsed.pathname.toLowerCase()}`;
}
