# ToDo / Kanban on gittr

The repo **ToDo** tab is a kanban board. Push publishes it as a general Nostr board, so a kanban app that is not a forge can show the same events. A forge project is only the first copy.

**Draft we follow:** [nips#1665](https://github.com/nostr-protocol/nips/pull/1665) — the same text as Kanbanstr’s [NIP-100.md](https://github.com/vivganes/kanbanstr/blob/main/NIP-100.md). Kinds **30301** (board) and **30302** (card). Nothing is merged yet. gittr did not mint its own kind.

**Also read, and not what we publish:** [nips#1804](https://github.com/nostr-protocol/nips/pull/1804) (the board event lists every card) and Headway’s provisional 30619/30620 (those numbers are already used elsewhere).

**Related:** gittr `docs/NIPS_AND_EVENT_KINDS.md` → Projects / Kanban.

## What someone sees

| Surface | Route | What happens |
| --- | --- | --- |
| **ToDo** | `/{entity}/{repo}/projects` | Edit the board, then **Push to Nostr**. Help: `/help#projects`. |
| **Imported GitHub project** | same tab | Fills the board once. Later edits push to Nostr. GitHub is not written back. |
| **GitLab, Codeberg, Gitea** | same tab | No project import. Create a board here and push it. |
| **Issues / PRs** | kinds `1621` / `1618` | Stay tickets. A card points at them. Closing a ticket moves the card to Done. |
| **Discussions** | Discussions tab | Unchanged. Forge threads stay read-only. Nostr-only threads are NIP-23 kind 30023. |

## How the events look

| Piece | What we publish |
| --- | --- |
| Board | Kind `30301`. `d` is stable. `title`. Columns are `["col", "todo", "To Do", "0"]` (id, then title). One `a` tag `30617:<owner>:<repo>` when the board belongs to a repo. Optional `["mirror","github", project id]`. |
| Card | Kind `30302`. `s` is the column **id** (`todo`, `in_progress`, `done`), not the title. We still read a title such as `To Do` from other apps. `a` points at the board. |
| Issue or PR that is a Nostr event | Same card, plus `k` (`1621` or `1618`) and `e` (the event id). |
| Forge issue number | Normal card with an `issue` or `pr` tag (`issue-12`). |
| Delete | Kind `5`, with the board or card address and the repo address. |

A board with no repo `a` tag is a personal board. It does not show on a repo ToDo tab.

## Relay and Blossom

- **`relay.gittr.space`** needs **30301** and **30302** in Pyramid’s allowed kinds and in `open_kinds_spec`. Kind **5** is already used for deletes. Other relays that allow any kind will store the board without a change.
- **Blossom does not need a change.** These events are text. Blossom stores file bytes (Pages, images), not kanban cards.

## Code in gittr

| Concern | Where |
| --- | --- |
| Build / parse | `ui/src/lib/projects/kanban-nip.ts` |
| Sign + publish | `ui/src/lib/projects/publish-kanban.ts` |
| ToDo page | `ui/src/app/[entity]/[repo]/projects/page.tsx` |
| GitHub seed | `ui/src/lib/utils/sync-github-repo-projects.ts` |

## Suggestions we left on the draft

Friendly notes on [nips#1665](https://github.com/nostr-protocol/nips/pull/1665), not a rival NIP:

1. Put the column **id** in `s`, and keep accepting the column title so today’s Kanbanstr boards still open.
2. An optional `a` tag `30617:<owner>:<repo>` when the board is for a git repo. Personal boards omit it.
3. A git issue has no `s` tag. Open, closed, and merged are kinds 1630–1633. A tracker card can follow those, and its own `s` wins when there is no status event.

## Out of scope

- Writing a column move back to GitHub, GitLab, Codeberg, or Gitea
- Changing NIP-34 issue and pull request kinds
