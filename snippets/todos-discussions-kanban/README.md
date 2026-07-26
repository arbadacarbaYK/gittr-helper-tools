# ToDo / Discussions / Kanban on gittr — how we handle it (for a future NIP)

Status: **product behavior today** + **draft pointers**. Not a shipped kind. Use this when proposing a NIP or porting boards to another client.

**Related:** [`../github-oauth-writeback/`](../github-oauth-writeback) (optional forge write-back), gittr `docs/NIPS_AND_EVENT_KINDS.md` → Projects / Kanban.

## What users see

| Surface | Route | Today |
| --- | --- | --- |
| **ToDo (Kanban)** | `/{entity}/{repo}/projects` | Local boards in `localStorage` + **read-only** GitHub Projects V2 import when the repo has a GitHub `source` / `sourceUrl` |
| **Discussions** | repo Discussions tab | Soft-sync / mirror patterns similar to Issues when upstream is GitHub; Nostr-native threads stay NIP-34-ish (issues/comments) |
| **Issues / PRs** | NIP-34 kinds `1621` / `1618` (+ status) | Canonical Nostr collaboration; GH soft-sync is a mirror, not a second source of truth |

## Design rules (keep these if you invent a kind)

1. **Nostr first for pure npub repos** — boards that never touched GitHub stay local or become Nostr events; do not require GitHub.
2. **GitHub Projects = mirror** — import on tab open; column moves do **not** write back unless the user opts into OAuth (see oauth-writeback snippet).
3. **Cards are issues/PRs when possible** — prefer linking kanban cards to kind `1621` / `1618` rather than inventing a parallel “ticket” kind.
4. **Do not mint a permanent gittr-only kind** until a draft settles ([nips#1665](https://github.com/nostr-protocol/nips/pull/1665), [nips#1804](https://github.com/nostr-protocol/nips/pull/1804), Headway provisional 30619/30620).
5. **Permissions** — visitors must not Quick-Add into someone else’s local board; editors only. GH boards stay read-only without OAuth.
6. **Identity for write-back** — NIP-39 kind `10011` *and* legacy `i` on kind `0` (gittr unions both; same claim prefers 10011). Kind `0` profile fields (name/avatar) stay separate and must not be dropped when 10011 exists. OAuth is a bridge, not the event transport.

## Suggested event shape (when a NIP lands)

Keep transport boring:

| Piece | Suggestion |
| --- | --- |
| Board | Replaceable addressable event (`d` = repo id + board slug), tags: `a`/`e` to repo announce, column defs |
| Card | Either pointer to existing `1621`/`1618`, or a small kind with `["e", "<issue-or-pr-id>"]` + column tag |
| Mirror | Optional `["mirror", "github", "<node-id-or-url>"]` — documentation only; mutations stay off-Nostr |

Auth for GitHub stays **OAuth**. Do not put tokens in events.

## gittr implementation map (for agents)

| Concern | Where |
| --- | --- |
| ToDo UI + GH Projects import | `ui/src/app/[entity]/[repo]/projects/page.tsx`, `sync-github-repo-projects.ts` |
| Issues/PRs soft-sync | `sync-github-repo-issues-prs.ts`, `repo-github-hub.ts` |
| Clone URL quality / announce | `ui/src/lib/nostr/clone-url-quality.ts` |
| NIP notes | `docs/NIPS_AND_EVENT_KINDS.md` |

## MCP / helpers

- **gittr-mcp** — agents use HTTPS/Nostr auth more than SSH; still prefer working clone URLs (hex path on `git.gittr.space`, or GitHub `source`).
- This folder — documentation only until a board NIP is adopted; then add a small event builder snippet here.

## Out of scope here

- Implementing OAuth write-back
- Shipping provisional Headway kinds in production
- Changing NIP-34 issue/PR kinds
