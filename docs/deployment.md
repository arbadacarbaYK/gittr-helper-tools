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

In your bridge's `git-nostr-bridge.json`, add a webhook section to POST repo clone events:

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

### gittr UI Configuration

**Note:** The clone-events-sse helper is not yet integrated into the gittr UI codebase. When integrating, you'll need to:

1. Add environment variables to `ui/.env.local` (variable names TBD - follow gittr's existing naming pattern like `BRIDGE_HTTP_PORT`/`BRIDGE_HTTP_HOST`)
2. Update the UI code to connect to the SSE endpoint when repos are opened
3. Listen for `repo_cloned` events and refresh the file tree automatically

Example integration code (to be added to gittr UI):
```typescript
// Connect to clone-events-sse helper
const sseUrl = process.env.CLONE_EVENTS_SSE_URL || 'http://localhost:4010/events';
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

**Note:** The blossom-fetch-helper is not yet integrated into the gittr UI codebase. When integrating, you'll need to:

1. Add environment variable to `ui/.env.local` for the helper path (variable name TBD)
2. Update the file-fetch flow to call the helper before falling back to external APIs

Example integration code (to be added to gittr UI):
```typescript
// gittr UI file-fetch flow
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
3. **Configure bridge:** Add `webhooks.repo_cloned` section to `git-nostr-bridge.json` with matching secret
4. **Integrate into gittr UI:** Add SSE connection code and environment variables (see integration notes above)
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
