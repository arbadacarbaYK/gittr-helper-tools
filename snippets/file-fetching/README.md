# File Fetching Snippets

Code snippets for parsing and handling Git clone URLs from NIP-34 events.

## `git-source-parser.ts`

Parses clone URLs and identifies the source type (GitHub, GitLab, Codeberg, GRASP servers, etc.).

**What it does:**
- Parses clone URLs from NIP-34 `clone` tags
- Identifies source type (github, gitlab, codeberg, nostr-git, unknown)
- Normalizes SSH (`git@host:path`) and `git://` URLs to HTTPS
- Detects GRASP servers (Nostr git servers)
- Supports multiple entity formats for Nostr git servers: `npub`, `NIP-05` (e.g., `user@domain.com`), and `hex pubkey` (64-char)

**Usage:**
```typescript
import { parseGitSource } from './git-source-parser';

const source = parseGitSource('https://github.com/user/repo.git', knownGraspDomains);
// { type: 'github', owner: 'user', repo: 'repo', url: '...', displayName: 'github.com' }

const graspSource = parseGitSource('https://relay.ngit.dev/npub123abc/repo.git', knownGraspDomains);
// { type: 'nostr-git', npub: 'npub123abc', repo: 'repo', url: '...', displayName: 'relay.ngit.dev' }

// Also supports NIP-05 and hex pubkey formats:
const nip05Source = parseGitSource('https://git.gittr.space/geek@primal.net/repo.git', knownGraspDomains);
// { type: 'nostr-git', npub: 'geek@primal.net', repo: 'repo', url: '...', displayName: 'git.gittr.space' }

const hexSource = parseGitSource('https://git.gittr.space/daa41bedb68591363bf4407f687cb9789cc543ed024bb77c22d2c84d88f54153/repo.git', knownGraspDomains);
// { type: 'nostr-git', npub: 'daa41bedb68591363bf4407f687cb9789cc543ed024bb77c22d2c84d88f54153', repo: 'repo', url: '...', displayName: 'git.gittr.space' }
```

**Extracted from:** `gittr/ui/src/lib/utils/git-source-fetcher.ts`

## File Path Encoding

**CRITICAL**: When making API calls with file paths, always URL-encode the path parameter using `encodeURIComponent()` to handle non-ASCII characters correctly:

```typescript
// ✅ Correct: URL-encode file paths
const apiUrl = `/api/nostr/repo/file-content?ownerPubkey=${encodeURIComponent(ownerPubkey)}&repo=${encodeURIComponent(repoName)}&path=${encodeURIComponent(filePath)}&branch=${encodeURIComponent(branch)}`;

// ✅ Also correct for external git servers
const gitApiUrl = `/api/git/file-content?sourceUrl=${encodeURIComponent(sourceUrl)}&path=${encodeURIComponent(filePath)}&branch=${encodeURIComponent(branch)}`;
```

This ensures files with non-ASCII characters (Cyrillic, Chinese, accented characters, etc.) are handled correctly:
- Cyrillic: `ЧИТАЙ.md` → `%D0%A7%D0%98%D0%A2%D0%90%D0%99.md`
- Chinese: `读我D.md` → `%E8%AF%BB%E6%88%91D.md`
- Accented: `LÉAME.md` → `L%C3%89AME.md`

The API endpoints automatically decode these and handle UTF-8 correctly on the backend.

## Performance Notes

This parser is used as part of a larger file fetching system that includes performance optimizations:

- **Bridge API Cache**: Deduplicates API calls to `git-nostr-bridge` (reduces from 7+ calls to 1 per repo/branch)
- **Clone Trigger Cache**: Prevents duplicate clone triggers for the same repository
- **Source Prioritization**: Known-good sources (GitHub, Codeberg, GitLab) are tried first
- **Nostr-Git Optimization**: Only the first nostr-git source is tried since they all hit the same bridge API
- **GitLab Pagination**: GitLab API returns max 100 items per page - gittr implements pagination using `X-Total-Pages` and `X-Page` headers to fetch ALL files (critical for repos with >100 files)

For full implementation details, see [gittr FILE_FETCHING_INSIGHTS.md](https://gittr.space/npub1n2ph08n4pqz4d3jk6n2p35p2f4ldhc5g5tu7dhftfpueajf4rpxqfjhzmc/gittr?path=docs&file=docs%2FFILE_FETCHING_INSIGHTS.md#file-fetching-performance-optimizations-2024).

