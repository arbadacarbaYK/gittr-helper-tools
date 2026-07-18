/**
 * Create NIP-34 GRASP list events (kind 10317).
 *
 * Source: gittr/ui/src/lib/nostr/events.ts (createGraspListEvent)
 * Synced: 2026-07-18
 *
 * MIT — keep this attribution when copying into your project.
 */

import { getEventHash, getPublicKey, signEvent } from "nostr-tools";

import { KIND_GRASP_LIST } from "./grasp-list";

export interface GraspListEvent {
  graspServers: string[]; // wss:// URLs in preference order
}

/**
 * Create and sign a Nostr GRASP list event (NIP-34 kind 10317).
 * Tags: ["g", "<grasp-service-websocket-url>"] per server; empty content.
 */
export function createGraspListEvent(
  graspList: GraspListEvent,
  privateKey: string
): any {
  const pubkey = getPublicKey(privateKey);
  const tags: string[][] = [];

  graspList.graspServers.forEach((serverUrl) => {
    if (
      serverUrl &&
      (serverUrl.startsWith("wss://") || serverUrl.startsWith("ws://"))
    ) {
      tags.push(["g", serverUrl]);
    } else {
      console.warn(
        `[createGraspListEvent] Invalid GRASP server URL (must be wss:// or ws://): ${serverUrl}`
      );
    }
  });

  const event = {
    kind: KIND_GRASP_LIST,
    created_at: Math.floor(Date.now() / 1000),
    tags,
    content: "",
    pubkey,
    id: "",
    sig: "",
  };

  event.id = getEventHash(event);
  event.sig = signEvent(event, privateKey);
  return event;
}

/** Unsigned-friendly builder (sign with NIP-07 / NIP-46 yourself). */
export function buildUnsignedGraspListEvent(
  graspList: GraspListEvent,
  pubkeyHex: string
) {
  const tags: string[][] = [];
  graspList.graspServers.forEach((serverUrl) => {
    if (
      serverUrl &&
      (serverUrl.startsWith("wss://") || serverUrl.startsWith("ws://"))
    ) {
      tags.push(["g", serverUrl]);
    }
  });
  return {
    kind: KIND_GRASP_LIST,
    created_at: Math.floor(Date.now() / 1000),
    tags,
    content: "",
    pubkey: pubkeyHex.toLowerCase(),
    id: "",
    sig: "",
  };
}
