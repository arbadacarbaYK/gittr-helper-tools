# Announce app — NIP-82 software events (gittr Apps)

Interop profile for **listing an installer on Nostr** from a forge Release (GitHub / Codeberg / GitLab / Forgejo). gittr’s **Nostr Apps** panel publishes kinds **`32267` / `30063` / `3063`**. The same event family is what **Zapstore** reads.

**Synced:** 2026-09-05 from gittr `software-announce-build.ts`, `nip82-blossom-hosts.ts`, `blossom-bud11-auth.ts`, `POST /api/repo/forge-release-blossom-pin`.  
**Live UX:** gittr.space → repo → Code sidebar **Nostr Apps**, or Releases tab **Announce on Nostr**.

**Canonical gittr docs:** [NIPS_AND_EVENT_KINDS.md § NIP-82](https://gittr.space/npub1n2ph08n4pqz4d3jk6n2p35p2f4ldhc5g5tu7dhftfpueajf4rpxqfjhzmc/gittr?file=docs/NIPS_AND_EVENT_KINDS.md&branch=main) · Help `/help#publish-pages-apps`

This folder is **not** gittr Pages. Pages use kind **`35128`** and **`https://blossom.gittr.space`**. See [`nip5a-gittr-pages`](../nip5a-gittr-pages).

## What gittr does

1. Owner links a forge `source` URL and picks a **Release** with an announceable binary (APK preferred for Zapstore Android; AppImage / DMG / linux `tar.gz` / MSI / EXE / IPA also work).
2. gittr **hashes** the file server-side (`GET /api/repo/forge-releases?hash=1`). Bytes are **not** stored on gittr.
3. Owner signs three events: app (`32267`), file (`3063`), release (`30063`).
4. Default kind `3063` **`url`** is the forge download. That is the easy path.
5. Optional checkbox **pin to public Blossom**: gittr streams the forge file (no disk) to public Blossom hosts and, on success, rewrites `url`. Pin failure still publishes the forge URL.

gittr **never** uploads Apps/APKs to **`blossom.gittr.space`**.

## Kinds

| Kind | Role |
| --- | --- |
| **`32267`** | Application (`d` = app id, `name`, `repository`, optional `t=android`, `f` platform tags) |
| **`3063`** | File asset (`i` app id, `x` sha256, `m` MIME, `url`, `version`, optional `f` / `size`) |
| **`30063`** | Release (`d` = `appId@version`, `e` tags to asset event ids after signing) |
| **`24242`** | Blossom upload auth when pinning (`t=upload`, `x=<sha256>`, `expiration`, optional `server`) |
| **`5`** | NIP-09 delete of the app/release/asset events (not the git repo) |

## Default vs pin

| Path | Kind `3063` `url` | Where bytes live |
| --- | --- | --- |
| Default | Forge download (GitHub / Codeberg / GitLab) | The forge |
| Optional pin | `https://<blossom-host>/<sha256>` | Public Blossom (see hosts below) |

Pin hosts gittr will use (in order). First success wins. **`blossom.gittr.space` is not allowed.**

- `https://blossom.primal.net`
- `https://blossom.ditto.pub`
- `https://haven.danconwaydev.com`

## Pin protocol (BUD-01 / BUD-11)

Browser CORS usually blocks GitHub → Blossom, so gittr uses a **server pass-through** that does not persist the file:

1. Owner signs kind **`24242`** (not NIP-98: no `u` / `method` tags).
2. Client `POST /api/repo/forge-release-blossom-pin` with `sourceUrl`, `tag`, `downloadUrl`, `sha256`, `authEvent`.
3. Server checks the URL is an announceable asset on that forge Release, verifies the auth event, then:
   - `HEAD /<sha256>` — skip upload if already present
   - `PUT /upload` with `Authorization: Nostr <base64>` (try unpadded base64url, then padded)
4. Returned `url` is used only if it is HTTPS on an allowlisted host with path `/<64-hex-sha256>`.

## Kind 3063 — asset tags (unsigned shape)

```json
{
  "kind": 3063,
  "content": "",
  "tags": [
    ["i", "com.example.app"],
    ["x", "<sha256-hex>"],
    ["m", "application/vnd.android.package-archive"],
    ["url", "https://github.com/…/releases/download/v1.0.0/app.apk"],
    ["version", "1.0.0"]
  ]
}
```

After a successful pin, `url` becomes e.g. `https://blossom.primal.net/<sha256>`.

## Client checklist

1. Require a hashed announceable binary before publish.
2. Keep forge `url` as the default; treat pin as optional.
3. Never send Apps/APKs to the Pages Blossom origin (`blossom.gittr.space`) or the Pages upload proxy (4 MiB JSON limit).
4. If pin fails, still publish with the forge URL.
5. Prefer an `.apk` when one exists so Zapstore Android can list the app. Other MIME types still show on gittr `/apps`.
6. Optional Zapstore catalog: `zapstore.yaml` at the source repo root (`repository` + owner `pubkey`). Listing is free. [zapstore.dev/docs/publish](https://zapstore.dev/docs/publish)

## gittr APIs

| Method | Path | Role |
| --- | --- | --- |
| `GET` | `/api/repo/forge-releases?sourceUrl=…&hash=1&tag=` | Announceable Release + optional sha256 |
| `GET` | `/api/repo/forge-release-list?sourceUrl=…` | Full asset list (Releases tab; no MIME gate) |
| `POST` | `/api/repo/forge-release-blossom-pin` | Stream forge file → public Blossom (no persist) |

## Related gittr sources

- `ui/src/lib/nostr/software-announce-build.ts`
- `ui/src/lib/nostr/nip82-blossom-hosts.ts`
- `ui/src/lib/nostr/blossom-bud11-auth.ts`
- `ui/src/lib/repo/pin-forge-asset-to-ngit-blossom.ts`
- `ui/src/pages/api/repo/forge-release-blossom-pin.ts`
- `ui/src/components/ui/repo-app-announce-panel.tsx`

## Files

| File | Role |
| --- | --- |
| `apps-blossom-hosts.ts` | Allowlist + reject gittr Pages Blossom |
| `blossom-upload-auth.ts` | Unsigned kind `24242` upload auth |
