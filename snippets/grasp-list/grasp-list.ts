/**
 * GRASP List Utilities (NIP-34 kind 10317)
 *
 * Handles fetching and parsing user GRASP lists (preferred GRASP servers).
 * Similar to NIP-65 relay lists and NIP-B7 blossom lists.
 *
 * Source: gittr/ui/src/lib/utils/grasp-list.ts
 * Synced: 2026-07-18
 *
 * MIT — keep this attribution when copying into your project.
 * Per NIP-34: https://github.com/nostrability/schemata/tree/master/nips/nip-34
 */

/** NIP-34: User GRASP list (preferred GRASP servers) */
export const KIND_GRASP_LIST = 10317;

export interface GraspListData {
  graspServers: string[]; // GRASP server URLs (wss://) in order of preference
  pubkey: string;
  eventId?: string;
  createdAt?: number;
}

/**
 * Parse a GRASP list event (kind 10317) into structured data
 */
export function parseGraspListEvent(event: any): GraspListData | null {
  if (!event || event.kind !== KIND_GRASP_LIST) {
    return null;
  }

  const graspServers: string[] = [];

  if (event.tags && Array.isArray(event.tags)) {
    for (const tag of event.tags) {
      if (Array.isArray(tag) && tag.length >= 2 && tag[0] === "g") {
        const serverUrl = tag[1];
        if (
          serverUrl &&
          (serverUrl.startsWith("wss://") || serverUrl.startsWith("ws://"))
        ) {
          graspServers.push(serverUrl);
        }
      }
    }
  }

  return {
    graspServers,
    pubkey: event.pubkey,
    eventId: event.id,
    createdAt: event.created_at,
  };
}

/**
 * Get user's preferred GRASP servers from their GRASP list.
 * Falls back to default GRASP servers if no list is found.
 */
export async function getUserGraspServers(
  subscribe: (
    filters: any[],
    relays: string[],
    onEvent: (event: any, isAfterEose: boolean, relayURL?: string) => void,
    maxDelayms?: number,
    onEose?: (relayUrl: string, minCreatedAt: number) => void,
    options?: any
  ) => () => void,
  relays: string[],
  userPubkey: string,
  defaultGraspServers: string[] = []
): Promise<string[]> {
  return new Promise((resolve) => {
    let latestEvent: any = null;
    let latestCreatedAt = 0;
    let eoseCount = 0;
    const expectedEose = relays.length;

    const unsub = subscribe(
      [
        {
          kinds: [KIND_GRASP_LIST],
          authors: [userPubkey],
        },
      ],
      relays,
      (event) => {
        if (event.created_at > latestCreatedAt) {
          latestEvent = event;
          latestCreatedAt = event.created_at;
        }
      },
      5000,
      () => {
        eoseCount++;
        if (eoseCount >= expectedEose) {
          unsub();

          if (latestEvent) {
            const parsed = parseGraspListEvent(latestEvent);
            if (parsed && parsed.graspServers.length > 0) {
              resolve(parsed.graspServers);
              return;
            }
          }

          resolve(defaultGraspServers);
        }
      }
    );

    setTimeout(() => {
      unsub();
      if (latestEvent) {
        const parsed = parseGraspListEvent(latestEvent);
        if (parsed && parsed.graspServers.length > 0) {
          resolve(parsed.graspServers);
          return;
        }
      }
      resolve(defaultGraspServers);
    }, 10000);
  });
}

/**
 * Prioritize GRASP servers: user preferences first, then defaults.
 */
export function prioritizeGraspServers(
  userGraspServers: string[],
  defaultGraspServers: string[]
): string[] {
  const prioritized: string[] = [...userGraspServers];

  for (const server of defaultGraspServers) {
    if (!prioritized.includes(server)) {
      prioritized.push(server);
    }
  }

  return prioritized;
}

/**
 * Convert GRASP relay URLs (wss://) to git clone URL domains.
 */
export function graspRelayUrlsToDomains(graspRelayUrls: string[]): string[] {
  return graspRelayUrls
    .map((url) => {
      const match = url.match(/^wss?:\/\/([^\/]+)/);
      return match ? match[1] : null;
    })
    .filter((domain): domain is string => domain !== null);
}

/**
 * When a NIP-34 repo event has no `clone` tags **after Nostr EOSE**, try
 * well-known GRASP git hosts using the standard npub/{repo}.git path.
 * Do not infer before the announcement arrives (see gittr FILE_FETCHING_INSIGHTS.md).
 */
export function buildGraspHttpsCloneCandidates(
  entityRoute: string,
  repoName: string,
  domains: string[],
  maxServers = 4
): string[] {
  const entity = String(entityRoute || "").trim();
  const repo = String(repoName || "").trim();
  if (!entity || !repo || !domains.length) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const domain of domains.slice(0, maxServers)) {
    const host = domain.replace(/^https?:\/\//, "").replace(/\/+$/, "");
    if (!host) continue;
    const url = `https://${host}/${entity}/${repo}.git`;
    if (!seen.has(url)) {
      seen.add(url);
      out.push(url);
    }
  }
  return out;
}
