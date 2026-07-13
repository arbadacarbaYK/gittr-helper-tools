/**
 * Minimal kind 9806 bounty event builder (reference extract from gittr).
 * Sign with your app's NIP-07 / NIP-46 resolver before publish.
 */

import { getEventHash, getPublicKey, signEvent } from "nostr-tools";

export const KIND_BOUNTY = 9806;

export type BountyStatus = "pending" | "paid" | "released" | "claimed";

export interface BountyEventInput {
  issueId: string;
  repoEntity: string;
  repoName: string;
  amount: number;
  status: BountyStatus;
  creator: string;
  claimedBy?: string;
  withdrawId?: string;
  lnurl?: string;
  withdrawUrl?: string;
  createdAt?: number;
  releasedAt?: number;
  claimedAt?: number;
}

export function buildUnsignedBountyEvent(
  bounty: BountyEventInput,
  creatorHex: string
) {
  const tags: string[][] = [
    ["e", bounty.issueId, "", "issue"],
    ["repo", bounty.repoEntity, bounty.repoName],
    ["status", bounty.status],
    ["p", bounty.creator, "creator"],
  ];

  if (bounty.claimedBy) {
    tags.push(["p", bounty.claimedBy, "claimed_by"]);
  }

  return {
    kind: KIND_BOUNTY,
    created_at: Math.floor((bounty.createdAt ?? Date.now()) / 1000),
    tags,
    content: JSON.stringify({
      amount: bounty.amount,
      status: bounty.status,
      withdrawId: bounty.withdrawId,
      lnurl: bounty.lnurl,
      withdrawUrl: bounty.withdrawUrl,
      releasedAt: bounty.releasedAt,
      claimedAt: bounty.claimedAt,
    }),
    pubkey: creatorHex,
    id: "",
    sig: "",
  };
}

export function signBountyEvent(
  bounty: BountyEventInput,
  privateKeyHex: string
) {
  const pubkey = getPublicKey(privateKeyHex);
  const event = buildUnsignedBountyEvent(bounty, pubkey);
  event.id = getEventHash(event);
  event.sig = signEvent(event, privateKeyHex);
  return event;
}
