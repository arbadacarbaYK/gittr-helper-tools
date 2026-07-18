/**
 * Pure helpers for Web of Trust badge text (viewer-relative).
 *
 * Source: gittr/ui/src/lib/nostr/wot.ts (wotLabel*, wotBadgeClassName)
 * Synced: 2026-07-18
 *
 * MIT — keep this attribution when copying into your project.
 * Map class names to your design system (gittr uses Tailwind borders/colors).
 */

export function wotLabel(
  hops: number | null,
  opts?: { loggedOut?: boolean }
): string {
  if (opts?.loggedOut) return "—";
  if (hops === null) return "Outside your network";
  if (hops === 0) return "";
  if (hops === 1) return "In your network";
  return `${hops} hops from you`;
}

export function wotSelfPreviewLabel(): string {
  return "Followers see: In their network";
}

export function wotSelfPreviewTitle(): string {
  return "People who follow you see your profile one hop away (In their network). Others see distance from their own follow graph.";
}

/** Semantic tokens — map to your CSS. gittr production uses Tailwind border/text/bg. */
export function wotBadgeClassName(hops: number | null): string {
  if (hops === null) return "wot-outside";
  if (hops === 1) return "wot-near";
  if (hops === 2) return "wot-mid";
  if (hops === 3) return "wot-far";
  return "wot-very-far";
}

/** Optional: gittr-style Tailwind classes if you use the same palette. */
export function wotBadgeTailwindClassName(hops: number | null): string {
  if (hops === null) return "border-gray-600/80 text-gray-400 bg-gray-900/40";
  if (hops === 1) return "border-green-600/60 text-green-300 bg-green-950/50";
  if (hops === 2) return "border-cyan-600/50 text-cyan-300 bg-cyan-950/40";
  if (hops === 3) return "border-amber-600/50 text-amber-300 bg-amber-950/40";
  return "border-orange-600/50 text-orange-300 bg-orange-950/40";
}
