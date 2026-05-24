# File Fetching Snippets

Code snippets for parsing and handling Git clone URLs from NIP-34 events.

## `git-source-parser.ts`

Parses clone URLs and identifies the source type (GitHub, GitLab, Codeberg, GRASP servers, etc.).

**What it does:**
- Parses clone URLs from NIP-34 `clone` tags
- Identifies source type (github, gitlab, codeberg, nostr-git, unknown)
- Normalizes **`git@host:path`** and `git://` URLs to HTTPS where appropriate
- Treats **`user@host:path`** (no scheme, generic SSH remote) as **`self-hosted-git`** for tree/file APIs (see gittr `parseGitSource` / `repo-files` route)
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

## GRASP file trees (gittr behaviour)

GRASP mirrors usually have **no** REST “list files” API. gittr’s `fetchFromNostrGit` (see main repo) does this **per clone URL**, often **in parallel**:

1. `GET /api/nostr/repo/files` — read bare repo on the gittr bridge disk  
2. `GET /api/git/repo-files?sourceUrl=<HTTPS clone URL>` — shallow clone into a **temp** dir and return the tree (**works even when step 1 is empty**)  
3. `POST /api/nostr/repo/clone` — bare mirror onto disk, **await** bridge read, then background poll  

`fetchFilesFromMultipleSources` races sources: **first non-empty tree wins**. A broken mirror (502) must not block a good one.

**Newest metadata:** latest kind **30617** on relays (`created_at`).  
**Newest commit across all GRASP mirrors:** not fully compared yet — first successful mirror, not max `HEAD` / 30618.

## Performance Notes

- **Bridge API cache** (client): dedupe `GET /api/nostr/repo/files` per repo/branch where implemented  
- **Clone trigger cache**: avoid duplicate bare-clone POSTs for the same repo  
- **Upstream first**: GitHub / `source` URLs tried before GRASP when `prioritizeUpstreamCloneUrls` applies  
- **Parallel GRASP**: every `clone[]` HTTPS GRASP URL is tried; race returns on first success  
- **GitLab pagination**: GitLab API max 100 items per page — gittr paginates for large trees  

For full implementation details, see [FILE_FETCHING_INSIGHTS.md](https://gittr.space/npub1n2ph08n4pqz4d3jk6n2p35p2f4ldhc5g5tu7dhftfpueajf4rpxqfjhzmc/gittr?file=docs/FILE_FETCHING_INSIGHTS.md&branch=main) in the gittr repository.
