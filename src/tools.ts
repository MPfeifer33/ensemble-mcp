/**
 * Ensemble MCP tool definitions and the requests they send.
 *
 * The Ensemble API builds every result from one design-system seed. It reads
 * `colors`, `preferences`, `accessibility`, `formats`, and (for Pitch)
 * `audit_all_combinations` — nothing else — and it only honors preferences
 * when a color comes with them. Every tool here is shaped by that contract;
 * `buildRequest` is the single place a tool call becomes an API request.
 */
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

/** The seed color the API falls back to, sent explicitly so preferences are honored. */
export const DEFAULT_SEED_COLOR = '#3B82F6';

/** The values the API accepts for each preference (`ensemble-api` schema, VALID_VALUES). */
export const PREFERENCE_VALUES = {
  color_scheme: ['monochromatic', 'analogous', 'complementary', 'triadic', 'split-complementary'],
  type_style: ['modern', 'classical', 'minimalist', 'expressive'],
  density: ['compact', 'balanced', 'airy'],
  corners: ['sharp', 'rounded', 'pill'],
  shadow_intensity: ['flat', 'subtle', 'pronounced', 'dramatic'],
  animation_style: ['none', 'minimal', 'fluid', 'energetic'],
} as const;

type PreferenceKey = keyof typeof PREFERENCE_VALUES;
const PREFERENCE_KEYS = Object.keys(PREFERENCE_VALUES) as PreferenceKey[];

export const EXPORT_FORMATS = ['css', 'json', 'tailwind', 'scss'] as const;
export const CONTRAST_ALGORITHMS = ['wcag2', 'apca'] as const;

export interface ToolRequest {
  endpoint: string;
  body: Record<string, unknown>;
  /** False only for the public accessibility check. */
  requiresKey: boolean;
}

// ── Schema fragments ────────────────────────────────────────────────

const colorProp = (required: boolean) => ({
  type: 'string',
  description: required
    ? 'Brand color in hex (e.g. #6366F1). The whole system is built from it.'
    : `Brand color in hex. Optional here; defaults to ${DEFAULT_SEED_COLOR}.`,
});

const extraColorsProp = {
  type: 'array',
  items: { type: 'string' },
  description: 'Additional brand colors in hex (up to 5 colors in total, including `color`).',
};

const prefProp = (key: PreferenceKey, description: string) => ({
  type: 'string',
  enum: [...PREFERENCE_VALUES[key]],
  description,
});

const preferencesProp = {
  type: 'object',
  description:
    'Other design preferences, so tools called separately stay consistent with each other. Pass the same values to every tool.',
  properties: {
    color_scheme: prefProp('color_scheme', 'How the palette is derived (default analogous)'),
    type_style: prefProp('type_style', 'Typography character (default modern)'),
    density: prefProp('density', 'Spacing density (default balanced)'),
    corners: prefProp('corners', 'Corner radius character (default rounded)'),
    shadow_intensity: prefProp('shadow_intensity', 'Shadow strength (default subtle)'),
    animation_style: prefProp('animation_style', 'Motion character (default minimal)'),
  },
};

// ── Tools ───────────────────────────────────────────────────────────

interface ToolSpec {
  /** The API route segment under /v2/tools/. */
  api: string;
  /** Whether a color must be supplied (otherwise the default seed is sent). */
  colorRequired: boolean;
  /** Preference keys offered as top-level arguments on this tool. */
  knobs: PreferenceKey[];
}

const SPECS: Record<string, ToolSpec> = {
  harmony_generate_palette: { api: 'harmony', colorRequired: true, knobs: ['color_scheme'] },
  duet_pair_fonts: { api: 'duet', colorRequired: false, knobs: ['type_style'] },
  tempo_generate_scale: { api: 'tempo', colorRequired: false, knobs: ['density', 'type_style'] },
  chord_generate_shadows: { api: 'chord', colorRequired: true, knobs: ['shadow_intensity', 'color_scheme'] },
  cadence_generate_grid: { api: 'cadence', colorRequired: false, knobs: ['density'] },
  riff_generate_motion: { api: 'riff', colorRequired: false, knobs: ['animation_style'] },
  bridge_generate_theme: { api: 'bridge', colorRequired: true, knobs: ['color_scheme'] },
  pitch_audit_contrast: { api: 'pitch', colorRequired: true, knobs: ['color_scheme'] },
  compose_export: { api: 'compose', colorRequired: true, knobs: [...PREFERENCE_KEYS] },
};

function builderSchema(name: string, knobDescriptions: Partial<Record<PreferenceKey, string>>, extra: Record<string, object> = {}) {
  const spec = SPECS[name];
  const properties: Record<string, object> = { color: colorProp(spec.colorRequired) };
  for (const key of spec.knobs) {
    properties[key] = prefProp(key, knobDescriptions[key] ?? (preferencesProp.properties[key].description as string));
  }
  Object.assign(properties, extra);
  properties.colors = extraColorsProp;
  properties.preferences = preferencesProp;
  return { type: 'object' as const, properties, required: spec.colorRequired ? ['color'] : [] };
}

export const TOOLS: Tool[] = [
  {
    name: 'harmony_generate_palette',
    description: `Generate a working color system from one brand color: primary, secondary and accent ramps, neutrals, and semantic colors (success, warning, error, info).

color_scheme decides how the secondary and accent hues are derived:
• monochromatic — one hue, many shades (elegant, unified)
• analogous — neighbors on the wheel (calm, cohesive; the default)
• complementary — the opposite hue (high contrast)
• triadic — three evenly spaced hues (balanced, colorful)
• split-complementary — the two hues beside the complement (nuanced contrast)`,
    inputSchema: builderSchema('harmony_generate_palette', { color_scheme: 'How the palette is derived from the brand color (default analogous)' }),
  },
  {
    name: 'duet_pair_fonts',
    description: `Pick a heading, body and monospace font pairing with a type scale, chosen for a typographic character.

type_style: modern (clean sans), classical (serif-led), minimalist (restrained), expressive (display-led). Returns font families, weights, fallbacks and the size scale.`,
    inputSchema: builderSchema('duet_pair_fonts', { type_style: 'The typographic character to pair for (default modern)' }),
  },
  {
    name: 'tempo_generate_scale',
    description: `Generate a spacing system tuned to the type: a base unit, a spacing scale, semantic spacing (padding, gaps, sections) and layout measures.

density: compact (dense UIs), balanced (the default), airy (generous whitespace).`,
    inputSchema: builderSchema('tempo_generate_scale', {
      density: 'How tight or generous the spacing is (default balanced)',
      type_style: 'The typography the spacing is tuned to (default modern)',
    }),
  },
  {
    name: 'chord_generate_shadows',
    description: `Generate a shadow and elevation system tinted by the palette: elevation levels, a focus ring and a glow.

shadow_intensity: flat (borders, no depth), subtle (the default), pronounced, dramatic.`,
    inputSchema: builderSchema('chord_generate_shadows', {
      shadow_intensity: 'How strong the elevation shadows are (default subtle)',
      color_scheme: 'The palette the shadows are tinted from (default analogous)',
    }),
  },
  {
    name: 'cadence_generate_grid',
    description: `Generate a responsive grid: breakpoints, column counts, gutters and max widths, sized from the spacing system.

density: compact, balanced (the default), airy.`,
    inputSchema: builderSchema('cadence_generate_grid', { density: 'How tight or generous the gutters are (default balanced)' }),
  },
  {
    name: 'riff_generate_motion',
    description: `Generate a motion system: durations, easing curves (cubic-bezier) and ready-made transition presets.

animation_style: none (reduced motion), minimal (the default), fluid (smooth, longer), energetic (snappy, springy).`,
    inputSchema: builderSchema('riff_generate_motion', { animation_style: 'The character of the motion (default minimal)' }),
  },
  {
    name: 'bridge_generate_theme',
    description: `Generate a complete dark mode from the light system built on a brand color: dark surfaces and text, adjusted palette, shadows and spacing, with contrast checked.`,
    inputSchema: builderSchema('bridge_generate_theme', { color_scheme: 'The palette the dark theme is derived from (default analogous)' }),
  },
  {
    name: 'pitch_audit_contrast',
    description: `Audit the contrast of the palette built from a brand color: which text and background pairs pass WCAG, which fail, and what to change. Returns a contrast matrix, the failures and recommendations.

To check one specific foreground and background pair, use a11y_validate (free, no key). audit_all_combinations checks every pair in the palette, not just the meaningful ones.`,
    inputSchema: builderSchema(
      'pitch_audit_contrast',
      { color_scheme: 'The palette to audit (default analogous)' },
      {
        contrast_algorithm: { type: 'string', enum: [...CONTRAST_ALGORITHMS], description: 'wcag2 (the default) or apca' },
        audit_all_combinations: { type: 'boolean', description: 'Check every pair in the palette, not just the meaningful ones' },
      },
    ),
  },
  {
    name: 'compose_export',
    description: `Build the whole design system from one brand color and export it: colors, typography, spacing, shadows, grid, motion and accessibility notes, as ready-to-use files.

formats: css (custom properties), json, tailwind (config) and scss. Pass the same preferences you used with the other tools so the export matches them.`,
    inputSchema: builderSchema(
      'compose_export',
      {},
      {
        formats: {
          type: 'array',
          items: { type: 'string', enum: [...EXPORT_FORMATS] },
          description: 'Export formats (default ["css", "json"])',
        },
      },
    ),
  },
  {
    name: 'a11y_validate',
    description: `Check one foreground and background color pair for accessibility (WCAG 2.1 and APCA).

FREE - No API key required.

Returns the contrast ratio, pass or fail for normal and large text, and suggested fixes.`,
    inputSchema: {
      type: 'object',
      properties: {
        foreground: { type: 'string', description: 'Text color in hex' },
        background: { type: 'string', description: 'Background color in hex' },
        algorithm: { type: 'string', enum: ['wcag2', 'apca', 'both'], description: 'Contrast algorithm (default: both)' },
        fontSize: { type: 'number', description: 'Font size in pixels (affects the large-text thresholds)' },
      },
      required: ['foreground', 'background'],
    },
  },
];

// ── Requests ────────────────────────────────────────────────────────

export function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && /^#?([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(value.trim());
}

export function normalizeHexColor(color: string): string {
  const c = color.trim();
  return (c.startsWith('#') ? c : `#${c}`).toUpperCase();
}

function hex(value: unknown, field: string): string {
  if (!isHexColor(value)) {
    throw new Error(`${field} is not a hex color: ${JSON.stringify(value)}. Use a value like #6366F1.`);
  }
  return normalizeHexColor(value);
}

function preference(key: string, value: unknown): [PreferenceKey, string] {
  if (!PREFERENCE_KEYS.includes(key as PreferenceKey)) {
    throw new Error(`unknown preference "${key}". Known: ${PREFERENCE_KEYS.join(', ')}.`);
  }
  const valid = PREFERENCE_VALUES[key as PreferenceKey] as readonly string[];
  if (typeof value !== 'string' || !valid.includes(value)) {
    throw new Error(`${key} must be one of: ${valid.join(', ')}. Got ${JSON.stringify(value)}.`);
  }
  return [key as PreferenceKey, value];
}

/**
 * Turn a tool call into the API request it stands for. Throws, naming the
 * field and the valid values, on anything the API would ignore or reject.
 */
export function buildRequest(name: string, args: Record<string, unknown> = {}): ToolRequest {
  if (name === 'a11y_validate') {
    if (args.foreground === undefined || args.background === undefined) {
      throw new Error('Both "foreground" and "background" colors are required.');
    }
    const body: Record<string, unknown> = {
      foreground: hex(args.foreground, 'foreground'),
      background: hex(args.background, 'background'),
    };
    if (args.algorithm !== undefined) body.algorithm = args.algorithm;
    if (args.fontSize !== undefined) body.fontSize = args.fontSize;
    return { endpoint: '/v2/a11y/validate', body, requiresKey: false };
  }

  const spec = SPECS[name];
  if (!spec) {
    throw new Error(`Unknown tool: ${name}. Available tools: ${TOOLS.map((t) => t.name).join(', ')}`);
  }

  // Colors. A color always goes out: without one the API ignores the request's preferences.
  const colors: string[] = [];
  if (args.color !== undefined) {
    colors.push(hex(args.color, 'color'));
  } else if (spec.colorRequired) {
    throw new Error('color is required. Provide a hex color like "#6366F1".');
  } else {
    colors.push(DEFAULT_SEED_COLOR);
  }
  if (args.colors !== undefined) {
    if (!Array.isArray(args.colors)) throw new Error('colors must be an array of hex colors.');
    args.colors.forEach((c, i) => colors.push(hex(c, `colors[${i}]`)));
  }
  if (colors.length > 5) throw new Error(`The API takes at most 5 colors; got ${colors.length}.`);

  // Preferences: the shared object first, then this tool's own knobs on top.
  const preferences: Record<string, string> = {};
  if (args.preferences !== undefined) {
    if (typeof args.preferences !== 'object' || args.preferences === null || Array.isArray(args.preferences)) {
      throw new Error('preferences must be an object.');
    }
    for (const [k, v] of Object.entries(args.preferences as Record<string, unknown>)) {
      const [key, value] = preference(k, v);
      preferences[key] = value;
    }
  }
  for (const key of spec.knobs) {
    if (args[key] !== undefined) {
      const [k, value] = preference(key, args[key]);
      preferences[k] = value;
    }
  }

  const body: Record<string, unknown> = { colors };
  if (Object.keys(preferences).length > 0) body.preferences = preferences;

  if (name === 'pitch_audit_contrast') {
    if (args.contrast_algorithm !== undefined) {
      if (!(CONTRAST_ALGORITHMS as readonly unknown[]).includes(args.contrast_algorithm)) {
        throw new Error(`contrast_algorithm must be one of: ${CONTRAST_ALGORITHMS.join(', ')}. Got ${JSON.stringify(args.contrast_algorithm)}.`);
      }
      body.accessibility = { contrast_algorithm: args.contrast_algorithm };
    }
    if (args.audit_all_combinations === true) body.audit_all_combinations = true;
  }

  if (name === 'compose_export') {
    const formats = args.formats === undefined ? ['css', 'json'] : args.formats;
    if (!Array.isArray(formats) || formats.length === 0) throw new Error('formats must be a non-empty array.');
    for (const f of formats) {
      if (!(EXPORT_FORMATS as readonly unknown[]).includes(f)) {
        throw new Error(`formats must be chosen from: ${EXPORT_FORMATS.join(', ')}. Got ${JSON.stringify(f)}.`);
      }
    }
    body.formats = formats;
  }

  return { endpoint: `/v2/tools/${spec.api}`, body, requiresKey: true };
}
