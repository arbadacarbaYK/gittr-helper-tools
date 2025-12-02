# NIP-C0 Code Snippets

Code snippets for implementing **NIP-C0** (Code Snippets) in a Nostr client, enabling users to share code snippets as standalone discoverable events on the Nostr network.

## What is NIP-C0?

NIP-C0 defines `kind:1337` events for sharing code snippets on Nostr. Unlike code in repositories, snippets are:

- ✅ **Standalone events** - Shareable code that exists independently
- ✅ **Discoverable** - Can be found across the Nostr network by language, description, etc.
- ✅ **Linkable** - Can optionally reference source repositories using NIP-34 format
- ✅ **Social** - Like sharing a function/algorithm on social media, but decentralized

### Use Cases

1. **Share code from a repository:**
   - User selects code lines in file viewer
   - Publishes snippet as standalone Nostr event
   - Snippet is discoverable on Nostr network
   - Optionally links back to source repository

2. **Display snippets in comments:**
   - Snippets appear inline in issue/PR comments
   - Better than pasting raw code in text
   - Makes code discussions more readable

## Files

- **`code-snippet-events.ts`** - Event creation and parsing utilities
- **`code-snippet-renderer.tsx`** - React component for displaying snippets

## Installation

```bash
npm install nostr-tools
# or
yarn add nostr-tools
```

For the renderer component, you'll also need:
```bash
npm install lucide-react
# or
yarn add lucide-react
```

## Usage

### Creating a Code Snippet Event

```typescript
import { createCodeSnippetEvent, CodeSnippetEvent } from './code-snippet-events';

// Define your snippet
const snippet: CodeSnippetEvent = {
  content: `function greet(name: string) {
  return \`Hello, \${name}!\`;
}`,
  language: "typescript",
  extension: "ts",
  name: "greet.ts",
  description: "Simple greeting function",
  runtime: "node v18.15.0",
  license: ["MIT"],
  dependencies: ["typescript"],
  // Optional: Link to source repository using NIP-34 format
  repo: "30617:9a83779e75080556c656d4d418d02a4d7edbe288a2f9e6dd2b48799ec935184c:my-repo",
  repoRelay: "wss://relay.example.com" // Optional relay for repo event
};

// Create the event (with private key for direct signing)
import { getPublicKey } from 'nostr-tools';
const privateKey = "your-private-key";
const pubkey = getPublicKey(privateKey);
const event = createCodeSnippetEvent(snippet, pubkey, privateKey);

// Publish to Nostr
await publish(event, relays);
```

#### With NIP-07 Extension

```typescript
import { createCodeSnippetEvent, CodeSnippetEvent } from './code-snippet-events';

// Define your snippet
const snippet: CodeSnippetEvent = {
  content: `function greet(name: string) {
  return \`Hello, \${name}!\`;
}`,
  language: "typescript",
  extension: "ts",
  name: "greet.ts",
  description: "Simple greeting function"
};

// Get pubkey from NIP-07
const pubkey = await window.nostr.getPublicKey();

// Create unsigned event (no privateKey parameter)
let event = createCodeSnippetEvent(snippet, pubkey);

// Sign with NIP-07
event = await window.nostr.signEvent(event);

// Publish to Nostr
await publish(event, relays);
```

### Parsing a Code Snippet Event

```typescript
import { parseCodeSnippetEvent } from './code-snippet-events';

// Parse an event you received
const parsed = parseCodeSnippetEvent(event);

console.log(parsed.language); // "typescript"
console.log(parsed.content); // The code content
console.log(parsed.licenses); // ["MIT"]
console.log(parsed.dependencies); // ["typescript"]
```

### Rendering a Code Snippet

```tsx
import { CodeSnippetRenderer } from './code-snippet-renderer';

function MyComponent({ event }) {
  return (
    <CodeSnippetRenderer 
      event={event} 
      showAuthor={true} 
    />
  );
}
```

## NIP-C0 Tag Reference

| Tag | Required | Description | Example |
|-----|----------|-------------|---------|
| `l` | No | Programming language (lowercase) | `["l", "javascript"]` |
| `extension` | No | File extension (without dot) | `["extension", "js"]` |
| `name` | No | Filename or snippet name | `["name", "hello-world.js"]` |
| `description` | No | Human-readable description | `["description", "Simple hello world"]` |
| `runtime` | No | Runtime environment | `["runtime", "node v18.15.0"]` |
| `license` | No | License (SPDX identifier, can repeat) | `["license", "MIT"]` |
| `dep` | No | Dependency (can repeat) | `["dep", "react@18.0.0"]` |
| `repo` | No | Repository reference (URL or NIP-34) | `["repo", "30617:pubkey:repo-name", "wss://relay"]` |

### Repository Reference Format

The `repo` tag supports two formats:

1. **NIP-34 format** (recommended for Nostr repos):
   ```
   30617:<pubkey>:<d tag>
   ```
   Example: `30617:9a83779e75080556c656d4d418d02a4d7edbe288a2f9e6dd2b48799ec935184c:my-repo`

2. **URL format** (for external repos):
   ```
   https://github.com/user/repo
   ```

The optional third parameter is a recommended relay for fetching the repository event.

## Example: Sharing Code from a File Viewer

### With Private Key

```typescript
import { createCodeSnippetEvent } from './code-snippet-events';
import { getPublicKey } from 'nostr-tools';
import { getNostrPrivateKey } from './security/encryptedStorage';

async function shareCodeAsSnippet(
  selectedCode: string,
  filePath: string,
  entity: string,
  repoName: string
) {
  // Extract file extension
  const extension = filePath.split('.').pop() || '';
  
  // Map extension to language (simplified)
  const languageMap: Record<string, string> = {
    'js': 'javascript',
    'ts': 'typescript',
    'py': 'python',
    'rs': 'rust',
    'go': 'go',
  };
  const language = languageMap[extension] || extension;
  
  // Create NIP-34 repo reference
  const repoRef = `30617:${entity}:${repoName}`;
  
  // Create snippet
  const snippet = {
    content: selectedCode,
    language,
    extension,
    name: filePath.split('/').pop() || 'snippet',
    description: `Code snippet from ${filePath}`,
    repo: repoRef,
  };
  
  // Get private key and create signed event
  const privateKey = await getNostrPrivateKey();
  const pubkey = getPublicKey(privateKey);
  const event = createCodeSnippetEvent(snippet, pubkey, privateKey);
  
  // Publish
  await publish(event, relays);
}
```

### With NIP-07 Extension

```typescript
import { createCodeSnippetEvent } from './code-snippet-events';

async function shareCodeAsSnippetWithNIP07(
  selectedCode: string,
  filePath: string,
  entity: string,
  repoName: string
) {
  // Check for NIP-07
  if (!window.nostr) {
    throw new Error('NIP-07 extension not available');
  }
  
  // Extract file extension and language
  const extension = filePath.split('.').pop() || '';
  const languageMap: Record<string, string> = {
    'js': 'javascript',
    'ts': 'typescript',
    'py': 'python',
    'rs': 'rust',
    'go': 'go',
  };
  const language = languageMap[extension] || extension;
  
  // Create NIP-34 repo reference
  const repoRef = `30617:${entity}:${repoName}`;
  
  // Create snippet
  const snippet = {
    content: selectedCode,
    language,
    extension,
    name: filePath.split('/').pop() || 'snippet',
    description: `Code snippet from ${filePath}`,
    repo: repoRef,
  };
  
  // Get pubkey from NIP-07
  const pubkey = await window.nostr.getPublicKey();
  
  // Create unsigned event (no privateKey parameter)
  let event = createCodeSnippetEvent(snippet, pubkey);
  
  // Sign with NIP-07
  event = await window.nostr.signEvent(event);
  
  // Publish
  await publish(event, relays);
}
```

## Example: Displaying Snippets in Comments

```tsx
import { CodeSnippetRenderer } from './code-snippet-renderer';
import { useNostrContext } from './NostrContext';

function CommentSection({ commentId }) {
  const { subscribe } = useNostrContext();
  const [snippets, setSnippets] = useState([]);
  
  useEffect(() => {
    // Subscribe to snippets that reference this comment
    const unsub = subscribe(
      [{ kinds: [1337], '#e': [commentId] }],
      (event) => {
        setSnippets(prev => [...prev, event]);
      }
    );
    
    return () => unsub();
  }, [commentId, subscribe]);
  
  return (
    <div>
      {snippets.map(snippet => (
        <CodeSnippetRenderer 
          key={snippet.id} 
          event={snippet} 
        />
      ))}
    </div>
  );
}
```

## Styling

The renderer component uses Tailwind CSS classes. You can customize the styling by modifying the component or wrapping it with your own styles.

Default color scheme:
- Background: `#171B21` (dark gray)
- Code background: `#0a0d11` (darker gray)
- Border: `#383B42` (medium gray)
- Accent: Purple (`#8b5cf6`)

## Related Documentation

- **NIP-C0 Specification**: https://github.com/nostr-protocol/nips/blob/master/C0.md
- **NIP-34**: Repository events (for repo references)
- **gittr Implementation**: See `ui/src/lib/nostr/events.ts` and `ui/src/components/ui/code-snippet-renderer.tsx` in the main gittr repository

## License

MIT, keeping attribution to the gittr.space implementation.

