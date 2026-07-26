# GitHub OAuth write-back (ToDo / Discussions) — plan

Status: **planned**, not implemented. Read-only GitHub → gittr mirrors already exist for Issues, PRs, Releases, and Projects V2 (ToDo).

## What someone asked for

When a Nostr repo owner has a **known GitHub identity** (NIP-39 `i` / claim, or `source` / `forkedFrom` on the repo announce), let maintainers:

1. Sign in with **GitHub OAuth** (user token, not the platform public-repo token).
2. **Write back** from gittr ToDo / Discussions into GitHub (Projects V2 cards, Issues, Discussions).

## Is this a NIP / kind?

**No — not as the first step, and probably not as the only step.**

| Layer | Role |
| --- | --- |
| **Nostr (NIP-34 + future board drafts)** | Source of truth for *Nostr-native* git collaboration: issues `1621`, PRs `1618`, status kinds, eventual kanban drafts (#1665 / #1804 / Headway). |
| **GitHub OAuth + REST/GraphQL** | *Bridge* to an external forge. Same class as today’s soft-sync *from* GitHub — just bidirectional for owners who opt in. |
| **NIP-39 identities** | How we *know* “this npub ↔ this GitHub user” so we only offer write-back when the claim matches the upstream owner/collaborator. |

Inventing a “kind that means push this card to GitHub” would couple every client to GitHub’s API shape and auth. Prefer:

1. Keep board/discussion **events on Nostr** (or local until a board NIP lands).
2. Optionally **mirror outbound** via GitHub OAuth when the user explicitly connects GitHub and the repo has a GitHub upstream + matching identity.

A small optional tag on a board/discussion event (e.g. `["mirror", "github", "<url-or-node-id>"]`) can document *that* a mirror exists — that tag *could* be proposed in a git NIP later. Auth and mutations stay off-Nostr.

## gittr product plan

1. **Identity gate** — Resolve owner NIP-39 GitHub claim and/or repo `source` URL. Only offer “Connect GitHub to write back” when claim matches upstream org/user (or collaborator check via OAuth).
2. **OAuth app** — User-scoped token with minimal scopes (`public_repo` or `repo` only if private; Projects/Discussions scopes as needed). Store token client-side or in a tight server session — never reuse `GITHUB_PLATFORM_TOKEN` for writes.
3. **Write paths (phase order)**  
   - Issues / PR comments (already familiar APIs)  
   - Discussions (GraphQL)  
   - Projects V2 item field updates (GraphQL) — today’s ToDo is read-only for GH boards  
4. **UX** — GH-sourced boards stay labeled read-only until OAuth connected; local boards stay local-only unless user links a GH project.
5. **Nostr-first default** — Pure npub repos without GitHub upstream never see OAuth write-back.

## Out of scope for a helper snippet today

No copy-paste OAuth client yet — this README is the product/architecture note so agents don’t invent a fake “kanban kind” as the write transport.

Related in gittr: `sync-github-repo-projects.ts`, `sync-github-repo-issues-prs.ts`, `docs/NIPS_AND_EVENT_KINDS.md`.
