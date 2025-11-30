# Markdown Media Handling

Utilities and React components for handling images, videos, and other media files in markdown content within repository viewers.

## Features

- ✅ **Relative Image Path Resolution**: Resolves relative image paths to repository assets
- ✅ **API Endpoint Support**: Handles API endpoints that return base64-encoded binary content
- ✅ **Base64 to Data URL Conversion**: Automatically converts base64 content to data URLs for direct image display
- ✅ **Video Embeds**: Supports YouTube, Vimeo, and direct video file embeds
- ✅ **Relative Link Handling**: Handles relative links within repositories
- ✅ **URL Caching**: Caches fetched URLs to prevent redundant network requests
- ✅ **Multi-Source Support**: Works with GitHub, GitLab, Codeberg, and Nostr-native repos

## Installation

Copy the `markdown-media.tsx` file to your project and import the functions you need.

## Usage

### Basic Usage with ReactMarkdown

```tsx
import ReactMarkdown from 'react-markdown';
import { createMarkdownImageRenderer, createMarkdownLinkRenderer } from './markdown-media';

function MarkdownViewer({ content, readmePath, repoData, selectedBranch, paramsEntity, paramsRepo }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw]}
      components={{
        img: createMarkdownImageRenderer(
          readmePath,
          repoData,
          selectedBranch,
          paramsEntity,
          paramsRepo,
          resolveEntityToPubkey // optional utility function
        ),
        a: createMarkdownLinkRenderer(readmePath, getRepoLink), // getRepoLink is optional
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
```

### Standalone Helper Functions

```tsx
import {
  normalizeRepoPath,
  resolveRepoRelativePath,
  getRepoAssetUrl,
  getRawUrl,
} from './markdown-media';

// Normalize a repository path (removes ./ and ../ safely)
const normalized = normalizeRepoPath('./images/../logo.png');
// Result: 'logo.png'

// Resolve a relative path relative to a base path
const resolved = resolveRepoRelativePath('../assets/image.png', 'docs/readme.md');
// Result: 'assets/image.png'

// Get the asset URL for an image
const assetUrl = getRepoAssetUrl(
  'public/og-image.png',
  repoData,
  paramsEntity,
  paramsRepo,
  selectedBranch
);
// Returns: '/api/nostr/repo/file-content?...' or 'https://raw.githubusercontent.com/...'

// Get raw URL for Git providers
const rawUrl = getRawUrl('README.md', repoData, selectedBranch, paramsRepo);
// Returns: 'https://raw.githubusercontent.com/owner/repo/branch/README.md'
```

## API Reference

### `createMarkdownImageRenderer(basePath, repoData?, selectedBranch?, paramsEntity?, paramsRepo?, resolveEntityToPubkey?)`

Creates a custom image renderer for ReactMarkdown that handles:
- Relative image paths (resolved relative to the markdown file)
- External URLs (used directly)
- API endpoints (fetched and converted from base64 to data URLs)
- Embedded files in Nostr events

**Parameters:**
- `basePath` (string | null): The path of the markdown file (for resolving relative paths)
- `repoData` (RepoData?): Repository data containing files, sourceUrl, ownerPubkey, etc.
- `selectedBranch` (string?): Currently selected branch (defaults to 'main')
- `paramsEntity` (string?): Entity identifier (npub or pubkey)
- `paramsRepo` (string?): Repository name
- `resolveEntityToPubkey` (function?): Optional utility to resolve entity to pubkey

**Returns:** ReactMarkdown image component renderer

### `createMarkdownLinkRenderer(basePath?, getRepoLink?)`

Creates a custom link renderer for ReactMarkdown that handles:
- YouTube embeds (converts YouTube URLs to iframe embeds)
- Vimeo embeds (converts Vimeo URLs to iframe embeds)
- Direct video files (mp4, webm, ogg, etc.)
- Relative links within repositories
- External links (opens in new tab with proper security attributes)

**Parameters:**
- `basePath` (string | null?): The path of the markdown file (for resolving relative paths)
- `getRepoLink` (function?): Optional function to generate repository links

**Returns:** ReactMarkdown link component renderer

### `getRepoAssetUrl(path, repoData?, paramsEntity?, paramsRepo?, selectedBranch?, resolveEntityToPubkey?)`

Resolves a repository asset URL for images and other media files.

**Returns:** Asset URL string or null

**Priority:**
1. Embedded files in Nostr events (if binary and has content)
2. Raw Git URLs (for GitHub/GitLab/Codeberg repos)
3. API endpoints (for Nostr-native repos)

### `getRawUrl(path, repoData?, selectedBranch?, paramsRepo?)`

Gets the raw URL for a file path from a Git provider.

**Returns:** Raw URL string or null

**Supported Providers:**
- GitHub: Uses `raw.githubusercontent.com` directly
- GitLab: Uses API proxy (`/api/git/file-content`)
- Codeberg: Uses API proxy (`/api/git/file-content`)
- Other providers: Uses API proxy

### `RepoImage` Component

Stateful React component that handles:
- API endpoint fetching
- Base64 to data URL conversion
- URL caching to prevent redundant requests
- Retry logic when sourceUrl becomes available

**Props:**
- `src` (string): Image source path
- `basePath` (string | null): Base path for resolving relative paths
- `repoData` (RepoData?): Repository data
- `selectedBranch` (string?): Currently selected branch
- `paramsEntity` (string?): Entity identifier
- `paramsRepo` (string?): Repository name
- `resolveEntityToPubkey` (function?): Optional utility function
- All standard `<img>` props (alt, className, etc.)

## How It Works

### Image Loading Flow

1. **External URLs**: If the image src starts with `http://`, `https://`, or `data:`, it's used directly
2. **Relative Paths**: Resolved relative to the markdown file's base path
3. **Embedded Files**: Checked first if available in `repoData.files` array
4. **Git Provider URLs**: Constructed for GitHub/GitLab/Codeberg repos using `getRawUrl()`
5. **API Endpoints**: For Nostr-native repos, uses `/api/nostr/repo/file-content`
6. **Base64 Conversion**: API endpoints that return base64 content are converted to data URLs
7. **Caching**: Fetched URLs are cached in `fetchedUrlsRef` to prevent duplicate requests

### Link Handling Flow

1. **Relative Links**: Resolved relative to repository root, converted to query parameter format
2. **YouTube URLs**: Detected and converted to iframe embeds
3. **Vimeo URLs**: Detected and converted to iframe embeds
4. **Video Files**: Direct video files (mp4, webm, etc.) are wrapped in `<video>` tags
5. **External Links**: Opened in new tab with `rel="noopener noreferrer"`

## Example: Complete Integration

```tsx
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import {
  createMarkdownImageRenderer,
  createMarkdownLinkRenderer,
} from './markdown-media';

function RepositoryReadmeViewer({
  content,
  readmePath,
  repoData,
  selectedBranch,
  paramsEntity,
  paramsRepo,
  getRepoLink,
  resolveEntityToPubkey,
}) {
  return (
    <div className="prose prose-invert max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          img: createMarkdownImageRenderer(
            readmePath,
            repoData,
            selectedBranch,
            paramsEntity,
            paramsRepo,
            resolveEntityToPubkey
          ),
          a: createMarkdownLinkRenderer(readmePath, getRepoLink),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
```

## Performance Optimizations

- **URL Caching**: `fetchedUrlsRef` prevents fetching the same API endpoint multiple times
- **Lazy Loading**: Images are only fetched when needed
- **Error Handling**: Failed images are logged once and retried when sourceUrl becomes available
- **Direct URLs**: External URLs and data URLs bypass the fetching logic entirely

## Supported Media Types

### Images
- PNG, JPG, JPEG, GIF, WebP, SVG, BMP, ICO, AVIF, TIFF

### Videos
- YouTube (via URL detection)
- Vimeo (via URL detection)
- Direct video files: MP4, WebM, OGG, MOV, AVI, WMV, FLV, MKV

### Other
- PDFs (via data URL conversion)
- Fonts: WOFF, WOFF2, TTF, OTF
- Audio: MP3, WAV

## Related Snippets

- [File Fetching](../file-fetching/README.md) - File fetching strategies and utilities
- [URL Normalization](../url-normalization/README.md) - Git URL normalization utilities

## Notes

- The `RepoImage` component uses a `key` prop that includes `repoData?.sourceUrl` to force re-renders when the source URL changes
- API endpoints are expected to return JSON with `{ content: string, isBinary: boolean }` format
- Base64 content is automatically converted to data URLs with appropriate MIME types
- The component handles the case where `sourceUrl` becomes available after initial render (retry logic)

## Content Security Policy (CSP) Configuration

**Important**: For YouTube embeds to work, you must configure your Content Security Policy to allow YouTube domains in the `frame-src` directive.

### Next.js Configuration

In your `next.config.js`:

```javascript
async headers() {
  return [
    {
      source: '/:path*',
      headers: [
        {
          key: 'Content-Security-Policy',
          value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: https: blob:",
            "font-src 'self' data:",
            "connect-src 'self' https://*.github.com wss://* https://*",
            "frame-src 'self' https://www.youtube.com https://youtube.com https://youtu.be", // Required for YouTube embeds
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            "frame-ancestors 'self'",
            "upgrade-insecure-requests"
          ].join('; ')
        }
      ]
    }
  ]
}
```

Without this CSP configuration, YouTube embeds will be blocked by the browser's security policy.

