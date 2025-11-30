/**
 * Simple README Image Handler for ReactMarkdown
 * 
 * This is a simplified, inline approach for handling relative image paths in README files.
 * It transforms relative image paths to absolute URLs using the repository's sourceUrl.
 * 
 * This approach is used in gittr's repository viewer for both:
 * - README section (when viewing repo without file selected)
 * - Markdown file viewer (when viewing ?file=README.md)
 * 
 * Features:
 * - Resolves relative image paths (e.g., "og-image.png") to absolute Git provider URLs
 * - Supports GitHub, GitLab, and Codeberg raw URL formats
 * - Falls back gracefully for unknown git providers
 * - Handles image load errors
 * - Works with YouTube embeds (via separate link handler)
 * 
 * Usage in ReactMarkdown:
 * ```tsx
 * import ReactMarkdown from 'react-markdown';
 * import remarkGfm from 'remark-gfm';
 * import rehypeRaw from 'rehype-raw';
 * 
 * <ReactMarkdown
 *   remarkPlugins={[remarkGfm]}
 *   rehypePlugins={[rehypeRaw]}
 *   components={{
 *     img: ({ node, ...props }) => {
 *       // Transform relative image paths to absolute URLs
 *       let imageSrc = props.src || "";
 *       
 *       // If src is already an absolute URL, use it as-is
 *       if (imageSrc.startsWith("http://") || imageSrc.startsWith("https://") || imageSrc.startsWith("data:")) {
 *         return <img {...props} className="max-w-full h-auto rounded" alt={props.alt || ""} />;
 *       }
 *       
 *       // For relative paths, resolve them using the repository's sourceUrl
 *       if (imageSrc && repoData?.sourceUrl) {
 *         try {
 *           const branch = selectedBranch || repoData?.defaultBranch || "main";
 *           const imagePath = imageSrc.startsWith("/") ? imageSrc.slice(1) : imageSrc;
 *           
 *           // Construct raw URL based on git provider
 *           const githubMatch = repoData.sourceUrl.match(/github\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?$/);
 *           const gitlabMatch = repoData.sourceUrl.match(/gitlab\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?$/);
 *           const codebergMatch = repoData.sourceUrl.match(/codeberg\.org\/([^\/]+)\/([^\/]+?)(?:\.git)?$/);
 *           
 *           if (githubMatch) {
 *             const [, owner, repo] = githubMatch;
 *             imageSrc = `https://raw.githubusercontent.com/${owner}/${repo}/${encodeURIComponent(branch)}/${imagePath}`;
 *           } else if (gitlabMatch) {
 *             // GitLab raw URL format: https://gitlab.com/owner/repo/-/raw/branch/path
 *             const [, owner, repo] = gitlabMatch;
 *             imageSrc = `https://gitlab.com/${owner}/${repo}/-/raw/${encodeURIComponent(branch)}/${imagePath}`;
 *           } else if (codebergMatch) {
 *             // Codeberg raw URL format: https://codeberg.org/owner/repo/raw/branch/path
 *             const [, owner, repo] = codebergMatch;
 *             imageSrc = `https://codeberg.org/${owner}/${repo}/raw/branch/${encodeURIComponent(branch)}/${imagePath}`;
 *           } else {
 *             // For other git providers, try to construct a raw URL pattern
 *             try {
 *               const url = new URL(repoData.sourceUrl.replace(/\.git$/, ""));
 *               const pathParts = url.pathname.split("/").filter(Boolean);
 *               if (pathParts.length >= 2) {
 *                 const owner = pathParts[0];
 *                 const repo = pathParts[1];
 *                 imageSrc = `${url.protocol}//${url.host}/${owner}/${repo}/raw/${encodeURIComponent(branch)}/${imagePath}`;
 *               }
 *             } catch (e) {
 *               console.warn("⚠️ [README] Failed to construct raw URL for image:", imageSrc, e);
 *             }
 *           }
 *         } catch (e) {
 *           console.warn("⚠️ [README] Failed to resolve image URL:", imageSrc, e);
 *         }
 *       }
 *       
 *       return <img {...props} src={imageSrc} className="max-w-full h-auto rounded" alt={props.alt || ""} onError={(e) => {
 *         console.warn("⚠️ [README] Image failed to load:", imageSrc);
 *         (e.target as HTMLImageElement).style.display = 'none';
 *       }} />;
 *     },
 *     a: ({ node, href, children, ...props }: any) => {
 *       // Convert YouTube URLs to embeds
 *       if (href && typeof href === 'string') {
 *         const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
 *         const match = href.match(youtubeRegex);
 *         if (match && match[1]) {
 *           const videoId = match[1];
 *           return (
 *             <div className="my-4">
 *               <iframe
 *                 width="560"
 *                 height="315"
 *                 src={`https://www.youtube.com/embed/${videoId}`}
 *                 title="YouTube video player"
 *                 frameBorder="0"
 *                 allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
 *                 allowFullScreen
 *                 referrerPolicy="no-referrer-when-downgrade"
 *                 className="w-full max-w-full rounded"
 *                 style={{ aspectRatio: '16/9' }}
 *               />
 *             </div>
 *           );
 *         }
 *       }
 *       // Regular link
 *       return <a href={href} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300" {...props}>{children}</a>;
 *     },
 *   }}
 * >
 *   {readmeContent}
 * </ReactMarkdown>
 * ```
 * 
 * Requirements:
 * - `repoData` object with `sourceUrl` property (e.g., "https://gitlab.com/owner/repo")
 * - `selectedBranch` or `repoData.defaultBranch` (defaults to "main")
 * - ReactMarkdown with `remarkGfm` and `rehypeRaw` plugins
 * 
 * Example:
 * - README contains: `![OG Image](og-image.png)`
 * - Repository sourceUrl: `https://gitlab.com/chad.curtis/nostrdamus`
 * - Branch: `main`
 * - Result: Image src becomes `https://gitlab.com/chad.curtis/nostrdamus/-/raw/main/og-image.png`
 * 
 * Extracted from: `gittr/ui/src/app/[entity]/[repo]/page.tsx`
 * 
 * See also: `markdown-media.tsx` for a more complex implementation with API endpoint support
 */

