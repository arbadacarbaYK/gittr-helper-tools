# GRASP Server Detection

Code snippets for identifying GRASP (Git-Nostr-Bridge) servers vs regular Nostr relays.

**Synced:** 2026-08-30 from `gittr/ui/src/lib/utils/grasp-servers.ts`

## `grasp-servers.ts`

Detects GRASP servers (git servers that are also Nostr relays) and filters relay lists.

**What it does:**
- Maintains list of known GRASP server domains
- Detects GRASP servers by domain pattern matching **and** `/grasp/` path clones
- Filters relay lists to separate GRASP servers from regular relays
- Push allowlist does **not** include `relay.gittr.space` (that hostname is the Pyramid wss relay; git bytes live on `git.gittr.space`)

**Exports:** `KNOWN_GRASP_DOMAINS` (all known mirrors for detection), **`GRASP_SERVERS_FOR_PUSHING`** (subset that accept arbitrary user pushes), `hasGraspPathPrefix`, `parseGraspPathClone`, `isGraspCloneUrl`.

**Usage:**
```typescript
import {
  isGraspServer,
  getGraspServers,
  getRegularRelays,
  KNOWN_GRASP_DOMAINS,
  GRASP_SERVERS_FOR_PUSHING,
} from './grasp-servers';

// Check if a URL is a GRASP server
const isGrasp = isGraspServer('wss://relay.gittr.space');
// true — gittr Pyramid (Nostr wss + GRASP git on same host)

// Filter relays
const relays = [
  'wss://relay.gittr.space',
  'wss://relay.ngit.dev',
  'wss://relay.damus.io',
  'wss://nos.lol',
];
const graspServers = getGraspServers(relays);
// ['wss://relay.gittr.space', 'wss://relay.ngit.dev']

const regularRelays = getRegularRelays(relays);
// ['wss://relay.damus.io', 'wss://nos.lol']
```

**Hosts:** `git.gittr.space` is HTTPS/SSH git (clone URLs, Push). `relay.gittr.space` is the open forge `wss://` relay. `wss://git.gittr.space` 404s.

**Why this exists:**
Some GRASP hosts are both a Nostr relay and a git server (git protocol, not a file-browse REST API). On this deployment those jobs are split: relay vs git host. Clone URLs are git hosts.

**Extracted from:** `gittr/ui/src/lib/utils/grasp-servers.ts`

