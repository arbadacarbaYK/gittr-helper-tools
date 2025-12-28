/**
 * NIP-34 Repository Events - Schema Examples
 * 
 * Complete request/response examples showing the exact structure of
 * NIP-34 repository events for developers of other Nostr clients.
 */

/**
 * REQUEST SCHEMA: Event you send to Nostr relay
 * 
 * This is the exact structure of a NIP-34 repository announcement event
 * that you create and publish to relays.
 */
export const REQUEST_SCHEMA_EXAMPLE = {
  kind: 30617,                    // NIP-34 repository announcement
  created_at: 1704067200,         // Unix timestamp
  tags: [
    ["d", "my-repo"],             // REQUIRED: Repository identifier
    ["name", "My Repository"],     // Human-readable name
    ["description", "A cool repository"], // Description
    ["clone", "https://github.com/user/repo.git"], // Git clone URL
    ["clone", "git@github.com:user/repo.git"],     // Multiple clone URLs
    ["relays", "wss://relay.example.com"], // Nostr relay
    ["relays", "wss://relay2.example.com"], // Multiple relays
    ["maintainers", "npub1abc123..."],     // Maintainer (npub format)
    ["maintainers", "npub1def456..."],     // Multiple maintainers
    ["source", "https://github.com/user/repo"], // Source URL
    ["forkedFrom", "30617:9a83779e75080556c656d4d418d02a4d7edbe288a2f9e6dd2b48799ec935184c:original-repo"], // Fork reference
    ["web", "https://example.com"],        // Website URL
    ["t", "javascript"],           // Topic/tag
    ["t", "typescript"],           // Multiple topics
    ["link", "docs", "https://docs.example.com", "Documentation"], // Structured link
  ],
  content: "",                    // REQUIRED: Must be empty per NIP-34 spec
  pubkey: "9a83779e75080556c656d4d418d02a4d7edbe288a2f9e6dd2b48799ec935184c", // Event publisher (64 hex chars)
  id: "abc123def456...",          // Computed from event hash
  sig: "signature-hash..."        // Event signature
};

/**
 * RESPONSE SCHEMA: Event you receive from Nostr relay
 * 
 * This is the exact structure of a NIP-34 repository event
 * that you receive when querying relays.
 */
export const RESPONSE_SCHEMA_EXAMPLE = {
  kind: 30617,
  created_at: 1704067200,
  tags: [
    ["d", "my-repo"],
    ["name", "My Repository"],
    ["description", "A cool repository"],
    ["clone", "https://github.com/user/repo.git"],
    ["clone", "git@github.com:user/repo.git"],
    ["relays", "wss://relay.example.com"],
    ["relays", "wss://relay2.example.com"],
    ["maintainers", "npub1abc123..."],
    ["maintainers", "npub1def456..."],
    ["source", "https://github.com/user/repo"],
    ["forkedFrom", "30617:9a83779e75080556c656d4d418d02a4d7edbe288a2f9e6dd2b48799ec935184c:original-repo"],
    ["web", "https://example.com"],
    ["t", "javascript"],
    ["t", "typescript"],
    ["link", "docs", "https://docs.example.com", "Documentation"]
  ],
  content: "",                    // Always empty for NIP-34
  pubkey: "9a83779e75080556c656d4d418d02a4d7edbe288a2f9e6dd2b48799ec935184c",
  id: "abc123def456...",
  sig: "signature-hash..."
};

/**
 * PARSED DATA SCHEMA: Result after parsing
 * 
 * This is the structure you get after parsing a NIP-34 event
 * using the parseNIP34Repository function.
 */
export const PARSED_DATA_EXAMPLE = {
  repositoryName: "my-repo",      // From "d" tag
  name: "My Repository",          // From "name" tag
  description: "A cool repository", // From "description" tag
  clone: [                        // All "clone" tags
    "https://github.com/user/repo.git",
    "git@github.com:user/repo.git"
  ],
  relays: [                       // All "relays" tags
    "wss://relay.example.com",
    "wss://relay2.example.com"
  ],
  maintainers: [                  // All "maintainers" tags (normalized to hex)
    "abc123...",
    "def456..."
  ],
  sourceUrl: "https://github.com/user/repo", // From "source" tag
  forkedFrom: "30617:9a83779e75080556c656d4d418d02a4d7edbe288a2f9e6dd2b48799ec935184c:original-repo", // From "forkedFrom" tag
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
};

/**
 * SUBSCRIPTION FILTER EXAMPLE: Query for specific repository
 * 
 * This shows how to query relays for a specific repository.
 */
export const SUBSCRIPTION_FILTER_EXAMPLE = {
  kinds: [30617],                 // NIP-34 repository events
  authors: ["9a83779e75080556c656d4d418d02a4d7edbe288a2f9e6dd2b48799ec935184c"], // Repository owner
  "#d": ["my-repo"]                // Repository identifier
};

/**
 * SUBSCRIPTION FILTER EXAMPLE: Query for all repositories
 * 
 * This shows how to query relays for all repositories.
 */
export const SUBSCRIPTION_FILTER_ALL_EXAMPLE = {
  kinds: [30617],                 // NIP-34 repository events
  limit: 100                      // Limit results
};

/**
 * ERROR HANDLING: Invalid event examples
 * 
 * These are examples of events that violate NIP-34 spec.
 */
export const INVALID_EVENT_EXAMPLES = {
  // ❌ Content is not empty (violates NIP-34 spec)
  hasContent: {
    kind: 30617,
    tags: [["d", "my-repo"]],
    content: '{"name": "My Repo"}', // ❌ Should be ""
    // ...
  },
  
  // ❌ Missing required "d" tag
  missingDTag: {
    kind: 30617,
    tags: [["name", "My Repo"]], // ❌ Missing "d" tag
    content: "",
    // ...
  },
  
  // ❌ Missing required "clone" tag
  missingCloneTag: {
    kind: 30617,
    tags: [["d", "my-repo"]], // ❌ Missing "clone" tag
    content: "",
    // ...
  },
  
  // ❌ Using legacy kind:51 format
  legacyFormat: {
    kind: 51,                     // ❌ Should be 30617
    content: '{"repositoryName": "my-repo"}', // ❌ Should use tags
    // ...
  }
};

/**
 * VALIDATION CHECKLIST
 * 
 * Use this checklist when creating or parsing NIP-34 events:
 */
export const VALIDATION_CHECKLIST = {
  // Event structure
  kindIs30617: "Event kind must be 30617",
  contentIsEmpty: "Content field must be empty string (\"\")",
  tagsIsArray: "Tags must be an array of string arrays",
  
  // Required tags
  hasDTag: "Must have 'd' tag with repository identifier",
  hasNameTag: "Should have 'name' tag for discoverability",
  hasDescriptionTag: "Should have 'description' tag",
  hasCloneTag: "Must have at least one 'clone' tag",
  
  // Tag format
  dTagIsString: "'d' tag value must be a non-empty string",
  cloneTagsAreStrings: "All 'clone' tag values must be non-empty strings",
  relaysTagsAreStrings: "All 'relays' tag values must be valid relay URLs",
  maintainersTagsAreValid: "All 'maintainers' tag values must be valid npub or hex pubkeys",
  
  // Tag values
  cloneUrlsAreValid: "Clone URLs should be valid git URLs (https://, git@, etc.)",
  relayUrlsAreValid: "Relay URLs should start with wss:// or ws://",
  maintainersAreValidPubkeys: "Maintainers should be valid Nostr pubkeys (npub or hex)",
};

