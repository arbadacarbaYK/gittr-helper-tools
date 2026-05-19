# gittr helper tools & snippets

Utilities and code snippets extracted from [gittr.space](https://gittr.space) that handle complex file-fetching logic, URL normalization, GRASP server detection, and other tricky bits we've built.

These are **actual code snippets** we use in production, not theoretical helpers. They solve real problems we encountered while building gittr.

**Forking / docs hygiene:** Examples in this repo intentionally use **placeholders** (e.g. `lnbits.example.com`). Do not commit real **server IPs**, **SSH key paths**, **OAuth client secrets**, **LNbits admin keys**, or **nsecs** into public docs or `.env` files you push to git. Use `.env.example` patterns and keep operator-specific deploy scripts private.

## What's in here

| Folder | What it does | Why it exists |
| --- | --- | --- |
| [`snippets/file-fetching/`](./snippets/file-fetching) | Parse clone URLs from NIP-34 events, identify source types (GitHub/GitLab/Codeberg/GRASP/self-hosted), handle multiple fallback sources, GitHub OAuth token support | NIP-34 repos can have multiple clone URLs. We need to parse them, identify the source type, and try them in parallel. **GRASP / bridge:** gittr triggers clone when **`/api/nostr/repo/files`** is **404** or **200 with empty `files`**, not only on 404. **GitHub OAuth**: For private repositories, users authenticate via GitHub OAuth and their tokens are passed to the file-content API. The API prioritizes user tokens (private repos) over platform tokens (public repos). **Note**: The full fetching system includes performance optimizations (caching, deduplication, source prioritization) — see [FILE_FETCHING_INSIGHTS.md](https://github.com/arbadacarbaYK/gittr/blob/main/docs/FILE_FETCHING_INSIGHTS.md) on the gittr repo. |
| [`snippets/url-normalization/`](./snippets/url-normalization) | Convert SSH (`git@host:path`) and `git://` URLs to HTTPS for API calls | Different git servers use different URL formats. We normalize them to HTTPS for consistent API calls. |
| [`snippets/grasp-detection/`](./snippets/grasp-detection) | Identify GRASP servers (git servers that are also Nostr relays) vs regular relays | GRASP servers need special handling - they serve repos via git protocol, not REST APIs. |
| [`snippets/nip46-remote-signer/`](./snippets/nip46-remote-signer) | NIP-46 remote signer integration with QR scanning support | Enable users to pair hardware signers (LNbits, Nowser, Bunker) without exposing private keys. Includes QR code scanning using `html5-qrcode`. |
| [`snippets/nip25-stars-nip51-following/`](./snippets/nip25-stars-nip51-following) | NIP-25 reactions for starring and NIP-51 `10018` lists for following repositories | Decentralized starring and following using standard NIPs. Platform-wide visibility without server storage. |
| [`snippets/markdown-media-handling/`](./snippets/markdown-media-handling) | Handle images, videos, and media in markdown files with API endpoint support | Two approaches: simple inline handler (currently used in gittr) and full-featured component-based solution. Resolves relative image paths to Git provider raw URLs (GitHub/GitLab/Codeberg), converts base64 API responses to data URLs, supports YouTube/Vimeo embeds, and handles relative links within repositories. |
| [`snippets/nip-c0-code-snippets/`](./snippets/nip-c0-code-snippets) | NIP-C0 code snippet sharing and rendering | Kind `1337` events + renderer. On gittr, **Copy permalink** (`#L6-L10` in file code view) is separate from **Share as snippet** (Nostr event). See snippet README for URL shape and “View Code” on `.md` files. |
| [`snippets/nip34-repository-events/`](./snippets/nip34-repository-events) | NIP-34 repository event schemas and handling | Complete request/response schemas for NIP-34 (kind:30617) repository announcements. Shows what you send, what you receive, and how to parse it. Essential for developers of other Nostr clients to ensure spec compliance and interoperability. |
| [`snippets/nip34-push-paywall/`](./snippets/nip34-push-paywall) | NIP-34 push paywall extension (`push_cost_sats`) | Interop profile for pay-to-push: publish policy on kind `30617`, normalize `owner+d`, and enforce payment server-side (HTTP/SSH) with `402` + invoice flow. |
| `cmd/` | (Future) Standalone CLI tools or services | Helpers that can run independently (e.g., clone-events-sse, blossom-fetch-helper) |

## Supported NIPs (gittr ecosystem)

This repo is **documentation + snippets**; “support” means what **[gittr.space](https://gittr.space)** and the **[gitnostr bridge fork](https://github.com/arbadacarbaYK/gitnostr)** actually implement in production.

| NIP / kind | Where it lives | Notes |
| --- | --- | --- |
| **NIP-46** (kind **`24133`**) | **gittr web UI only** | Remote signer / `bunker://` / `nostrconnect://`, QR, NIP-07 adapter. The **bridge never implements NIP-46**; it only sees normal signed events on relays. |
| **NIP-07** | gittr web UI | In-browser extension signing (separate code path from NIP-46, same UX goal). |
| **NIP-34** + kinds **`30617` / `30618`** | UI + bridge | Repository metadata and state; bridge clones and SSH. |
| **NIP-57** (e.g. **`9735`**) | gittr UI + relays | Zaps; bridge may see zap receipts on relays but does not create them. |
| **NIP-96** | gittr UI | Blossom uploads (e.g. packs, Pages assets). |
| **Kinds `50`–`52`, NIP-22 threads, etc.** | Mostly bridge + UI | See gittr’s canonical list: [`docs/NIPS_AND_EVENT_KINDS.md`](https://github.com/arbadacarbaYK/gittr/blob/main/docs/NIPS_AND_EVENT_KINDS.md). |

**If you are implementing NIP-46:** read [`docs/NIP46_REMOTE_SIGNER_INTEGRATION.md`](https://github.com/arbadacarbaYK/gittr/blob/main/docs/NIP46_REMOTE_SIGNER_INTEGRATION.md) on gittr (architecture + pitfalls), then the snippet [`snippets/nip46-remote-signer/`](./snippets/nip46-remote-signer) for extracted code. The table above avoids the common mistake of expecting the **git server** to participate in bunker/nostrconnect pairing.

## Getting Started

Each snippet folder contains its own README with detailed documentation, code examples, and usage instructions. 

## Recent Additions

### GRASP + NIP-34 snippet sync (2026-05-15)
- **`snippets/grasp-detection/grasp-servers.ts`:** Added **`git.gittr.space`**, documented **`git.jb55.com`** as read-oriented, introduced **`GRASP_SERVERS_FOR_PUSHING`** (mirrors excluded from multi-tenant push lists).
- **`snippets/nip34-repository-events/`:** Documented gittr production **multi-value `clone` / `relays` rows**, **HTTPS GRASP clone requirement** for ngit-relay acceptance, **no `git@` SSH in `clone`** for gitworkshop-style clients, and updated **`repository-events.ts` + `schema-examples.ts`** to **parse every value** on those rows (not only `tag[1]`).

### File-fetch docs sync (2026-05-09)
- Aligned [`snippets/file-fetching/README.md`](./snippets/file-fetching/README.md) with production gittr: **`user@host:path`** as **self-hosted-git**, **200 + empty `files`** as clone trigger alongside **404**, fixed deep-link anchor to [`FILE_FETCHING_INSIGHTS.md` § GRASP cloning](https://github.com/arbadacarbaYK/gittr/blob/main/docs/FILE_FETCHING_INSIGHTS.md#grasp-server-automatic-cloning-mechanism).

### NIP-34 Push Paywall Interop (2026-05-01)
- Added `snippets/nip34-push-paywall/` describing `push_cost_sats` as an optional extension tag on kind `30617`.
- Documented normalization (`owner pubkey + d tag`), host-side enforcement model, and reference HTTP API pattern (`push-payment` + `402` semantics).
- Clarified that pay-to-push should stay on NIP-34 repository metadata, not a separate PR kind.

### NIP-34 Interop Updates (2026-04-30)
- Clarified ngit/gitworkshop-compatible event expectations across repository (`30617`, `30618`), issues (`1621`), pull requests (`1618`, `1619`), follows (`10018`), and label overlays (`1985`).
- Added guidance to treat `r` (earliest unique commit) as required for issue/PR-family events, and to resolve it from repository git history when local cache metadata is missing.
- Aligned helper docs with cross-client compatibility behavior used in production gittr flows.
- Added merge lifecycle guidance: after a PR is merged, publish merge status (`1631`) and then publish refreshed repository/state events (`30617` + `30618`) so other clients can reconstruct the post-merge file state immediately.

### NIP-34 Repository Events (2025-12-28)
- Added `snippets/nip34-repository-events/` with complete NIP-34 implementation
- Request/response schema examples showing exact event structure
- Event creation and parsing utilities with full tag handling
- Validation checklist and error handling examples
- Essential for developers of other Nostr clients to ensure spec compliance

### NIP-C0 Code Snippets (2025-11-30)
- Added `snippets/nip-c0-code-snippets/` with complete NIP-C0 implementation
- Event creation utilities (`code-snippet-events.ts`) for creating and parsing kind:1337 events
- React renderer component (`code-snippet-renderer.tsx`) for displaying snippets with syntax highlighting
- Support for linking snippets to source repositories using NIP-34 format

### gittr line permalinks vs NIP-C0 (2026-05)
- Documented in [`snippets/nip-c0-code-snippets/README.md`](./snippets/nip-c0-code-snippets/README.md): permalinks (`?file=…#L6-L10`) vs kind `1337` snippets; **View Code** for markdown; grid line layout
- Full documentation with usage examples and tag reference

### Markdown Media Handling (2025-11-28)
- Added `snippets/markdown-media-handling/` for handling images, videos, and media in markdown
- Two approaches: simple inline handler and full-featured component-based solution
- Resolves relative image paths to Git provider raw URLs (GitHub/GitLab/Codeberg)
- Converts base64 API responses to data URLs
- Supports YouTube/Vimeo embeds and relative links within repositories

### NIP-25 Stars & NIP-51 Following (2025-11-28)
- Added `snippets/nip25-stars-nip51-following/` for decentralized repository starring and following
- NIP-25 reactions for starring repositories
- NIP-51 lists for following/watching repositories
- Platform-wide visibility without server storage

### NIP-46 Remote Signer (2025-11-28, updated 2026-05-08)
- Added `snippets/nip46-remote-signer/` for hardware signer integration
- QR code scanning support using `html5-qrcode`
- Support for LNbits, Nowser, Amber, Bunker, and other remote signers
- Documented **bunker vs nostrconnect** URI semantics, **subscription-before-scan** ordering, **JSON-RPC id** quirks, and clarified **bridge does not implement NIP-46** (see **Supported NIPs** section above + snippet README learnings)

### Core Utilities (2025-11-27)
- Added `snippets/file-fetching/` for parsing and handling Git clone URLs from NIP-34 events
- Added `snippets/url-normalization/` for converting SSH and git:// URLs to HTTPS
- Added `snippets/grasp-detection/` for identifying GRASP servers vs regular relays

## Related Documentation

- **gittr file-fetch flow**: [`FILE_FETCHING_INSIGHTS.md`](https://github.com/arbadacarbaYK/gittr/blob/main/docs/FILE_FETCHING_INSIGHTS.md)
- **gitnostr fork enhancements**: [`gittr-enhancements.md`](https://github.com/arbadacarbaYK/gitnostr/blob/main/docs/gittr-enhancements.md)
- **Standalone bridge setup**: [`STANDALONE_BRIDGE_SETUP.md`](https://github.com/arbadacarbaYK/gitnostr/blob/main/docs/STANDALONE_BRIDGE_SETUP.md)

## License

MIT, keeping attribution to @spearson78's original gitnostr and the gittr.space fork.
