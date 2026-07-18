# Clone URL quality (NIP-34)

Offline checks for `clone` tags on discovery surfaces and announce builders.

**Source:** `gittr/ui/src/lib/nostr/clone-url-quality.ts` (+ `nip34-tag-values.ts`)  
**Synced:** 2026-07-18

## Problem

Some announces publish **host-only** clone URLs like `https://git.gittr.space` with no `/npub…/repo.git` path. Other clients (gitworkshop, ngit) cannot load files from those. Localhost / private LAN URLs are likewise unusable for public discovery.

## Files

| File | Role |
| --- | --- |
| `clone-url-quality.ts` | Host-only detection, expand, normalize for announce, hide policy |
| `nip34-tag-values.ts` | Collect multi-value tag rows (`clone` / `relays`) |

## Key APIs

- **`isHostOnlyCloneUrl(url)`** — bare host with no owner/repo path
- **`expandHostOnlyCloneUrl(url, owner, repo)`** — expand to `https://host/<npub>/<repo>.git`
- **`normalizeCloneUrlsForNip34Announcement({ cloneUrls, ownerNpub, repoName, fallbackGitServerUrl? })`** — clean list before publishing kind 30617
- **`usableCloneUrls(urls)`** / **`isUnusableCloneUrl`** — filter localhost / LAN / host-only
- **`shouldHideAnnounceForUnusableClones`** / **`shouldHideNip34EventForUnusableClones`** — discovery hide when *every* listed clone is unusable (announces with **zero** clone tags stay visible)

## Related snippets

- [`../repair-host-only-clones/`](../repair-host-only-clones) — UI badge predicates (“Please republish”)
- [`../nip34-repository-events/`](../nip34-repository-events) — build kind 30617 using multi-value `clone` rows
