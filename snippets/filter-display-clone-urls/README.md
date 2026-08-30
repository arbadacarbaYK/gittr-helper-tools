# Filter display clone URLs

Sidebar clone list for NIP-34 announces: keep forge `source`, primary git host,
and every host on the **Push allowlist** (`GRASP_SERVERS_FOR_PUSHING`). Hide bare
IP mirrors and random third-party GRASP hosts.

**Do not** collapse to “primary only” when primary is present — that hid
shakespeare / gitnostr / ngit even though Push advertises them (fixed Aug 2026).

If you inject `isGraspDomainForPushing`, pass the **production push list** (`git.gittr.space`, ngit, gitnostr.com, shakespeare — **not** `relay.gittr.space`). The relay hostname is wss only; advertising it as a clone host 404s on git fetch.

**Source:** `gittr/ui/src/lib/utils/filter-display-clone-urls.ts`  
**Synced:** 2026-08-30  
**Regression test in gittr:** `ui/src/lib/utils/filter-display-clone-urls.test.ts` (`npm run test:regressions` in `ui/`)

```typescript
import { filterDisplayCloneUrlsForSidebar } from "./filter-display-clone-urls";
import { isGraspServer } from "../grasp-detection/grasp-servers";
import { isGraspDomainForPushing } from "../grasp-list/grasp-servers"; // or grasp-servers snippet

const visible = filterDisplayCloneUrlsForSidebar(cloneUrls, {
  primaryGitServerEnv: "https://git.gittr.space",
  sourceUrl: repo.sourceUrl,
  isGraspServer,
  isGraspDomainForPushing,
});
```
