# URL Normalization Snippets

Normalize Git URLs toward HTTPS for API / clone processing.

**Source:** `gittr/ui/src/lib/utils/git-source-fetcher.ts` (URL branches inside `parseGitSource` — there is no standalone `normalize-git-url.ts` in gittr)  
**Synced:** 2026-07-18

## `normalize-git-url.ts`

**What it does:**
- Converts `git@host:path` → `https://host/path`
- Converts `git://host/path` → `https://host/path`
- Converts `nostr://npub@domain/repo` → `https://domain/npub/repo` (fallback domain when `@domain` omitted)
- Preserves original URL for display
- Handles batch normalization

**Usage:**
```typescript
import { normalizeGitUrl, normalizeGitUrls } from './normalize-git-url';

const normalized = normalizeGitUrl('git@github.com:user/repo.git');
// { original: 'git@github.com:user/repo.git', normalized: 'https://github.com/user/repo.git', protocol: 'ssh' }

const nostr = normalizeGitUrl('nostr://npub1abc@relay.gittr.space/my-repo');
// { protocol: 'nostr', normalized: 'https://relay.gittr.space/npub1abc/my-repo', ... }
```

For full source-type classification (including `self-hosted-git` and generic `user@host:path`), see [`../file-fetching/git-source-parser.ts`](../file-fetching/git-source-parser.ts).
