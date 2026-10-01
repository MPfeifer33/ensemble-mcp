#!/usr/bin/env node
/**
 * ╔═══════════════════════════════════════════════════════════════════╗
 * ║                                                                   ║
 * ║   🎨 Ensemble MCP Server                                          ║
 * ║                                                                   ║
 * ║   AI-ready design toolkit with 10 tools for colors, typography,  ║
 * ║   spacing, shadows, and accessibility validation.                 ║
 * ║                                                                   ║
 * ║   https://hearthbyte.dev/ensemble/                                ║
 * ║                                                                   ║
 * ╚═══════════════════════════════════════════════════════════════════╝
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  Tool,
  Resource,
} from '@modelcontextprotocol/sdk/types.js';

// ═══════════════════════════════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════════════════════════════

const API_BASE = 'https://api.ensemble.hearthbyte.dev';
const A11Y_BASE = 'https://api.ensemble.hearthbyte.dev/v2/a11y';
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1000;
const REQUEST_TIMEOUT_MS = 30000;

// ═══════════════════════════════════════════════════════════════════
// Tool Definitions - The Ensemble Toolkit
// ═══════════════════════════════════════════════════════════════════

const TOOLS: Tool[] = [
  {
    name: 'harmony_generate_palette',
    description: `Generate a harmonious color palette from a single base color.

Returns 5-7 colors that work beautifully together based on color theory.

Harmony types:
• analogous - Colors adjacent on the wheel (calm, cohesive)
• complementary - Opposite colors (high contrast, vibrant)
• triadic - Three evenly spaced colors (balanced, colorful)
• split-complementary - Base + two adjacent to complement (nuanced contrast)
• tetradic - Four colors in rectangle (rich, needs careful balance)
• monochromatic - Shades/tints of one hue (elegant, unified)`,
    inputSchema: {
      type: 'object',
      properties: {
        baseColor: {
          type: 'string',
          description: 'Base color in hex format (e.g., #6366F1, #E11D48)'
        },
        harmony: {
          type: 'string',
          enum: ['analogous', 'complementary', 'triadic', 'split-complementary', 'tetradic', 'monochromatic'],
          description: 'Type of color harmony to generate'
        }
      },
      required: ['baseColor']
    }
  },
  {
    name: 'duet_pair_fonts',
    description: `Pair heading and body fonts that complement each other.

Uses typography principles to suggest pairings that create visual hierarchy
while maintaining readability. Returns Google Fonts @import and CSS.`,
    inputSchema: {
      type: 'object',
      properties: {
        heading: {
          type: 'string',
          description: 'Heading font name from Google Fonts (e.g., "Inter", "Playfair Display")'
        },
        body: {
          type: 'string',
          description: 'Body font name from Google Fonts (e.g., "Source Sans Pro", "Lora")'
        }
      },
      required: ['heading', 'body']
    }
  },
  {
    name: 'tempo_generate_scale',
    description: `Generate a type scale and spacing system.

Creates a mathematical progression of sizes based on a ratio.
Supports fluid typography with CSS clamp() for responsive designs.

Popular ratios:
• 1.125 (Major Second) - Subtle, compact
• 1.250 (Major Third) - Balanced, versatile
• 1.333 (Perfect Fourth) - Classical, readable
• 1.618 (Golden Ratio) - Dramatic, elegant`,
    inputSchema: {
      type: 'object',
      properties: {
        base: {
          type: 'number',
          description: 'Base font size in pixels (typically 16)'
        },
        ratio: {
          type: 'string',
          enum: ['1.067', '1.125', '1.200', '1.250', '1.333', '1.414', '1.500', '1.618'],
          description: 'Scale ratio'
        },
        fluid: {
          type: 'boolean',
          description: 'Generate fluid clamp() values for responsive typography'
        }
      }
    }
  },
  {
    name: 'chord_generate_shadows',
    description: `Generate a 5-level CSS box-shadow elevation system.

Creates consistent shadow tokens from subtle (level 1) to dramatic (level 5).

Styles:
• natural - Soft, realistic shadows
• sharp - Crisp, defined edges
• diffused - Soft, spread out
• layered - Multiple shadow layers for depth`,
    inputSchema: {
      type: 'object',
      properties: {
        color: {
          type: 'string',
          description: 'Shadow color in hex (e.g., #000000)'
        },
        opacity: {
          type: 'number',
          description: 'Base opacity 0-100'
        },
        style: {
          type: 'string',
          enum: ['natural', 'sharp', 'diffused', 'layered'],
          description: 'Shadow style'
        }
      }
    }
  },
  {
    name: 'bridge_generate_theme',
    description: `Generate light and dark theme color tokens.

Input light theme colors, get auto-generated dark mode counterparts
using perceptual color science for optimal contrast and readability.`,
    inputSchema: {
      type: 'object',
      properties: {
        preset: {
          type: 'string',
          enum: ['clean', 'warm', 'forest', 'ocean', 'sunset'],
          description: 'Named color preset'
        },
        bg: { type: 'string', description: 'Background color hex' },
        surface: { type: 'string', description: 'Surface/card color hex' },
        text: { type: 'string', description: 'Primary text color hex' },
        primary: { type: 'string', description: 'Primary accent color hex' }
      }
    }
  },
  {
    name: 'cadence_set_grid',
    description: `Configure a CSS Grid layout system.

Presets:
• 12col - Classic 12-column grid
• sidebar - Main content + sidebar
• holy - Holy grail layout
• dashboard - Admin/app layout
• cards - Responsive card grid
• magazine - Editorial layout`,
    inputSchema: {
      type: 'object',
      properties: {
        preset: {
          type: 'string',
          enum: ['12col', 'sidebar', 'holy', 'dashboard', 'cards', 'magazine']
        },
        cols: { type: 'number', description: 'Number of columns (1-24)' },
        colGap: { type: 'number', description: 'Column gap in pixels' },
        rowGap: { type: 'number', description: 'Row gap in pixels' }
      }
    }
  },
  {
    name: 'pitch_create_gradient',
    description: `Create CSS gradients from color stops.

Supports linear, radial, and conic gradients with customizable
direction and color positions.`,
    inputSchema: {
      type: 'object',
      properties: {
        colors: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of hex colors'
        },
        type: {
          type: 'string',
          enum: ['linear', 'radial', 'conic']
        },
        direction: {
          type: 'string',
          description: 'Gradient direction (e.g., "to right", "45deg", "circle at center")'
        }
      },
      required: ['colors']
    }
  },
  {
    name: 'riff_set_easing',
    description: `Set a CSS cubic-bezier easing curve.

Presets:
• ease - Default browser easing
• ease-in - Slow start
• ease-out - Slow end
• ease-in-out - Slow start and end
• snappy - Quick, responsive
• smooth - Gentle, fluid
• bouncy - Playful overshoot`,
    inputSchema: {
      type: 'object',
      properties: {
        preset: {
          type: 'string',
          enum: ['ease', 'ease-in', 'ease-out', 'ease-in-out', 'snappy', 'smooth', 'bouncy']
        },
        x1: { type: 'number' },
        y1: { type: 'number' },
        x2: { type: 'number' },
        y2: { type: 'number' }
      }
    }
  },
  {
    name: 'compose_export',
    description: `Export complete design system with all tokens.

Formats:
• css - CSS custom properties
• tailwind - Tailwind config
• scss - SCSS variables
• json - Design tokens JSON
• figma-tokens - Figma Tokens plugin format`,
    inputSchema: {
      type: 'object',
      properties: {
        format: {
          type: 'string',
          enum: ['css', 'tailwind', 'scss', 'json', 'figma-tokens'],
          description: 'Export format'
        }
      },
      required: ['format']
    }
  },
  {
    name: 'a11y_validate',
    description: `Validate color contrast for WCAG 2.1 and APCA accessibility.

FREE - No API key required.

Checks if foreground/background color pairs meet accessibility standards.
Returns contrast ratio, pass/fail status, and improvement suggestions.`,
    inputSchema: {
      type: 'object',
      properties: {
        foreground: {
          type: 'string',
          description: 'Text/foreground color in hex'
        },
        background: {
          type: 'string',
          description: 'Background color in hex'
        },
        algorithm: {
          type: 'string',
          enum: ['wcag2', 'apca', 'both'],
          description: 'Contrast algorithm (default: both)'
        },
        fontSize: {
          type: 'number',
          description: 'Font size in pixels (affects large text thresholds)'
        }
      },
      required: ['foreground', 'background']
    }
  }
];

// ═══════════════════════════════════════════════════════════════════
// Utilities
// ═══════════════════════════════════════════════════════════════════

function log(message: string, level: 'info' | 'warn' | 'error' = 'info') {
  const prefix = { info: '🎨', warn: '⚠️', error: '❌' }[level];
  console.error(`${prefix} [ensemble] ${message}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function validateHexColor(color: string): boolean {
  return /^#?([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
}

function normalizeHexColor(color: string): string {
  if (!color.startsWith('#')) {
    color = '#' + color;
  }
  return color.toUpperCase();
}

// ═══════════════════════════════════════════════════════════════════
// API Client with Retry Logic
// ═══════════════════════════════════════════════════════════════════

interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = REQUEST_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

async function callEnsembleAPI(
  endpoint: string,
  params: Record<string, unknown>,
  apiKey?: string
): Promise<unknown> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'ensemble-mcp/1.0.0',
  };
  
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE}${endpoint}`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify(params),
        }
      );

      if (response.ok) {
        return response.json();
      }

      // Handle specific error codes
      if (response.status === 401) {
        throw new Error('Invalid or missing API key. Get one at hearthbyte.dev/ensemble/pricing/');
      }
      if (response.status === 403) {
        throw new Error('API key does not have access to this tool. Upgrade at hearthbyte.dev/ensemble/pricing/');
      }
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After') || '60';
        throw new Error(`Rate limited. Try again in ${retryAfter} seconds.`);
      }
      if (response.status >= 500) {
        // Server error - retry
        lastError = new Error(`Server error (${response.status}). Retrying...`);
        if (attempt < RETRY_ATTEMPTS) {
          log(`Attempt ${attempt} failed, retrying in ${RETRY_DELAY_MS}ms...`, 'warn');
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
          lastError = new Error('Could not connect to Ensemble API. Check your internet connection.');
        } else {
          lastError = error;
        }
      }
      
      if (attempt < RETRY_ATTEMPTS && !lastError?.message.includes('API key')) {
        await sleep(RETRY_DELAY_MS * attempt);
        continue;
      }
      
      throw lastError;
    }
  }

  throw lastError || new Error('Unknown error occurred');
}

async function callA11yAPI(params: Record<string, unknown>): Promise<unknown> {
  // Validate input colors
  if (params.foreground && typeof params.foreground === 'string') {
    if (!validateHexColor(params.foreground)) {
      throw new Error(`Invalid foreground color: "${params.foreground}". Use hex format like #FF5500 or FF5500.`);
    }
    params.foreground = normalizeHexColor(params.foreground);
  }
  if (params.background && typeof params.background === 'string') {
    if (!validateHexColor(params.background)) {
      throw new Error(`Invalid background color: "${params.background}". Use hex format like #FFFFFF or FFFFFF.`);
    }
    params.background = normalizeHexColor(params.background);
  }

  const response = await fetchWithTimeout(
    `${A11Y_BASE}/validate`,
    {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': 'ensemble-mcp/1.0.0',
      },
      body: JSON.stringify(params),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Accessibility API error: ${error}`);
  }

  return response.json();
}

// ═══════════════════════════════════════════════════════════════════
// Resources - Helpful context for agents
// ═══════════════════════════════════════════════════════════════════

const RESOURCES: Resource[] = [
  {
    uri: 'ensemble://guide/getting-started',
    name: 'Getting Started with Ensemble',
    description: 'Quick guide to using Ensemble design tools',
    mimeType: 'text/markdown',
  },
  {
    uri: 'ensemble://guide/color-theory',
    name: 'Color Harmony Guide',
    description: 'Understand color harmonies and when to use each type',
    mimeType: 'text/markdown',
  },
  {
    uri: 'ensemble://guide/type-scales',
    name: 'Type Scale Reference',
    description: 'Common type scale ratios and their visual characteristics',
    mimeType: 'text/markdown',
  },
];

const RESOURCE_CONTENT: Record<string, string> = {
  'ensemble://guide/getting-started': `# Getting Started with Ensemble

## Quick Start
1. Generate a color palette with \`harmony_generate_palette\`
2. Pair fonts with \`duet_pair_fonts\`
3. Create a type scale with \`tempo_generate_scale\`
4. Export everything with \`compose_export\`

## Free Tool
\`a11y_validate\` works without an API key - use it to check color accessibility!

## Tips
- Start with a single brand color and let Ensemble build around it
- Use "triadic" harmony for vibrant, balanced palettes
- Use "analogous" for calm, cohesive designs
- Always validate contrast with a11y_validate before finalizing colors
`,
  
  'ensemble://guide/color-theory': `# Color Harmony Types

## Analogous
Colors next to each other on the wheel. Creates calm, cohesive designs.
Best for: Backgrounds, subtle branding, nature themes.

## Complementary
Opposite colors on the wheel. High contrast, vibrant energy.
Best for: CTAs, highlights, attention-grabbing elements.

## Triadic
Three evenly spaced colors. Balanced but colorful.
Best for: Playful brands, children's products, creative projects.

## Split-Complementary
Base color + two adjacent to its complement. Nuanced contrast.
Best for: Most projects - versatile and visually interesting.

## Tetradic
Four colors forming a rectangle. Rich but needs careful balance.
Best for: Complex designs with many elements.

## Monochromatic
Shades and tints of one hue. Elegant, unified.
Best for: Minimalist designs, professional/corporate.
`,

  'ensemble://guide/type-scales': `# Type Scale Ratios

## 1.067 - Minor Second
Very subtle progression. Good for dense UIs.

## 1.125 - Major Second  
Gentle scaling. Good for body-heavy content.

## 1.200 - Minor Third
Slightly more pronounced. Versatile choice.

## 1.250 - Major Third ⭐ Popular
Well-balanced. Works for most projects.

## 1.333 - Perfect Fourth ⭐ Popular
Classical proportions. Great readability.

## 1.414 - Augmented Fourth
Dramatic but usable. Good for marketing sites.

## 1.500 - Perfect Fifth
Bold progression. Statement typography.

## 1.618 - Golden Ratio
Maximum drama. Use for impactful headlines.
`,
};

// ═══════════════════════════════════════════════════════════════════
// Tool Execution with Input Validation
// ═══════════════════════════════════════════════════════════════════

function validateToolInput(name: string, args: Record<string, unknown>): void {
  switch (name) {
    case 'harmony_generate_palette':
      if (!args.baseColor) {
        throw new Error('baseColor is required. Provide a hex color like "#6366F1".');
      }
      if (typeof args.baseColor === 'string' && !validateHexColor(args.baseColor)) {
        throw new Error(`Invalid baseColor: "${args.baseColor}". Use hex format like #6366F1.`);
      }
      break;
    
    case 'duet_pair_fonts':
      if (!args.heading || !args.body) {
        throw new Error('Both "heading" and "body" font names are required.');
      }
      break;
    
    case 'pitch_create_gradient':
      if (!args.colors || !Array.isArray(args.colors) || args.colors.length < 2) {
        throw new Error('At least 2 colors are required for a gradient.');
      }
      break;
    
    case 'a11y_validate':
      if (!args.foreground || !args.background) {
        throw new Error('Both "foreground" and "background" colors are required.');
      }
      break;
    
    case 'compose_export':
      if (!args.format) {
        throw new Error('Export format is required. Options: css, tailwind, scss, json, figma-tokens');
      }
      break;
  }
}

async function executeTool(
  name: string,
  args: Record<string, unknown>,
  apiKey?: string
): Promise<unknown> {
  // Validate inputs first
  validateToolInput(name, args);
  
  // Normalize color inputs
  if (args.baseColor && typeof args.baseColor === 'string') {
    args.baseColor = normalizeHexColor(args.baseColor);
  }
  if (args.color && typeof args.color === 'string') {
    args.color = normalizeHexColor(args.color);
  }
  
  // Check API key for paid tools
  const freeTools = ['a11y_validate'];
  if (!freeTools.includes(name) && !apiKey) {
    log('No API key provided. Some tools require an Ensemble Pro subscription.', 'warn');
    log('Get your API key at: hearthbyte.dev/ensemble/pricing/', 'info');
  }

  switch (name) {
    case 'harmony_generate_palette':
      return callEnsembleAPI('/v2/tools/harmony', args, apiKey);
    
    case 'duet_pair_fonts':
      return callEnsembleAPI('/v2/tools/duet', args, apiKey);
    
    case 'tempo_generate_scale':
      return callEnsembleAPI('/v2/tools/tempo', args, apiKey);
    
    case 'chord_generate_shadows':
      return callEnsembleAPI('/v2/tools/chord', args, apiKey);
    
    case 'bridge_generate_theme':
      return callEnsembleAPI('/v2/tools/bridge', args, apiKey);
    
    case 'cadence_set_grid':
      return callEnsembleAPI('/v2/tools/cadence', args, apiKey);
    
    case 'pitch_create_gradient':
      return callEnsembleAPI('/v2/tools/pitch', args, apiKey);
    
    case 'riff_set_easing':
      return callEnsembleAPI('/v2/tools/riff', args, apiKey);
    
    case 'compose_export':
      return callEnsembleAPI('/v2/tools/compose', args, apiKey);
    
    case 'a11y_validate':
      // A11y is free, no API key needed
      return callA11yAPI(args);
    
    default:
      throw new Error(`Unknown tool: ${name}. Available tools: ${TOOLS.map(t => t.name).join(', ')}`);
  }
}

// ═══════════════════════════════════════════════════════════════════
// MCP Server
// ═══════════════════════════════════════════════════════════════════

async function main() {
  const apiKey = process.env.ENSEMBLE_API_KEY;

  // Startup banner
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log('Ensemble MCP Server v1.0.0');
  log('https://hearthbyte.dev/ensemble/');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  if (apiKey) {
    log('API key configured ✓');
  } else {
    log('No API key - only free tools (a11y_validate) available', 'warn');
    log('Get Pro: hearthbyte.dev/ensemble/pricing/', 'info');
  }

  const server = new Server(
    {
      name: 'ensemble',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
        resources: {},
      },
    }
  );

  // ─────────────────────────────────────────────────────────────────
  // Tool Handlers
  // ─────────────────────────────────────────────────────────────────

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
      const duration = Date.now() - startTime;
      
      log(`✓ ${name} completed in ${duration}ms`);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      log(`✗ ${name} failed: ${message}`, 'error');
      
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${message}`,
          },
        ],
        isError: true,
      };
    }
  });

  // ─────────────────────────────────────────────────────────────────
  // Resource Handlers
  // ─────────────────────────────────────────────────────────────────

  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return { resources: RESOURCES };
  });

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;
    const content = RESOURCE_CONTENT[uri];
    
    if (!content) {
      throw new Error(`Resource not found: ${uri}`);
    }
    
    return {
      contents: [
        {
          uri,
          mimeType: 'text/markdown',
          text: content,
        },
      ],
    };
  });

  // ─────────────────────────────────────────────────────────────────
  // Start Server
  // ─────────────────────────────────────────────────────────────────

  const transport = new StdioServerTransport();
  
  // Handle graceful shutdown
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
