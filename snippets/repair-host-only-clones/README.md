# Repair host-only clones (predicates)

UI helpers for announces whose `clone` tags are all unusable (host-only, localhost, LAN).

**Source:** `gittr/ui/src/lib/nostr/repair-host-only-clones.ts`  
**Synced:** 2026-07-18

## What this snippet includes

- `announceHasOnlyHostOnlyClones(tags)`
- `cloneListNeedsRepublish(cloneUrls)`
- `CLONE_REPUBLISH_BADGE_LABEL` / `CLONE_REPUBLISH_BADGE_TITLE`

## What it does **not** include

gittr's `repairHostOnlyCloneAnnounces` calls `pushRepoToNostr` (app-specific).  
**Call your own publish/push** after fixing clones with
[`../clone-url-quality/`](../clone-url-quality) (`normalizeCloneUrlsForNip34Announcement`).

## Typical UI flow

1. Detect with `cloneListNeedsRepublish(cloneUrls)` or `announceHasOnlyHostOnlyClones(tags)`.
2. Show badge: `CLONE_REPUBLISH_BADGE_LABEL`.
3. On owner action: expand clones → rebuild kind 30617 → sign → publish (and optionally kind 30618 state).
