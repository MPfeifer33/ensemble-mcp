# ensemble-mcp

**Purpose:** the MCP server for Ensemble, HearthByte's design toolkit (hearthbyte.dev/ensemble). Ten
tools an agent can call: palettes, font pairing, type and spacing scales, shadows, dark themes,
grids, gradients, easing, export, and a free accessibility check. A thin stdio server over the
Ensemble API at `api.ensemble.hearthbyte.dev`.

**Status (2026-10-01):** tools rewritten to the API's real contract the same day as the first public commit:
the original definitions sent parameters the API never reads (eight of ten tools ignored their
arguments; one described gradients and called the contrast checker). Three tools renamed for what
they do: `cadence_generate_grid`, `riff_generate_motion`, `pitch_audit_contrast`. Version 1.0.0, not yet on npm. This repo is the
canonical home of the server; it was split out of the private site repo so registries have a
public source to point at.

**Tech stack:** TypeScript, `@modelcontextprotocol/sdk`, Node 18+. No runtime dependencies beyond
the SDK.

**Layout:** `src/tools.ts` (tool definitions and `buildRequest`, the one place a tool call becomes an API
request), `src/index.ts` (API client, resources, server), `test/tools.test.mjs` (request shapes), `server.json` (MCP registry
entry), `smithery.yaml` (Smithery entry), `package.json` (`@hearthbyte/ensemble-mcp`).

**Build / run / test:** `npm ci && npm test` (builds, then 12 request-contract tests); `npm run build`, then `node dist/index.js` (or `npm run dev`).
`ENSEMBLE_API_KEY` unlocks the Pro tools; `a11y_validate` needs no key.

**Open before publishing to registries:** the npm scope `@hearthbyte` must be owned by the
publisher; the registry name in `server.json` / `mcpName` must be a namespace that can be proven
(decided 2026-10-01: `dev.hearthbyte/ensemble`, proven by one DNS TXT record on hearthbyte.dev).
