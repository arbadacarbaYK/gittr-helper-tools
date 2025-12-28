# NIP-34 Repository Events

Code snippets for implementing **NIP-34** (Replaceable Events) repository announcements in a Nostr client. This shows the complete request/response cycle: what you send, what you receive, and how to handle it.

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
    ["clone", "https://github.com/user/repo.git"], // Git clone URL (can repeat)
    ["clone", "git@github.com:user/repo.git"],     // Multiple clone URLs supported
    ["relays", "wss://relay1.com"], // Nostr relay (can repeat)
    ["relays", "wss://relay2.com"],
    ["maintainers", "npub1..."],   // Maintainer pubkey (npub format, can repeat)
    ["maintainers", "npub1..."],
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
    ["clone", "https://github.com/user/repo.git"],
    ["clone", "git@github.com:user/repo.git"],
    ["relays", "wss://relay1.com"],
    ["relays", "wss://relay2.com"],
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
  clone: [                        // All "clone" tags
    "https://github.com/user/repo.git",
    "git@github.com:user/repo.git"
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
    "https://github.com/user/repo.git",
    "git@github.com:user/repo.git"
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
    console.log(repoData.clone);          // ["https://...", "git@..."]
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
| `clone` | ✅ Yes | String | Git clone URL (can repeat) | `["clone", "https://github.com/user/repo.git"]` |
| `relays` | No | String | Nostr relay URL (can repeat) | `["relays", "wss://relay.com"]` |
| `maintainers` | No | String | Maintainer pubkey (npub format, can repeat) | `["maintainers", "npub1abc..."]` |
| `source` | No | String | Source repository URL | `["source", "https://github.com/user/repo"]` |
| `forkedFrom` | No | String | NIP-34 format fork reference | `["forkedFrom", "30617:pubkey:repo"]` |
| `web` | No | String | Website URL (can repeat) | `["web", "https://example.com"]` |
| `t` | No | String | Topic/tag (can repeat) | `["t", "javascript"]` |
| `link` | No | Array | Structured link: `[type, url, label?]` | `["link", "docs", "https://docs.com", "Docs"]` |

## Important Notes

### Content Field

**CRITICAL**: The `content` field **MUST be empty** (`""`) per NIP-34 spec. All metadata goes in tags, not in content. This ensures interoperability with other NIP-34 clients.

### Maintainers Format

Maintainer pubkeys should be in **npub format** (bech32-encoded) per best practices, but parsers should accept both npub and hex formats for compatibility.

### Clone URLs

Multiple clone URLs are supported and should be tried in order:
1. HTTPS URLs (for API access)
2. SSH URLs (for git protocol)
3. GRASP servers (Nostr relays that serve git)

### Relay Tags

Each relay should be in a **separate tag** per NIP-34 spec:
```typescript
// ✅ Correct: Separate tags
[["relays", "wss://relay1.com"], ["relays", "wss://relay2.com"]]

// ❌ Incorrect: Comma-separated (backward compat only)
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
  clone: ["https://github.com/user/repo.git"],
  relays: ["wss://relay.example.com"],
  contributors: [{ pubkey: "abc123..." }]
};

const event = createRepositoryEvent(repo, privateKey);
// Result: { kind: 30617, tags: [...], content: "", ... }
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
    ["clone", "https://github.com/user/repo.git"],
    ["relays", "wss://relay.example.com"],
    ["maintainers", "npub1abc..."]
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
//   clone: ["https://github.com/user/repo.git"],
//   relays: ["wss://relay.example.com"],
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

