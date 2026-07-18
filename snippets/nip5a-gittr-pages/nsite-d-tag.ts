/**
 * Map a repo slug to a valid NIP-5A `d` tag fragment.
 *
 * Source: gittr/ui/src/lib/nsite/nsite-url.ts (`slugToNsiteDTag`)
 * Synced: 2026-07-18
 *
 * MIT — keep this attribution when copying into your project.
 *
 * Rules: 1–13 chars, [a-z0-9-], must not end with '-'.
 */
export function slugToNsiteDTag(slug: string): string {
  let s = slug
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (s.length > 13) {
    s = s.slice(0, 13).replace(/-+$/, "");
  }
  if (!s) {
    s = "site";
  }
  if (s.endsWith("-")) {
    s = s.replace(/-+$/, "") || "site";
  }
  return s;
}
