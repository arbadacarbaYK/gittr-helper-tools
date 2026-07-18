# GRASP list (NIP-34 kind 10317)

User preference list of GRASP (git + Nostr) servers, similar to NIP-65 relay lists.

**Source:** `gittr/ui/src/lib/utils/grasp-list.ts` + `createGraspListEvent` in `events.ts`  
**Synced:** 2026-07-18

## Files

| File | Role |
| --- | --- |
| `grasp-list.ts` | Parse kind 10317, query user list, prioritize, build HTTPS clone candidates |
| `create-grasp-list-event.ts` | Build / sign kind 10317 (`g` tags) |

## Event shape

```json
{
  "kind": 10317,
  "content": "",
  "tags": [
    ["g", "wss://relay.ngit.dev"],
    ["g", "wss://git.gittr.space"]
  ]
}
```

Order of `g` tags is preference order.

## Usage

```typescript
import { parseGraspListEvent, prioritizeGraspServers, KIND_GRASP_LIST } from "./grasp-list";
import { createGraspListEvent } from "./create-grasp-list-event";

const signed = createGraspListEvent(
  { graspServers: ["wss://relay.ngit.dev", "wss://git.gittr.space"] },
  privateKeyHex
);
```

See also: [`snippets/grasp-detection/`](../grasp-detection) for known GRASP domains.
