# ensemble-mcp

**Purpose:** the MCP server for Ensemble, HearthByte's design toolkit (hearthbyte.dev/ensemble). Ten
tools an agent can call: palettes, font pairing, type and spacing scales, shadows, dark themes,
grids, gradients, easing, export, and a free accessibility check. A thin stdio server over the
Ensemble API at `api.ensemble.hearthbyte.dev`.

**Status (2026-10-01):** first public commit. Version 1.0.0, not yet on npm. This repo is the
canonical home of the server; it was split out of the private site repo so registries have a
public source to point at.

**Tech stack:** TypeScript, `@modelcontextprotocol/sdk`, Node 18+. No runtime dependencies beyond
the SDK.

**Layout:** `src/index.ts` (tool definitions, API client, server), `server.json` (MCP registry
entry), `smithery.yaml` (Smithery entry), `package.json` (`@hearthbyte/ensemble-mcp`).

**Build / run:** `npm ci && npm run build`, then `node dist/index.js` (or `npm run dev`).
`ENSEMBLE_API_KEY` unlocks the Pro tools; `a11y_validate` needs no key.

**Open before publishing to registries:** the npm scope `@hearthbyte` must be owned by the
publisher; the registry name in `server.json` / `mcpName` must be a namespace that can be proven
(`dev.hearthbyte/ensemble` by DNS, or `io.github.mpfeifer33/ensemble` by GitHub login).
