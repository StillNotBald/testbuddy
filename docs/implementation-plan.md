# Implementation Plan

Derived from the Test Management Platform spec, [ADR 0001](adr/0001-pocketbase-backend-nextjs-frontend.md),
[ADR 0002](adr/0002-api-first-design-testrail-reference.md),
[ADR 0003](adr/0003-own-client-api-and-agent-access.md),
[database-schema.md](database-schema.md), and [docs/api/openapi.yaml](api/openapi.yaml).

Build order is **UI first** (ADR 0003): Milestone 0 on mocks, owner gate, then backend.

Rules of engagement for coding agents:

1. Read this plan + the schema + the OpenAPI spec before touching a feature area.
2. A feature is done only when: migrations exist, hooks exist, SPA wiring exists,
   integration tests pass, and the demo workflow for that milestone runs green.
3. The application must be runnable at the end of every milestone.
4. New endpoints/fields: update `openapi.yaml` / `database-schema.md` in the same change.

## Milestone 0 — UI/UX prototype (UI-first, ADR 0003)

Scope: the Next.js app built against **typed mock services** backed by a **local mock
database** (browser storage, seeded from deterministic fixtures, persists edits, "Reset demo
data" re-seeds). No PocketBase yet: it is wired in Milestone 1 behind the same interfaces.

Deliverables:
- Next.js 16 App Router + React 19 + TypeScript + Tailwind v4 + Radix; shadcn-style
  primitives re-created in-repo (house design-system look); TanStack Query +
  @tanstack/react-table.
- App shell (nav, project switcher, auth screens) and all main screens on mock data:
  projects, suite/section tree, case list + editor + version history, plans/runs,
  test execution view with step results, run dashboard, milestones, automation
  settings, audit log.
- Service interfaces in TypeScript derived from `openapi.yaml` + `database-schema.md`
  (same field names: `_id` suffix, integer seconds, `defects` string array); mocks
  and later real services implement the same interfaces.

**Owner review gate:** the owner reviews and approves (or amends) the UI before any
backend work starts. No Milestone 1 work begins until the gate is passed.

Acceptance: every main screen is navigable on mock data; `npm run build` and typecheck pass.

## Milestone 1 — Working Foundation

Scope: infra + identity/projects + governance foundations.

Deliverables:
- PocketBase pinned to exactly **v0.40.6**. Dev: `npm run pb:start` runs the pinned
  binary (downloaded and checksum-verified into ignored `.pb/`) on :8090 alongside
  `next dev` on :3000. Production only: Docker Compose with two services, Next
  (`output: 'standalone'`) and PocketBase built from a small Dockerfile that downloads
  the pinned binary plus checksum (there is no official image). `pb_data` in a named
  volume; never committed.
- Swap the M0 mock services for real PocketBase/façade services (the `pocketbase` JS SDK,
  client-side); the approved M0 UI is unchanged.
- Auth: sign in/sign out, session persistence, OAuth2 hooks left available but off.
- Migrations creating ALL collections from `database-schema.md`, including the
  later-milestone `requirements`, `requirement_coverage` (M6) and `defect_refs` (M5)
  (empty schemas cost nothing and keep the contract frozen).
- Seed migration: statuses (Untested/Passed/Blocked/Retest/Failed; Untested is the default for run tests and not postable), priorities P1–P4, case types,
  demo superuser bootstrap documented in README (env-driven, no committed password).
- Endpoints/hooks: `add_project` transaction (project + owner admin member),
  `update_project` (announcement/archive), `delete_project` (cascade + audit),
  `/health`, membership mutation hooks with audit_logs; `automation_mappings` token
  hook (hash, prefix, shown once).
- Authorization: `MEMBER/ADMIN/MANAGER/TESTER`/`NO_CLIENT_WRITE` rules per schema
  (PocketBase v0.23+ syntax with `@collection.project_members:m` alias; the rule tests
  verify the macro semantics, including a cross-project escalation case);
  integration tests assert all 4 project roles against representative routes:
  project CRUD, membership, case write, result write, audit read, attachment read.
- `next.config` rewrites `/api/:path*` and `/_/:path*` to PocketBase :8090 (no Vite proxy;
  `app/api/mcp/route.ts` wins over the rewrite).
- LICENSE (Apache-2.0) at repo root.
- README: setup, env, commands (`npm run dev`, `npm run pb:start`, `npm test`).

Acceptance (demo workflow, from spec): start app → sign in → create workspace →
create project → see it in SPA → verify a non-member gets 403 on project records →
confirm persistence + audit row.

## Milestone 2 — Test Case Repository

Deliverables:
- Suite/section tree UI (drag-to-reorder within section via `position`).
- Case list: filter by suite/section/priority/type/automation_status/tags + title search;
  pagination (native `page/perPage`, ceiling 200).
- Case editor: steps (position/description/expected), auto save + change note;
  version history panel (pre/post snapshots from `test_case_versions`).
- Façade hooks: `add_case`, `update_case` (snapshot + version bump + audit, atomic),
  `get_case_history`; `ref` assignment per schema.
- Tags management UI + junction collection wiring; deprecated-case state in UI
  (excluded from new runs).
- Deletion rules: `delete_case` hook — no results: hard delete (cascade, removed from
  open runs); has results: deprecated + removed from open runs, results and
  `case_snapshot` kept. Suite delete is ADMIN-only and audit-logged. Tests assert both
  branches and that history survives.
- `POST /api/v1/import_cases/{project_id}`: generic JSON import (suites → sections →
  cases → steps), idempotent by `source_key`; journey-mapping tool pushes its decided map through it.
  `test_cases.source_key` partial unique index.

Acceptance: create suite → sections → cases with steps → edit + view history →
search/filter → delete a case → removed from open runs, and a case with results is
deprecated instead of deleted (history intact in a completed run) → re-import the
same `import_cases` payload twice → no duplicates.

## Milestone 3 — Test Execution

Deliverables:
- Plan builder (milestone, builds, entries → runs per suite).
- Run creation: `include_all` / explicit case selection; `add_run` snapshots cases.
- Test view: case snapshot + step list + result form (status, comment, elapsed, defects);
  per-step results (`step_results`); `add_results/{run_id}` and `add_results_for_cases/{run_id}` batches (≤ 1,000 results, 25 MB).
- Run progress dashboard + case activity feed (realtime subscribe on run).
- Defect references as an array-of-strings field; test history view (`get_results/{test_id}`).
- `close_run` irreversibility + snapshot freezing; result update rules pre/post close.
- Attachment upload on result (type/size constraints per schema).

Acceptance: full run-through — plan → run → execute with step results → history after
retest → evidence attachment → close → verify writes rejected post-close.

## Milestone 3b — MCP server (agent access, ADR 0003)

Deliverables:
- Next route handler `src/app/api/mcp/route.ts` (Streamable HTTP, for the claude.ai
  custom connector) and optional stdio entry `mcp/server.mjs` (Claude Code), sharing
  tool definitions.
- Tools: thin wrappers over specced façade/PocketBase endpoints (projects, cases,
  `import_cases`, runs, tests, results). Calls use the caller's PocketBase token or a
  personal access token; detailed auth design TBD (decide before building).
- Route handler holds no business logic and no data store.

Acceptance: from Claude Code (stdio) and a claude.ai connector (HTTP), list cases,
create a run and record a result; PocketBase rules and audit log apply as for a human.

## Milestone 4 — Automation APIs

Deliverables:
- `automation_mappings` + `automation_executions` admin UI (field maps, external refs).
- CI auth: service tokens via `X-API-Token` (schema gap #12 closed) — token per mapping,
  `token_hash` + `token_prefix` + `run_as` on `automation_mappings`, shown once.
- **TestRail import:** `POST /api/v1/import_testrail/{project_id}` — XML case export
  (and CSV) → suites/sections/cases/steps, idempotent via `source_key`; fixtures from a
  real TestRail export. This is the migration path (ADR 0003); no client compatibility.
- `POST /api/v1/post_results_automation/{project_id}` per openapi.yaml: idempotent by
  `external_execution_id`; re-POST = no duplicate results; item-level errors.
- JUnit XML importer via `POST /api/v1/import_results_file/{project_id}` (`framework=junit`, multipart; same pipeline as `post_results_automation`): maps
  `classname/name` → case `ref` via mapping rules; unmatched handled per mapping config.
- Robot Framework output.xml importer (same endpoint, `framework=robot`).
- CI run binding: `run_id` + build/branch/commit on `automation_executions`; deprecated-case
  guard (reject or skip-with-warning per mapping config).

Acceptance: sample JUnit + Robot fixtures posted twice → idempotent results; unmatched
case reported; CI summary shows build metadata.

## Milestone 5 — Reporting and Integrations

Deliverables:
- Reports: pass/fail/block trends per milestone/run/suite/assignee; executive summary
  (SQL aggregates in hooks, not client loops).
- Defect references → populate the `defect_refs` collection (schema exists since M1; gap #6) with Jira issue fields.
- Jira integration via `integration_configs` (connectivity test, create/link issue from
  a failed result; secrets from env, never in DB — schema policy).
- Xray interop: export results JSON matching common Xray import shape; document mapping.
- Outbound webhook events (gap #22): `run.closed`, `result.created`, `case.updated`
  signed with per-config secret.
- CSV export (gap #21): cases + result summary exports (streamed, role-gated).

## Milestone 6 — AI Features (prepare only, no model vendor locked)

Deliverables:
- `requirements` + `requirement_coverage` collections (created empty in M1, gap #7) —
  populated and used in M6 when the AI work is scheduled.
- Embedding-friendly exports (case corpus JSONL) for generation/dedup/coverage analysis.
- Contract stubs in openapi.yaml (`/api/v1/suggest_cases`, etc.) marked `x-status: draft`.

## Cross-cutting requirements

- **Testing matrix**: integration tests (Vitest + PocketBase in CI) per milestone acceptance
  list; role-permission matrix (4 roles × protected routes); idempotency tests (M4);
  smoke E2E (Playwright) for demo workflows; per-route API rules doc synced with schema doc.
- **CI/CD for the repo** (gap #18): GitHub Actions — lint, typecheck, vitest, playwright
  smoke on PR; PocketBase version bump PR workflow (pinned v0.40.6; check release location, repo moved to ganigeorgiev.com/pocketbase/pocketbase).
- **Observability** (gap #16–17): structured request logs via hooks; `/health` façade
  endpoint (spec'd in openapi); frontend error capture (vendor TBD, see Deferred); pb_data volume backup
  documented (sqlite VACUUM-into-copy via `pb_backup` cron script).
- **Performance targets** (gap #19): v1 budget — case list ≤ 300ms @ 5k cases/project;
  run dashboard ≤ 500ms @ 1k tests; pagination ceilings enforced.
- **A11y** (gap #20): Radix primitives + axe checks in Playwright smoke; WCAG 2.1 AA goal.
- **Seed data** (gap #24): `scripts/seed.ts` generating demo workspace/project/suite/cases
  behind an env flag; never in migrations.
- **Backup/restore** (gap #16): README runbook; `pb_data` copy strategy.

<a id="deferred-decisions"></a>
## Deferred decisions (register)

| # | Decision | Trigger | Current stance |
|---|---|---|---|
| 1 | 2FA/MFA + SSO (SAML/OIDC) | enterprise requirement | OAuth2 via PocketBase available in M1; SAML deferred |
| 2 | Per-project status/priority customization | demand post-M3 | global lookups only in v1 |
| 3 | Shared steps / templates | repository maturity | deferred (ADR 0002 list) |
| 4 | BDD/Gherkin, datasets, variables | automation client demand | deferred (ADR 0002 list) |
| 5 | Defect collection population | M5 Jira work | `defect_refs` exists (empty) from M1; array-of-strings field on results until then |
| 6 | Audit retention policy | legal/compliance demand | permanent v1 |
| 7 | Attachment virus scanning | public exposure | size/type allowlist only, private deployments |
| 8 | Error-tracking vendor (Sentry vs self-hosted) | M5 hardening | vendor-neutral wrapper in M1 |
| 9 | Multi-workspace per user UX | M2 UI | v1: workspace switcher, one active at a time |
| 10 | AI vendor/runtime | M6 scheduling | schema+contract prep only |
| 11 | MCP/agent auth (token exchange vs personal access tokens) | start of M3b | TBD; must use PocketBase rules, no privileged back door |
| 12 | TestRail results-history import | migration demand | v1 imports cases only |
| 13 | Rate-limit numbers | M1 hardening | use PocketBase built-in limiter; tune per endpoint |

## Next action

Milestone 0 begins with: Next.js scaffold, Tailwind/Radix primitives, typed mock services and
the app shell, ending at the owner review gate. Milestone 1 (pinned PocketBase v0.40.6,
migrations for ALL collections, seeds) starts only after that gate.
