/**
 * NIP-34 Repository Events - Event Creation and Parsing
 * 
 * Utilities for creating and parsing NIP-34 (kind:30617) repository announcement events on Nostr.
 * 
 * NIP-34 uses tags-only format with empty content for spec compliance and interoperability
 * with other Nostr clients (e.g., gitworkshop.dev, ngit clients).
 * 
 * @see https://github.com/nostrability/schemata/tree/master/nips/nip-34
 */

import { getEventHash, getPublicKey, signEvent, nip19 } from "nostr-tools";

/**
 * Values for tags like `clone` / `relays` may span indices 1..n on one tag row,
 * e.g. `["clone", "https://a/x.git", "https://b/x.git"]`. Older tools emitted one row per URL;
 * parsers should accept both shapes (matches gittr production + `nip34-tag-values` helpers).
 */
function collectTagRowValues(tag: string[]): string[] {
  const out: string[] = [];
  for (let i = 1; i < tag.length; i++) {
    const raw = String(tag[i] ?? "").trim();
    if (!raw) continue;
    if (raw.includes(",")) {
      raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .forEach((s) => out.push(s));
    } else {
      out.push(raw);
    }
  }
  return out;
}

function normalizeRelayWssUrl(relay: string): string {
  const t = relay.trim();
  if (!t) return "";
  if (t.startsWith("wss://") || t.startsWith("ws://")) return t;
  return `wss://${t}`;
}

/**
 * Event kind for NIP-34 repository announcements
 */
export const KIND_REPOSITORY_NIP34 = 30617;

/**
 * Interface for creating a repository event
 */
export interface RepositoryEvent {
  repositoryName: string;        // REQUIRED: Repository identifier (d tag)
  name?: string;                 // Human-readable name (falls back to repositoryName)
  description?: string;         // Repository description
  clone?: string[];              // REQUIRED: Git clone URLs (at least one)
  relays?: string[];             // Nostr relay URLs
  contributors?: Array<{ pubkey: string }>; // Contributors (added as maintainers)
  sourceUrl?: string;            // Source repository URL
  forkedFrom?: string;           // NIP-34 format fork reference
  tags?: string[];               // Topics/tags for categorization
  links?: Array<{                // Structured links
    type?: string;
    url: string;
    label?: string;
  }>;
  logoUrl?: string;              // Logo URL (added as web tag)
}

/**
 * Parsed repository data structure
 */
export interface ParsedRepository {
  repositoryName: string;
  name?: string;
  description?: string;
  clone: string[];
  relays: string[];
  maintainers: string[];         // Normalized to hex format
  sourceUrl?: string;
  forkedFrom?: string;
  web: string[];
  topics: string[];
  links: Array<{
    type: string;
    url: string;
    label?: string;
  }>;
}

/**
 * Creates a NIP-34 repository announcement event
 * 
 * @param repo - Repository data
 * @param privateKey - Private key for signing
 * @returns Signed Nostr event (kind:30617)
 * 
 * @example
 * ```typescript
 * const repo: RepositoryEvent = {
 *   repositoryName: "my-repo",
 *   name: "My Repository",
 *   description: "A cool repository",
 *   clone: ["https://git.example.com/npub1…/my-repo.git"],
 *   relays: ["wss://relay.example.com"],
 *   contributors: [{ pubkey: "abc123..." }]
 * };
 * 
 * const event = createRepositoryEvent(repo, privateKey);
 * await publish(event, relays);
 * ```
 */
export function createRepositoryEvent(
  repo: RepositoryEvent,
  privateKey: string
): any {
  const pubkey = getPublicKey(privateKey);
  
  // NIP-34: Build tags array with all required metadata
  const tags: string[][] = [
    ["d", repo.repositoryName], // REQUIRED: Replaceable event identifier
  ];
  
  // NIP-34: Add name tag (human-readable project name)
  const repoName = repo.name || repo.repositoryName;
  if (repoName) {
    tags.push(["name", repoName]);
  }
  
  // NIP-34: Add description tag
  const description = repo.description || `Repository: ${repoName || repo.repositoryName}`;
  if (description) {
    tags.push(["description", description]);
  }
  
  // NIP-34: clone — prefer one row with multiple HTTPS URLs (gittr production shape).
  // Avoid git@ SSH in announcements meant for browser/ngit clients; expose SSH via UI/env instead.
  if (repo.clone && repo.clone.length > 0) {
    const trimmed = repo.clone
      .map((u) => (typeof u === "string" ? u.trim() : ""))
      .filter(Boolean);
    if (trimmed.length > 0) {
      tags.push(["clone", ...trimmed]);
    }
  }

  // NIP-34: relays — same multi-value row shape as gittr (see nostr-protocol/nips 34.md examples).
  if (repo.relays && repo.relays.length > 0) {
    const normalizedRelays = repo.relays
      .map((r) => normalizeRelayWssUrl(String(r).trim()))
      .filter(Boolean);
    if (normalizedRelays.length > 0) {
      tags.push(["relays", ...normalizedRelays]);
    }
  }
  
  // NIP-34: Add topics/tags
  if (repo.tags && repo.tags.length > 0) {
    repo.tags.forEach(tag => {
      tags.push(["t", tag]);
    });
  }
  
  // NIP-34: Add web tags (from logoUrl or links array)
  if (repo.logoUrl && (repo.logoUrl.startsWith("http://") || repo.logoUrl.startsWith("https://"))) {
    tags.push(["web", repo.logoUrl]);
  }
  if (repo.links && Array.isArray(repo.links)) {
    repo.links.forEach(link => {
      if (link.url && (link.url.startsWith("http://") || link.url.startsWith("https://"))) {
        tags.push(["web", link.url]);
      }
    });
  }
  
  // NIP-34: Add maintainers tags (from contributors + owner)
  const maintainerPubkeys = new Set<string>();
  
  // Add event publisher (owner) as maintainer
  if (pubkey && /^[0-9a-f]{64}$/i.test(pubkey)) {
    maintainerPubkeys.add(pubkey);
  }
  
  // Add contributors as maintainers
  if (repo.contributors && Array.isArray(repo.contributors)) {
    repo.contributors.forEach(contributor => {
      const contributorPubkey = contributor.pubkey;
      if (contributorPubkey && /^[0-9a-f]{64}$/i.test(contributorPubkey)) {
        maintainerPubkeys.add(contributorPubkey);
      }
    });
  }
  
  // Add all maintainers to tags (use npub format per best practices)
  maintainerPubkeys.forEach(maintainerPubkey => {
    try {
      const npub = nip19.npubEncode(maintainerPubkey);
      tags.push(["maintainers", npub]);
    } catch (e) {
      // Fallback to hex if encoding fails
      tags.push(["maintainers", maintainerPubkey]);
    }
  });
  
  // NIP-34: Add source and forkedFrom tags if present
  if (repo.sourceUrl) {
    tags.push(["source", repo.sourceUrl]);
  }
  if (repo.forkedFrom) {
    tags.push(["forkedFrom", repo.forkedFrom]);
  }
  
  // NIP-34: Add link tags if present
  if (repo.links && Array.isArray(repo.links)) {
    repo.links.forEach(link => {
      if (link.url && typeof link.url === "string" && link.url.trim().length > 0) {
        const linkType = (link.type || "other").toString();
        const linkTag: string[] = ["link", linkType, link.url.trim()];
        if (link.label && typeof link.label === "string" && link.label.trim().length > 0) {
          linkTag.push(link.label.trim());
        }
        tags.push(linkTag);
      }
    });
  }
  
  // NIP-34: Content field MUST be empty per spec
  // All metadata goes in tags, not in content
  const event = {
    kind: KIND_REPOSITORY_NIP34,
    created_at: Math.floor(Date.now() / 1000),
    tags,
    content: "", // REQUIRED: Must be empty per NIP-34 spec
    pubkey,
    id: "",
    sig: "",
  };

  event.id = getEventHash(event);
  event.sig = signEvent(event, privateKey);
  return event;
}

/**
 * Parses a NIP-34 repository event and extracts all tags
 * 
 * @param event - The Nostr event (kind:30617)
 * @returns Parsed repository data
 * 
 * @example
 * ```typescript
 * const parsed = parseNIP34Repository(event);
 * console.log(parsed.repositoryName); // "my-repo"
 * console.log(parsed.clone);         // ["https://github.com/user/repo.git"]
 * console.log(parsed.maintainers);   // ["abc123...", "def456..."]
 * ```
 */
export function parseNIP34Repository(event: {
  tags: string[][];
  content: string;
}): ParsedRepository {
  const repoData: ParsedRepository = {
    repositoryName: "",
    clone: [],
    relays: [],
    maintainers: [],
    web: [],
    topics: [],
    links: [],
  };
  
  if (!event.tags || !Array.isArray(event.tags)) {
    return repoData;
  }
  
  // CRITICAL: Validate content is empty per NIP-34 spec
  if (event.content && event.content.trim().length > 0) {
    console.warn("⚠️ [parseNIP34Repository] NIP-34 event has non-empty content - this violates the spec");
  }
  
  for (const tag of event.tags) {
    if (!Array.isArray(tag) || tag.length < 2) continue;
    
    const tagName = tag[0];
    const tagValue = tag[1];
    
    switch (tagName) {
      case "d":
        // Repository identifier (REQUIRED)
        repoData.repositoryName = tagValue;
        break;
      case "name":
        // Human-readable name
        repoData.name = tagValue;
        break;
      case "description":
        // Repository description
        repoData.description = tagValue;
        break;
      case "clone": {
        const urls = collectTagRowValues(tag);
        for (const u of urls) {
          if (u && !repoData.clone.includes(u)) repoData.clone.push(u);
        }
        break;
      }
      case "relays": {
        const relays = collectTagRowValues(tag).map(normalizeRelayWssUrl).filter(Boolean);
        for (const normalized of relays) {
          if (!repoData.relays.includes(normalized)) repoData.relays.push(normalized);
        }
        break;
      }
      case "web":
        // Website URL (can repeat)
        if (tagValue) repoData.web.push(tagValue);
        break;
      case "t":
        // Topic/tag (can repeat)
        if (tagValue) repoData.topics.push(tagValue);
        break;
      case "maintainers":
        // Maintainer pubkey (can repeat, accepts both npub and hex)
        if (tagValue) {
          try {
            // Try to decode npub format
            const decoded = nip19.decode(tagValue);
            if (decoded.type === "npub") {
              const hexPubkey = (decoded.data as string).toLowerCase();
              if (!repoData.maintainers.includes(hexPubkey)) {
                repoData.maintainers.push(hexPubkey);
              }
            }
          } catch (e) {
            // Not npub format, try hex
            if (/^[0-9a-f]{64}$/i.test(tagValue)) {
              const hexPubkey = tagValue.toLowerCase();
              if (!repoData.maintainers.includes(hexPubkey)) {
                repoData.maintainers.push(hexPubkey);
              }
            }
          }
        }
        break;
      case "source":
        // Source repository URL
        repoData.sourceUrl = tagValue;
        break;
      case "forkedFrom":
        // NIP-34 format fork reference
        repoData.forkedFrom = tagValue;
        break;
      case "link":
        // Structured link: [type, url, label?]
        if (tag.length >= 3) {
          repoData.links.push({
            type: tag[1] || "other",
            url: tag[2] || "",
            label: tag[3],
          });
        }
        break;
    }
  }
  
  return repoData;
}

