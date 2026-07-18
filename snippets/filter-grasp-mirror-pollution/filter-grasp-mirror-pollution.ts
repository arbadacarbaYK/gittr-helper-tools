/**
 * Strip GRASP/git-nostr-bridge mirror layout paths from a file tree
 * (`{64-hex-pubkey}/{repo}/…` or `npub1…/{repo}/…`).
 *
 * Source: gittr/ui/src/lib/utils/filter-grasp-mirror-pollution.ts
 * Synced: 2026-07-18
 *
 * MIT — keep this attribution when copying into your project.
 */

const NPUB_DIR = /^npub1[a-z0-9]+$/i;
const HEX_DIR = /^[0-9a-f]{64}$/i;

function firstPathSegment(path: string): string {
  return (
    String(path || "")
      .replace(/^\//, "")
      .split("/")
      .filter(Boolean)[0] || ""
  );
}

export function isGraspMirrorFilesystemPollutionPath(path: string): boolean {
  const first = firstPathSegment(path);
  return NPUB_DIR.test(first) || HEX_DIR.test(first);
}

export function filterGraspMirrorPollutionFromFileTree<
  T extends { path: string }
>(files: T[], opts?: { ownerPubkeyHex?: string }): T[] {
  if (!Array.isArray(files) || files.length === 0) return files;

  const owner = opts?.ownerPubkeyHex?.toLowerCase();
  const foreignHexDirs = new Set<string>();
  const foreignNpubDirs = new Set<string>();

  for (const f of files) {
    const first = firstPathSegment(f.path);
    if (HEX_DIR.test(first)) {
      if (owner && first.toLowerCase() === owner) continue;
      foreignHexDirs.add(first.toLowerCase());
    } else if (NPUB_DIR.test(first)) {
      foreignNpubDirs.add(first.toLowerCase());
    }
  }

  const foreignRootDirs = foreignHexDirs.size + foreignNpubDirs.size;
  if (foreignRootDirs >= 1 || files.length >= 150) {
    return files.filter((f) => {
      const first = firstPathSegment(f.path);
      if (NPUB_DIR.test(first)) return false;
      if (HEX_DIR.test(first)) {
        if (owner && first.toLowerCase() === owner) return true;
        return false;
      }
      return true;
    });
  }

  return files.filter((f) => {
    const first = firstPathSegment(f.path);
    if (NPUB_DIR.test(first)) return false;
    if (HEX_DIR.test(first)) {
      if (owner && first.toLowerCase() === owner) return true;
      return false;
    }
    return true;
  });
}

export const REPO_FILE_TREE_SOFT_CAP = 1200;

export type CapFileTreeResult<T extends { path: string }> = {
  files: T[];
  truncated: boolean;
  originalCount: number;
};

export function capRepoFileTreeForDisplay<T extends { path: string }>(
  files: T[]
): CapFileTreeResult<T> {
  if (!Array.isArray(files) || files.length <= REPO_FILE_TREE_SOFT_CAP) {
    return { files, truncated: false, originalCount: files.length };
  }
  return {
    files: files.slice(0, REPO_FILE_TREE_SOFT_CAP),
    truncated: true,
    originalCount: files.length,
  };
}

export function fileTreeListFromScrub<T extends { path: string }>(
  result: CapFileTreeResult<T> | T[]
): T[] {
  return Array.isArray(result) ? result : result.files;
}
