# Monitoring & Telemetry

## clone-events-sse
- `/healthz` returns 200 when the webhook listener and SSE loop run.
- Logs are JSON: `{ "ts": 1732720000, "level": "info", "event": "repo_cloned", "repo": "npub1.../myrepo" }`.
- SSE payload example:
```json
{
  "type": "repo_cloned",
  "repo": "npub1.../myrepo",
  "timestamp": 1732720000
}
```
- gittr UI subscription example:
```ts
const source = new EventSource("https://helper.gittr.space/events");
source.addEventListener("repo_cloned", (evt) => {
  const data = JSON.parse(evt.data);
  refreshRepo(data.repo);
});
```

## blossom-fetch-helper
- Exit code 0 = success. Monitor failures via systemd (`OnFailure=`) or cron wrappers.
- Log fields: `normalized_url`, `dest_repo`, `bytes`, `duration_ms`.
- Optional `--zap-webhook` sends a POST when large packs are fetched (useful for Lightning/zap accounting).

## Alert ideas
- Webhook signature failures or repeated 5xx responses.
- SSE disconnects (fall back to polling, but log to help operators).
- Long-running Blossom downloads (watch duration histogram; consider mirroring repos locally if >10s median).
