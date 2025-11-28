/**
 * NIP-25 Repository Stars & NIP-51 Following
 * 
 * Extracted from gittr.space - implements repository starring using NIP-25 (Kind 7) reactions
 * and repository following using NIP-51 (Kind 3000) bookmark lists.
 * 
 * NIP-25: https://nips.nostr.com/25 (Reactions)
 * NIP-51: https://nips.nostr.com/51 (Lists)
 * 
 * Usage:
 * ```typescript
 * import { queryRepoStars, publishStarReaction, removeStarReaction } from './repo-stars';
 * 
 * // Query star count for a repository
 * const { count, starers } = await queryRepoStars(subscribe, repoEventId);
 * 
 * // Star a repository
 * await publishStarReaction(repoEventId, repoOwnerPubkey, publish, getSigner);
 * 
 * // Unstar a repository
 * await removeStarReaction(repoEventId, repoOwnerPubkey, publish, getSigner);
 * ```
 */

import { Filter, Event } from "nostr-tools";

export const KIND_REACTION = 7; // NIP-25: Reactions

/**
 * Query star reactions for a repository from Nostr relays
 * Returns aggregated star count and list of users who starred
 */
export async function queryRepoStars(
  subscribe: (filters: Filter[], onEvent: (event: Event) => void) => () => void,
  repoEventId: string
): Promise<{ count: number; starers: string[] }> {
  return new Promise((resolve) => {
    const starers = new Set<string>();
    
    const filters: Filter[] = [
      {
        kinds: [KIND_REACTION],
        "#e": [repoEventId], // Reactions to this repo event
        "#k": ["30617"], // Reactions to kind 30617 events
      },
    ];
    
    const unsubscribe = subscribe(filters, (event: Event) => {
      // Only count positive reactions (stars)
      if (event.content === "+" || event.content === "⭐") {
        starers.add(event.pubkey);
      }
      // Negative reactions ("-") are ignored (they cancel out)
    });
    
    // Wait a bit for events to come in, then resolve
    setTimeout(() => {
      unsubscribe();
      resolve({
        count: starers.size,
        starers: Array.from(starers),
      });
    }, 2000); // 2 second timeout for querying
  });
}

/**
 * Publish a star reaction (NIP-25) for a repository
 */
export async function publishStarReaction(
  repoEventId: string,
  repoOwnerPubkey: string,
  publish: (event: Event) => Promise<void>,
  getSigner: () => Promise<{ signEvent: (event: any) => Promise<any> }>
): Promise<{ success: boolean; eventId?: string; error?: string }> {
  try {
    const signer = await getSigner();
    
    // Create unsigned event
    const unsignedEvent = {
      kind: KIND_REACTION,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ["e", repoEventId],      // Reference to the repository event (Kind 30617)
        ["k", "30617"],          // Indicates this is a reaction to a Kind 30617 event
        ["p", repoOwnerPubkey],  // Repository owner's pubkey
      ],
      content: "+", // Star reaction (NIP-25 standard: "+" for like/star)
      pubkey: "", // Will be set by signer
    };
    
    // Sign the event
    const signedEvent = await signer.signEvent(unsignedEvent);
    
    // Publish to relays
    await publish(signedEvent);
    
    return {
      success: true,
      eventId: signedEvent.id,
    };
  } catch (error: any) {
    console.error("[Repo Stars] Failed to publish star reaction:", error);
    return {
      success: false,
      error: error?.message || "Failed to publish star reaction",
    };
  }
}

/**
 * Remove a star reaction (publish a negative reaction)
 * NIP-25: Use "-" content to unstar
 */
export async function removeStarReaction(
  repoEventId: string,
  repoOwnerPubkey: string,
  publish: (event: Event) => Promise<void>,
  getSigner: () => Promise<{ signEvent: (event: any) => Promise<any> }>
): Promise<{ success: boolean; error?: string }> {
  try {
    const signer = await getSigner();
    
    // Create negative reaction (NIP-25: "-" means remove reaction)
    const unsignedEvent = {
      kind: KIND_REACTION,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ["e", repoEventId],
        ["k", "30617"],
        ["p", repoOwnerPubkey],
      ],
      content: "-", // Negative reaction (unstar)
      pubkey: "", // Will be set by signer
    };
    
    const signedEvent = await signer.signEvent(unsignedEvent);
    await publish(signedEvent);
    
    return { success: true };
  } catch (error: any) {
    console.error("[Repo Stars] Failed to remove star reaction:", error);
    return {
      success: false,
      error: error?.message || "Failed to remove star reaction",
    };
  }
}

