<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://hearthbyte.dev/images/ensemble-banner-dark.svg">
  <img alt="Ensemble - AI-Ready Design Toolkit" src="https://hearthbyte.dev/images/ensemble-banner.svg" width="100%">
</picture>

<div align="center">

# 🎨 Ensemble MCP

**Give your AI agent design taste.**

[![npm version](https://img.shields.io/npm/v/@hearthbyte/ensemble-mcp?style=flat&colorA=18181B&colorB=A78BFA)](https://www.npmjs.com/package/@hearthbyte/ensemble-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-A78BFA.svg?style=flat&colorA=18181B)](https://opensource.org/licenses/MIT)

[Website](https://hearthbyte.dev/ensemble/) · [Documentation](https://hearthbyte.dev/ensemble/docs/) · [Get API Key](https://hearthbyte.dev/ensemble/pricing/)

</div>

---

## What is this?

Ensemble MCP is a [Model Context Protocol](https://modelcontextprotocol.io/) server that gives AI agents access to professional design tools. Generate color palettes, pair typography, create shadow systems, and export complete design tokens - all through natural conversation.

**10 tools. One API. Infinite possibilities.**

| Tool | What it does |
|------|--------------|
| `harmony_generate_palette` | Generate harmonious color palettes from a single color |
| `duet_pair_fonts` | Pair heading and body fonts that complement each other |
| `tempo_generate_scale` | Create type scales and spacing systems |
| `chord_generate_shadows` | Generate 5-level shadow elevation systems |
| `bridge_generate_theme` | Auto-generate dark mode from light theme colors |
| `cadence_set_grid` | Configure CSS Grid layouts with presets |
| `pitch_create_gradient` | Create linear, radial, and conic gradients |
| `riff_set_easing` | Set cubic-bezier easing curves |
| `compose_export` | Export complete design system (CSS, Tailwind, SCSS, JSON) |
| `a11y_validate` | Check color contrast accessibility (FREE, no key needed) |

---

## Quick Start

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "ensemble": {
      "command": "npx",
      "args": ["-y", "@hearthbyte/ensemble-mcp"],
      "env": {
        "ENSEMBLE_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

### Cursor / Cline

```json
{
  "ensemble": {
    "command": "npx",
    "args": ["-y", "@hearthbyte/ensemble-mcp"],
    "env": {
      "ENSEMBLE_API_KEY": "your-api-key-here"
    }
  }
}
```

### Manual Installation

```bash
npm install -g @hearthbyte/ensemble-mcp
ensemble-mcp
```

---

## Example Prompts

Once installed, try these with your AI:

> "Generate a color palette based on #6366F1 using triadic harmony"

> "Create a type scale with base 16px and golden ratio, with fluid clamp() values"

> "Check if #FFFFFF text on #6366F1 background is accessible"

> "Export my design system as Tailwind config"

> "Set up a dashboard grid layout with 24px gaps"

---

## API Key

Most tools require a Pro subscription ($4.99/month, or $39/year).

**Free tool:** `a11y_validate` - accessibility validation with no API key required.

[Get your API key →](https://hearthbyte.dev/ensemble/pricing/)

---

## Design Philosophy

Ensemble tools are built on these principles:

1. **One color in, design system out** - Start with a single value, get a complete system
2. **Cross-tool sync** - Colors flow to typography, typography informs spacing
3. **Export everywhere** - CSS, Tailwind, SCSS, JSON, Figma Tokens
4. **Accessibility first** - WCAG 2.1 + APCA checking built in

---

## Links

- 🌐 [Ensemble Web Tools](https://hearthbyte.dev/ensemble/) - Use in browser, no install
- 📖 [API Documentation](https://hearthbyte.dev/ensemble/docs/)
- 🤖 [WebMCP Spec](https://hearthbyte.dev/.well-known/webmcp.json)

---

<div align="center">

**Built with 🧡 by [HearthByte](https://hearthbyte.dev)**

*Your work. Your choice. Always.*

</div>
