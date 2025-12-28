# gittr helper tools & snippets

Utilities and code snippets extracted from [gittr.space](https://gittr.space) that handle complex file-fetching logic, URL normalization, GRASP server detection, and other tricky bits we've built.

These are **actual code snippets** we use in production, not theoretical helpers. They solve real problems we encountered while building gittr.

## What's in here

| Folder | What it does | Why it exists |
| --- | --- | --- |
| [`snippets/file-fetching/`](https://gittr.space/npub1n2ph08n4pqz4d3jk6n2p35p2f4ldhc5g5tu7dhftfpueajf4rpxqfjhzmc/gittr-helper-tools?path=snippets%2Ffile-fetching) | Parse clone URLs from NIP-34 events, identify source types (GitHub/GitLab/Codeberg/GRASP), handle multiple fallback sources, GitHub OAuth token support | NIP-34 repos can have multiple clone URLs. We need to parse them, identify the source type, and try them in parallel. **GitHub OAuth**: For private repositories, users authenticate via GitHub OAuth and their tokens are passed to the file-content API. The API prioritizes user tokens (private repos) over platform tokens (public repos). **Note**: The full fetching system includes performance optimizations (caching, deduplication, source prioritization) - see [gittr FILE_FETCHING_INSIGHTS.md](https://gittr.space/npub1n2ph08n4pqz4d3jk6n2p35p2f4ldhc5g5tu7dhftfpueajf4rpxqfjhzmc/gittr?path=docs&file=docs%2FFILE_FETCHING_INSIGHTS.md) for details. |
| [`snippets/url-normalization/`](https://gittr.space/npub1n2ph08n4pqz4d3jk6n2p35p2f4ldhc5g5tu7dhftfpueajf4rpxqfjhzmc/gittr-helper-tools?path=snippets%2Furl-normalization) | Convert SSH (`git@host:path`) and `git://` URLs to HTTPS for API calls | Different git servers use different URL formats. We normalize them to HTTPS for consistent API calls. |
| [`snippets/grasp-detection/`](https://gittr.space/npub1n2ph08n4pqz4d3jk6n2p35p2f4ldhc5g5tu7dhftfpueajf4rpxqfjhzmc/gittr-helper-tools?path=snippets%2Fgrasp-detection) | Identify GRASP servers (git servers that are also Nostr relays) vs regular relays | GRASP servers need special handling - they serve repos via git protocol, not REST APIs. |
| [`snippets/nip46-remote-signer/`](https://gittr.space/npub1n2ph08n4pqz4d3jk6n2p35p2f4ldhc5g5tu7dhftfpueajf4rpxqfjhzmc/gittr-helper-tools?path=snippets%2Fnip46-remote-signer) | NIP-46 remote signer integration with QR scanning support | Enable users to pair hardware signers (LNbits, Nowser, Bunker) without exposing private keys. Includes QR code scanning using `html5-qrcode`. |
| [`snippets/nip25-stars-nip51-following/`](https://gittr.space/npub1n2ph08n4pqz4d3jk6n2p35p2f4ldhc5g5tu7dhftfpueajf4rpxqfjhzmc/gittr-helper-tools?path=snippets%2Fnip25-stars-nip51-following) | NIP-25 reactions for starring and NIP-51 lists for following repositories | Decentralized starring and following using standard NIPs. Platform-wide visibility without server storage. |
| [`snippets/markdown-media-handling/`](https://gittr.space/npub1n2ph08n4pqz4d3jk6n2p35p2f4ldhc5g5tu7dhftfpueajf4rpxqfjhzmc/gittr-helper-tools?path=snippets%2Fmarkdown-media-handling) | Handle images, videos, and media in markdown files with API endpoint support | Two approaches: simple inline handler (currently used in gittr) and full-featured component-based solution. Resolves relative image paths to Git provider raw URLs (GitHub/GitLab/Codeberg), converts base64 API responses to data URLs, supports YouTube/Vimeo embeds, and handles relative links within repositories. |
| [`snippets/nip-c0-code-snippets/`](https://gittr.space/npub1n2ph08n4pqz4d3jk6n2p35p2f4ldhc5g5tu7dhftfpueajf4rpxqfjhzmc/gittr-helper-tools?path=snippets%2Fnip-c0-code-snippets) | NIP-C0 code snippet sharing and rendering | Create and display code snippets as standalone Nostr events (kind:1337). Includes event creation utilities, React renderer component, and support for linking snippets back to source repositories using NIP-34 format. |
| [`snippets/nip34-repository-events/`](https://gittr.space/npub1n2ph08n4pqz4d3jk6n2p35p2f4ldhc5g5tu7dhftfpueajf4rpxqfjhzmc/gittr-helper-tools?path=snippets%2Fnip34-repository-events) | NIP-34 repository event schemas and handling | Complete request/response schemas for NIP-34 (kind:30617) repository announcements. Shows what you send, what you receive, and how to parse it. Essential for developers of other Nostr clients to ensure spec compliance and interoperability. |
| `cmd/` | (Future) Standalone CLI tools or services | Helpers that can run independently (e.g., clone-events-sse, blossom-fetch-helper) |

## Getting Started

Each snippet folder contains its own README with detailed documentation, code examples, and usage instructions. 

## Recent Additions

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

### NIP-46 Remote Signer (2025-11-28, updated 2025-11-29)
- Added `snippets/nip46-remote-signer/` for hardware signer integration
- QR code scanning support using `html5-qrcode`
- Support for LNbits, Nowser, Bunker, and other remote signers

### Core Utilities (2025-11-27)
- Added `snippets/file-fetching/` for parsing and handling Git clone URLs from NIP-34 events
- Added `snippets/url-normalization/` for converting SSH and git:// URLs to HTTPS
- Added `snippets/grasp-detection/` for identifying GRASP servers vs regular relays

## Related Documentation

- **gittr file-fetch flow**: [`FILE_FETCHING_INSIGHTS.md`](https://gittr.space/npub1n2ph08n4pqz4d3jk6n2p35p2f4ldhc5g5tu7dhftfpueajf4rpxqfjhzmc/gittr?path=docs&file=docs%2FFILE_FETCHING_INSIGHTS.md)
- **gitnostr fork enhancements**: [`gittr-enhancements.md`](https://gittr.space/npub1n2ph08n4pqz4d3jk6n2p35p2f4ldhc5g5tu7dhftfpueajf4rpxqfjhzmc/gitnostr?path=docs&file=docs%2Fgittr-enhancements.md)
- **Standalone bridge setup**: [`STANDALONE_BRIDGE_SETUP.md`](https://gittr.space/npub1n2ph08n4pqz4d3jk6n2p35p2f4ldhc5g5tu7dhftfpueajf4rpxqfjhzmc/gitnostr?path=docs&file=docs%2FSTANDALONE_BRIDGE_SETUP.md)

## License

MIT, keeping attribution to @spearson78's original gitnostr and the gittr.space fork.
