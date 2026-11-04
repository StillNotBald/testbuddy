# ADR 0003: Own-client API, TestRail import as migration path, MCP agent access, UI-first build

- Status: Accepted
- Date: 2026-11-04
- Builds on: [ADR 0001](0001-pocketbase-backend-nextjs-frontend.md), [ADR 0002](0002-api-first-design-testrail-reference.md)
- Revises: ADR 0002 (drops the TestRail wire-compatibility intent)

## Context

ADR 0002 implied that existing TestRail clients and docs would "map 1:1" onto
the `/api/v1` façade. That is not achievable or desirable: real TestRail
clients (trcli etc.) call `index.php?/api/v2/...` with HTTP Basic auth and
TestRail's exact payloads. Matching that would constrain our model (PocketBase
string IDs, snapshots, `step_results`, idempotent automation) for little gain.
We also want AI agents (Claude Code, claude.ai) to operate the tool, and we want
the UX reviewed before backend effort is spent.

## Decision

### 1. Own clients only

TestBuddy is **not** wire-compatible with TestRail clients. The façade keeps the
TestRail-inspired domain model and the `verb_resource` route naming under
`/api/v1` purely because it is familiar to migrating users. Clients are:
the SPA, the MCP server (below), our CI scripts/importers, and any third-party
code written against our OpenAPI spec. Auth is PocketBase JWT bearer or the
`X-API-Token` CI token — never Basic auth.

### 2. TestRail migration via importer

Migration is a data path, not an API path:

- `POST /api/v1/import_testrail/{project_id}` accepts TestRail's **XML case
  export** (and **CSV** export) as multipart upload and creates
  suites/sections/cases/steps. Re-import is idempotent through `source_key`
  (derived from the TestRail case id/section path).
- Results history is out of scope for v1 (cases only).

### 3. Agent access via an MCP server

- **Streamable HTTP (claude.ai custom connector):** a Next route handler at
  `src/app/api/mcp/route.ts` (`/api/mcp`; filesystem routes win over the
  `/api/:path*` PocketBase rewrite). Not hosted in PocketBase — its goja JSVM
  cannot host the MCP SDK.
- **stdio (Claude Code):** optional entry `mcp/server.mjs` sharing the same tool
  definitions.
- Both call the `/api/v1` façade and the PocketBase API with the **caller's
  PocketBase token or a personal access token**, so PocketBase rules and audit
  logging apply to agents exactly as to humans. No privileged back door.
  Detailed auth (token exchange, PAT storage/scopes) is **TBD**.
- The route handler holds only thin agent-access code — no business logic, no
  second data store (ADR 0001).
- Tools are thin wrappers over specced endpoints (list/get/add/update cases,
  runs, results, `import_cases`). Contract rule from ADR 0002 applies: no tool
  without a spec'd endpoint.

### 4. Frontend stack change

The owner replaced Vite/React/TanStack Router/Mantine with Next.js 16 App Router + React 19 + Tailwind v4 + Radix (shadcn-style primitives in-repo); recorded in ADR 0001 §2, which is the source of truth for topology.

### 5. UI-first build order

The app is built first against **typed mock services** (the same TypeScript
interfaces the real PocketBase/façade services will implement), reviewed by the
owner at a gate (Milestone 0), and only then wired to PocketBase (Milestone 1+).
In Milestone 0 the mocks sit on a small local mock database (`MockDb`: browser
storage, versioned key, seeded fixtures, in-memory fallback with a visible warning),
so the prototype behaves like the real app across reloads without any server.
Consequences: service interfaces are derived from `openapi.yaml` and
`database-schema.md` types; mocks must obey the same field names (`*_id`
suffix, seconds as integers).

## Consequences

- Freedom to evolve payloads (`step_results`, idempotent batches, `total` in
  pagination) without TestRail constraints.
- Migrating users need one importer, not a compatibility layer.
- MCP adds a route handler (and an optional stdio entry) to build, test and document; it is optional at runtime.
- UI risk is reduced early; some rework when real data shapes (hook errors,
  permissions) arrive is accepted.
