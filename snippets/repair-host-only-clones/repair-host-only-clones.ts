/**
 * Predicates + badge strings for NIP-34 announces with unusable clone tags.
 *
 * Source: gittr/ui/src/lib/nostr/repair-host-only-clones.ts
 * Synced: 2026-07-18
 *
 * MIT — keep this attribution when copying into your project.
 *
 * Does NOT include repairHostOnlyCloneAnnounces (that calls gittr's
 * pushRepoToNostr). Call your own publish / push after normalizing clones —
 * see ../clone-url-quality/normalizeCloneUrlsForNip34Announcement.
 */

import {
  collectCloneUrlsFromTags,
  isHostOnlyCloneUrl,
  shouldHideAnnounceForUnusableClones,
} from "../clone-url-quality/clone-url-quality";

/** @deprecated Prefer cloneListNeedsRepublish — kept for call-site clarity. */
export function announceHasOnlyHostOnlyClones(tags: unknown[]): boolean {
  const clones = collectCloneUrlsFromTags(tags);
  if (clones.length === 0) return false;
  return clones.every((u) => isHostOnlyCloneUrl(u));
}

/**
 * True when the announce lists clone URL(s) but none are usable for other
 * clients (same rule as homepage/explore hide). Owner should publish again.
 */
export function cloneListNeedsRepublish(
  cloneUrls: string[] | undefined | null
): boolean {
  return shouldHideAnnounceForUnusableClones(cloneUrls);
}

/** @deprecated Use cloneListNeedsRepublish */
export function cloneListNeedsHostOnlyRepair(
  cloneUrls: string[] | undefined | null
): boolean {
  return cloneListNeedsRepublish(cloneUrls);
}

export const CLONE_REPUBLISH_BADGE_LABEL = "Please republish";

export const CLONE_REPUBLISH_BADGE_TITLE =
  "Clone URL is only a bare host, localhost, or other unusable address. Push to Nostr again so gitworkshop and others can load files.";
