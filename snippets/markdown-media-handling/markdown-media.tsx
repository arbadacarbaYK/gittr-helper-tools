/**
 * Markdown Media Handling for Repository Files
 * 
 * This snippet provides utilities and React components for handling images, videos,
 * and other media files in markdown content within repository viewers.
 * 
 * Features:
 * - Resolves relative image paths to repository assets
 * - Handles API endpoints that return base64-encoded binary content
 * - Converts base64 content to data URLs for direct image display
 * - Supports YouTube, Vimeo, and direct video file embeds
 * - Handles relative links within repositories
 * - Caches fetched URLs to prevent redundant network requests
 * 
 * Usage:
 * ```tsx
 * import ReactMarkdown from 'react-markdown';
 * import { createMarkdownImageRenderer, createMarkdownLinkRenderer } from './markdown-media';
 * 
 * <ReactMarkdown
 *   components={{
 *     img: createMarkdownImageRenderer(readmePath),
 *     a: createMarkdownLinkRenderer(readmePath),
 *   }}
 * >
 *   {markdownContent}
 * </ReactMarkdown>
 * ```
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { nip19 } from 'nostr-tools';

// Types
interface RepoFileEntry {
  path: string;
  content?: string;
  data?: string;
  body?: string;
  text?: string;
  fileContent?: string;
  file_content?: string;
  isBinary?: boolean;
  binary?: boolean;
}

interface RepoData {
  files?: RepoFileEntry[];
  sourceUrl?: string;
  ownerPubkey?: string;
  repo?: string;
  slug?: string;
  defaultBranch?: string;
}

interface RepoImageProps {
  src: string;
  basePath: string | null;
  alt?: string;
  [key: string]: any;
}

// Helper to normalize repo-relative paths (removes ./ and ../ safely)
function normalizeRepoPath(path: string): string {
  if (!path) return "";
  const sanitized = path.replace(/\\/g, "/").trim();
  const segments = sanitized.split("/");
  const stack: string[] = [];
  for (const segment of segments) {
    if (!segment || segment === ".") continue;
    if (segment === "..") {
      stack.pop();
    } else {
      stack.push(segment);
    }
  }
  return stack.join("/");
}

function resolveRepoRelativePath(targetPath: string, basePath?: string | null): string {
  if (!targetPath) return "";
  const trimmed = targetPath.trim();
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("mailto:") ||
    trimmed.startsWith("#")
  ) {
    return trimmed;
  }

  const isRootRelative = trimmed.startsWith("/");
  const segments = trimmed.replace(/\\/g, "/").split("/");
  const stack: string[] = [];

  if (!isRootRelative && basePath) {
    const baseNormalized = normalizeRepoPath(basePath);
    if (baseNormalized) {
      const baseParts = baseNormalized.split("/");
      baseParts.pop(); // remove filename
      stack.push(...baseParts);
    }
  }

  if (isRootRelative) {
    // Start from repo root
    stack.length = 0;
  }

  for (const segment of segments) {
    if (!segment || segment === ".") continue;
    if (segment === "..") {
      stack.pop();
    } else {
      stack.push(segment);
    }
  }

  return stack.join("/");
}

function getInlineRepoFile(
  path: string,
  repoData?: RepoData | null
): { content: string; isBinary: boolean } | null {
  if (!repoData?.files || !Array.isArray(repoData.files)) return null;
  const normalizedTarget = normalizeRepoPath(path).toLowerCase();
  const contentFields = ["content", "data", "body", "text", "fileContent", "file_content"] as const;

  const match = repoData.files.find((file) => {
    const filePath = normalizeRepoPath(file?.path || "").toLowerCase();
    return filePath === normalizedTarget;
  });

  if (!match) return null;

  for (const field of contentFields) {
    const fieldValue = match[field];
    if (typeof fieldValue === "string" && fieldValue) {
      const isBinary = Boolean(match.isBinary || match.binary);
      return { content: fieldValue, isBinary };
    }
  }
  return null;
}

function guessMimeType(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() || "";
  const mimeMap: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    bmp: "image/bmp",
    ico: "image/x-icon",
    avif: "image/avif",
    jfif: "image/jpeg",
    tiff: "image/tiff",
    tif: "image/tiff",
  };
  return mimeMap[ext] || "application/octet-stream";
}

/**
 * Gets the raw URL for a file path from a Git provider (GitHub, GitLab, Codeberg)
 * Uses API proxy for GitLab and Codeberg for better reliability
 */
function getRawUrl(
  path: string,
  repoData?: RepoData | null,
  selectedBranch?: string,
  paramsRepo?: string
): string | null {
  if (!repoData?.sourceUrl) return null;
  const normalizedPath = normalizeRepoPath(path);
  try {
    const u = new URL(repoData.sourceUrl);
    const hostname = u.hostname.toLowerCase();
    const parts = u.pathname.split("/").filter(Boolean);
    const owner = parts[0];
    const repo = (parts[1] || paramsRepo || "").replace(/\.git$/, "");
    const branch = selectedBranch || repoData?.defaultBranch || "main";

    // For GitLab and Codeberg, use API proxy for better reliability
    // For GitHub, use raw.githubusercontent.com directly
    if (hostname === "github.com" || hostname.includes("github")) {
      const encodedPath = normalizedPath
        .split("/")
        .map((segment) => encodeURIComponent(segment))
        .join("/");
      return `https://raw.githubusercontent.com/${owner}/${repo}/${encodeURIComponent(branch)}/${encodedPath}`;
    } else if (hostname === "gitlab.com" || hostname.includes("gitlab")) {
      // Use API proxy for GitLab - more reliable than raw URLs
      return `/api/git/file-content?sourceUrl=${encodeURIComponent(repoData.sourceUrl)}&path=${encodeURIComponent(normalizedPath)}&branch=${encodeURIComponent(branch)}`;
    } else if (hostname === "codeberg.org" || hostname.includes("codeberg")) {
      // Use API proxy for Codeberg
      return `/api/git/file-content?sourceUrl=${encodeURIComponent(repoData.sourceUrl)}&path=${encodeURIComponent(normalizedPath)}&branch=${encodeURIComponent(branch)}`;
    } else {
      // For other git providers, use the API proxy
      return `/api/git/file-content?sourceUrl=${encodeURIComponent(repoData.sourceUrl)}&path=${encodeURIComponent(normalizedPath)}&branch=${encodeURIComponent(branch)}`;
    }
  } catch (e) {
    console.error(`❌ [getRawUrl] Error constructing raw URL for ${path}:`, e);
    return null;
  }
}

/**
 * Resolves a repository asset URL for images and other media files
 * Handles embedded files, Git provider raw URLs, and Nostr-native repos
 */
function getRepoAssetUrl(
  path: string,
  repoData?: RepoData | null,
  paramsEntity?: string,
  paramsRepo?: string,
  selectedBranch?: string,
  resolveEntityToPubkey?: (entity: string, repoData?: RepoData | null) => string | null
): string | null {
  if (!path) return null;
  const inlineFile = getInlineRepoFile(path, repoData);
  if (inlineFile && inlineFile.isBinary && inlineFile.content) {
    return inlineFile.content.startsWith("data:")
      ? inlineFile.content
      : `data:${guessMimeType(path)};base64,${inlineFile.content}`;
  }

  // Try raw Git URL first (for GitHub/GitLab repos)
  const rawUrl = getRawUrl(path, repoData, selectedBranch, paramsRepo);
  if (rawUrl) {
    return rawUrl;
  }

  // For Nostr-native repos (no sourceUrl), use API endpoint
  if (!repoData?.sourceUrl) {
    // Resolve ownerPubkey: check repoData, then decode npub from entity, then resolveEntityToPubkey
    let ownerPubkey: string | null = repoData?.ownerPubkey ?? null;

    if (!ownerPubkey || !/^[0-9a-f]{64}$/i.test(ownerPubkey)) {
      // Try to decode npub from entity
      if (paramsEntity && paramsEntity.startsWith("npub")) {
        try {
          const decoded = nip19.decode(paramsEntity);
          if (decoded.type === "npub") {
            ownerPubkey = decoded.data as string;
          }
        } catch (e) {
          // Decode failed, try resolveEntityToPubkey
        }
      }
    }

    // Final fallback: use resolveEntityToPubkey utility
    if ((!ownerPubkey || !/^[0-9a-f]{64}$/i.test(ownerPubkey)) && resolveEntityToPubkey) {
      const resolved = resolveEntityToPubkey(paramsEntity || "", repoData);
      if (resolved && /^[0-9a-f]{64}$/i.test(resolved)) {
        ownerPubkey = resolved;
      }
    }

    if (ownerPubkey && /^[0-9a-f]{64}$/i.test(ownerPubkey)) {
      const repoName = repoData?.repo || repoData?.slug || paramsRepo || "";
      const branch = selectedBranch || repoData?.defaultBranch || "main";
      const normalizedPath = normalizeRepoPath(path);
      const encodedPath = normalizedPath
        .split("/")
        .map((segment) => encodeURIComponent(segment))
        .join("/");
      return `/api/nostr/repo/file-content?ownerPubkey=${encodeURIComponent(ownerPubkey)}&repo=${encodeURIComponent(repoName)}&path=${encodeURIComponent(encodedPath)}&branch=${encodeURIComponent(branch)}`;
    }
  }
  return null;
}

/**
 * Stateful image component that handles API endpoint fetching and base64-to-data-URL conversion
 * Includes URL caching to prevent redundant network requests
 */
function RepoImage({ src, basePath, repoData, selectedBranch, paramsEntity, paramsRepo, resolveEntityToPubkey, ...props }: RepoImageProps & {
  repoData?: RepoData | null;
  selectedBranch?: string;
  paramsEntity?: string;
  paramsRepo?: string;
  resolveEntityToPubkey?: (entity: string, repoData?: RepoData | null) => string | null;
}) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const retryIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const fetchedUrlsRef = useRef<Set<string>>(new Set());
  const trimmedSrc = src.trim();
  const isExternal =
    trimmedSrc.startsWith("http://") ||
    trimmedSrc.startsWith("https://") ||
    trimmedSrc.startsWith("data:");

  useEffect(() => {
    // External URLs (blossom-servers, etc.) - use directly
    if (isExternal) {
      setImageSrc(trimmedSrc);
      return;
    }

    // Relative paths - resolve to repo asset URL
    const resolvedPath = resolveRepoRelativePath(trimmedSrc, basePath || undefined);
    const assetUrl = getRepoAssetUrl(
      resolvedPath,
      repoData,
      paramsEntity,
      paramsRepo,
      selectedBranch,
      resolveEntityToPubkey
    );

    // Only set imageSrc if we have a valid assetUrl
    if (!assetUrl) {
      setImageSrc(null);
      return;
    }

    // If it's an API endpoint, fetch and convert to data URL immediately
    if (assetUrl.startsWith("/api/")) {
      // Avoid duplicate fetches
      if (fetchedUrlsRef.current.has(assetUrl)) {
        return;
      }
      fetchedUrlsRef.current.add(assetUrl);

      fetch(assetUrl)
        .then((res) => res.json())
        .then((data: { content?: string; isBinary?: boolean }) => {
          if (data.content && data.isBinary) {
            // Convert base64 content to data URL
            const ext = trimmedSrc.split(".").pop()?.toLowerCase() || "";
            const mimeTypes: Record<string, string> = {
              png: "image/png",
              jpg: "image/jpeg",
              jpeg: "image/jpeg",
              gif: "image/gif",
              webp: "image/webp",
              svg: "image/svg+xml",
              ico: "image/x-icon",
              pdf: "application/pdf",
              woff: "font/woff",
              woff2: "font/woff2",
              ttf: "font/ttf",
              otf: "font/otf",
              mp4: "video/mp4",
              mp3: "audio/mpeg",
              wav: "audio/wav",
            };
            const mimeType = mimeTypes[ext] || "application/octet-stream";
            const dataUrl = `data:${mimeType};base64,${data.content}`;
            setImageSrc(dataUrl);
          } else {
            // Not binary or no content - set to null to trigger error handler
            setImageSrc(null);
          }
        })
        .catch((error) => {
          console.error(`❌ [RepoImage] Failed to fetch API endpoint ${assetUrl}:`, error);
          fetchedUrlsRef.current.delete(assetUrl); // Allow retry
          setImageSrc(null);
        });
    } else {
      // Direct URL (data URL, external URL, etc.) - use directly
      setImageSrc(assetUrl);
    }
  }, [trimmedSrc, basePath, repoData?.sourceUrl, selectedBranch, repoData?.defaultBranch, isExternal, repoData, paramsEntity, paramsRepo, resolveEntityToPubkey]);

  useEffect(() => {
    // Cleanup interval on unmount
    return () => {
      if (retryIntervalRef.current) {
        clearInterval(retryIntervalRef.current);
        retryIntervalRef.current = null;
      }
    };
  }, []);

  const handleError = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const target = e.currentTarget as HTMLImageElement;
      if (!target.dataset.errorLogged) {
        target.dataset.errorLogged = "true";
        const resolvedPath = resolveRepoRelativePath(trimmedSrc, basePath || undefined);
        const currentAssetUrl = getRepoAssetUrl(
          resolvedPath,
          repoData,
          paramsEntity,
          paramsRepo,
          selectedBranch,
          resolveEntityToPubkey
        );

        console.error(`❌ [Markdown Image] Failed to load image:`, {
          originalSrc: trimmedSrc,
          resolvedPath: resolvedPath,
          assetUrl: currentAssetUrl,
          sourceUrl: repoData?.sourceUrl,
          hasRepoData: !!repoData,
          branch: selectedBranch || repoData?.defaultBranch || "main",
        });

        // Retry when sourceUrl becomes available
        if (!repoData?.sourceUrl) {
          let retryCount = 0;
          const maxRetries = 10;

          retryIntervalRef.current = setInterval(() => {
            retryCount++;
            const newAssetUrl = getRepoAssetUrl(
              resolvedPath,
              repoData,
              paramsEntity,
              paramsRepo,
              selectedBranch,
              resolveEntityToPubkey
            );
            if (repoData?.sourceUrl && newAssetUrl && newAssetUrl.startsWith("/api/git/")) {
              console.log(`🔄 [Markdown Image] Retrying with Git API endpoint:`, newAssetUrl);
              setImageSrc(newAssetUrl);
              delete target.dataset.errorLogged;
              if (retryIntervalRef.current) {
                clearInterval(retryIntervalRef.current);
                retryIntervalRef.current = null;
              }
            } else if (retryCount >= maxRetries) {
              console.warn(`⚠️ [Markdown Image] Max retries reached, giving up`);
              if (retryIntervalRef.current) {
                clearInterval(retryIntervalRef.current);
                retryIntervalRef.current = null;
              }
            }
          }, 1000);
        } else if (currentAssetUrl && currentAssetUrl !== imageSrc) {
          // sourceUrl is available but we're using wrong URL, update immediately
          console.log(`🔄 [Markdown Image] Updating to correct URL:`, currentAssetUrl);
          setImageSrc(currentAssetUrl);
          delete target.dataset.errorLogged;
        }
      }
    },
    [trimmedSrc, basePath, repoData?.sourceUrl, selectedBranch, repoData?.defaultBranch, imageSrc, paramsEntity, paramsRepo, resolveEntityToPubkey]
  );

  // External URLs (blossom-servers, etc.) - use directly
  if (isExternal) {
    return <img {...props} src={trimmedSrc} className="max-w-full h-auto rounded" alt={props.alt || ""} />;
  }

  // Use key to force re-render when sourceUrl changes
  const imageKey = `${trimmedSrc}-${repoData?.sourceUrl || "no-source"}-${selectedBranch || repoData?.defaultBranch || "main"}`;

  // Don't render if we don't have a valid src yet
  if (!imageSrc) {
    return null;
  }

  return (
    <img
      {...props}
      key={imageKey}
      src={imageSrc}
      onError={handleError}
      className="max-w-full h-auto rounded"
      alt={props.alt || ""}
    />
  );
}

/**
 * Creates a custom image renderer for ReactMarkdown
 * Handles relative paths, external URLs, and API endpoints
 */
export function createMarkdownImageRenderer(
  basePath: string | null,
  repoData?: RepoData | null,
  selectedBranch?: string,
  paramsEntity?: string,
  paramsRepo?: string,
  resolveEntityToPubkey?: (entity: string, repoData?: RepoData | null) => string | null
) {
  return ({ node, ...props }: any) => {
    const rawSrc = props.src || "";
    if (!rawSrc) {
      return <img {...props} className="max-w-full h-auto rounded" />;
    }

    const trimmedSrc = rawSrc.trim();
    const isExternal =
      trimmedSrc.startsWith("http://") ||
      trimmedSrc.startsWith("https://") ||
      trimmedSrc.startsWith("data:");

    if (isExternal) {
      return <img {...props} src={trimmedSrc} className="max-w-full h-auto rounded" />;
    }

    return (
      <RepoImage
        src={trimmedSrc}
        basePath={basePath}
        repoData={repoData}
        selectedBranch={selectedBranch}
        paramsEntity={paramsEntity}
        paramsRepo={paramsRepo}
        resolveEntityToPubkey={resolveEntityToPubkey}
        {...props}
      />
    );
  };
}

/**
 * Creates a custom link renderer for ReactMarkdown
 * Handles YouTube/Vimeo embeds, video files, and relative links within repositories
 */
export function createMarkdownLinkRenderer(
  basePath: string | null = null,
  getRepoLink?: (path: string) => string
) {
  return ({ node, href, children, ...props }: any) => {
    if (!href) {
      return <a {...props}>{children}</a>;
    }

    let url = href.trim();
    const isExternal = url.startsWith("http://") || url.startsWith("https://");

    // Handle relative links (for file viewer)
    if (basePath && !isExternal && !url.startsWith("mailto:") && !url.startsWith("#") && getRepoLink) {
      // Relative link - resolve relative to repo root using query params format
      const repoBasePath = getRepoLink("");
      // Remove leading ./ or . if present
      let cleanHref = url.replace(/^\.\//, "").replace(/^\.$/, "");
      // Remove leading / if present (root-relative)
      if (cleanHref.startsWith("/")) {
        cleanHref = cleanHref.substring(1);
      }
      // Extract directory path and filename
      const pathParts = cleanHref.split("/");
      const fileName = pathParts[pathParts.length - 1];
      const dirPath = pathParts.length > 1 ? pathParts.slice(0, -1).join("/") : "";
      // Construct URL with query parameters: ?path=dir&file=dir%2Ffile.md
      const encodedFile = encodeURIComponent(cleanHref);
      const encodedPath = dirPath ? encodeURIComponent(dirPath) : "";
      if (encodedPath) {
        url = `${repoBasePath}?path=${encodedPath}&file=${encodedFile}`;
      } else {
        url = `${repoBasePath}?file=${encodedFile}`;
      }
      return (
        <a {...props} href={url} className="text-purple-400 hover:text-purple-300">
          {children}
        </a>
      );
    }

    // YouTube embed detection
    const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
    const youtubeMatch = url.match(youtubeRegex);
    if (youtubeMatch) {
      const videoId = youtubeMatch[1];
      return (
        <div className="my-4">
          <iframe
            width="560"
            height="315"
            src={`https://www.youtube.com/embed/${videoId}`}
            title="YouTube video player"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
            className="w-full max-w-full rounded"
            style={{ aspectRatio: '16/9' }}
          />
        </div>
      );
    }

    // Vimeo embed detection
    const vimeoRegex = /vimeo\.com\/(?:.*\/)?(\d+)/i;
    const vimeoMatch = url.match(vimeoRegex);
    if (vimeoMatch) {
      const videoId = vimeoMatch[1];
      return (
        <div className="my-4 aspect-video w-full max-w-4xl mx-auto">
          <iframe
            src={`https://player.vimeo.com/video/${videoId}`}
            title={typeof children === "string" ? children : "Vimeo video"}
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            className="w-full h-full rounded"
          />
        </div>
      );
    }

    // Generic video file detection (mp4, webm, ogg, etc.)
    const videoExtensions = /\.(mp4|webm|ogg|mov|avi|wmv|flv|mkv)(\?.*)?$/i;
    if (videoExtensions.test(url)) {
      return (
        <div className="my-4 w-full max-w-4xl mx-auto">
          <video controls className="w-full rounded">
            <source src={url} />
            Your browser does not support the video tag.
          </video>
        </div>
      );
    }

    // Regular link (external URLs like blossom-servers, etc.)
    return (
      <a
        href={url}
        target={isExternal ? "_blank" : undefined}
        rel={isExternal ? "noopener noreferrer" : undefined}
        {...props}
      >
        {children}
      </a>
    );
  };
}

// Export helper functions for standalone use
export {
  normalizeRepoPath,
  resolveRepoRelativePath,
  getInlineRepoFile,
  guessMimeType,
  getRawUrl,
  getRepoAssetUrl,
  RepoImage,
};

