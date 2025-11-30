# gittr helper tools & snippets

Utilities and code snippets extracted from [gittr.space](https://gittr.space) that handle complex file-fetching logic, URL normalization, GRASP server detection, and other tricky bits we've built.

These are **actual code snippets** we use in production, not theoretical helpers. They solve real problems we encountered while building gittr.

## What's in here

| Folder | What it does | Why it exists |
| --- | --- | --- |
| <span style="color: #8b5cf6;">[`snippets/file-fetching/`](snippets/file-fetching/README.md)</span> | Parse clone URLs from NIP-34 events, identify source types (GitHub/GitLab/Codeberg/GRASP), handle multiple fallback sources | NIP-34 repos can have multiple clone URLs. We need to parse them, identify the source type, and try them in parallel. **Note**: The full fetching system includes performance optimizations (caching, deduplication, source prioritization) - see [gittr FILE_FETCHING_INSIGHTS.md](https://github.com/arbadacarbaYK/gittr/blob/main/docs/FILE_FETCHING_INSIGHTS.md) for details. |
| <span style="color: #8b5cf6;">[`snippets/url-normalization/`](snippets/url-normalization/README.md)</span> | Convert SSH (`git@host:path`) and `git://` URLs to HTTPS for API calls | Different git servers use different URL formats. We normalize them to HTTPS for consistent API calls. |
| <span style="color: #8b5cf6;">[`snippets/grasp-detection/`](snippets/grasp-detection/README.md)</span> | Identify GRASP servers (git servers that are also Nostr relays) vs regular relays | GRASP servers need special handling - they serve repos via git protocol, not REST APIs. |
| <span style="color: #8b5cf6;">[`snippets/nip46-remote-signer/`](snippets/nip46-remote-signer/README.md)</span> | NIP-46 remote signer integration with QR scanning support | Enable users to pair hardware signers (LNbits, Nowser, Bunker) without exposing private keys. Includes QR code scanning using `html5-qrcode`. |
| <span style="color: #8b5cf6;">[`snippets/nip25-stars-nip51-following/`](snippets/nip25-stars-nip51-following/README.md)</span> | NIP-25 reactions for starring and NIP-51 lists for following repositories | Decentralized starring and following using standard NIPs. Platform-wide visibility without server storage. |
| <span style="color: #8b5cf6;">[`snippets/markdown-media-handling/`](snippets/markdown-media-handling/README.md)</span> | Handle images, videos, and media in markdown files with API endpoint support | Two approaches: simple inline handler (currently used in gittr) and full-featured component-based solution. Resolves relative image paths to Git provider raw URLs (GitHub/GitLab/Codeberg), converts base64 API responses to data URLs, supports YouTube/Vimeo embeds, and handles relative links within repositories. |
| `cmd/` | (Future) Standalone CLI tools or services | Helpers that can run independently (e.g., clone-events-sse, blossom-fetch-helper) |

## Getting Started

Each snippet folder contains its own README with detailed documentation, code examples, and usage instructions. Click on any <span style="color: #8b5cf6;">violet link</span> above to jump to the specific snippet documentation.

## Related Documentation

- **gittr file-fetch flow**: https://github.com/arbadacarbaYK/gittr/blob/main/docs/FILE_FETCHING_INSIGHTS.md
- **gitnostr fork enhancements**: https://github.com/arbadacarbaYK/gitnostr/blob/main/docs/gittr-enhancements.md
- **Standalone bridge setup**: https://github.com/arbadacarbaYK/gitnostr/blob/main/docs/STANDALONE_BRIDGE_SETUP.md

## License

MIT, keeping attribution to @spearson78's original gitnostr and the gittr.space fork.
