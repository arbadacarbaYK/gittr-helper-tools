# gittr helper tools & snippets

Utilities and code snippets extracted from [gittr.space](https://gittr.space) that handle complex file-fetching logic, URL normalization, GRASP server detection, and other tricky bits we've built.

These are **actual code snippets** we use in production, not theoretical helpers. They solve real problems we encountered while building gittr.

## What's in here

| Folder | What it does | Why it exists |
| --- | --- | --- |
| <span style="color: #8b5cf6;">[`snippets/file-fetching/`](snippets/file-fetching/README.md)</span> | Parse clone URLs from NIP-34 events, identify source types (GitHub/GitLab/Codeberg/GRASP), handle multiple fallback sources | NIP-34 repos can have multiple clone URLs. We need to parse them, identify the source type, and try them in parallel. |
| <span style="color: #8b5cf6;">[`snippets/url-normalization/`](snippets/url-normalization/README.md)</span> | Convert SSH (`git@host:path`) and `git://` URLs to HTTPS for API calls | Different git servers use different URL formats. We normalize them to HTTPS for consistent API calls. |
| <span style="color: #8b5cf6;">[`snippets/grasp-detection/`](snippets/grasp-detection/README.md)</span> | Identify GRASP servers (git servers that are also Nostr relays) vs regular relays | GRASP servers need special handling - they serve repos via git protocol, not REST APIs. |
| <span style="color: #8b5cf6;">[`snippets/nip46-remote-signer/`](snippets/nip46-remote-signer/README.md)</span> | NIP-46 remote signer integration with QR scanning support | Enable users to pair hardware signers (LNbits, Nowser, Bunker) without exposing private keys. Includes QR code scanning using `html5-qrcode`. |
| <span style="color: #8b5cf6;">[`snippets/nip25-stars-nip51-following/`](snippets/nip25-stars-nip51-following/README.md)</span> | NIP-25 reactions for starring and NIP-51 lists for following repositories | Decentralized starring and following using standard NIPs. Platform-wide visibility without server storage. |
| `cmd/` | (Future) Standalone CLI tools or services | Helpers that can run independently (e.g., clone-events-sse, blossom-fetch-helper) |

## Quick start

These are TypeScript snippets. Copy them into your project or import them:

```typescript
import { parseGitSource } from './snippets/file-fetching/git-source-parser';
import { normalizeGitUrl } from './snippets/url-normalization/normalize-git-url';
import { isGraspServer } from './snippets/grasp-detection/grasp-servers';

// Parse a clone URL from a NIP-34 event
const source = parseGitSource('https://github.com/user/repo.git');
// { type: 'github', url: '...', owner: 'user', repo: 'repo', ... }

// Normalize SSH URL to HTTPS
const normalized = normalizeGitUrl('git@github.com:user/repo.git');
// { original: 'git@...', normalized: 'https://github.com/user/repo.git', protocol: 'ssh' }

// Check if a relay is a GRASP server
const isGrasp = isGraspServer('wss://relay.ngit.dev');
// true
```

### Authentication & Remote Signing

For NIP-46 remote signer integration, see <span style="color: #8b5cf6;">[`snippets/nip46-remote-signer/README.md`](snippets/nip46-remote-signer/README.md)</span>. This includes:
- QR code scanning with `html5-qrcode` library
- NIP-07 compatible adapter for seamless integration
- Session persistence and reconnection handling

### Stars & Following

For repository starring and following, see <span style="color: #8b5cf6;">[`snippets/nip25-stars-nip51-following/README.md`](snippets/nip25-stars-nip51-following/README.md)</span>. This includes:
- NIP-25 (Kind 7) reactions for starring repositories
- NIP-51 (Kind 3000) bookmark lists for following/watching repositories
- Decentralized aggregation without server storage

## Related documentation

- **gittr file-fetch flow**: https://github.com/arbadacarbaYK/gittr/blob/main/docs/FILE_FETCHING_INSIGHTS.md
- **NIP-46 Remote Signer Integration**: <span style="color: #8b5cf6;">[`snippets/nip46-remote-signer/README.md`](snippets/nip46-remote-signer/README.md)</span> - Complete guide for implementing NIP-46 with QR scanning
- **NIP-25 Stars & NIP-51 Following**: <span style="color: #8b5cf6;">[`snippets/nip25-stars-nip51-following/README.md`](snippets/nip25-stars-nip51-following/README.md)</span> - Implementation guide for decentralized starring and following
- **gitnostr fork enhancements**: https://github.com/arbadacarbaYK/gitnostr/blob/main/docs/gittr-enhancements.md
- **Standalone bridge setup**: https://github.com/arbadacarbaYK/gitnostr/blob/main/docs/STANDALONE_BRIDGE_SETUP.md

## License

MIT, keeping attribution to @spearson78's original gitnostr and the gittr.space fork.
