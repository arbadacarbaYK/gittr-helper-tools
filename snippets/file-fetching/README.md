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

