# gittr helper tools & snippets

Production **code snippets** from [gittr.space](https://gittr.space) for developers and coding agents building Nostr-native Git clients. Copy a folder, read its README, adapt URLs and relay lists for your app. Source: [github.com/arbadacarbaYK/gittr](https://github.com/arbadacarbaYK/gittr).

Do not commit secrets into examples; use placeholders in `.env.example`.

## What's in here

| Folder | What it does |
| --- | --- |
| [`snippets/file-fetching/`](./snippets/file-fetching) | Parse NIP-34 `clone` URLs, source types, encoding |
| [`snippets/url-normalization/`](./snippets/url-normalization) | SSH / `git://` → HTTPS |
| [`snippets/grasp-detection/`](./snippets/grasp-detection) | GRASP servers vs normal relays |
| [`snippets/nip46-remote-signer/`](./snippets/nip46-remote-signer) | NIP-46 in the **browser** (bridge does not do NIP-46) |
| [`snippets/nip25-stars-nip51-following/`](./snippets/nip25-stars-nip51-following) | Stars (NIP-25) and repo lists (NIP-51) |
| [`snippets/markdown-media-handling/`](./snippets/markdown-media-handling) | Markdown images, embeds, relative links |
| [`snippets/nip-c0-code-snippets/`](./snippets/nip-c0-code-snippets) | NIP-C0 kind `1337` events + renderer |
| [`snippets/nip34-repository-events/`](./snippets/nip34-repository-events) | NIP-34 kind `30617` / `30618` schemas and parsers |
| [`snippets/nip34-push-paywall/`](./snippets/nip34-push-paywall) | Optional `push_cost_sats` on `30617` |
| `cmd/` | (Future) standalone tools |

## Getting started

1. Open the snippet folder you need; read its README.
2. Copy the `.ts` / `.tsx` files into your project (MIT, keep attribution).
3. For full file-fetch / bridge behaviour see gittr [FILE_FETCHING_INSIGHTS.md](https://github.com/arbadacarbaYK/gittr/blob/main/docs/FILE_FETCHING_INSIGHTS.md).

## More on gittr

- [NIPS_AND_EVENT_KINDS.md](https://github.com/arbadacarbaYK/gittr/blob/main/docs/NIPS_AND_EVENT_KINDS.md)
- [NIP46_REMOTE_SIGNER_INTEGRATION.md](https://github.com/arbadacarbaYK/gittr/blob/main/docs/NIP46_REMOTE_SIGNER_INTEGRATION.md)
- [gitnostr bridge docs](https://github.com/arbadacarbaYK/gitnostr)

## License

MIT, keeping attribution to @spearson78's original gitnostr and the gittr.space fork.
