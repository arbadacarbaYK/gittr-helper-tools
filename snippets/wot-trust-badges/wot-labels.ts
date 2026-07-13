/**
 * Pure helpers for Web of Trust badge text (viewer-relative).
 * Extracted from gittr production — adapt styling in your design system.
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

export function wotBadgeClassName(hops: number | null): string {
  if (hops === null) return "wot-outside";
  if (hops === 1) return "wot-near";
  if (hops === 2) return "wot-mid";
  if (hops === 3) return "wot-far";
  return "wot-very-far";
}
