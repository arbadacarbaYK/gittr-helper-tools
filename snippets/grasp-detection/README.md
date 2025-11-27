# GRASP Server Detection

Code snippets for identifying GRASP (Git-Nostr-Bridge) servers vs regular Nostr relays.

## `grasp-servers.ts`

Detects GRASP servers (git servers that are also Nostr relays) and filters relay lists.

**What it does:**
- Maintains list of known GRASP server domains
- Detects GRASP servers by domain pattern matching
- Filters relay lists to separate GRASP servers from regular relays

**Usage:**
```typescript
import { isGraspServer, getGraspServers, getRegularRelays, KNOWN_GRASP_DOMAINS } from './grasp-servers';

// Check if a URL is a GRASP server
const isGrasp = isGraspServer('wss://relay.ngit.dev');
// true

// Filter relays
const relays = ['wss://relay.ngit.dev', 'wss://relay.damus.io', 'wss://nos.lol'];
const graspServers = getGraspServers(relays);
// ['wss://relay.ngit.dev']

const regularRelays = getRegularRelays(relays);
// ['wss://relay.damus.io', 'wss://nos.lol']
```

**Why this exists:**
GRASP servers are special - they're both Nostr relays AND git servers. They serve repos via git protocol (not REST APIs), so they need special handling in the file-fetch flow. Regular relays should NOT be included in clone URLs.

**Extracted from:** `gittr/ui/src/lib/utils/grasp-servers.ts`

