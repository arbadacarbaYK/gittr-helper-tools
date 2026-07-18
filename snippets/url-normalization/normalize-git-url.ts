/**
 * Git URL Normalization
 *
 * Teaching extract of the URL-normalization branches used by gittr's parseGitSource.
 * Source: gittr/ui/src/lib/utils/git-source-fetcher.ts (not a standalone normalize-git-url.ts)
 * Synced: 2026-07-18
 *
 * MIT — keep this attribution when copying into your project.
 */

export interface NormalizedUrl {
  original: string;
  normalized: string;
  protocol: "https" | "ssh" | "git" | "http" | "nostr";
}

/**
 * Normalize a Git URL toward HTTPS for API / clone processing.
 *
 * Handles:
 * - git@host:path → https://host/path
 * - git://host/path → https://host/path
 * - nostr://npub@domain/repo → https://domain/npub/repo (or fallback domain)
 * - Already HTTPS/HTTP → unchanged
 *
 * @param fallbackGraspDomain - Used when nostr:// omits @domain
 */
export function normalizeGitUrl(
  url: string,
  fallbackGraspDomain = "git.gittr.space"
): NormalizedUrl {
  if (!url || typeof url !== "string") {
    return {
      original: url || "",
      normalized: url || "",
      protocol: "https",
    };
  }

  const sshMatch = url.match(/^git@([^:]+):(.+)$/);
  if (sshMatch) {
    const [, host, path] = sshMatch;
    return {
      original: url,
      normalized: `https://${host}/${path}`,
      protocol: "ssh",
    };
  }

  if (url.startsWith("git://")) {
    return {
      original: url,
      normalized: url.replace(/^git:\/\//, "https://"),
      protocol: "git",
    };
  }

  if (url.startsWith("nostr://")) {
    const nostrMatch = url.match(
      /^nostr:\/\/([^\/@]+)(?:@([^\/]+))?\/(.+)$/
    );
    if (nostrMatch) {
      const [, npub, domain, repo] = nostrMatch;
      if (npub && repo) {
        const targetDomain = domain || fallbackGraspDomain;
        return {
          original: url,
          normalized: `https://${targetDomain}/${npub}/${repo}`,
          protocol: "nostr",
        };
      }
    }
    return {
      original: url,
      normalized: url,
      protocol: "nostr",
    };
  }

  if (url.startsWith("https://") || url.startsWith("http://")) {
    return {
      original: url,
      normalized: url,
      protocol: url.startsWith("https://") ? "https" : "http",
    };
  }

  return {
    original: url,
    normalized: url,
    protocol: "https",
  };
}

export function normalizeGitUrls(
  urls: string[],
  fallbackGraspDomain?: string
): NormalizedUrl[] {
  return urls.map((u) => normalizeGitUrl(u, fallbackGraspDomain));
}

export function getNormalizedUrls(
  urls: string[],
  fallbackGraspDomain?: string
): string[] {
  return normalizeGitUrls(urls, fallbackGraspDomain).map((n) => n.normalized);
}
