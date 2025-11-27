# Helper Overview

`gittr-helper-tools` extends the gittr UX without changing the core gitnostr bridge or gittr UI. Each helper can run independently and communicates via HTTP or filesystem hooks.

```
gittr UI ──(repo missing)──▶ git-nostr-bridge ──▶ clone-events-sse helper ─▶ SSE /events
    │                                         │
    │                                         └─ POST /webhooks/repo-cloned (shared secret)
    │
    └─ File/tab load ─▶ blossom-fetch-helper ─▶ HTTPS/Blossom/NIP-96 packs ─▶ bridge repo cache
```

1. UI requests repo/tree. If the bare repo is missing, the bridge clones it using the NIP-34 `source`/`clone` tags.
2. The bridge optionally POSTs a `repo-cloned` webhook to `clone-events-sse`; gittr tabs subscribed to `/events` instantly refresh.
3. File viewers can call `blossom-fetch-helper` to fetch pack files over HTTPS (GitHub/GitLab/Codeberg or Blossom) before falling back to slower external APIs.

### Reference docs
- gittr file-fetch flow: https://github.com/arbadacarbaYK/gittr/blob/main/docs/FILE_FETCHING_INSIGHTS.md
- gitnostr fork enhancements: https://github.com/arbadacarbaYK/gitnostr/blob/main/docs/gittr-enhancements.md
- Standalone bridge setup: https://github.com/arbadacarbaYK/gitnostr/blob/main/docs/STANDALONE_BRIDGE_SETUP.md
