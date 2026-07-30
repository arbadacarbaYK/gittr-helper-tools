# Make a Page — NIP-5A named sites (gittr Pages)

Interop profile for **publishing a static site from a git repo** (gittr **Pages** / nsite).  
Docs-first folder — copy the tag shapes; wire Blossom + your gateway.

**Synced:** 2026-07-18 from gittr `publish-named-site-manifest.ts`, `nsite-url.ts`, `events.ts` (`KIND_NSITE_NAMED`).  
**Live UX:** gittr.space → repo → **Pages** (requires root `index.html`).

## Kinds

| Kind | Role |
| --- | --- |
| **`35128`** | NIP-5A **named** site manifest (what gittr Pages publishes) |
| `15128` | NIP-5A **root** site (defined in gittr; Pages flow uses named) |
| **`24242`** | Blossom upload auth (`t=upload`, `expiration`, `x`=sha256, …) |
| **`10063`** | Blossom server list (`["server", "<origin>"]`) |

## Publish flow (gittr)

1. Repo has static files including **`/index.html`**.
2. Upload bytes to **Blossom** (signed kind `24242` auth; gittr uses a proxy + server tag).
3. Sign & publish kind **`35128`** manifest (`content: ""`).
4. Optionally refresh kind **`10063`** so clients know your Blossom origin.
5. Gateway serves `https://{pubkeyB36}{dTag}.pages…/` (see URL rules below).

## Kind 35128 — named manifest tags

```json
{
  "kind": 35128,
  "content": "",
  "tags": [
    ["d", "<1–13 char slug>"],
    ["path", "/index.html", "<sha256-hex>"],
    ["path", "/styles.css", "<sha256-hex>"],
    ["server", "https://blossom.example"],
    ["title", "My site"],
    ["description", "Optional"],
    ["source", "https://github.com/…"],
    ["relay", "wss://relay.gittr.space"]
  ]
}
```

| Tag | Required | Notes |
| --- | --- | --- |
| `d` | yes | Site label fragment, **1–13** chars `[a-z0-9-]`, not ending with `-` (gittr: `slugToNsiteDTag`) |
| `path` | yes (×N) | `["path", "<web-absolute-path>", "<sha256>"]` — one per uploaded file |
| `server` | yes | Blossom HTTP origin that holds the blobs |
| `title` | recommended | Short site title |
| `description` | no | |
| `source` | no | HTTPS upstream / repo URL |
| `relay` | recommended | **Singular** `relay` (not `relays`) — nsite-gateway reads these |

## Site URL (NIP-5A)

Named site label = **50-char pubkeyB36** + **`d` tag**, no separator:

```
https://{pubkeyB36}{dTag}.pages.gittr.space/
```

Helpers in production: `buildNsiteSiteUrl`, `slugToNsiteDTag`, `pubkeyHexToPubkeyB36` under `ui/src/lib/nsite/`.

## Client checklist

1. Require `index.html` before publish.
2. Hash file bytes (SHA-256) for each `path` tag; upload matching blobs to Blossom.
3. Owner pubkey must sign the `35128` (same as repo owner in gittr).
4. Publish to general + git relays your users read; include `relay` tags the gateway expects.
5. Do **not** put secrets in the manifest — only public static assets.

## Related gittr sources

- `ui/src/lib/gittr-pages/publish-named-site-manifest.ts`
- `ui/src/lib/nsite/nsite-url.ts`
- `infra/nsite-gateway/` (serving)
- `docs/NIPS_AND_EVENT_KINDS.md` (kind table)

## Files

| File | Role |
| --- | --- |
| `nsite-d-tag.ts` | `slugToNsiteDTag` extract (no `@/` imports) |
| `named-site-manifest.ts` | Build unsigned `35128` tag list from path/sha pairs |
