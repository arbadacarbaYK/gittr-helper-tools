# NIP-34 Repository Events

Code snippets for implementing **NIP-34** (Replaceable Events) repository announcements in a Nostr client. This shows the complete request/response cycle: what you send, what you receive, and how to handle it.

**Synced:** 2026-07-18 — aligned with gittr `buildUnsignedRepositoryEvent` (multi-value tags, hex maintainers, optional `push_cost_sats` / `public-read` / `public-write`).  
**Host-only clones:** never publish bare hosts — see [`../clone-url-quality/`](../clone-url-quality).

## What is NIP-34?

NIP-34 defines `kind:30617` events for announcing Git repositories on Nostr. Unlike legacy `kind:51` events that use JSON content, NIP-34 uses **tags only** with **empty content** for spec compliance.

### Key Differences from Legacy Format

| Aspect | Legacy (kind:51) | NIP-34 (kind:30617) |
|--------|------------------|---------------------|
| Content | JSON object | Empty string (`""`) |
| Metadata | In content field | In tags array |
| Spec | Custom format | NIP-34 compliant |
| Interoperability | gittr-specific | Works with all NIP-34 clients |

## Files

- **`repository-events.ts`** - Event creation and parsing utilities
- **`schema-examples.ts`** - Request/response schema examples

## Production alignment (gittr)

Recent interoperability lessons from gittr.space production pushes:

1. **`clone` row shape:** Prefer **one `clone` tag with multiple HTTPS values**, e.g. `["clone", "https://primary/npub/repo.git", "https://ngit-relay.nostrver.se/npub/repo.git"]`. Parsers must read **every value after index 0**, not only `tag[1]`. Repeated `["clone", url]` rows still appear on older relays — accept both.

2. **HTTPS GRASP clones:** Some GRASP relays (notably **`ngit-relay.nostrver.se`**) validate that the announcement lists **their own HTTPS git URL** on the `clone` row before accepting kind **30617**. Listing the relay under `relays` alone is not enough.

3. **Avoid `git@` SSH in `clone` for web-focused announcements:** Many browser-based Nostr Git clients cannot use SSH transports. Gittr keeps **`git@` URLs out of kind 30617 `clone`** and exposes SSH separately (sidebar / env such as `NEXT_PUBLIC_GIT_SSH_BASE`). CLI users still clone over SSH using that UI or their own remotes.

4. **`relays` row:** Match the NIP-34 multi-value style: `["relays", "wss://a", "wss://b"]` (gittr emission). Older per-relay repeated tags remain valid; parse all forms.

5. **Import / `source`:** For GitHub-GitLab-Codeberg imports, gittr keeps the upstream URL on the **`source`** tag and treats **GRASP HTTPS** as canonical in `clone` when publishing from gittr — adjust your client if you expected GitHub lines inside `clone`.

## Installation

```bash
npm install nostr-tools
# or
yarn add nostr-tools
```

## Request Schema (What You Send)

### Event Structure

```typescript
{
  kind: 30617,                    // NIP-34 repository announcement
  created_at: 1234567890,         // Unix timestamp
  tags: [
    ["d", "my-repo"],             // REQUIRED: Repository identifier (replaceable event)
    ["name", "My Repository"],     // Human-readable name
    ["description", "A cool repo"], // Description
    ["clone", "https://git.example.com/npub1…/repo.git", "https://ngit-relay.nostrver.se/npub1…/repo.git"],
    ["relays", "wss://relay1.com", "wss://relay2.com"],
    ["maintainers", "<hex64>", "<hex64>"], // Multi-value hex pubkeys (gittr / ngit)
    ["source", "https://github.com/user/repo"], // Source URL (optional)
    ["forkedFrom", "30617:pubkey:repo-name"], // Fork reference (optional)
    ["web", "https://example.com"], // Website URL (can repeat)
    ["t", "javascript"],          // Topic/tag (can repeat)
    ["link", "docs", "https://docs.example.com", "Documentation"] // Link tag (optional)
  ],
  content: "",                    // REQUIRED: Must be empty per NIP-34 spec
  pubkey: "abc123...",            // Event publisher (64 hex chars)
  id: "event-id-hash",            // Computed from event hash
  sig: "signature..."             // Event signature
}
```

### Required Tags

- **`d`** - Repository identifier (used for replaceable events)
- **`name`** - Human-readable repository name
- **`description`** - Repository description
- **`clone`** - At least one Git clone URL (required for interoperability)

### Optional Tags

- **`relays`** - Nostr relay URLs (recommended for discoverability)
- **`maintainers`** - Maintainer pubkeys in npub format (for access control)
- **`source`** - Source repository URL (for imported repos)
- **`forkedFrom`** - NIP-34 format reference to forked repo
- **`web`** - Website URLs
- **`t`** - Topics/tags for categorization
- **`link`** - Structured links with type and label

## Response Schema (What You Receive)

### Event Structure from Relay

```typescript
{
  kind: 30617,
  created_at: 1234567890,
  tags: [
    ["d", "my-repo"],
    ["name", "My Repository"],
    ["description", "A cool repo"],
    ["clone", "https://git.example.com/npub1…/repo.git", "https://ngit-relay.nostrver.se/npub1…/repo.git"],
    ["relays", "wss://relay1.com", "wss://relay2.com"],
    ["maintainers", "npub1abc..."],
    ["maintainers", "npub1def..."],
    ["source", "https://github.com/user/repo"],
    ["web", "https://example.com"],
    ["t", "javascript"],
    ["t", "typescript"],
    ["link", "docs", "https://docs.example.com", "Documentation"]
  ],
  content: "",                    // Always empty for NIP-34
  pubkey: "abc123...",
  id: "event-id-hash",
  sig: "signature..."
}
```

### Parsed Repository Data

After parsing, you get:

```typescript
{
  repositoryName: "my-repo",      // From "d" tag
  name: "My Repository",          // From "name" tag
  description: "A cool repo",     // From "description" tag
  clone: [
    "https://git.example.com/npub1…/repo.git",
    "https://ngit-relay.nostrver.se/npub1…/repo.git",
  ],
  relays: [                       // All "relays" tags
    "wss://relay1.com",
    "wss://relay2.com"
  ],
  maintainers: [                  // All "maintainers" tags (normalized to hex)
    "abc123...",
    "def456..."
  ],
  sourceUrl: "https://github.com/user/repo", // From "source" tag
  forkedFrom: "30617:pubkey:repo-name",      // From "forkedFrom" tag
  web: [                          // All "web" tags
    "https://example.com"
  ],
  topics: [                       // All "t" tags
    "javascript",
    "typescript"
  ],
  links: [                        // All "link" tags
    {
      type: "docs",
      url: "https://docs.example.com",
      label: "Documentation"
    }
  ]
}
```

## Usage

### Creating a Repository Event

```typescript
import { createRepositoryEvent } from './repository-events';
import { getPublicKey, signEvent } from 'nostr-tools';

// Define repository data
const repo = {
  repositoryName: "my-repo",
  name: "My Repository",
  description: "A cool repository",
  clone: [
    "https://git.example.com/npub1…/repo.git",
    "https://ngit-relay.nostrver.se/npub1…/repo.git",
  ],
  relays: [
    "wss://relay.example.com"
  ],
  contributors: [
    { pubkey: "abc123..." },
    { pubkey: "def456..." }
  ],
  sourceUrl: "https://github.com/user/repo",
  tags: ["javascript", "typescript"]
};

// Create and sign event
const privateKey = "your-private-key";
const event = createRepositoryEvent(repo, privateKey);

// Publish to Nostr
await publish(event, relays);
```

### Parsing a Repository Event

```typescript
import { parseNIP34Repository } from './repository-events';

// Subscribe to repository events
const unsub = subscribe(
  [{ kinds: [30617] }],
  relays,
  (event) => {
    // Parse NIP-34 event
    const repoData = parseNIP34Repository(event);
    
    console.log(repoData.repositoryName); // "my-repo"
    console.log(repoData.name);           // "My Repository"
    console.log(repoData.clone);          // ["https://...", "https://..."]
    console.log(repoData.maintainers);    // ["abc123...", "def456..."]
  }
);
```

### Querying for Specific Repository

```typescript
// Query for a specific repository by pubkey and d tag
const unsub = subscribe(
  [{
    kinds: [30617],
    authors: ["abc123..."],  // Repository owner pubkey
    "#d": ["my-repo"]        // Repository identifier
  }],
  relays,
  (event) => {
    const repoData = parseNIP34Repository(event);
    // Handle repository data
  }
);
```

## Tag Reference

| Tag | Required | Format | Description | Example |
|-----|----------|--------|-------------|---------|
| `d` | ✅ Yes | String | Repository identifier (for replaceable events) | `["d", "my-repo"]` |
| `name` | ✅ Yes | String | Human-readable repository name | `["name", "My Repository"]` |
| `description` | ✅ Yes | String | Repository description | `["description", "A cool repo"]` |
| `clone` | ✅ Yes | String+ | Git clone URL(s); **preferred:** one row, multiple HTTPS values | `["clone", "https://a/npub…/r.git", "https://ngit-relay…/npub…/r.git"]` |
| `relays` | No | String+ | Relay URL(s); **preferred:** one row, multiple `wss://` values | `["relays", "wss://a", "wss://b"]` |
| `maintainers` | No | String | Maintainer pubkey (npub format, can repeat) | `["maintainers", "npub1abc..."]` |
| `source` | No | String | Source repository URL | `["source", "https://github.com/user/repo"]` |
| `forkedFrom` | No | String | NIP-34 format fork reference | `["forkedFrom", "30617:pubkey:repo"]` |
| `web` | No | String | Website URL (can repeat) | `["web", "https://example.com"]` |
| `t` | No | String | Topic/tag (can repeat) | `["t", "javascript"]` |
| `link` | No | Array | Structured link: `[type, url, label?]` | `["link", "docs", "https://docs.com", "Docs"]` |

## Important Notes

### Cross-client interoperability

For full interop, repository announcements (`30617`) should be paired with repository state events (`30618`) for the same `d` identifier. Collaborative events that reference a repository (issues `1621`, pull requests `1618`, PR updates `1619`, patches `1617`) should include `r` (earliest unique commit/root commit) so clients can anchor history consistently.

If local repository cache metadata is incomplete, resolve `r` from git history (for example via `git rev-list --max-parents=0 <branch|HEAD>`) instead of blocking event creation.

For merge flows, do not stop at publishing a PR status update. After merge status (`1631`) is published, also publish refreshed repository/state events (`30617` + `30618`) so multi-client users see the merged commit/file state without relying on local cache order or timeline reconstruction.

### Content Field

**CRITICAL**: The `content` field **MUST be empty** (`""`) per NIP-34 spec. All metadata goes in tags, not in content. This ensures interoperability with other NIP-34 clients.

### Maintainers Format

Maintainer pubkeys should be in **npub format** (bech32-encoded) per best practices, but parsers should accept both npub and hex formats for compatibility.

### Clone URLs

- Prefer **HTTPS** GRASP URLs so browser-oriented clients can fetch trees and blobs.
- **`git@host:path` SSH URLs:** Fine for git CLI; gittr **does not place SSH on kind 30617 `clone`** — use HTTPS on the event and expose SSH in the UI if needed.

Try clone URLs in published order (first usable HTTPS wins for web).

### Relay Tags

**Preferred (gittr emission):** one `relays` row with multiple `wss://` values:

```typescript
[["relays", "wss://relay1.com", "wss://relay2.com"]]
```

**Still valid:** repeated rows (`["relays", "wss://a"], ["relays", "wss://b"]`) and comma-separated legacy values inside a single cell — parsers should normalize all forms.

```typescript
// Legacy comma-separated inside first cell (backward compat)
[["relays", "wss://relay1.com,wss://relay2.com"]]
```

### Privacy

**Privacy is NOT encoded in NIP-34 events**. Privacy is determined by:
- The `maintainers` tag (who has access)
- Bridge access control (server-side permissions)

Do not add custom `public-read`/`public-write` tags - they are not in the spec and break interoperability.

## Example: Complete Request/Response Cycle

### 1. Create Event (Request)

```typescript
const repo = {
  repositoryName: "my-repo",
  name: "My Repository",
  description: "A cool repository",
  clone: [
    "https://git.example.com/npub1…/my-repo.git",
    "https://ngit-relay.nostrver.se/npub1…/my-repo.git",
  ],
  relays: ["wss://relay.example.com", "wss://ngit-relay.nostrver.se"],
  contributors: [{ pubkey: "abc123..." }],
  sourceUrl: "https://github.com/user/upstream",
};

const event = createRepositoryEvent(repo, privateKey);
// Result: { kind: 30617, tags: [...] with ["clone", …] and ["relays", …] multi-value rows, …, content: "", … }
```

### 2. Publish to Relay

```typescript
await publish(event, ["wss://relay.example.com"]);
```

### 3. Receive Event (Response)

```typescript
// Relay sends back the event
{
  kind: 30617,
  created_at: 1234567890,
  tags: [
    ["d", "my-repo"],
    ["name", "My Repository"],
    ["description", "A cool repository"],
    ["clone", "https://git.example.com/npub1…/my-repo.git", "https://ngit-relay.nostrver.se/npub1…/my-repo.git"],
    ["relays", "wss://relay.example.com", "wss://ngit-relay.nostrver.se"],
    ["maintainers", "npub1abc..."],
    ["source", "https://github.com/user/upstream"],
  ],
  content: "",
  pubkey: "abc123...",
  id: "event-id-hash",
  sig: "signature..."
}
```

### 4. Parse Event

```typescript
const repoData = parseNIP34Repository(event);
// Result:
// {
//   repositoryName: "my-repo",
//   name: "My Repository",
//   description: "A cool repository",
//   clone: ["https://git.example.com/npub1…/my-repo.git", "https://ngit-relay.nostrver.se/npub1…/my-repo.git"],
//   relays: ["wss://relay.example.com", "wss://ngit-relay.nostrver.se"],
//   maintainers: ["abc123..."]
// }
```

## Related Documentation

- **NIP-34 Specification**: https://github.com/nostrability/schemata/tree/master/nips/nip-34
- **NIP-33**: Parameterized Replaceable Events (used by NIP-34)
- **NIP-19**: bech32-encoded entities (for npub format)
- **gittr Implementation**: See `ui/src/lib/nostr/events.ts` in the main gittr repository

## License

MIT, keeping attribution to the gittr.space implementation.

