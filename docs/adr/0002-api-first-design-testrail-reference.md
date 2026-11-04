# ADR 0002: API-first design, TestRail as domain-model reference

- Status: Accepted (revised 2026-11-04 by ADR 0003)
- Date: 2026-11-04
- Builds on: [ADR 0001](0001-pocketbase-backend-nextjs-frontend.md)
- Revision: PocketBase's native collection API is the default data API; the
  TestRail API reference is a **domain-model and naming reference** for the
  custom `/api/v1` façade. Per [ADR 0003](0003-own-client-api-and-agent-access.md),
  TestBuddy is NOT wire-compatible with TestRail clients.

## Context

Coding agents work most reliably against an explicit contract. Designing the
API first (before UI or server-side code) lets frontend and backend work
proceed in parallel and keeps vibecoding sessions from drifting into ad-hoc,
undocumented endpoints.

The platform is TestRail-inspired. Reusing TestRail's domain vocabulary and
verb+resource route naming makes the API familiar to migrating users. It does
not make existing TestRail clients work (they use `index.php?/api/v2` + Basic
auth); our clients are the SPA, the MCP server, CI scripts and importers.

## Decision

### Two API surfaces

1. **PocketBase native collection API** — the default application API. All
   normal CRUD (cases, sections, suites, projects, plans, runs, results,
   attachments) is served by PocketBase collections, consumed by the SPA via
   the official JS SDK, protected by collection API rules. Do not duplicate
   this behind custom routes.
2. **TestRail-inspired façade under `/api/v1/`** — implemented in
   `pb_hooks/*.pb.js`, used only where the project spec requires trusted
   server-side operations: execution transactions, immutable snapshots, batch
   result submission, imports (TestRail XML/CSV, generic JSON cases, JUnit XML, Robot Framework),
   automation result posting, reporting, and audit-logged mutations.

### Reference

The domain-model and naming reference is the TestRail API reference:
<https://support.testrail.com/hc/en-us/sections/7077185274644-API-reference>

Façade endpoints reuse TestRail method names as path segments for familiarity
(payloads and auth differ; no client compatibility is claimed), e.g.:

| TestRail-inspired method   | Façade route                                | Backing collections           |
| -------------------------- | ------------------------------------------- | ----------------------------- |
| `get_case` / `get_cases`   | `GET /api/v1/get_case/{id}`, `GET /api/v1/get_cases/{project_id}` | `test_cases` |
| `add_case` / `update_case` | `POST /api/v1/add_case/{section_id}`, `POST /api/v1/update_case/{id}` | `test_cases`, `test_case_versions` |
| `get_tests`                | `GET /api/v1/get_tests/{run_id}`            | `test_run_cases`              |
| `add_run` / `close_run`    | `POST /api/v1/add_run/{project_id}`, `POST /api/v1/close_run/{id}` | `test_runs`, `test_run_cases` |
| `add_result` / `add_results` | `POST /api/v1/add_result/{test_id}`, `POST /api/v1/add_results/{run_id}` (body `{results:[{test_id,...}]}`); `add_results_for_cases/{run_id}` (body `{results:[{case_id,...}]}`) | `test_results`, `test_step_results` |
| `add_attachment_to_result` | `POST /api/v1/add_attachment_to_result/{result_id}` | `test_attachments` |

**Adopted sections** (mapped to our domain model): Cases, Sections,
Suites, Runs, Plans, Results, Tests, Projects, Users, Attachments, Milestones,
Statuses, Priorities, Case Types, Case Fields, Result Fields, Reports.

**Deferred sections** (out of initial scope; may be adopted later under the
same API-first rules): BDDs, Datasets, Dynamic Filter Fields, Groups, Labels,
Shared Steps, Templates, Configurations, Variables, Cross-Project Reports,
Roles (covered by our own project-role model + PocketBase rules).

Note: adopting the Milestones section implies adding a `milestones`
collection to the domain model (previously flagged as a schema gap).

### Extension policy

We are free to add any new endpoint beyond the TestRail-inspired set, provided it
complies with the API-first principles below. New capabilities (e.g. AI
features, coverage analysis, webhooks) get façade routes designed in the spec
first, never prototyped directly in hooks.

### API-first process rules for agents

1. **Contract before code.** Write or update the OpenAPI 3 spec in
   `docs/api/openapi.yaml` (plus overview in `docs/api/README.md`) *before*
   implementing an endpoint in `pb_hooks/` or calling it from the frontend.
   An endpoint without its spec change is incomplete.
2. **Never block on the server.** When the spec exists but the endpoint does
   not, frontend/automation work proceeds against the documented contract
   (mock/stub); do not invent a different shape on the fly.
3. **Spec is the source of truth.** If implementation and spec disagree, fix
   one of them in the same change — no silent divergence.

### Style rules (inspired by the TestRail reference)

- **Verb + resource naming.** `get_X`, `get_Xs`, `add_X`, `update_X`,
  `delete_X`, plus action verbs where TestRail defines them (`close_run`,
  `add_result_for_case`, `add_results_for_cases`).
- **URI versioning.** Façade lives under `/api/v1/`; never break a published
  version in place — bump to `/api/v2/` instead.
- **JSON everywhere.** Requests and responses are JSON; field names are
  `snake_case` (TestRail style: `created_on`, `is_system`, `custom_status`).
- **Explicit HTTP status codes.** `200` success, `400` validation/input error,
  `401` unauthenticated, `403` forbidden, `404` not found. Errors return
  `{"error": "Field :title is a required field."}`.
- **Pagination for collections.** List endpoints accept `offset` and `limit`
  and return `{ "offset": ..., "limit": ..., "size": ..., "items": [...] }`.
  (The SPA may keep using PocketBase's native `page/perPage` on native routes;
  façade routes use the envelope above.)
- **Filters as query parameters.** e.g.
  `GET /api/v1/get_cases/{project_id}?suite_id=1&created_after=1698796800`.
- **Stable identifiers.** Resources are addressed by PocketBase record IDs;
  human-readable case references are additional fields, never URL keys.

## Consequences

- Migrating users recognise the vocabulary; migration itself is handled by the
  TestRail importer (ADR 0003), not by wire compatibility.
- Clear split: SPA uses the native API for simple CRUD; anything requiring
  trust, transactions, or imports/automation goes through the façade.
- Cost: an extra documentation step per feature and a thin `pb_hooks/` façade
  layer; two pagination/id conventions coexist (native vs. façade), which the
  typed frontend API services must encapsulate.
