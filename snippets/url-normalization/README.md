# URL Normalization Snippets

Code snippets for normalizing Git URLs to HTTPS format.

## `normalize-git-url.ts`

Converts various Git URL formats (SSH, git://, etc.) to HTTPS for consistent API calls.

**What it does:**
- Converts `git@host:path` → `https://host/path`
- Converts `git://host/path` → `https://host/path`
- Preserves original URL for display
- Handles batch normalization

**Usage:**
```typescript
import { normalizeGitUrl, normalizeGitUrls } from './normalize-git-url';

// Single URL
const normalized = normalizeGitUrl('git@github.com:user/repo.git');
// { original: 'git@github.com:user/repo.git', normalized: 'https://github.com/user/repo.git', protocol: 'ssh' }

// Multiple URLs
const urls = ['git@github.com:user/repo.git', 'git://jb55.com/damus'];
const normalized = normalizeGitUrls(urls);
// [{ original: '...', normalized: 'https://...', protocol: 'ssh' }, ...]
```

**Why this exists:**
Different git servers use different URL formats. When making API calls (e.g., to GitHub API, bridge clone endpoint), we need HTTPS URLs. This utility normalizes them while preserving the original for display.

**Extracted from:** `gittr/ui/src/lib/utils/git-source-fetcher.ts`

