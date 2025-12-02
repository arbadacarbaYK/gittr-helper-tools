/**
 * NIP-C0 Code Snippets - Event Creation
 * 
 * Utilities for creating and parsing NIP-C0 (kind:1337) code snippet events on Nostr.
 * 
 * NIP-C0 allows sharing code snippets as standalone Nostr events that can be discovered
 * across the network. Snippets can optionally link back to source repositories.
 * 
 * @see https://github.com/nostr-protocol/nips/blob/master/C0.md
 */

import { getEventHash, getPublicKey, signEvent } from "nostr-tools";

/**
 * Event kind for code snippets (NIP-C0)
 */
export const KIND_CODE_SNIPPET = 1337;

/**
 * Interface for creating a code snippet event
 */
export interface CodeSnippetEvent {
  content: string; // The actual code
  language?: string; // From 'l' tag (lowercase, e.g., "javascript", "python")
  extension?: string; // From 'extension' tag (without dot, e.g., "js", "py")
  name?: string; // From 'name' tag (commonly a filename, e.g., "hello-world.js")
  description?: string; // From 'description' tag
  runtime?: string; // From 'runtime' tag
  license?: string[]; // From 'license' tags (can be multiple)
  dependencies?: string[]; // From 'dep' tags
  repo?: string; // From 'repo' tag (URL or NIP-34 format: "30617:<pubkey>:<d tag>")
  repoRelay?: string; // Recommended relay for repo event
}

/**
 * Creates a NIP-C0 code snippet event
 * 
 * @param snippet - The snippet data
 * @param pubkey - Public key for the event (required)
 * @param privateKey - Optional private key for signing. If not provided, event will be unsigned (for NIP-07 signing)
 * @returns Nostr event (signed if privateKey provided, otherwise unsigned for NIP-07)
 * 
 * @example
 * ```typescript
 * // With private key (direct signing)
 * const snippet: CodeSnippetEvent = {
 *   content: "console.log('Hello, Nostr!');",
 *   language: "javascript",
 *   extension: "js",
 *   name: "hello.js",
 *   description: "Simple hello world example",
 *   repo: "30617:9a83779e75080556c656d4d418d02a4d7edbe288a2f9e6dd2b48799ec935184c:my-repo"
 * };
 * 
 * const pubkey = getPublicKey(privateKey);
 * const event = createCodeSnippetEvent(snippet, pubkey, privateKey);
 * await publish(event);
 * ```
 * 
 * @example
 * ```typescript
 * // With NIP-07 (sign separately)
 * const snippet: CodeSnippetEvent = {
 *   content: "console.log('Hello, Nostr!');",
 *   language: "javascript",
 *   extension: "js",
 *   name: "hello.js"
 * };
 * 
 * const pubkey = await window.nostr.getPublicKey();
 * let event = createCodeSnippetEvent(snippet, pubkey); // No privateKey = unsigned
 * event = await window.nostr.signEvent(event); // Sign with NIP-07
 * await publish(event);
 * ```
 */
export function createCodeSnippetEvent(
  snippet: CodeSnippetEvent,
  pubkey: string, // Accept pubkey directly (required)
  privateKey?: string // Optional: only needed if signing with private key
): any {
  const tags: string[][] = [];
  
  // NIP-C0: Add language tag (lowercase)
  if (snippet.language) {
    tags.push(["l", snippet.language.toLowerCase()]);
  }
  
  // NIP-C0: Add extension tag (without dot)
  if (snippet.extension) {
    tags.push(["extension", snippet.extension.replace(/^\./, "")]);
  }
  
  // NIP-C0: Add name tag (filename)
  if (snippet.name) {
    tags.push(["name", snippet.name]);
  }
  
  // NIP-C0: Add description tag
  if (snippet.description) {
    tags.push(["description", snippet.description]);
  }
  
  // NIP-C0: Add runtime tag
  if (snippet.runtime) {
    tags.push(["runtime", snippet.runtime]);
  }
  
  // NIP-C0: Add license tags (can be multiple)
  if (snippet.license && snippet.license.length > 0) {
    snippet.license.forEach(license => {
      tags.push(["license", license]);
    });
  }
  
  // NIP-C0: Add dependency tags (can be repeated)
  if (snippet.dependencies && snippet.dependencies.length > 0) {
    snippet.dependencies.forEach(dep => {
      tags.push(["dep", dep]);
    });
  }
  
  // NIP-C0: Add repo tag (URL or NIP-34 format: "30617:<pubkey>:<d tag>")
  if (snippet.repo) {
    if (snippet.repoRelay) {
      // Add relay as additional parameter
      tags.push(["repo", snippet.repo, snippet.repoRelay]);
    } else {
      tags.push(["repo", snippet.repo]);
    }
  }
  
  const event = {
    kind: KIND_CODE_SNIPPET,
    created_at: Math.floor(Date.now() / 1000),
    tags,
    content: snippet.content, // NIP-C0: content contains the actual code
    pubkey,
    id: "",
    sig: "",
  };
  
  event.id = getEventHash(event);
  
  // Only sign if privateKey is provided (for non-NIP-07 signing)
  if (privateKey) {
    event.sig = signEvent(event, privateKey);
  }
  
  return event;
}

/**
 * Parses a NIP-C0 code snippet event and extracts all tags
 * 
 * @param event - The Nostr event (kind:1337)
 * @returns Parsed snippet data
 * 
 * @example
 * ```typescript
 * const parsed = parseCodeSnippetEvent(event);
 * console.log(parsed.language); // "javascript"
 * console.log(parsed.content); // The code content
 * ```
 */
export function parseCodeSnippetEvent(event: {
  content: string;
  tags: string[][];
}): {
  content: string;
  language?: string;
  extension?: string;
  name?: string;
  description?: string;
  runtime?: string;
  licenses: string[];
  dependencies: string[];
  repo?: string;
  repoRelay?: string;
} {
  const language = event.tags.find((t) => Array.isArray(t) && t[0] === "l")?.[1];
  const extension = event.tags.find((t) => Array.isArray(t) && t[0] === "extension")?.[1];
  const name = event.tags.find((t) => Array.isArray(t) && t[0] === "name")?.[1];
  const description = event.tags.find((t) => Array.isArray(t) && t[0] === "description")?.[1];
  const runtime = event.tags.find((t) => Array.isArray(t) && t[0] === "runtime")?.[1];
  const licenses = event.tags.filter((t) => Array.isArray(t) && t[0] === "license").map((t) => t[1]);
  const dependencies = event.tags.filter((t) => Array.isArray(t) && t[0] === "dep").map((t) => t[1]);
  const repoTag = event.tags.find((t) => Array.isArray(t) && t[0] === "repo");
  const repo = repoTag?.[1];
  const repoRelay = repoTag?.[2];

  return {
    content: event.content,
    language,
    extension,
    name,
    description,
    runtime,
    licenses,
    dependencies,
    repo,
    repoRelay,
  };
}

