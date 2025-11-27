/**
 * Git Source Parser
 * 
 * Extracted from gittr.space - handles parsing clone URLs and determining source types
 * according to NIP-34: https://github.com/nostr-protocol/nips/blob/master/34.md
 * 
 * This utility parses clone URLs from NIP-34 events and identifies:
 * - Nostr git servers (GRASP servers): https://relay.ngit.dev/npub/.../repo.git
 * - GitHub: https://github.com/user/repo.git
 * - Codeberg: https://codeberg.org/user/repo.git
 * - GitLab: https://gitlab.com/user/repo.git
 * - Other git servers
 */

export type GitSourceType = 
  | "nostr-git"      // Nostr git server (grasp): https://relay.ngit.dev/npub/.../repo.git
  | "github"         // GitHub: https://github.com/user/repo.git
  | "codeberg"       // Codeberg: https://codeberg.org/user/repo.git
  | "gitlab"         // GitLab: https://gitlab.com/user/repo.git
  | "unknown";       // Unknown git server

export interface GitSource {
  type: GitSourceType;
  url: string;
  displayName: string;
  owner?: string;
  repo?: string;
  npub?: string; // For nostr-git sources
}

/**
 * Parse a clone URL and determine its source type
 * 
 * Handles:
 * - SSH URLs (git@host:owner/repo) → normalized to https://
 * - git:// URLs → normalized to https://
 * - GRASP server detection
 * - GitHub/Codeberg/GitLab pattern matching
 */
export function parseGitSource(cloneUrl: string, knownGraspDomains: string[] = []): GitSource {
  // Validate input
  if (!cloneUrl || typeof cloneUrl !== "string") {
    console.warn("⚠️ [Git Source] Invalid cloneUrl:", cloneUrl);
    return {
      type: "unknown",
      url: String(cloneUrl || ""),
      displayName: "Invalid URL",
    };
  }
  
  // CRITICAL: Convert SSH URLs (git@host:owner/repo) to https:// for processing
  // SSH format: git@github.com:owner/repo or git@github.com:owner/repo.git
  // We'll convert it to https:// for API calls
  let normalizedUrl = cloneUrl;
  let originalProtocol = "https";
  const sshMatch = cloneUrl.match(/^git@([^:]+):(.+)$/);
  if (sshMatch) {
    const [, host, path] = sshMatch;
    normalizedUrl = `https://${host}/${path}`;
    originalProtocol = "ssh";
    console.log(`🔄 [Git Source] Converting SSH URL to HTTPS for processing: ${normalizedUrl}`);
  } else if (cloneUrl.startsWith("git://")) {
    // CRITICAL: Convert git:// URLs to https:// for processing
    // git:// protocol is used by some git servers (e.g., git://jb55.com/damus)
    // We'll convert it to https:// for the clone API, but preserve original for display
    normalizedUrl = cloneUrl.replace(/^git:\/\//, "https://");
    originalProtocol = "git";
    console.log(`🔄 [Git Source] Converting git:// to https:// for processing: ${normalizedUrl}`);
  }
  
  // Remove .git suffix if present
  const url = normalizedUrl.replace(/\.git$/, "");
  
  // Known git server domains (GRASP servers + custom git servers)
  const knownGitServers = [
    ...knownGraspDomains,
    "git.vanderwarker.family",
    "jb55.com", // Custom git server (not GRASP, but supports git)
  ];
  
  // Nostr git server (grasp) pattern: https://relay.ngit.dev/npub.../repo
  // or: https://ngit.danconwaydev.com/npub.../repo
  // or: https://git.vanderwarker.family/nostr/repo (without npub in path)
  const nostrGitMatch = url.match(/^https?:\/\/([^\/]+)\/(npub[a-z0-9]+)\/([^\/]+)$/i);
  if (nostrGitMatch) {
    const [, domain, npub, repo] = nostrGitMatch;
    if (domain && npub && repo) {
      return {
        type: "nostr-git",
        url: normalizedUrl, // Use normalized URL (https://) for API calls
        displayName: domain,
        npub,
        repo,
      };
    }
  }
  
  // Alternative pattern for git servers without npub in path (e.g., git.vanderwarker.family/nostr/repo)
  // or custom git servers like git://jb55.com/damus
  // These are still considered nostr-git servers if they're known git server domains
  const gitServerMatch = url.match(/^https?:\/\/([^\/]+)\/([^\/]+)\/([^\/]+)$/i);
  if (gitServerMatch) {
    const [, domain, pathSegment, repo] = gitServerMatch;
    // Check if this is a known git server domain
    if (domain && knownGitServers.some(server => domain.includes(server) || server.includes(domain))) {
      return {
        type: "nostr-git",
        url: normalizedUrl, // Use normalized URL (https://) for API calls
        displayName: domain,
        npub: "", // No npub in path
        repo: `${pathSegment}/${repo}`, // Include path segment in repo name
      };
    }
  }
  
  // Pattern for simple git://domain/repo or https://domain/repo (single path segment)
  // e.g., git://jb55.com/damus or https://jb55.com/damus
  const simpleGitMatch = url.match(/^https?:\/\/([^\/]+)\/([^\/]+)$/i);
  if (simpleGitMatch) {
    const [, domain, repo] = simpleGitMatch;
    // Check if this is a known git server domain
    if (domain && knownGitServers.some(server => domain.includes(server) || server.includes(domain))) {
      return {
        type: "nostr-git",
        url: normalizedUrl, // Use normalized URL (https://) for API calls
        displayName: domain,
        npub: "", // No npub in path
        repo: repo,
      };
    }
  }
  
  // GitHub pattern: https://github.com/owner/repo or https://github.com/owner/repo.git
  const githubMatch = url.match(/^https?:\/\/github\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?$/i);
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
      repo: repo.replace(/\.git$/, ""), // Remove .git suffix if present
    };
  }
  
  // Codeberg pattern: https://codeberg.org/owner/repo
  const codebergMatch = url.match(/^https?:\/\/codeberg\.org\/([^\/]+)\/([^\/]+)$/i);
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
  
  // GitLab pattern: https://gitlab.com/owner/repo
  const gitlabMatch = url.match(/^https?:\/\/gitlab\.com\/([^\/]+)\/([^\/]+)$/i);
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
  
  // Unknown source
  try {
    const urlObj = new URL(cloneUrl);
    return {
      type: "unknown",
      url: cloneUrl,
      displayName: urlObj.hostname || "Unknown Git Source",
    };
  } catch (e) {
    // Invalid URL - return safe fallback
    console.warn("⚠️ [Git Source] Invalid URL format:", cloneUrl);
    return {
      type: "unknown",
      url: String(cloneUrl || ""),
      displayName: "Invalid URL",
    };
  }
}

