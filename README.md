## gittr helper tools

Utilities that sit next to the gittr UI and its gitnostr-based bridge. Each helper is optional: flip on the ones you need to boost clone notifications, Blossom/NIP-96 fetches, or deployment automation.

### Components

| Folder | Summary | Where it plugs in |
| --- | --- | --- |
| `cmd/clone-events-sse` | Webhook endpoint → Server-Sent Events broadcaster. Turns bridge `repo cloned` hooks into live UI refreshes. | Configure the gittr-enhanced bridge to POST repo clone events here; gittr UI tabs listen on `/events`. |
| `cmd/blossom-fetch-helper` | CLI that normalizes git URLs, fetches pack files via HTTPS/NIP-96 Blossom, and seeds the bridge cache. | Called by gittr UI’s file-fetch flow before falling back to GitHub/GitLab/Codeberg. |
| `docs/` | Diagrams + flow explanations linking back to the main gittr docs. | Shows how helpers align with `docs/FILE_FETCHING_INSIGHTS.md` and the gitnostr fork enhancements. |
| `scripts/` | Sanitized systemd units + sample env files. | Drop onto Hetzner (or any host) to keep helpers running beside bridge/UI. |

### Related documentation

- gitnostr fork enhancements: https://github.com/arbadacarbaYK/gitnostr/blob/main/docs/gittr-enhancements.md
- gittr file-fetch flow: https://github.com/arbadacarbaYK/gittr/blob/main/docs/FILE_FETCHING_INSIGHTS.md
- Standalone bridge setup: https://github.com/arbadacarbaYK/gitnostr/blob/main/docs/STANDALONE_BRIDGE_SETUP.md

### Quick start

```bash
git clone https://github.com/arbadacarbaYK/gittr-helper-tools.git
cd gittr-helper-tools
go test ./...
make build
```

Binaries land in `bin/`. Each helper directory has its own README section (env vars, webhook URLs, systemd snippets).

### License

MIT, keeping attribution to @spearson78’s original gitnostr and the gittr.space fork.
