# API Overview

Contract-first reference for the Test Management Platform. See
[ADR 0002](../adr/0002-api-first-design-testrail-reference.md) and [ADR 0003](../adr/0003-own-client-api-and-agent-access.md) for the decisions and
[openapi.yaml](openapi.yaml) for the façade baseline contract.

## Two surfaces

| Surface | Purpose | Consumers |
|---|---|---|
| PocketBase native collection API (`/api/collections/...`) | Default CRUD for all collections; JS SDK + collection API rules | Next.js app (PocketBase SDK) |
| TestRail-inspired façade (`/api/v1/...`, `pb_hooks`) | Trusted operations: execution transactions, snapshots, batch results, imports, automation, reporting | App services, MCP server, CI scripts, integrations |

**Not TestRail-compatible.** Real TestRail clients (trcli etc.) use `index.php?/api/v2` with Basic auth and will not work. Migrate data with `POST /api/v1/import_testrail/{project_id}` (TestRail XML/CSV case export). Generic JSON import: `POST /api/v1/import_cases/{project_id}` (idempotent by `source_key`).

## Façade conventions

- Versioned URI `/api/v1/`; breaking changes → `/api/v2/`.
- Verb+resource names inspired by TestRail: `get_X`, `get_Xs`, `add_X`, `update_X`, `delete_X`, `close_run`.
- JSON in/out, `snake_case` fields; timestamps are unix seconds (`created_on`).
- Status codes: `200`, `201` create, `400` validation, `401` unauthenticated, `403` forbidden/permission, `404` not found. Errors: `{ "error": "Field :title is a required field." }`.
- List endpoints: `offset`/`limit` (limit ≤ 500) returning
  `{ offset, limit, size, total, items }` (`size` = items in this page, `total` = all matches).
- Field conventions: relations use an `_id` suffix; `estimate`/`elapsed` are integer seconds; `defects` is an array of strings; case description is `content`.
- Limits: ≤ 1,000 results per batch, ≤ 25 MB body. Rate limiting via PocketBase's built-in limiter; `429` with `Retry-After`.
- Results: `add_results/{run_id}` takes `{results:[{test_id,...}]}`; `add_results_for_cases/{run_id}` takes `{results:[{case_id,...}]}`; bodies may include `step_results`.
- Case deletion: `delete_case` hard-deletes only cases without results; otherwise deprecates (history kept).
- Automation: JSON via `post_results_automation`, raw JUnit/Robot files via `import_results_file` (same pipeline). `untested` is not a postable status.
- Agents: MCP server at `/api/mcp` (Next route) / `mcp/server.mjs` (stdio) wraps this façade (ADR 0003).
- Auth: PocketBase JWT bearer for humans; `X-API-Token` service token mapped to an
  `automation_mappings` record for CI (hashed at rest, shown once; identity = its `run_as` user; no shared write-all key).

## Adding an endpoint (process, per ADR 0002)

1. Define it in `openapi.yaml` first — schema, params, status codes, errors.
2. Implement in `pb_hooks/` behind the same contract; keep the OpenAPI + implementation in one change.
3. Add integration tests covering success, validation, permission (all 4 project roles), and idempotency where applicable.

## Why not mirror everything in the façade

Duplicating native CRUD as `/get_X` routes would double the surface with no trust benefit.
The façade exists only for operations that require atomicity, immutability, audit logging,
or automation interop. If an automation client later needs read-only
mirrors (e.g. `get_projects`), add them here with a spec entry — that's the "free to extend"
policy in action.
