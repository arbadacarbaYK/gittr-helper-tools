# Repo status (local → live)

Lifecycle badges for repositories moving from local-only to fully live on Nostr.

**Source:** `gittr/ui/src/lib/utils/repo-status.ts`  
**Synced:** 2026-07-18

## Status meanings

| Status | Meaning |
| --- | --- |
| `local` | Not published yet |
| `pushing` / `push_failed` | In-flight publish |
| `live_soon` | Announced on Nostr; clone/bridge may still be settling (~5 min) |
| `live` | Fully live |
| `live_with_edits` | Was live; has local changes not pushed |

## Pure helpers (this snippet)

- `isPublishedRepoStatus`
- `statusNeedsPushAction`
- `getRepoStatus(repo)` — infer from local record fields
- `getStatusBadgeStyle(status)` — `{ bg, text, label }`

## Omitted (host-specific)

- `checkBridgeExists` — hits a bridge `/api/nostr/repo/exists` and may write localStorage
- `setRepoStatus` / `markRepoAsEdited` — gittr `gittr_repos` localStorage coupling

Wire bridge readiness into `repo.bridgeProcessed` from your own API, then call `getRepoStatus`.
