/**
 * NIP-34 Repository Events - Schema Examples
 *
 * Tag shape reflects **gittr production (2026-07-18):** multi-value `clone`,
 * `relays`, `web`, and `maintainers` (hex pubkeys) rows.
 * Source: gittr/ui/src/lib/nostr/events.ts (buildUnsignedRepositoryEvent)
 *
 * MIT — keep this attribution when copying into your project.
 */

/**
 * REQUEST SCHEMA: Event you send to Nostr relay
 */
export const REQUEST_SCHEMA_EXAMPLE = {
  kind: 30617,
  created_at: 1704067200,
  tags: [
    ["d", "my-repo"],
    ["name", "My Repository"],
    ["description", "A cool repository"],
    [
      "clone",
      "https://git.gittr.space/npub1aaaa/my-repo.git",
      "https://relay.gittr.space/npub1aaaa/my-repo.git",
    ],
    ["relays", "wss://relay.gittr.space", "wss://relay.damus.io"],
    [
      "maintainers",
      "9a83779e75080556c656d4d418d02a4d7edbe288a2f9e6dd2b48799ec935184c",
      "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789",
    ],
    ["web", "https://example.com/logo.png", "https://docs.example.com"],
    ["source", "https://github.com/user/repo"],
    [
      "forkedFrom",
      "30617:9a83779e75080556c656d4d418d02a4d7edbe288a2f9e6dd2b48799ec935184c:original-repo",
    ],
    ["t", "javascript"],
    ["t", "typescript"],
    ["link", "docs", "https://docs.example.com", "Documentation"],
    // gittr extensions (optional)
    ["push_cost_sats", "2"],
    ["public-read", "true"],
    ["public-write", "false"],
  ],
  content: "",
  pubkey: "9a83779e75080556c656d4d418d02a4d7edbe288a2f9e6dd2b48799ec935184c",
  id: "abc123def456...",
  sig: "signature-hash...",
};

/**
 * RESPONSE SCHEMA: Event you receive from Nostr relay
 */
export const RESPONSE_SCHEMA_EXAMPLE = {
  ...REQUEST_SCHEMA_EXAMPLE,
};

/**
 * PARSED DATA SCHEMA: Result after parsing
 */
export const PARSED_DATA_EXAMPLE = {
  repositoryName: "my-repo",
  name: "My Repository",
  description: "A cool repository",
  clone: [
    "https://git.gittr.space/npub1aaaa/my-repo.git",
    "https://relay.gittr.space/npub1aaaa/my-repo.git",
  ],
  relays: ["wss://relay.gittr.space", "wss://relay.damus.io"],
  maintainers: [
    "9a83779e75080556c656d4d418d02a4d7edbe288a2f9e6dd2b48799ec935184c",
    "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789",
  ],
  sourceUrl: "https://github.com/user/repo",
  forkedFrom:
    "30617:9a83779e75080556c656d4d418d02a4d7edbe288a2f9e6dd2b48799ec935184c:original-repo",
  web: ["https://example.com/logo.png", "https://docs.example.com"],
  topics: ["javascript", "typescript"],
  links: [
    {
      type: "docs",
      url: "https://docs.example.com",
      label: "Documentation",
    },
  ],
  pushCostSats: 2,
  publicRead: true,
  publicWrite: false,
};

/**
 * Bad announce: host-only clone — other clients cannot fetch files.
 * Use ../clone-url-quality/ to expand before publish.
 */
export const HOST_ONLY_CLONE_ANTI_PATTERN = {
  kind: 30617,
  tags: [
    ["d", "my-repo"],
    ["clone", "https://git.gittr.space"], // BAD — missing /npub/repo.git
  ],
  content: "",
};
