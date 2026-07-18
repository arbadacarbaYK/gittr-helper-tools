/**
 * Repository status helpers (local → live_soon → live).
 *
 * Source: gittr/ui/src/lib/utils/repo-status.ts
 * Synced: 2026-07-18
 *
 * MIT — keep this attribution when copying into your project.
 *
 * Pure helpers below. Host-specific bridge existence checks and localStorage
 * persistence are omitted — implement those against your own backend/storage.
 */

export type RepoStatus =
  | "local"
  | "pushing"
  | "live"
  | "live_soon"
  | "live_with_edits"
  | "push_failed";

/** True when the repo is already on Nostr (including transitional / edits). */
export function isPublishedRepoStatus(status: RepoStatus): boolean {
  return (
    status === "live" || status === "live_soon" || status === "live_with_edits"
  );
}

/** True when the UI should still offer Push (incomplete publish or local edits). */
export function statusNeedsPushAction(status: RepoStatus): boolean {
  return (
    status === "local" ||
    status === "live_soon" ||
    status === "live_with_edits" ||
    status === "push_failed"
  );
}

/**
 * Infer status from a local repo record.
 *
 * Expected fields (all optional except as used):
 * - status, bridgeProcessed, nostrEventId / lastNostrEventId / syncedFromNostr / fromNostr
 * - stateEventId / lastStateEventId, hasUnpushedEdits
 * - lastNostrEventCreatedAt / nostrEventCreatedAt, lastModifiedAt
 *
 * Bridge readiness (`bridgeProcessed`) is host-specific — set it from your API.
 */
export function getRepoStatus(repo: Record<string, unknown>): RepoStatus {
  if (repo.status === "pushing") return "pushing";
  if (repo.status === "push_failed") return "push_failed";

  const bridgeProcessed = repo.bridgeProcessed;

  const hasAnnouncementEventId = !!(
    repo.nostrEventId ||
    repo.lastNostrEventId ||
    repo.syncedFromNostr ||
    repo.fromNostr
  );

  const hasStateEventId = !!(repo.stateEventId || repo.lastStateEventId);

  const hasUnpushedEdits =
    repo.hasUnpushedEdits === true ||
    (!!repo.lastNostrEventId &&
      typeof repo.lastModifiedAt === "number" &&
      typeof repo.lastNostrEventCreatedAt === "number" &&
      repo.lastModifiedAt > (repo.lastNostrEventCreatedAt as number) * 1000);

  const isSyncedFromNostr = !!(repo.syncedFromNostr || repo.fromNostr);
  const eventCreatedAt =
    (repo.lastNostrEventCreatedAt as number) ||
    (repo.nostrEventCreatedAt as number) ||
    0;
  const ageSec =
    eventCreatedAt > 0
      ? Date.now() / 1000 - eventCreatedAt
      : Number.POSITIVE_INFINITY;
  const isVeryRecentPush = ageSec < 300;
  const isSettledAnnounce = ageSec >= 600;

  if (hasAnnouncementEventId && hasStateEventId && bridgeProcessed === true) {
    return hasUnpushedEdits ? "live_with_edits" : "live";
  }

  if (isSyncedFromNostr && hasAnnouncementEventId && !eventCreatedAt) {
    return hasUnpushedEdits ? "live_with_edits" : "live";
  }

  if (isSyncedFromNostr && hasAnnouncementEventId && isSettledAnnounce) {
    return hasUnpushedEdits ? "live_with_edits" : "live";
  }

  if (hasAnnouncementEventId && !hasStateEventId) {
    if (isSettledAnnounce) {
      return hasUnpushedEdits ? "live_with_edits" : "live";
    }
    return "live_soon";
  }

  if (
    hasAnnouncementEventId &&
    hasStateEventId &&
    (bridgeProcessed === undefined || bridgeProcessed === false)
  ) {
    if (hasUnpushedEdits && !isVeryRecentPush) {
      return "live_with_edits";
    }
    if (isVeryRecentPush) {
      return "live_soon";
    }
    return "live";
  }

  if (repo.status === "live_soon") {
    if (!isVeryRecentPush && hasAnnouncementEventId) {
      return hasUnpushedEdits ? "live_with_edits" : "live";
    }
    return "live_soon";
  }
  if (repo.status === "live_with_edits") return "live_with_edits";
  if (repo.status === "live") {
    return hasUnpushedEdits ? "live_with_edits" : "live";
  }
  if (repo.status === "local") return "local";

  return "local";
}

export function getStatusBadgeStyle(status: RepoStatus): {
  bg: string;
  text: string;
  label: string;
} {
  switch (status) {
    case "local":
      return {
        bg: "bg-yellow-600/30",
        text: "text-yellow-300",
        label: "Local",
      };
    case "pushing":
      return {
        bg: "bg-blue-600/30",
        text: "text-blue-300",
        label: "Pushing...",
      };
    case "push_failed":
      return {
        bg: "bg-red-600/30",
        text: "text-red-300",
        label: "Push Failed",
      };
    case "live":
      return {
        bg: "bg-green-600/30",
        text: "text-green-300",
        label: "Live on Nostr",
      };
    case "live_soon":
      return {
        bg: "bg-orange-600/30",
        text: "text-orange-300",
        label: "Published, live soon",
      };
    case "live_with_edits":
      return {
        bg: "bg-amber-600/30",
        text: "text-amber-300",
        label: "Has unpublished edits",
      };
    default:
      return {
        bg: "bg-gray-600/30",
        text: "text-gray-300",
        label: "Unknown",
      };
  }
}
