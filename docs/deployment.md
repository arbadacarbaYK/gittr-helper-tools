# Deployment & Configuration

This guide explains how to configure the helper tools to work with the gittr UI and git-nostr-bridge.

## Configuration Overview

Each helper has its own config, but they all connect to the same gittr stack:

```
gittr UI (browser) ──SSE──▶ clone-events-sse helper
git-nostr-bridge ──webhook──▶ clone-events-sse helper
gittr UI (API) ──CLI call──▶ blossom-fetch-helper
```

## clone-events-sse Configuration

### Environment Variables (`config/helper.env`)

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `LISTEN_ADDR` | no | `:4010` | HTTP server address (e.g., `:4010` or `0.0.0.0:4010`) |
| `WEBHOOK_SECRET` | yes | (none) | Shared secret for HMAC validation of webhook POSTs from the bridge |
| `EVENT_BUFFER` | no | `200` | Number of recent events to keep in memory for new SSE subscribers |
| `ALLOW_ORIGINS` | no | (empty) | **CORS whitelist**: Comma-separated list of web origins allowed to connect to `/events` SSE endpoint. This is NOT for Nostr relays—it's for browser-based SSE connections. Example: `https://gittr.space,https://beta.gittr.space` |

**Important:** `ALLOW_ORIGINS` controls which web domains can make cross-origin requests to the `/events` Server-Sent Events stream from the browser. When the gittr UI at `https://gittr.space` opens an `EventSource` connection, the browser checks CORS headers. Set this to your gittr UI domain(s).

### Example `config/helper.env`
```
LISTEN_ADDR=:4010
WEBHOOK_SECRET=your-secret-here-change-me
EVENT_BUFFER=200
ALLOW_ORIGINS=https://gittr.space,https://beta.gittr.space
```

### git-nostr-bridge Configuration

When the bridge clones a repository, it can POST a webhook to the clone-events-sse helper. Add this to your bridge's `git-nostr-bridge.json`:

```json
{
  "repositoryDir": "/opt/ngit/git-nostr-repositories",
  "DbFile": "/opt/ngit/.config/git-nostr-db.sqlite",
  "relays": ["wss://relay.damus.io"],
  "webhooks": {
    "repo_cloned": {
      "url": "http://127.0.0.1:4010/webhooks/repo-cloned",
      "secret": "your-secret-here-change-me"
    }
  }
}
```

**Note:** The `secret` in the bridge config must match `WEBHOOK_SECRET` in the helper's env file.

**Note:** Webhook support in the bridge is a planned feature. The bridge code will need to be updated to POST to this endpoint when repos are cloned.

### gittr UI Configuration

The gittr UI connects to the SSE endpoint to receive real-time notifications when repos are cloned. Add environment variables to `ui/.env.local`:

**⚠️ TODO: Variable names need to be confirmed from actual gittr codebase/deployment**

The exact variable names used in gittr should follow the same pattern as `BRIDGE_HTTP_PORT` and `BRIDGE_HTTP_HOST`. Please check your gittr deployment configuration to confirm the exact variable names.

Example integration code in gittr UI:
```typescript
// Connect to clone-events-sse helper
// TODO: Replace with actual env variable names from gittr
const ssePort = process.env.CLONE_EVENTS_SSE_PORT || "4010";
const sseHost = process.env.CLONE_EVENTS_SSE_HOST || "localhost";
const sseUrl = `http://${sseHost}:${ssePort}/events`;
const source = new EventSource(sseUrl);

source.addEventListener('repo_cloned', (event) => {
  const data = JSON.parse(event.data);
  // Refresh the repo view for data.repo
  refreshRepoView(data.repo);
});
```

## blossom-fetch-helper Configuration

This helper is called as a CLI tool, not a service. It accepts command-line flags:

| Flag | Required | Purpose |
| --- | --- | --- |
| `--source` | yes | HTTPS, git@, git://, or nip96 Blossom URL to fetch pack from |
| `--repo-path` | yes | Destination bare repository path (e.g., `/opt/ngit/git-nostr-repositories/npub123/repo.git`) |
| `--cache-dir` | no | Optional cache directory for downloaded packs (defaults to system temp) |

### gittr UI Integration

The gittr UI calls this helper when fetching files. Add environment variable to `ui/.env.local`:

**⚠️ TODO: Variable name needs to be confirmed from actual gittr codebase/deployment**

Example integration code in gittr UI:
```typescript
// gittr UI file-fetch flow
// TODO: Replace with actual env variable name from gittr
const helperPath = process.env.BLOSSOM_FETCH_HELPER_PATH || 'blossom-fetch-helper';
async function fetchRepoFiles(repoPath: string, sourceUrl: string) {
  // Try helper first
  const result = await exec(`${helperPath} --source ${sourceUrl} --repo-path ${repoPath}`);
  if (result.success) {
    // Retry bridge API
    return await fetchFromBridge(repoPath);
  }
  // Fallback to external APIs...
}
```

## Systemd Service Example

### clone-events-sse.service
```
[Unit]
Description=gittr clone events SSE helper
After=network.target

[Service]
EnvironmentFile=/opt/gittr-helper-tools/config/helper.env
ExecStart=/opt/gittr-helper-tools/bin/clone-events-sse
Restart=on-failure
User=gittr
Group=gittr
WorkingDirectory=/opt/gittr-helper-tools

[Install]
WantedBy=multi-user.target
```

## Complete Installation Checklist

1. **Build helpers:** `cd gittr-helper-tools && make build`
2. **Configure clone-events-sse:** Set `WEBHOOK_SECRET` and `ALLOW_ORIGINS` in `config/helper.env`
3. **Configure bridge:** Add `webhooks.repo_cloned` section to `git-nostr-bridge.json` with matching secret (when webhook support is added to bridge)
4. **Configure gittr UI:** Add environment variables to `ui/.env.local` (variable names TBD - check actual gittr deployment)
5. **Start services:** `systemctl start gittr-clone-events` (and restart bridge/UI if needed)

## Testing

```bash
# Test webhook endpoint
curl -X POST http://localhost:4010/webhooks/repo-cloned \
  -H "Content-Type: application/json" \
  -H "X-Signature: $(echo -n '{"repo":"test/repo"}' | openssl dgst -sha256 -hmac 'your-secret' | cut -d' ' -f2)" \
  -d '{"repo":"test/repo"}'

# Test SSE endpoint (in browser console or curl)
curl -N http://localhost:4010/events
```
