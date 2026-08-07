/**
 * Filter clone URLs shown in a repo sidebar.
 *
 * Keep forge `source` + primary git host + every host on the Push allowlist
 * (GRASP_SERVERS_FOR_PUSHING). Hide bare IPs and random third-party GRASP hosts
 * that are not on that allowlist.
 *
 * Source: gittr/ui/src/lib/utils/filter-display-clone-urls.ts
 * Synced: 2026-08-07
 *
 * MIT — keep this attribution when copying into your project.
 *
 * Pass `isGraspServer` / `isGraspDomainForPushing` from the grasp-detection /
 * grasp-servers snippets (injectable).
 */

const UPSTREAM_HOSTS = ["github.com", "gitlab.com", "codeberg.org"] as const;

/** Hostname for https URLs, or host part of git@host:path */
export function gitUrlHostname(url: string): string {
  const u = String(url || "").trim();
  if (!u || u.startsWith("nostr://")) return "";
  if (/^git@/i.test(u)) {
    return (u.slice(4).split(":")[0] ?? "").toLowerCase();
  }
  try {
    const withProto =
      u.startsWith("http://") || u.startsWith("https://") ? u : `https://${u}`;
    return new URL(withProto).hostname.toLowerCase();
  } catch {
    return "";
  }
}

export function primaryGitHostFromEnv(
  envUrl: string | undefined
): string | null {
  if (!envUrl || typeof envUrl !== "string") return null;
  const t = envUrl.trim().replace(/^["']|["']$/g, "");
  if (!t) return null;
  const h = gitUrlHostname(t);
  return h || null;
}

/** Bare IPv4 / IPv6 hosts — fine for fetch, noisy for sidebar clone lists. */
export function isIpLiteralHostname(host: string): boolean {
  const h = String(host || "")
    .trim()
    .toLowerCase()
    .replace(/^\[|\]$/g, "");
  if (!h) return false;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h)) return true;
  if (h.includes(":")) return true;
  return false;
}

function isKnownUpstreamHost(host: string): boolean {
  return UPSTREAM_HOSTS.some((d) => host === d || host.endsWith(`.${d}`));
}

function sourceMatchesUpstreamClone(
  cloneUrl: string,
  sourceUrl: string | undefined
): boolean {
  if (!sourceUrl) return false;
  const uh = gitUrlHostname(cloneUrl);
  const sh = gitUrlHostname(sourceUrl);
  if (!uh || !sh) return false;
  if (!isKnownUpstreamHost(uh) || !isKnownUpstreamHost(sh)) return false;
  return uh === sh;
}

/**
 * Sidebar clone list: keep primary + forge source + pushable GRASP mirrors.
 * Do NOT collapse to primary-only when primary is present (Aug 2026 regression).
 */
export function filterDisplayCloneUrlsForSidebar(
  urls: string[],
  options: {
    primaryGitServerEnv?: string;
    sourceUrl?: string;
    /** Inject from grasp-detection snippet — default treats nothing as GRASP. */
    isGraspServer?: (url: string) => boolean;
    /** Inject from grasp-servers snippet — push allowlist. */
    isGraspDomainForPushing?: (hostOrUrl: string) => boolean;
  }
): string[] {
  const isGrasp = options.isGraspServer ?? (() => false);
  const isPushable = options.isGraspDomainForPushing ?? (() => false);

  const withoutEmpty = urls
    .map((u) => String(u || "").trim())
    .filter(Boolean);

  const hasNamedHost = withoutEmpty.some((u) => {
    if (u.startsWith("nostr://")) return true;
    const h = gitUrlHostname(u);
    return !!h && !isIpLiteralHostname(h);
  });
  const withoutBareIps = hasNamedHost
    ? withoutEmpty.filter((u) => {
        if (u.startsWith("nostr://")) return true;
        return !isIpLiteralHostname(gitUrlHostname(u));
      })
    : withoutEmpty;

  const primary = primaryGitHostFromEnv(options.primaryGitServerEnv);
  const src = options.sourceUrl?.trim();

  return withoutBareIps.filter((u) => {
    if (u.startsWith("nostr://")) return true;
    if (src && sourceMatchesUpstreamClone(u, src)) return true;
    const h = gitUrlHostname(u);
    if (primary && h === primary) return true;
    if (isPushable(h) || isPushable(u)) return true;
    if (isGrasp(u)) return false;
    return true;
  });
}
