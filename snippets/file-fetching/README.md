# File Fetching Snippets

Code snippets for parsing and handling Git clone URLs from NIP-34 events.

## `git-source-parser.ts`

Parses clone URLs and identifies the source type (GitHub, GitLab, Codeberg, GRASP servers, etc.).

**What it does:**
- Parses clone URLs from NIP-34 `clone` tags
- Identifies source type (github, gitlab, codeberg, nostr-git, unknown)
- Normalizes SSH (`git@host:path`) and `git://` URLs to HTTPS
- Detects GRASP servers (Nostr git servers)

**Usage:**
```typescript
import { parseGitSource } from './git-source-parser';

const source = parseGitSource('https://github.com/user/repo.git', knownGraspDomains);
// { type: 'github', owner: 'user', repo: 'repo', url: '...', displayName: 'github.com' }

const graspSource = parseGitSource('https://relay.ngit.dev/npub123abc/repo.git', knownGraspDomains);
// { type: 'nostr-git', npub: 'npub123abc', repo: 'repo', url: '...', displayName: 'relay.ngit.dev' }
```

**Extracted from:** `gittr/ui/src/lib/utils/git-source-fetcher.ts`

## Performance Notes

This parser is used as part of a larger file fetching system that includes performance optimizations:

- **Bridge API Cache**: Deduplicates API calls to `git-nostr-bridge` (reduces from 7+ calls to 1 per repo/branch)
- **Clone Trigger Cache**: Prevents duplicate clone triggers for the same repository
- **Source Prioritization**: Known-good sources (GitHub, Codeberg, GitLab) are tried first
- **Nostr-Git Optimization**: Only the first nostr-git source is tried since they all hit the same bridge API
- **GitLab Pagination**: GitLab API returns max 100 items per page - gittr implements pagination using `X-Total-Pages` and `X-Page` headers to fetch ALL files (critical for repos with >100 files)

For full implementation details, see [gittr FILE_FETCHING_INSIGHTS.md](https://gittr.space/npub1n2ph08n4pqz4d3jk6n2p35p2f4ldhc5g5tu7dhftfpueajf4rpxqfjhzmc/gittr?path=docs&file=docs%2FFILE_FETCHING_INSIGHTS.md#file-fetching-performance-optimizations-2024).

