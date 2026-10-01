#!/usr/bin/env node
/**
 * Ensemble MCP Server
 *
 * Ten design tools an AI agent can call, served over stdio and backed by the
 * Ensemble API: palettes, font pairing, spacing, shadows, grids, motion, dark
 * mode, contrast audits, exports, and a free accessibility check.
 *
 * https://hearthbyte.dev/ensemble/
 *
 * Tool definitions and the request each one sends live in ./tools.ts.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  Resource,
} from '@modelcontextprotocol/sdk/types.js';

import { TOOLS, buildRequest } from './tools.js';

// ── Configuration ───────────────────────────────────────────────────

const VERSION = '1.0.0';
const API_BASE = 'https://api.ensemble.hearthbyte.dev';
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1000;
const REQUEST_TIMEOUT_MS = 30000;

// ── Utilities ───────────────────────────────────────────────────────

function log(message: string, level: 'info' | 'warn' | 'error' = 'info') {
  const prefix = { info: '🎨', warn: '⚠️', error: '❌' }[level];
  // stderr: stdout belongs to the MCP protocol.
  console.error(`${prefix} [ensemble] ${message}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── API client with retry ───────────────────────────────────────────

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number = REQUEST_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function callEnsembleAPI(endpoint: string, body: Record<string, unknown>, apiKey?: string): Promise<unknown> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': `ensemble-mcp/${VERSION}`,
  };
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
    try {
      const response = await fetchWithTimeout(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      if (response.ok) {
        return response.json();
      }

      if (response.status === 401) {
        throw new Error('Invalid or missing API key. Get one at hearthbyte.dev/ensemble/pricing/');
      }
      if (response.status === 403) {
        throw new Error('Your key does not include this tool or option. See hearthbyte.dev/ensemble/pricing/');
      }
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After') || '60';
        throw new Error(`Rate limited. Try again in ${retryAfter} seconds.`);
      }
      if (response.status >= 500) {
        lastError = new Error(`Server error (${response.status}).`);
        if (attempt < RETRY_ATTEMPTS) {
          log(`Attempt ${attempt} failed, retrying in ${RETRY_DELAY_MS * attempt}ms...`, 'warn');
          await sleep(RETRY_DELAY_MS * attempt);
          continue;
        }
      }

      const errorText = await response.text();
      throw new Error(`API error ${response.status}: ${errorText}`);
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          lastError = new Error('Request timed out. The API may be slow or unavailable.');
        } else if (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED')) {
          lastError = new Error('Could not connect to the Ensemble API. Check your internet connection.');
        } else {
          lastError = error;
        }
      }

      const retryable = lastError !== null && /timed out|Could not connect|Server error/.test(lastError.message);
      if (attempt < RETRY_ATTEMPTS && retryable) {
        await sleep(RETRY_DELAY_MS * attempt);
        continue;
      }
      throw lastError;
    }
  }

  throw lastError || new Error('Unknown error occurred');
}

// ── Resources: context an agent can read ────────────────────────────

const RESOURCES: Resource[] = [
  {
    uri: 'ensemble://guide/getting-started',
    name: 'Getting Started with Ensemble',
    description: 'How the tools fit together and what to call first',
    mimeType: 'text/markdown',
  },
  {
    uri: 'ensemble://guide/color-theory',
    name: 'Color Scheme Guide',
    description: 'The five color schemes and when to use each',
    mimeType: 'text/markdown',
  },
  {
    uri: 'ensemble://guide/preferences',
    name: 'Design Preferences Reference',
    description: 'Every preference the tools accept, with its values',
    mimeType: 'text/markdown',
  },
];

const RESOURCE_CONTENT: Record<string, string> = {
  'ensemble://guide/getting-started': `# Getting Started with Ensemble

Everything is built from one brand color plus a few preferences. Pass the same
color and preferences to each tool and the pieces agree with each other.

## The short path
\`compose_export\` with a \`color\` returns the whole system (colors, type,
spacing, shadows, grid, motion) as CSS and JSON in one call.

## Piece by piece
1. \`harmony_generate_palette\` — the color system (\`color_scheme\`)
2. \`duet_pair_fonts\` — fonts and type scale (\`type_style\`)
3. \`tempo_generate_scale\` — spacing (\`density\`)
4. \`chord_generate_shadows\` — elevation (\`shadow_intensity\`)
5. \`cadence_generate_grid\` — responsive grid (\`density\`)
6. \`riff_generate_motion\` — durations and easings (\`animation_style\`)
7. \`pitch_audit_contrast\` — which palette pairs pass WCAG
8. \`bridge_generate_theme\` — dark mode

## Free tool
\`a11y_validate\` checks one foreground and background pair without an API key.

## Tips
- Start from a single brand color and let Ensemble build around it
- Results are deterministic: the same color and preferences give the same system
- Check contrast before finalizing colors
`,

  'ensemble://guide/color-theory': `# Color Schemes

Set with \`color_scheme\` on \`harmony_generate_palette\` (and pass the same value to the other tools).

## monochromatic
Shades and tints of one hue. Elegant, unified.
Best for: minimalist designs, professional and corporate work.

## analogous (default)
Hues next to each other on the wheel. Calm, cohesive.
Best for: backgrounds, subtle branding, nature themes.

## complementary
The opposite hue. High contrast, vibrant.
Best for: calls to action, highlights, attention.

## triadic
Three evenly spaced hues. Balanced but colorful.
Best for: playful brands, creative projects.

## split-complementary
The two hues beside the complement. Nuanced contrast.
Best for: most projects; versatile and visually interesting.
`,

  'ensemble://guide/preferences': `# Design Preferences

Each tool takes its own preference as a top-level argument, and every builder
also accepts a \`preferences\` object with the rest.

| Preference | Values | Default | Drives |
|---|---|---|---|
| color_scheme | monochromatic, analogous, complementary, triadic, split-complementary | analogous | palette |
| type_style | modern, classical, minimalist, expressive | modern | fonts, type scale |
| density | compact, balanced, airy | balanced | spacing, grid gutters |
| corners | sharp, rounded, pill | rounded | radii in exports |
| shadow_intensity | flat, subtle, pronounced, dramatic | subtle | elevation |
| animation_style | none, minimal, fluid, energetic | minimal | motion |

Export formats for \`compose_export\`: css, json, tailwind, scss.
`,
};

// ── Tool execution ──────────────────────────────────────────────────

async function executeTool(name: string, args: Record<string, unknown>, apiKey?: string): Promise<unknown> {
  // Validation and the exact request shape live in buildRequest.
  const request = buildRequest(name, args);
  if (request.requiresKey && !apiKey) {
    log('No API key set. This tool needs ENSEMBLE_API_KEY; a11y_validate is the free one.', 'warn');
  }
  return callEnsembleAPI(request.endpoint, request.body, request.requiresKey ? apiKey : undefined);
}

// ── MCP server ──────────────────────────────────────────────────────

async function main() {
  const apiKey = process.env.ENSEMBLE_API_KEY;

  log(`Ensemble MCP Server v${VERSION} — https://hearthbyte.dev/ensemble/`);
  if (apiKey) {
    log('API key configured ✓');
  } else {
    log('No API key: only the free tool (a11y_validate) will work', 'warn');
    log('Get a key: hearthbyte.dev/ensemble/pricing/', 'info');
  }

  const server = new Server({ name: 'ensemble', version: VERSION }, { capabilities: { tools: {}, resources: {} } });

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    log(`Listing ${TOOLS.length} tools`);
    return { tools: TOOLS };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    log(`Executing tool: ${name}`);

    try {
      const startTime = Date.now();
      const result = await executeTool(name, args ?? {}, apiKey);
      log(`✓ ${name} completed in ${Date.now() - startTime}ms`);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      log(`✗ ${name} failed: ${message}`, 'error');
      return { content: [{ type: 'text', text: `Error: ${message}` }], isError: true };
    }
  });

  server.setRequestHandler(ListResourcesRequestSchema, async () => ({ resources: RESOURCES }));

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;
    const content = RESOURCE_CONTENT[uri];
    if (!content) {
      throw new Error(`Resource not found: ${uri}`);
    }
    return { contents: [{ uri, mimeType: 'text/markdown', text: content }] };
  });

  const transport = new StdioServerTransport();
  process.on('SIGINT', () => {
    log('Shutting down...');
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    log('Shutting down...');
    process.exit(0);
  });

  await server.connect(transport);
  log('Server ready. Waiting for requests...');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
