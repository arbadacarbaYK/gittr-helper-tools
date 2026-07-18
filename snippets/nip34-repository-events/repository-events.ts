/**
 * NIP-34 Repository Events - Event Creation and Parsing
 *
 * Teaching extract aligned with gittr `buildUnsignedRepositoryEvent`.
 * Source: gittr/ui/src/lib/nostr/events.ts
 * Synced: 2026-07-18
 *
 * MIT — keep this attribution when copying into your project.
 *
 * Host-only clone URLs (e.g. https://git.example.com with no path) break
 * gitworkshop and other clients. Before publishing, run clones through
 * `normalizeCloneUrlsForNip34Announcement` from ../clone-url-quality/.
 *
 * @see https://github.com/nostrability/schemata/tree/master/nips/nip-34
 */

import { getEventHash, getPublicKey, signEvent } from "nostr-tools";

/**
 * Values for tags like `clone` / `relays` may span indices 1..n on one tag row,
 * e.g. `["clone", "https://a/x.git", "https://b/x.git"]`. Older tools emitted one row per URL;
 * parsers should accept both shapes.
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

export const KIND_REPOSITORY_NIP34 = 30617;

export interface RepositoryEvent {
  repositoryName: string;
  name?: string;
  description?: string;
  clone?: string[];
  relays?: string[];
  contributors?: Array<{ pubkey: string }>;
  sourceUrl?: string;
  forkedFrom?: string;
  tags?: string[];
  links?: Array<{
    type?: string;
    url: string;
    label?: string;
  }>;
  logoUrl?: string;
  /** gittr extension — optional pay-to-push (sats). See nip34-push-paywall. */
  pushCostSats?: number;
  /** gittr extension — default true when omitted */
  publicRead?: boolean;
  /** gittr extension — default false when omitted */
  publicWrite?: boolean;
}

export interface ParsedRepository {
  repositoryName: string;
  name?: string;
  description?: string;
  clone: string[];
  relays: string[];
  maintainers: string[];
  sourceUrl?: string;
  forkedFrom?: string;
  web: string[];
  topics: string[];
  links: Array<{
    type: string;
    url: string;
    label?: string;
  }>;
  pushCostSats?: number;
  publicRead?: boolean;
  publicWrite?: boolean;
}

/**
 * Build unsigned kind 30617 (matches gittr buildUnsignedRepositoryEvent patterns).
 * Caller hashes/signs. Prefer full clone paths — see ../clone-url-quality/.
 */
export function buildUnsignedRepositoryEvent(
  repo: RepositoryEvent,
  pubkeyHex: string
) {
  const pubkey = pubkeyHex.toLowerCase();
  const tags: string[][] = [["d", repo.repositoryName]];

  const repoName = repo.name || repo.repositoryName;
  if (repoName) {
    tags.push(["name", repoName]);
  }

  const description = (repo.description || "").trim();
  const placeholder = `repository: ${(repoName || repo.repositoryName || "").toLowerCase()}`;
  if (description && description.toLowerCase() !== placeholder) {
    tags.push(["description", description]);
  }

  // Multi-value clone row — expand host-only URLs in your app via clone-url-quality
  if (repo.clone && repo.clone.length > 0) {
    const trimmed = repo.clone
      .map((u) => (typeof u === "string" ? u.trim() : ""))
      .filter(Boolean)
      .slice(0, 12);
    if (trimmed.length > 0) {
      tags.push(["clone", ...trimmed]);
    }
  }

  if (repo.relays && repo.relays.length > 0) {
    const cleaned = repo.relays
      .map((relay) => normalizeRelayWssUrl(String(relay)))
      .filter(Boolean)
      .slice(0, 12);
    if (cleaned.length > 0) {
      tags.push(["relays", ...cleaned]);
    }
  }

  if (repo.tags && repo.tags.length > 0) {
    repo.tags.forEach((tag) => {
      tags.push(["t", tag]);
    });
  }

  // Prefer one multi-value "web" row
  const webVals: string[] = [];
  if (
    repo.logoUrl &&
    (repo.logoUrl.startsWith("http://") || repo.logoUrl.startsWith("https://"))
  ) {
    webVals.push(repo.logoUrl);
  }
  if (repo.links && Array.isArray(repo.links)) {
    repo.links.forEach((link) => {
      if (
        link.url &&
        (link.url.startsWith("http://") || link.url.startsWith("https://"))
      ) {
        webVals.push(link.url);
      }
    });
  }
  if (webVals.length > 0) {
    tags.push(["web", ...webVals]);
  }

  if (
    typeof repo.pushCostSats === "number" &&
    Number.isFinite(repo.pushCostSats) &&
    repo.pushCostSats >= 0
  ) {
    tags.push(["push_cost_sats", String(Math.floor(repo.pushCostSats))]);
  }

  // Maintainers: one multi-value tag with hex pubkeys (ngit expects hex)
  const maintainerPubkeys = new Set<string>();
  if (pubkey && /^[0-9a-f]{64}$/i.test(pubkey)) {
    maintainerPubkeys.add(pubkey);
  }
  if (repo.contributors && Array.isArray(repo.contributors)) {
    repo.contributors.forEach((contributor) => {
      const contributorPubkey = contributor.pubkey;
      if (contributorPubkey && /^[0-9a-f]{64}$/i.test(contributorPubkey)) {
        maintainerPubkeys.add(contributorPubkey.toLowerCase());
      }
    });
  }
  if (maintainerPubkeys.size > 0) {
    tags.push(["maintainers", ...Array.from(maintainerPubkeys)]);
  }

  if (repo.sourceUrl) {
    tags.push(["source", repo.sourceUrl]);
  }
  if (repo.forkedFrom) {
    tags.push(["forkedFrom", repo.forkedFrom]);
  }

  if (repo.links && Array.isArray(repo.links)) {
    repo.links.forEach((link) => {
      if (
        link.url &&
        typeof link.url === "string" &&
        link.url.trim().length > 0
      ) {
        const linkType = (link.type || "other").toString();
        const linkTag: string[] = ["link", linkType, link.url.trim()];
        if (
          link.label &&
          typeof link.label === "string" &&
          link.label.trim().length > 0
        ) {
          linkTag.push(link.label.trim());
        }
        tags.push(linkTag);
      }
    });
  }

  // gittr extensions (clients may ignore)
  const normalizedPublicRead = repo.publicRead !== false;
  const normalizedPublicWrite = repo.publicWrite === true;
  tags.push(["public-read", normalizedPublicRead ? "true" : "false"]);
  tags.push(["public-write", normalizedPublicWrite ? "true" : "false"]);

  return {
    kind: KIND_REPOSITORY_NIP34,
    created_at: Math.floor(Date.now() / 1000),
    tags,
    content: "",
    pubkey,
    id: "",
    sig: "",
  };
}

export function createRepositoryEvent(
  repo: RepositoryEvent,
  privateKey: string
): any {
  const pubkey = getPublicKey(privateKey);
  const event = buildUnsignedRepositoryEvent(repo, pubkey);
  event.id = getEventHash(event);
  event.sig = signEvent(event, privateKey);
  return event;
}

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

  if (event.content && event.content.trim().length > 0) {
    console.warn(
      "[parseNIP34Repository] NIP-34 event has non-empty content - this violates the spec"
    );
  }

  for (const tag of event.tags) {
    if (!Array.isArray(tag) || tag.length < 2) continue;

    const tagName = tag[0];
    const tagValue = tag[1];

    switch (tagName) {
      case "d":
        repoData.repositoryName = tagValue;
        break;
      case "name":
        repoData.name = tagValue;
        break;
      case "description":
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
        const relays = collectTagRowValues(tag)
          .map(normalizeRelayWssUrl)
          .filter(Boolean);
        for (const normalized of relays) {
          if (!repoData.relays.includes(normalized))
            repoData.relays.push(normalized);
        }
        break;
      }
      case "web": {
        const webs = collectTagRowValues(tag);
        for (const w of webs) {
          if (w && !repoData.web.includes(w)) repoData.web.push(w);
        }
        break;
      }
      case "t":
        if (tagValue) repoData.topics.push(tagValue);
        break;
      case "maintainers": {
        // Multi-value hex (and legacy npub / repeated rows)
        const vals = collectTagRowValues(tag);
        for (const v of vals) {
          if (/^[0-9a-f]{64}$/i.test(v)) {
            const hex = v.toLowerCase();
            if (!repoData.maintainers.includes(hex)) {
              repoData.maintainers.push(hex);
            }
          }
          // Legacy npub: leave for caller to decode with nip19 if needed
          else if (v.startsWith("npub1") && !repoData.maintainers.includes(v)) {
            repoData.maintainers.push(v);
          }
        }
        break;
      }
      case "source":
        repoData.sourceUrl = tagValue;
        break;
      case "forkedFrom":
        repoData.forkedFrom = tagValue;
        break;
      case "push_cost_sats": {
        const n = Number.parseInt(tagValue, 10);
        if (Number.isFinite(n) && n >= 0) repoData.pushCostSats = n;
        break;
      }
      case "public-read":
        repoData.publicRead = tagValue === "true";
        break;
      case "public-write":
        repoData.publicWrite = tagValue === "true";
        break;
      case "link":
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
