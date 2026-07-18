# gittr helper tools & snippets

Production **code snippets** from [gittr.space](https://gittr.space) for developers and coding agents building Nostr-native Git clients. Copy a folder, read its README, adapt URLs and relay lists for your app. Source: [gittr on gittr.space](https://gittr.space/npub1n2ph08n4pqz4d3jk6n2p35p2f4ldhc5g5tu7dhftfpueajf4rpxqfjhzmc/gittr?branch=main).

**Last sync:** 2026-07-18 from gittr `main`.

Do not commit secrets into examples; use placeholders in `.env.example`.

## What's in here

| Folder | What it does |
| --- | --- |
| [`snippets/file-fetching/`](./snippets/file-fetching) | Parse NIP-34 `clone` URLs, source types (`self-hosted-git`, `nostr://`, …) |
| [`snippets/url-normalization/`](./snippets/url-normalization) | SSH / `git://` / `nostr://` → HTTPS (from `git-source-fetcher.ts`) |
| [`snippets/grasp-detection/`](./snippets/grasp-detection) | GRASP servers vs normal relays |
| [`snippets/grasp-list/`](./snippets/grasp-list) | NIP-34 kind `10317` GRASP preference lists (`g` tags) |
| [`snippets/clone-url-quality/`](./snippets/clone-url-quality) | Host-only / unusable clone detection + announce normalize |
| [`snippets/repair-host-only-clones/`](./snippets/repair-host-only-clones) | “Please republish” predicates (no push coupling) |
| [`snippets/repo-status/`](./snippets/repo-status) | Local → live_soon → live status helpers |
| [`snippets/filter-display-clone-urls/`](./snippets/filter-display-clone-urls) | Sidebar: hide extra GRASP mirrors when primary host present |
| [`snippets/filter-grasp-mirror-pollution/`](./snippets/filter-grasp-mirror-pollution) | Strip mirror `npub`/`hex` roots from file trees |
| [`snippets/nip46-remote-signer/`](./snippets/nip46-remote-signer) | NIP-46 pairing + **unified signer resolver** (browser; bridge does not do NIP-46) |
| [`snippets/nip25-stars-nip51-following/`](./snippets/nip25-stars-nip51-following) | **Star** (NIP-25) + **Watch** (NIP-51 kind `10018`) |
| [`snippets/nip34-issue-bounties/`](./snippets/nip34-issue-bounties) | Bounties **offer / take** (kind `9806` + LNURL-withdraw) |
| [`snippets/nip5a-gittr-pages/`](./snippets/nip5a-gittr-pages) | **Make a Page** — NIP-5A named sites (`35128` + Blossom) |
| [`snippets/markdown-media-handling/`](./snippets/markdown-media-handling) | Markdown images, embeds, relative links (`markdown-anchor.ts`) |
| [`snippets/nip-c0-code-snippets/`](./snippets/nip-c0-code-snippets) | NIP-C0 kind `1337` events + renderer |
| [`snippets/nip34-repository-events/`](./snippets/nip34-repository-events) | NIP-34 `30617` / `30618` — clone, **docs `link`**, **private `public-read`**, paywall tags |
| [`snippets/nip34-push-paywall/`](./snippets/nip34-push-paywall) | Optional `push_cost_sats` on `30617` (links + private documented in repository-events) |
| [`snippets/wot-trust-badges/`](./snippets/wot-trust-badges) | Viewer-relative Web of Trust badges |

### Product features → snippet map

| Feature | Where |
| --- | --- |
| Watch a repo | [`nip25-stars-nip51-following`](./snippets/nip25-stars-nip51-following) (kind `10018`) |
| Offer / take bounty | [`nip34-issue-bounties`](./snippets/nip34-issue-bounties) |
| Make a Page | [`nip5a-gittr-pages`](./snippets/nip5a-gittr-pages) |
| Push: docs links + private repo | Same `30617` announce — [`nip34-repository-events`](./snippets/nip34-repository-events) (no extra snapshot) |
| Push: pay-to-push | [`nip34-push-paywall`](./snippets/nip34-push-paywall) |

## Getting started

1. Open the snippet folder you need; read its README.
2. Copy the `.ts` / `.tsx` files into your project (MIT, keep attribution).
3. Snippets are self-contained: no `@/` imports. Stub private-key storage yourself where noted.
4. For full file-fetch / bridge behaviour see gittr [FILE_FETCHING_INSIGHTS.md](https://gittr.space/npub1n2ph08n4pqz4d3jk6n2p35p2f4ldhc5g5tu7dhftfpueajf4rpxqfjhzmc/gittr?file=docs/FILE_FETCHING_INSIGHTS.md&branch=main).

## More on gittr

- [Nostr schemata (NIPs / kinds)](https://gittr.space/npub1zafcms4xya5ap9zr7xxr0jlrtrattwlesytn2s42030lzu0dwlzqpd26k5/schemata?file=README.md) · [NIP-34](https://gittr.space/npub1zafcms4xya5ap9zr7xxr0jlrtrattwlesytn2s42030lzu0dwlzqpd26k5/schemata?file=README.md&path=nips%2Fnip-34)
- [NIPS_AND_EVENT_KINDS.md](https://gittr.space/npub1n2ph08n4pqz4d3jk6n2p35p2f4ldhc5g5tu7dhftfpueajf4rpxqfjhzmc/gittr?file=docs/NIPS_AND_EVENT_KINDS.md&branch=main)
- [WOT.md](https://github.com/arbadacarbaYK/gittr/blob/main/docs/WOT.md) (Web of Trust on gittr)
- [NIP46_REMOTE_SIGNER_INTEGRATION.md](https://gittr.space/npub1n2ph08n4pqz4d3jk6n2p35p2f4ldhc5g5tu7dhftfpueajf4rpxqfjhzmc/gittr?file=docs/NIP46_REMOTE_SIGNER_INTEGRATION.md&branch=main)
- [gitnostr bridge docs](https://gittr.space/npub1n2ph08n4pqz4d3jk6n2p35p2f4ldhc5g5tu7dhftfpueajf4rpxqfjhzmc/gitnostr?branch=main)

## License

MIT, keeping attribution to @spearson78's original gitnostr and the gittr.space fork.
