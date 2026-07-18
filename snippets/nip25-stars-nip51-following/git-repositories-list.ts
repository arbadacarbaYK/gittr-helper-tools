/**
 * NIP-51 Git repositories follow list (kind 10018)
 *
 * Source: gittr/ui/src/lib/nostr/events.ts
 *   (createGitRepositoriesListEvent / parseGitRepositoriesListEvent)
 * Synced: 2026-07-18
 *
 * MIT — keep this attribution when copying into your project.
 */

import { getEventHash, getPublicKey, signEvent } from "nostr-tools";

export const KIND_GIT_REPOSITORIES_LIST = 10018;

const REPO_ADDRESS_RE = /^30617:[0-9a-f]{64}:.+/i;

export interface GitRepositoriesListEvent {
  /** NIP-34 addresses: `30617:<hexPubkey>:<d-tag>` */
  repoAddresses: string[];
}

/** Build unsigned kind 10018 (sign with NIP-07 / NIP-46 / nsec yourself). */
export function buildUnsignedGitRepositoriesListEvent(
  list: GitRepositoriesListEvent,
  pubkeyHex: string
) {
  const uniqueAddresses = Array.from(
    new Set(
      (list.repoAddresses || [])
        .map((a) => a.trim())
        .filter((a) => REPO_ADDRESS_RE.test(a))
    )
  );
  const tags: string[][] = uniqueAddresses.map((address) => ["a", address]);
  return {
    kind: KIND_GIT_REPOSITORIES_LIST,
    created_at: Math.floor(Date.now() / 1000),
    tags,
    content: "",
    pubkey: pubkeyHex.toLowerCase(),
    id: "",
    sig: "",
  };
}

/** Create and sign a NIP-51 git repositories follow list. */
export function createGitRepositoriesListEvent(
  list: GitRepositoriesListEvent,
  privateKey: string
): any {
  const pubkey = getPublicKey(privateKey);
  const event = buildUnsignedGitRepositoriesListEvent(list, pubkey);
  event.id = getEventHash(event);
  event.sig = signEvent(event, privateKey);
  return event;
}

/** Parse kind 10018 → list of `30617:pubkey:d` addresses. */
export function parseGitRepositoriesListEvent(event: unknown): string[] {
  if (!event || typeof event !== "object") return [];
  const typedEvent = event as { kind?: unknown; tags?: unknown };
  if (typedEvent.kind !== KIND_GIT_REPOSITORIES_LIST) return [];
  if (!Array.isArray(typedEvent.tags)) return [];

  const repoAddresses: string[] = [];
  for (const tag of typedEvent.tags) {
    if (!Array.isArray(tag) || tag.length < 2) continue;
    if (tag[0] !== "a" || typeof tag[1] !== "string") continue;
    const candidate = tag[1].trim();
    if (REPO_ADDRESS_RE.test(candidate)) {
      repoAddresses.push(candidate);
    }
  }
  return repoAddresses;
}
