/**
 * Git URL Normalization
 * 
 * Extracted from gittr.space - handles converting various Git URL formats to HTTPS
 * 
 * This utility normalizes:
 * - SSH URLs (git@host:path) → https://host/path
 * - git:// URLs → https://
 * - Preserves original URL for display while providing normalized version for API calls
 */

export interface NormalizedUrl {
  original: string;
  normalized: string;
  protocol: 'https' | 'ssh' | 'git' | 'http';
}

/**
 * Normalize a Git URL to HTTPS format
 * 
 * Handles:
 * - git@host:path → https://host/path
 * - git://host/path → https://host/path
 * - Already HTTPS/HTTP URLs → unchanged
 * 
 * @param url - Git URL in any format
 * @returns Normalized URL object with original and normalized versions
 */
export function normalizeGitUrl(url: string): NormalizedUrl {
  if (!url || typeof url !== "string") {
    return {
      original: url || "",
      normalized: url || "",
      protocol: 'https',
    };
  }

  // SSH format: git@host:path
  const sshMatch = url.match(/^git@([^:]+):(.+)$/);
  if (sshMatch) {
    const [, host, path] = sshMatch;
    const normalized = `https://${host}/${path}`;
    return {
      original: url,
      normalized,
      protocol: 'ssh',
    };
  }

  // git:// protocol
  if (url.startsWith("git://")) {
    const normalized = url.replace(/^git:\/\//, "https://");
    return {
      original: url,
      normalized,
      protocol: 'git',
    };
  }

  // Already HTTPS or HTTP
  if (url.startsWith("https://") || url.startsWith("http://")) {
    return {
      original: url,
      normalized: url,
      protocol: url.startsWith("https://") ? 'https' : 'http',
    };
  }

  // Unknown format - return as-is
  return {
    original: url,
    normalized: url,
    protocol: 'https',
  };
}

/**
 * Normalize multiple Git URLs to HTTPS format
 * 
 * @param urls - Array of Git URLs in any format
 * @returns Array of normalized URL objects
 */
export function normalizeGitUrls(urls: string[]): NormalizedUrl[] {
  return urls.map(normalizeGitUrl);
}

/**
 * Extract normalized URLs only (for API calls)
 * 
 * @param urls - Array of Git URLs in any format
 * @returns Array of normalized HTTPS URLs
 */
export function getNormalizedUrls(urls: string[]): string[] {
  return normalizeGitUrls(urls).map(n => n.normalized);
}

