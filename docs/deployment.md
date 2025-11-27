# Deployment notes

A minimal layout that keeps helpers separate from the gittr UI/bridge:

```
/opt/gittr-helper-tools
├── bin/
│   ├── clone-events-sse
│   └── blossom-fetch-helper
├── config/helper.env
└── logs/
```

### Environment sample (`config/helper.env`)
```
LISTEN_ADDR=:4010
WEBHOOK_SECRET=change-me
EVENT_BUFFER=200
ALLOW_ORIGINS=https://gittr.space,https://beta.gittr.space
CACHE_DIR=/var/cache/gittr-blossom
```

### Systemd unit example
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

[Install]
WantedBy=multi-user.target
```

Bridge config snippet (from `git-nostr-bridge.json`):
```json
"webhooks": {
  "repo_cloned": {
    "url": "http://127.0.0.1:4010/webhooks/repo-cloned",
    "secret": "change-me"
  }
}
```

### Blossom helper usage
```
/opt/gittr-helper-tools/bin/blossom-fetch-helper \
  --repo-path /opt/ngit/git-nostr-repositories/npub123/myrepo.git \
  --source https://blossom.example.com/packs/abc123.pack \
  --cache-dir /var/cache/gittr-blossom
```
The helper normalizes git@/git:// URLs into HTTPS when possible, downloads the pack, and ensures the bare repo exists before the UI retries file/tree APIs.
