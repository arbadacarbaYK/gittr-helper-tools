# File Fetching Snippets

Code snippets for parsing and handling Git clone URLs from NIP-34 events.

**Synced:** 2026-08-07 — `parseGitSource` + `isGenericHttpsGitRemoteUrl` from `git-source-fetcher.ts`.  
Pass injectable `knownGraspDomains` (do not require grasp-servers).

Also keep in sync with gittr docs:

- [FILE_FETCHING_INSIGHTS.md](https://github.com/arbadacarbaYK/gittr/blob/main/docs/FILE_FETCHING_INSIGHTS.md) — Code tab order, timestamps, tip fidelity, clone sidebar
- Sibling snippet: [`filter-display-clone-urls`](../filter-display-clone-urls/) — sidebar must keep the full Push GRASP set
- gitnostr: `ui/gitnostr/docs/file-fetch-flow.md` + SSH guides cross-link the same doc

## Regression suites (do not treat MCP smoke alone as “file fetch works”)

| Where | Command | Catches |
| --- | --- | --- |
| `gittr/ui` | `npm run test:regressions` | tree timestamps (`%x00` orphan), clone sidebar filter, tip fidelity gate |
| `gittr-mcp` | `npm run test:regressions` | full GRASP `clone[]` set, forge source matchers |

`npm test` / `test:mcp-stdio` alone will **not** catch empty Code dates, missing shakespeare clones, or “Push invents empty commit” tip drift.

## `git-source-parser.ts`

Parses clone URLs and identifies the source type (GitHub, GitLab, Codeberg, GRASP servers, self-hosted, etc.).

**What it does:**
- Parses clone URLs from NIP-34 `clone` tags
- Identifies source type (github, gitlab, codeberg, nostr-git, self-hosted-git, unknown)
- Normalizes **`git@host:path`** and `git://` URLs to HTTPS where appropriate
- Treats **`user@host:path`** (no scheme, generic SSH remote) as **`self-hosted-git`**
- **`nostr-git` only** when host is in `knownGraspDomains` **and** path is `/npub1…/repo`
- **Non-GRASP** hosts with `/npub1…/repo` (home Freebox, NAS) → **`self-hosted-git`** (use `GET /api/git/repo-files`)
- Supports multiple entity formats for Nostr git servers: `npub`, `NIP-05`, and hex pubkey

**Usage:**
```typescript
import { parseGitSource } from './git-source-parser';

const knownGraspDomains = [
  'relay.gittr.space',
  'relay.ngit.dev',
  'gitnostr.com',
  'git.gittr.space',
];

const source = parseGitSource('https://github.com/user/repo.git', knownGraspDomains);
// { type: 'github', ... }

// gittr Pyramid GRASP (wss + https git on same host)
const graspSource = parseGitSource(
  'https://relay.gittr.space/npub123abc/repo.git',
  knownGraspDomains
);
// { type: 'nostr-git', ... }

// Bridge HTTPS clone host (gitnostr layout — not a wss:// relay)
const bridgeSource = parseGitSource(
  'https://git.gittr.space/npub123abc/repo.git',
  knownGraspDomains
);

const homeSource = parseGitSource(
  'http://myfreebox.example:7334/npub123abc/repo.git',
  knownGraspDomains
);
// { type: 'self-hosted-git', owner: 'npub123abc', ... }  — NOT nostr-git
```

**Extracted from:** `gittr/ui/src/lib/utils/git-source-fetcher.ts`

## File Path Encoding

**CRITICAL**: When making API calls with file paths, always URL-encode the path parameter using `encodeURIComponent()`.

```typescript
const apiUrl = `/api/nostr/repo/file-content?ownerPubkey=${encodeURIComponent(ownerPubkey)}&repo=${encodeURIComponent(repoName)}&path=${encodeURIComponent(filePath)}&branch=${encodeURIComponent(branch)}`;
const gitApiUrl = `/api/git/file-content?sourceUrl=${encodeURIComponent(sourceUrl)}&path=${encodeURIComponent(filePath)}&branch=${encodeURIComponent(branch)}`;
```

## GRASP + self-hosted file trees (gittr behaviour)

1. **Published `clone[]` / `source` are authoritative** — do not infer well-known GRASP mirrors until **after Nostr EOSE** if still no clones (`buildGraspHttpsCloneCandidates`).
2. When both exist, **prefer non-GRASP remotes** (GitHub / Freebox / self-hosted) **before** GRASP mirrors.
3. Per GRASP URL: bridge `GET /api/nostr/repo/files` → `GET /api/git/repo-files?sourceUrl=…` → optional `POST /api/nostr/repo/clone`.
4. Per self-hosted URL (including non-GRASP `/npub/…`): **`repo-files` only**.
5. `repo-files` runs on the **gittr server** — home hosts must be publicly reachable from that host.

`fetchFilesFromMultipleSources` races sources: **first non-empty tree wins**.

Full details: [FILE_FETCHING_INSIGHTS.md](https://gittr.space/npub1n2ph08n4pqz4d3jk6n2p35p2f4ldhc5g5tu7dhftfpueajf4rpxqfjhzmc/gittr?file=docs/FILE_FETCHING_INSIGHTS.md&branch=main).

## Performance Notes

- **Upstream / non-GRASP first**: avoid 45s timeouts on dead inferred ngit hosts  
- **Parallel GRASP**: every published GRASP `clone[]` HTTPS URL is tried; race returns on first success  
- **GitLab pagination**: GitLab API max 100 items per page — gittr paginates for large trees  
