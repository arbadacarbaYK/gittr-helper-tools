# Filter GRASP mirror pollution

GRASP/git-nostr-bridge mirrors sometimes expose the whole repositories directory as paths like `{64-hex}/{repo}/…` or `npub1…/{repo}/…` inside one repo tree. Strip those for the file browser.

**Source:** `gittr/ui/src/lib/utils/filter-grasp-mirror-pollution.ts`  
**Synced:** 2026-07-18

```typescript
import {
  filterGraspMirrorPollutionFromFileTree,
  capRepoFileTreeForDisplay,
} from "./filter-grasp-mirror-pollution";

const scrubbed = filterGraspMirrorPollutionFromFileTree(files, {
  ownerPubkeyHex: ownerHex,
});
const { files: capped, truncated } = capRepoFileTreeForDisplay(scrubbed);
```
