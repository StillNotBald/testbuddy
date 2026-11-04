# Agent instructions

## Architecture decisions (must follow)

- [ADR 0001: PocketBase + Node.js/Next.js](docs/adr/0001-pocketbase-backend-nextjs-frontend.md)
  — PocketBase is the database and app server; the frontend is built with
  Next.js 16 (App Router; revised 2026-11-04). PocketBase v0.40.6 is pinned. Next route handlers hold only thin agent-access/proxy code. Do not introduce other databases, ORMs, backends, or
  meta-frameworks. New decisions go in `docs/adr/` as the next numbered file.
- [ADR 0002: API-first design, TestRail as domain-model reference](docs/adr/0002-api-first-design-testrail-reference.md)
  — two API surfaces: PocketBase's native collection API is the default for
  CRUD; a TestRail-inspired façade under `/api/v1/` (in `pb_hooks/`) covers
  execution transactions, batch results, imports, and automation. Design the
  contract (OpenAPI spec in `docs/api/openapi.yaml`) before implementing any
  endpoint. New endpoints beyond the TestRail-inspired baseline are allowed if they
  follow the same conventions: verb+resource naming, URI versioning, JSON
  with snake_case fields, explicit status codes, offset/limit pagination.
- [ADR 0003: Own-client API, TestRail import, MCP agent access, UI-first](docs/adr/0003-own-client-api-and-agent-access.md)
  — TestBuddy is not wire-compatible with TestRail clients; TestRail XML/CSV
  import is the migration path; agents use an MCP server (Next route `/api/mcp` + optional stdio `mcp/server.mjs`; calls the
  façade with the caller's token); the app is built against typed mocks first
  (Milestone 0), then wired to PocketBase.

## Project docs (read before coding)

- [docs/database-schema.md](docs/database-schema.md) — PocketBase collections,
  fields, indexes, API rules, snapshot/versioning policy. Schema changes must
  update this doc and `pb_migrations/` together.
- [docs/api/openapi.yaml](docs/api/openapi.yaml) +
  [docs/api/README.md](docs/api/README.md) — façade contract. Spec before code,
  always (ADR 0002).
- [docs/implementation-plan.md](docs/implementation-plan.md) — milestones,
  acceptance demos, deferred decisions register. Work the current milestone;
  the app must be runnable at every milestone end.

## Licence

Apache-2.0 (see `LICENSE`), Copyright 2026 TestBuddy contributors.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
