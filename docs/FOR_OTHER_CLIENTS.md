# For other clients and coding agents

This file is the **porting index** for [gittr-helper-tools](https://github.com/arbadacarbaYK/gittr-helper-tools). Use it when you (or an AI agent) are building or extending a **Nostr-native Git client** and want behaviour that matches [gittr.space](https://gittr.space) production without re‑inventing edge cases.

## How snippets relate to production

| Snippet | Portable (NIP / generic) | gittr-specific (adapt) | Canonical source in [ngit](https://github.com/arbadacarbaYK/gittr) |
| --- | --- | --- | --- |
| [file-fetching](../snippets/file-fetching/) | Clone URL parsing, encoding, source types | API routes (`/api/nostr/repo/files`, OAuth), bridge clone triggers | `ui/src/lib/utils/git-source-fetcher.ts`, `ui/pages/api/git/`, `ui/pages/api/nostr/repo/` |
| [url-normalization](../snippets/url-normalization/) | **Fully portable** — pure URL helpers | None | Same as `git-source-fetcher.ts` |
| [grasp-detection](../snippets/grasp-detection/) | GRASP vs relay concept | Domain lists (`git.gittr.space`, push vs read mirrors) | `grasp-servers.ts` + fetcher |
| [nip34-repository-events](../snippets/nip34-repository-events/) | **NIP-34 interop** — multi-value `clone`/`relays`, parsers | gittr emission rules (HTTPS GRASP, no `git@` in `clone`) | `ui/src/lib/nostr/events.ts`, publish flows |
| [nip34-push-paywall](../snippets/nip34-push-paywall/) | Extension tag `push_cost_sats` | Your host’s payment API | Bridge + `ui/pages/api/nostr/repo/push-*` |
| [nip25-stars-nip51-following](../snippets/nip25-stars-nip51-following/) | **NIP-25 / NIP-51** | UI wiring, relay filters | `ui/src/lib/nostr/repo-stars.ts`, list events |
| [nip46-remote-signer](../snippets/nip46-remote-signer/) | NIP-46 pairing patterns | **Web UI only** — bridge does not implement NIP-46 | `ui/src/lib/nostr/remoteSigner.ts` |
| [nip-c0-code-snippets](../snippets/nip-c0-code-snippets/) | **NIP-C0** kind `1337` | Line **permalinks** (`#L…`) are gittr UI, not the NIP | `events.ts`, `code-viewer.tsx`, `code-snippet-renderer.tsx` |
| [markdown-media-handling](../snippets/markdown-media-handling/) | Relative media/link resolution ideas | Production uses **`markdown-anchor.tsx`** + inline img handler on repo page | `ui/src/lib/utils/markdown-anchor.tsx`, repo `page.tsx` |

**Not in this repo (yet):** full file-fetch orchestration (caching, parallel sources, GitLab pagination) — documented in gittr [`FILE_FETCHING_INSIGHTS.md`](https://github.com/arbadacarbaYK/gittr/blob/main/docs/FILE_FETCHING_INSIGHTS.md).

## Suggested workflow for agents

1. Read the snippet README for the feature you are implementing.
2. Copy the `.ts` / `.tsx` files into your client; keep MIT attribution.
3. Cross-check the **Canonical source** path in ngit — snippets can lag by a few commits.
4. Replace gittr-only assumptions: API base paths, env vars (`NEXT_PUBLIC_*`), relay lists, GRASP domain tables.
5. Run your client’s interop tests against a real kind `30617` from gittr or ngit-relay.

## What stays standard vs gittr-only

| Standard (reuse as-is) | gittr-only (do not assume in other clients) |
| --- | --- |
| NIP-34 empty content + tag metadata | `?file=` + `#L6-L10` permalink URLs |
| NIP-C0 kind `1337` tags | “View Code” toggle for `.md` in file viewer |
| NIP-25 `+` on repo event id | gittr Help / PWA service worker |
| NIP-46 bunker/nostrconnect in **browser** | Bridge signing or NIP-46 on git server |
| `push_cost_sats` on `30617` | Exact gittr push-payment HTTP routes |

## Hygiene

Do not copy production secrets, IPs, or keys from gittr deploy docs into your fork. Use placeholders in `.env.example`.
