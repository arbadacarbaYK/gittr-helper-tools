# Filter display clone URLs

Hide extra GRASP mirrors in the sidebar when an announce already lists your primary git host.

**Source:** `gittr/ui/src/lib/utils/filter-display-clone-urls.ts`  
**Synced:** 2026-07-18

```typescript
import { filterDisplayCloneUrlsForSidebar } from "./filter-display-clone-urls";
import { isGraspServer } from "../grasp-detection/grasp-servers";

const visible = filterDisplayCloneUrlsForSidebar(cloneUrls, {
  primaryGitServerEnv: "https://git.gittr.space",
  sourceUrl: repo.sourceUrl,
  isGraspServer,
});
```
