/**
 * Git Source Parser
 *
 * Teaching extract from gittr.space — parse NIP-34 clone URLs and classify source type.
 * Source: gittr/ui/src/lib/utils/git-source-fetcher.ts (parseGitSource + helpers)
 * Synced: 2026-07-26
 *
 * MIT — keep this attribution when copying into your project.
 *
 * Pass `knownGraspDomains` yourself (e.g. from the grasp-detection snippet).
 * Do not require() app-local modules.
 */

export type GitSourceType =
  | "nostr-git" // GRASP: https://relay.ngit.dev/npub/.../repo.git
  | "github"
  | "codeberg"
  | "gitlab"
  | "self-hosted-git" // Gitea/Forgejo / generic user@host:path
  | "unknown";

export interface GitSource {
  type: GitSourceType;
  url: string;
  displayName: string;
  owner?: string;
  repo?: string;
  npub?: string;
}

/**
 * True for https(s) remotes that look like host/owner/repo.
 * Allows `/npub1…/repo` on hosts that are **not** in `knownGraspDomains`
 * (home Freebox, NAS) so callers can use `/api/git/repo-files`.
 */
export function isGenericHttpsGitRemoteUrl(
  raw: string,
  knownGraspDomains: string[] = []
): boolean {
  if (!raw || typeof raw !== "string") return false;
  try {
    let u = raw.trim();
    const sshMatch = u.match(/^git@([^:]+):(.+)$/);
    if (sshMatch) {
      const [, host, path] = sshMatch;
      u = `https://${host}/${path}`;
    } else if (u.startsWith("git://")) {
      u = u.replace(/^git:\/\//, "https://");
    }
    if (!/^https?:\/\//i.test(u)) {
      u = `https://${u}`;
    }
    const parsed = new URL(u);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false;
    }
    const host = parsed.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host.endsWith(".local") ||
      host === "0.0.0.0"
    ) {
      return false;
    }
    const parts = parsed.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return false;
    const ownerSeg = parts[0];
    if (!ownerSeg) return false;
    if (/^npub1[a-z0-9]+$/i.test(ownerSeg)) {
      const isKnownGrasp = knownGraspDomains.some(
        (server) => host.includes(server) || server.includes(host)
      );
      if (isKnownGrasp) return false;
    }
    return true;
  } catch {
    return false;
  }
}

/** Upstream URLs refetchable via server-side git (GitHub/GitLab/Codeberg or generic HTTPS). */
export function isRefetchableUpstreamSourceUrl(
  raw: string,
  knownGraspDomains: string[] = []
): boolean {
  if (!raw || typeof raw !== "string") return false;
  const t = raw.trim();
  if (
    t.includes("github.com") ||
    t.includes("gitlab.com") ||
    t.includes("codeberg.org")
  ) {
    return true;
  }
  return isGenericHttpsGitRemoteUrl(t, knownGraspDomains);
}

/**
 * Parse a clone URL and determine its source type.
 *
 * @param knownGraspDomains - Inject GRASP hostnames (no hard dependency on grasp-servers).
 */
export function parseGitSource(
  cloneUrl: string,
  knownGraspDomains: string[] = []
): GitSource {
  if (!cloneUrl || typeof cloneUrl !== "string") {
    return {
      type: "unknown",
      url: String(cloneUrl || ""),
      displayName: "Invalid URL",
    };
  }

  let normalizedUrl = cloneUrl;
  const sshMatch = cloneUrl.match(/^git@([^:]+):(.+)$/);
  if (sshMatch) {
    const [, host, path] = sshMatch;
    normalizedUrl = `https://${host}/${path}`;
  } else if (cloneUrl.startsWith("git://")) {
    normalizedUrl = cloneUrl.replace(/^git:\/\//, "https://");
  } else if (cloneUrl.startsWith("nostr://")) {
    // nostr://npub@domain/repo or nostr://npub/repo
    const nostrMatch = cloneUrl.match(
      /^nostr:\/\/([^\/@]+)(?:@([^\/]+))?\/(.+)$/
    );
    if (nostrMatch) {
      const [, npub, domain, repo] = nostrMatch;
      if (npub && repo) {
        const targetDomain =
          domain ||
          (knownGraspDomains.length > 0
            ? knownGraspDomains[0]
            : "git.gittr.space");
        normalizedUrl = `https://${targetDomain}/${npub}/${repo}`;
      }
    }
  } else if (
    /^[^@\s]+@[^:]+:.+$/.test(cloneUrl.trim()) &&
    !cloneUrl.includes("://")
  ) {
    // Generic SSH remote (not only git@): e.g. ubuntu@host:path/to/repo
    const m = cloneUrl.trim().match(/^([^@\s]+)@([^:]+):(.+)$/);
    if (m) {
      const sshUser = m[1];
      const sshHost = m[2];
      const sshPath = m[3];
      if (sshUser && sshHost && sshPath) {
        const repoLeaf =
          sshPath
            .replace(/\/+$/, "")
            .replace(/\.git$/i, "")
            .split("/")
            .filter(Boolean)
            .pop() || sshPath;
        return {
          type: "self-hosted-git",
          url: cloneUrl.trim(),
          displayName: sshHost,
          owner: sshUser,
          repo: repoLeaf,
        };
      }
    }
  }

  const url = normalizedUrl.replace(/\.git$/, "");

  const knownGitServers = [
    ...knownGraspDomains,
    "git.vanderwarker.family",
    "jb55.com",
  ];

  const nostrGitMatch = url.match(
    /^https?:\/\/([^\/]+)\/(npub[a-z0-9]+)\/([^\/]+)$/i
  );
  if (nostrGitMatch) {
    const [, domain, npub, repo] = nostrGitMatch;
    const isKnownGrasp =
      domain &&
      knownGraspDomains.some(
        (server) => domain.includes(server) || server.includes(domain)
      );
    // Only known GRASP hosts → nostr-git. Home Freebox/NAS /npub/ paths fall through to self-hosted.
    if (domain && npub && repo && isKnownGrasp) {
      return {
        type: "nostr-git",
        url: normalizedUrl,
        displayName: domain,
        npub,
        repo,
      };
    }
  }

  const gitServerMatch = url.match(
    /^https?:\/\/([^\/]+)\/([^\/]+)\/([^\/]+)$/i
  );
  if (gitServerMatch) {
    const [, domain, pathSegment, repo] = gitServerMatch;
    if (
      domain &&
      knownGitServers.some(
        (server) => domain.includes(server) || server.includes(domain)
      )
    ) {
      return {
        type: "nostr-git",
        url: normalizedUrl,
        displayName: domain,
        npub: "",
        repo: `${pathSegment}/${repo}`,
      };
    }
  }

  const simpleGitMatch = url.match(/^https?:\/\/([^\/]+)\/([^\/]+)$/i);
  if (simpleGitMatch) {
    const [, domain, repo] = simpleGitMatch;
    if (
      domain &&
      knownGitServers.some(
        (server) => domain.includes(server) || server.includes(domain)
      )
    ) {
      return {
        type: "nostr-git",
        url: normalizedUrl,
        displayName: domain,
        npub: "",
        repo,
      };
    }
  }

  const githubMatch = url.match(
    /^https?:\/\/github\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?$/i
  );
  if (githubMatch) {
    const [, owner, repo] = githubMatch;
    if (!owner || !repo) {
      return {
        type: "unknown",
        url: cloneUrl,
        displayName: "Invalid GitHub URL",
      };
    }
    return {
      type: "github",
      url: cloneUrl,
      displayName: "github.com",
      owner,
      repo: repo.replace(/\.git$/, ""),
    };
  }

  const codebergMatch = url.match(
    /^https?:\/\/codeberg\.org\/([^\/]+)\/([^\/]+)$/i
  );
  if (codebergMatch) {
    const [, owner, repo] = codebergMatch;
    return {
      type: "codeberg",
      url: cloneUrl,
      displayName: "codeberg.org",
      owner,
      repo,
    };
  }

  const gitlabMatch = url.match(
    /^https?:\/\/gitlab\.com\/([^\/]+)\/([^\/]+)$/i
  );
  if (gitlabMatch) {
    const [, owner, repo] = gitlabMatch;
    return {
      type: "gitlab",
      url: cloneUrl,
      displayName: "gitlab.com",
      owner,
      repo,
    };
  }

  const selfHostedMatch = url.match(
    /^https?:\/\/([^\/]+)\/([^\/]+)\/([^\/]+)$/i
  );
  if (selfHostedMatch) {
    const [, host, ownerSeg, repoSeg] = selfHostedMatch;
    if (
      host &&
      ownerSeg &&
      repoSeg &&
      !/^github\.com$/i.test(host) &&
      !/^gitlab\.com$/i.test(host) &&
      !/^codeberg\.org$/i.test(host)
    ) {
      return {
        type: "self-hosted-git",
        url: normalizedUrl,
        displayName: host,
        owner: ownerSeg,
        repo: repoSeg.replace(/\.git$/i, ""),
      };
    }
  }

  try {
    const urlObj = new URL(cloneUrl);
    return {
      type: "unknown",
      url: cloneUrl,
      displayName: urlObj.hostname || "Unknown Git Source",
    };
  } catch {
    return {
      type: "unknown",
      url: String(cloneUrl || ""),
      displayName: "Invalid URL",
    };
  }
}
