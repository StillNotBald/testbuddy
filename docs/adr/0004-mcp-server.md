# ADR 0004: MCP server (M0 demo dataset, bearer tokens, shared core)

- Status: Accepted
- Date: 2026-11-04
- Builds on: [ADR 0003](0003-own-client-api-and-agent-access.md) section 3 (agent access), [ADR 0001](0001-pocketbase-backend-nextjs-frontend.md)
- Resolves: the agent-auth decision (R-135) for M0

## Context

ADR 0003 decided that agents reach TestBuddy through an MCP server, as the caller, under the same rules and audit as people (BR-8). It left authentication and the data source open. In Milestone 0 there is no server database: the demo data lives in the browser (localStorage), which a server process cannot read.

## Decision

1. **One core, two transports.** `src/mcp/` holds a transport-neutral core: JSON-RPC 2.0 dispatch (`initialize`, `ping`, `tools/list`, `tools/call`), the tool registry with JSON schemas, token auth and a rate limit. Streamable HTTP is `POST /api/mcp` (a thin Next route handler; stateless; JSON responses; `GET`/`DELETE` return 405 with a reason because there is no SSE stream or session). The stdio entry `mcp/server.mjs` runs the same core.
2. **No SDK dependency.** The protocol subset is small (four methods), so the JSON-RPC layer is hand-written (about 100 lines) and no package was added. Revisit if we need resumable streams, sampling or elicitation.
3. **M0 data: a server-side in-memory demo dataset.** `src/mcp/data-source.ts` is the single seam. It builds the standard fixtures through the existing mock service layer, one instance per server process, separate from any browser. It is lost on restart. Every tool description and every doc says: "M0 demo data, separate from your browser; M1 uses PocketBase". In M1 only this module is replaced by a PocketBase-backed implementation that calls the facade with the caller's token.
4. **Auth (M0).** `Authorization: Bearer <token>` or `X-API-Token`. A token maps to a fictional demo user (admin, manager, tester, viewer), configured by `MCP_DEMO_TOKENS`. Defaults exist outside production only. Tokens are compared in constant time, never logged and never echoed. Missing or unknown token gives 401; a disabled user or a disallowed `Origin` gives 403. OAuth for the claude.ai connector, and PocketBase tokens / personal access tokens, are M1 items.
5. **Rules and audit.** Each write checks the caller's project role with `lib/permissions.ts` (the UI's matrix) and the service layer enforces it again. Every successful write appends an audit entry `agent.<tool>` with `after: { agent: true, via: "mcp", tool, client }` and the token owner as actor, next to the service layer's own entry.
6. **Safety.** `close_run` is irreversible and requires `confirm: true`. `add_result` rejects `untested` and requires a comment for Failed and Blocked. Tool failures return `isError` results with `{ code, status, message }`, never a stack trace (R-138). Protocol problems return JSON-RPC errors (-32700, -32600, -32601, -32602). A fixed-window limit applies per token (default 120/min, 429 with `Retry-After`). Bodies over 256 KB are refused.
7. **Serialisation.** The mock layer keeps its session in a module global, so tool calls run one at a time through a queue with the session set per call. This is correct for M0 and disappears with PocketBase.

## Consequences

- An agent can list, read, add cases, version cases, create runs, post results and close runs against demo data today, from Claude Code (HTTP or stdio) and Claude Desktop (stdio).
- Agent writes in M0 do not appear in a browser's demo data. This is stated in every tool description.
- The claude.ai connector needs a public HTTPS URL and, ideally, OAuth; bearer tokens suffice for Claude Code and a custom connector that accepts custom headers. Both are tracked in `docs/mcp/README.md`.
- The stdio launcher depends on Node 24 (`--experimental-transform-types`) and a small resolver hook in `mcp/loader.mjs`; no build step or tsx.
- The pattern (JSON-RPC over Streamable HTTP, tool registry, token auth, smoke script) is adapted from an Apache-2.0 reference credited in NOTICE.
