# Database Schema — PocketBase Collections

Status: Design (to be implemented as version-controlled migrations in `pb_migrations/`).
Related: [ADR 0001](adr/0001-pocketbase-backend-nextjs-frontend.md), [ADR 0002](adr/0002-api-first-design-testrail-reference.md), [ADR 0003](adr/0003-own-client-api-and-agent-access.md), [API contract](api/openapi.yaml), [Implementation plan](implementation-plan.md)

## Conventions

- **IDs**: PocketBase record IDs everywhere. Human-readable case refs (`ref` field) are content, never URL keys.
- **Timestamps**: PocketBase `created`/`updated` auto-fields on every collection. Unix-second fields (`created_on`, `expires_on`) only where the façade contract needs them.
- **Authors**: `created_by`/`updated_by` relation → `users`, set by hooks, never by clients.
- **Soft deletes**: none, except cases. Cases that have results are never hard-deleted by clients: the `delete_case` façade hook deprecates them instead (see "Delete rules" below). Cases without results are hard-deleted.
- **Façade field naming**: the façade JSON uses the schema field name, with an `_id` suffix for relations (`priority` → `priority_id`, `type` → `type_id`, `section` → `section_id`, `suite` → `suite_id`, `milestone` → `milestone_id`, `assigned_to` → `assigned_to_id`, `status` → `status_id`, `plan` → `plan_id`). `estimate` and `elapsed` are integer seconds everywhere; `defects` is an array of strings everywhere; case description is `content`; milestone name is `title`.
- **API rule macros** (PocketBase v0.23+ filter syntax; `@collection` joins use the alias `:m` so every condition binds the same `project_members` row. Unaliased `@collection.x` references to one collection also share one join; using one consistent alias is safe under either reading. Final expressions **verified by M1 rule tests**):
  - `MEMBER` (record has a `project` field) — `@request.auth.id != "" && @collection.project_members:m.project ?= project && @collection.project_members:m.user ?= @request.auth.id`
  - `ADMIN` — `MEMBER` plus `&& @collection.project_members:m.role ?= 'admin'`
  - `MANAGER` — `MEMBER` plus `&& (@collection.project_members:m.role ?= 'admin' || @collection.project_members:m.role ?= 'manager')`
  - `TESTER` — as `MANAGER`, with `|| @collection.project_members:m.role ?= 'tester'`
  - For the `projects` collection itself, replace `project` with `id` (`@collection.project_members:m.project ?= id`). For collections scoped through another relation only (e.g. `test_steps` → `case.project`), use `case.project`.
  - Caveat: `?=` ("any") on a multi-row join returns true if any joined row matches each condition; the single alias binds them together. The M1 role-matrix tests must include a user who is `admin` in project A and `viewer` in project B and assert no cross-project escalation.
  - `NO_CLIENT_WRITE` — list rule = `@request.auth.id != ""` (or `MEMBER` scoped), create/update/delete rule = `null` (superuser/hooks only; note `""` would mean *public*, so use `null`)
- **Immutability** = create-only client rule + `NO_CLIENT_WRITE`, enforced by hooks; integration tests must assert update/delete attempts fail.

## Case numbering (decision closing schema gap #9)

`projects.ref_prefix` (e.g. `CORE`, unique per workspace) + `projects.case_counter` (int).
The `add_case` hook increments the counter atomically and stores `case.ref = "{prefix}-C{counter}"`.
Refs are never reused, even after deletion.

## Delete rules (closing the M2 contradiction)

- Clients never hard-delete a case that has results. The `delete_case` façade hook:
  1. **No results** → hard delete; cascades `test_case_versions`, `test_steps`, `test_case_tags`; removes the case from open runs (`test_run_cases` rows deleted).
  2. **Has results** → set `deprecated = true` (with `deprecated_reason`); the case is excluded from **new** runs only. In open runs, tests that already have results stay (with results and `case_snapshot`, so the run stays complete and closable); only tests with no result are removed. (Owner decision Q-CASE-4, 2026-11-04.)
- **Manual deprecate** does not touch open runs: they keep the test; only new runs exclude the case (Q-CASE-5). `reactivate_case` clears `deprecated` (tester and above, no new version, audit-logged `case.reactivate`); deprecating an already deprecated case is a no-op (Q-CASE-2, Q-CASE-3). A deprecated case can still be edited (new version, stays deprecated) and moved (Q-CASE-1, Q-CASE-6).
- `test_run_cases.case` and `test_results.case` are **optional** relations with **set-null** on delete; history is always read from `case_snapshot`, never from the live case.
- `test_case_versions` cascade with the case (they only disappear when the case is hard-deleted, i.e. had no results).
- `test_cases.section` and `.suite` cascade, so deleting a suite works (sections → cases → versions/steps/tags, `case` refs on runs/results become null). **Suite delete is `ADMIN`-only and audit-logged** (`suite.delete`, with counts of cases and results affected); the hook refuses suite delete when it would orphan results unless `?force=true` is given by an admin.
- Direct client delete on `test_cases` via the native API is rejected (`delete` rule = `null`); use `delete_case`.

## Snapshot policy (closing gap #10)

- Every `update_case` creates a new `test_case_versions` row (`version = old + 1`) containing a full JSON snapshot of the case + steps. Created inside the transaction by the hook.
- When a case enters a run (`add_run` / `add_case_to_run` / plan entry expansion), `test_run_cases.case_snapshot` stores the case+steps JSON at that version.
- While a run is open and the case is later edited, the run hook refreshes `case_snapshot` and bumps `test_run_cases.version`. Once results exist for that test, the snapshot is frozen (gap review: matches TestRail "test version" behavior).
- `test_results.version` records which case version was executed. `add_result` is refused as stale only when the client sends a `version` that differs from the test's current snapshot version; a client that sends no version is accepted (Q-RES-2). If a case edit and a first result race, the result wins when it was saved against the version the tester saw; otherwise the save is refused as stale (Q-CASE-9).
- Moving a case to another section creates **no** version (location is not content); it is audit-logged (`case.move`) and the suite denormalisation is kept in sync by the hook (Q-CASE-6).
- `import_cases` on a case whose `source_key` matched a hard-deleted case creates a fresh case with a new ref (refs are never reused); on a deprecated case it updates the content and keeps `deprecated` unchanged (Q-CASE-7, Q-CASE-8).
- If a result is deleted by an admin (open run only), the hook recomputes `test_run_cases.status` from the latest remaining result (or `Untested` if none).

---

## Identity & Projects

### users (PocketBase built-in auth collection, extended)
| Field | Type | Notes |
|---|---|---|
| name, email, avatar, … | builtin | PocketBase defaults |
| is_active | bool, default true | superuser-only; inactive users blocked by auth hooks |
| last_access | datetime | hook-maintained; used for inactivity checks |

Auth: PocketBase native (`authWithPassword`), OAuth2 enabled via PocketBase settings (gap #13). 2FA/SSO deferred — see [Implementation plan §Deferred](implementation-plan.md#deferred-decisions).

### workspaces
| Field | Type | Constraints |
|---|---|---|
| name | text | required, unique |
| owner | relation → users | required |
| settings | json | default `{}` |

Rules: read = workspace member; write = workspace `admin` member or owner.

### workspace_members
| Field | Type | Constraints |
|---|---|---|
| workspace | relation → workspaces | required, cascade delete |
| user | relation → users | required |
| role | select: `admin`, `member` | required |

Indexes: unique (workspace, user).
Rules: create/delete = workspace admin; read = workspace member. Project admins cannot edit workspace membership (enforced by rule scope).

### projects
| Field | Type | Constraints |
|---|---|---|
| workspace | relation → workspaces | required, cascade delete |
| name | text | required, unique per workspace |
| announcement | text | optional |
| ref_prefix | text | required, `[A-Z0-9]{2,10}`, unique per workspace |
| case_counter | int | default 0, hook-only (`NO_CLIENT_WRITE`) |
| is_archived | bool | default false |

Rules: read/write via `project_members` (`ADMIN` for update, `MANAGER` for create-in-workspace flows); archive = `ADMIN`.

### project_members
| Field | Type | Constraints |
|---|---|---|
| project | relation → projects | required, cascade delete |
| user | relation → users | required |
| role | select: `admin`, `manager`, `tester`, `viewer` | required |

Indexes: unique (project, user); index (user).
Rules: create/update/delete = project `ADMIN` only. This is the authorization table every other rule hangs off — integration tests cover all 4 roles × representative routes.

---

## Test Design (Repository)

### test_suites
| Field | Type | Constraints |
|---|---|---|
| project | relation → projects | required, cascade delete |
| name | text | required, unique per project |
| description | editor/text | optional |
| is_baseline | bool | default false |
| is_completed | bool | default false |

Rules: `MEMBER` read / `TESTER` write.

### test_sections
| Field | Type | Constraints |
|---|---|---|
| project | relation → projects | required, cascade delete |
| suite | relation → test_suites | required, cascade delete |
| parent | relation → test_sections (self) | optional, cascade delete; tree depth 1 enforced by hook |
| name | text | required, unique per (suite, parent) — see nullable-unique note |
| position | int | ordering within parent |

Indexes: `CREATE UNIQUE INDEX idx_sections_name ON test_sections (suite, COALESCE(parent, ''), name)` — a plain unique index on nullable `parent` would let duplicate root-level names through in SQLite (NULLs are distinct). PocketBase also stores an empty relation as `''`, but the expression index makes the intent explicit; the section hook additionally validates uniqueness and returns a friendly 400.
Rules: `MEMBER` read / `TESTER` write.

### case_types (global lookup, superuser-managed)
`name` (required, unique), `sort_order`. Seed: Functional, Smoke, Regression, UI, Performance, Security.
Rules: authenticated read; `NO_CLIENT_WRITE`.

### priorities (global lookup, superuser-managed)
`name`, `short_name` (P1–P4), `color` (#rrggbb), `sort_order`. Seed: P1 Critical, P2 Major, P3 Minor, P4 Trivial.
Rules: authenticated read; `NO_CLIENT_WRITE`.

### statuses (global lookup, superuser-managed)
| Field | Type | Notes |
|---|---|---|
| name | text, unique | Seed: Untested (sort 0, is_passing=false, is_failing=false), Passed, Blocked, Retest, Failed |
| color | #rrggbb | |
| is_passing | bool | Passed=true |
| is_failing | bool | Failed/Blocked=true |
| flags | text | reserved (`require_comment`, etc.) |
| sort_order | int | |

`Untested` is system-owned and cannot be posted as a result (hooks reject it). Automation payloads use lowercase names `passed|blocked|retest|failed` mapped case-insensitively to `statuses.name`; `untested` is not postable.
Rules: authenticated read; `NO_CLIENT_WRITE`. Custom statuses: authenticated create, global read (gap review: no per-project status sets in v1).

### tags
| Field | Type | Constraints |
|---|---|---|
| project | relation → projects | required, cascade delete |
| name | text | required, unique per project |
| color | #rrggbb | optional |

Rules: `MEMBER` read / `TESTER` write. Closing gap #4: single source of tag definitions.

### test_case_tags (junction)
| Field | Type | Constraints |
|---|---|---|
| case | relation → test_cases | required, cascade delete |
| tag | relation → tags | required, cascade delete |

Indexes: unique (case, tag). Rules: `MEMBER` read / `TESTER` write.

### test_cases
| Field | Type | Constraints |
|---|---|---|
| project | relation → projects | required, cascade delete |
| suite | relation → test_suites | required, cascade delete; denormalized from `section.suite` — hook keeps it in sync and rejects mismatches |
| section | relation → test_sections | required, cascade delete¹ |
| ref | text | unique per project, hook-set (`NO_CLIENT_WRITE`) |
| source_key | text | optional; unique per project when set (partial index); external key for idempotent import (`import_cases`, `import_testrail`) |
| title | text | required |
| content | editor/text | description/preconditions |
| priority | relation → priorities | optional |
| type | relation → case_types | optional |
| automation_status | select: `not_specified`, `needs_review`, `needs_automation`, `in_progress`, `automated`, `not_automatable` | default `not_specified` |
| estimate | int (seconds) | optional |
| version | int | default 1, hook-only |
| deprecated | bool, default false | set by `delete_case` (when results exist) or manually |
| deprecated_reason | text | optional |
| refs | text | related requirement/ticket refs (free-text string) |
| milestone | relation → milestones | optional, set-null |
| created_by / updated_by | relation → users | hook-only |

¹ Cascade lets suite/project deletion work; client-side case deletion goes through `delete_case` (see Delete rules). Deprecated cases are excluded from new runs by the execution service.
Indexes: unique (project, ref); partial unique `CREATE UNIQUE INDEX idx_cases_source_key ON test_cases (project, source_key) WHERE source_key != ''` (so unset keys never collide); index (suite), (section), (project, automation_status); text index on `title` for search.
Rules: `MEMBER` read / `TESTER` create+update; delete = `null` (use `delete_case`); `ref`, `version`, `case_counter` interactions only through the façade/`pb_hooks` so versioning + audit stay atomic.

### test_case_versions (immutable)
| Field | Type | Constraints |
|---|---|---|
| case | relation → test_cases | required, cascade delete |
| project | relation → projects | required (query scoping) |
| version | int | required, unique (case, version) |
| snapshot | json | full case fields + steps array |
| note | text | optional change note |
| saved_by | relation → users | hook-only |

Rules: `MEMBER` read / `NO_CLIENT_WRITE`.

### test_steps
| Field | Type | Constraints |
|---|---|---|
| case | relation → test_cases | required, cascade delete |
| position | int | required, unique (case, position) |
| description | editor/text | required |
| expected_result | editor/text | optional |

Rules: `MEMBER` read / `TESTER` write. Steps are edited through `update_case` (whole-list replace inside the versioning transaction); direct client writes allowed only for simple add/remove/reorder via hooks that bump the case version.

---

## Execution

### milestones
| Field | Type | Constraints |
|---|---|---|
| project | relation → projects | required, cascade delete |
| title | text | required, unique per project |
| description | text | optional |
| expires_on | datetime | optional; `is_past_due` computed by hook/view |
| is_completed | bool | default false |
| refs | text | optional |

Rules: `MEMBER` read / `MANAGER` write. (Added by ADR 0002 baseline adoption — closing gap #5.)

### test_plans
| Field | Type | Constraints |
|---|---|---|
| project | relation → projects | required, cascade delete |
| name | text | required, unique per project |
| description | text | optional |
| type | text | free-form plan-type label |
| milestones | relation → milestones (multi) | optional |
| builds | text | optional |
| refs | text | optional |
| owner | relation → users | optional |
| is_completed | bool | default false; set only by `close_plan` (a plan never completes itself when its last run closes, Q-RUN-7) |

Rules: `MEMBER` read / `MANAGER` write. `close_plan` is `ADMIN`/`MANAGER` only and idempotent on a completed plan (Q-RUN-2, Q-RUN-3).

### test_runs
| Field | Type | Constraints |
|---|---|---|
| project | relation → projects | required, cascade delete |
| suite | relation → test_suites | required, cascade delete (a run covers one suite; plan entries create one run per suite) |
| plan | relation → test_plans | optional, cascade delete (gap review: keep runs under plans via relation, no entries blob)² |
| name | text | required, unique per (project, plan) — see index note |
| description | text | optional |
| milestone | relation → milestones | optional, set-null |
| include_all | bool | selection mode 1: all non-deprecated cases of the suite |
| case_ids | json (array of case ids) | selection mode 2 (when `include_all` false) |
| build | text | optional |
| refs | text | optional |
| assigned_to | relation → users | optional |
| started_on / finished_on | datetime | hook-set on open/close |
| is_closed | bool | default false; closing is irreversible (TestRail behavior) |
| created_by | relation → users | hook-only |

² Plan entries = runs grouped by suite; a plan's `add_plan_entry` creates a run with `plan` and `suite` set.
Indexes: `CREATE UNIQUE INDEX idx_runs_name ON test_runs (project, COALESCE(plan, ''), name)` (plain unique on nullable `plan` would permit duplicates; hook also validates); index (suite), (plan).
Rules: `MEMBER` read / `TESTER` write (open runs); close = `TESTER`. Closing an already closed run is idempotent: it returns the closed run unchanged and writes no second audit row (Q-RUN-1). Creating a run inside a completed plan is refused (Q-RUN-6). Adding a case already in the run is skipped, not an error (unique (run, case); Q-RUN-4). Removing a test that already has a result is refused (Q-RUN-5).

### test_run_cases ("tests")
| Field | Type | Constraints |
|---|---|---|
| run | relation → test_runs | required, cascade delete |
| project | relation → projects | required (scoping) |
| case | relation → test_cases | optional, set-null on delete (history reads `case_snapshot`) |
| version | int | case version of current snapshot |
| case_snapshot | json | immutable while results exist; hook-only |
| refs | text | optional |
| assigned_to | relation → users | optional |
| status | relation → statuses | default `Untested` seed; hook-maintained from latest result (recomputed if a result is deleted) |

Indexes: unique (run, case) (NULL cases are distinct, which is intended); index (case) for history queries.
Rules: `MEMBER` read / `NO_CLIENT_WRITE` (managed by run/result services).

### test_results
| Field | Type | Constraints |
|---|---|---|
| project / run | relations | required, cascade delete (denormalized for reports) |
| test | relation → test_run_cases | required, cascade delete |
| case | relation → test_cases | optional, set-null on delete (history protection via `case_snapshot` on the test) |
| status | relation → statuses | required |
| comment | editor/text | required when status `require_comment` flag set (hook) |
| version | int | required, = executed case version |
| elapsed | int (seconds) | optional, max run duration rule via hook |
| defects | json (array of strings) | optional; promoted to `defect_refs` rows in M5 (the field stays as the input shape) |
| build / refs | text | optional |
| assigned_to | relation → users | optional |
| created_by | relation → users | hook-only |

Rules: `MEMBER` read; create via façade `add_result(s)` + direct create for manual UI (`TESTER`); update = the **author** (or admin) only while the run is open, and only `comment`, `elapsed`, `defects`, `build`, `refs` are editable: `status`, `version`, `test` and `created_by` are immutable, so editing a result never changes the test status or the status history (Q-RES-3); delete = `ADMIN`, **only while the run is open** (audit-logged; hook then recomputes the test's status from the latest remaining result; a closed run is frozen history, Q-RES-4) — closes the history-protection requirement. Editing or deleting a result that does not exist answers `404 Not found` (Q-RES-9). A status flagged `require_comment` refuses a save without a comment with "A comment is required for this status." (also for CI items, Q-RES-7). A save for a test that was removed from the run is refused with "This test was removed from the run." (Q-RES-8). `Untested` is never postable; the U hotkey only clears the unsaved selection and records nothing (Q-RES-1).

### test_step_results
| Field | Type | Constraints |
|---|---|---|
| result | relation → test_results | required, cascade delete |
| test | relation → test_run_cases | required, cascade delete |
| step_position | int | required — refers to position inside `case_snapshot`, not live steps |
| status | relation → statuses | required |
| comment | editor/text | optional |

Indexes: unique (result, step_position). Rules: written transactionally with `test_results`; `NO_CLIENT_WRITE`. The server validates only that `step_position` exists in `case_snapshot`, that no position repeats, and that the step status is not `Untested`; consistency with the overall status stays a UI hint (Q-RES-6).

### test_attachments
| Field | Type | Constraints |
|---|---|---|
| result | relation → test_results | required, cascade delete |
| project / run | relations | required (scoping) |
| file | file | required; ≤ 25 MB; types: image/*, application/pdf, text/plain, text/xml, application/json, video/mp4, application/zip (closing gap #14; enforce in hook + PocketBase settings) |
| original_name | text | for download naming |
| created_by | relation → users | hook-only |

Rules: `MEMBER` read / `TESTER` create (open runs only); delete = uploader or `ADMIN`, **only while the run is open** (evidence on a closed run is frozen, Q-RES-5). Deleting an attachment that is already gone answers `404 Not found`; the cascade from a deleted result ignores an already-deleted attachment (Q-RES-9).

---

## Governance & Integrations

### audit_logs (immutable, hooks/superuser only)
| Field | Type | Notes |
|---|---|---|
| project | relation → projects | set-null on delete (keep audit even if project removed → use restrict on project delete? no: set-null + snapshot `project_name` string) |
| project_name | text | snapshot for orphaned entries |
| actor | relation → users | set-null |
| action | text | e.g. `case.update`, `run.close`, `member.remove`, `result.delete` |
| entity_type / entity_id | text | collection name + record id (no relation: entity may be deleted) |
| before / after | json | full-field snapshots per spec |
| ip | text | hook-captured |

Rules: read = `ADMIN` of matching project (or workspace admin); `NO_CLIENT_WRITE`. Retention: permanent until project hard-delete (gap #15 policy v1).

### integration_configs (admin-only)
| Field | Type | Notes |
|---|---|---|
| workspace | relation → workspaces | required |
| name | text | required, unique per workspace |
| type | select: `jira`, `xray`, `webhook`, `git` | |
| base_url | text | |
| auth_type | select: `basic`, `bearer`, `api_token` | |
| credential_env | text | **name of the env var holding the secret — secrets are never stored in pb_data** (closing gap #15-part: credentials policy) |
| is_active | bool | |

Rules: workspace `ADMIN` read/write; never expose `credential_env` values via any API.

### automation_mappings
| Field | Type | Notes |
|---|---|---|
| project | relation → projects | required, cascade delete |
| framework | select: `robot`, `junit`, `pytest`, `custom` | |
| config | relation → integration_configs | optional (reporting side) |
| field_map | json | external case-id ↔ `test_cases.ref` mapping rules |
| run_as | relation → users | required; identity under which posted results are written. Checked at **post time** (not only at mapping create): the user must be active and hold `TESTER`, `MANAGER` or `ADMIN` in the project, otherwise `403` "The CI user cannot write results." (Q-CI-11) |
| on_unmatched | select: `skip`, `reject` | default `skip`. A `case_ref` that matches no case: `skip` records the item as `unmatched` in the execution summary and keeps the rest; `reject` fails the batch (Q-CI-5) |
| on_deprecated | select: `skip`, `reject` | default `skip`. A `case_ref` that matches a deprecated case: `skip` records the item as `skipped` with a warning and never writes a result; `reject` fails the batch (Q-CI-6) |
| is_active | bool | |

Tokens no longer live on the mapping: a mapping has **many** tokens (see `automation_tokens`). A mapping created by a manager starts with no token (Q-CI-10).
Rules: project `ADMIN`/`MANAGER` read/write.

### automation_tokens
| Field | Type | Notes |
|---|---|---|
| mapping | relation → automation_mappings | required, cascade delete |
| project | relation → projects | required (scoping) |
| name | text | required, unique per mapping (shown in the token list; typed to confirm revoke) |
| token_hash | text | hook-only, never readable via any API; hash of the CI token |
| token_prefix | text | first 8 chars of the token, for display/identification |
| last_used | datetime | hook-set on each accepted request |
| revoked_on | datetime | null while active; set by revoke (terminal state, a revoked token never becomes active) |
| created_by | relation → users | hook-only |

The full token is generated by the create hook and **shown once** in the create response; only `token_hash` + `token_prefix` are stored. The `token_hash` field is marked hidden so it is excluded from all API responses.
Rules: project `ADMIN` read / create / revoke only (a manager can edit a mapping but cannot create or revoke tokens); `NO_CLIENT_WRITE` for `token_hash`, `last_used`. Revoking an already revoked token changes nothing. Auth: missing, malformed, unknown, revoked or expired token → `401`; a valid token that is not allowed (token of another project, `run_as` lacks a role) → `403` (Q-CI-9, Q-CI-15).

### automation_executions
| Field | Type | Notes |
|---|---|---|
| mapping | relation → automation_mappings | required, cascade delete |
| external_execution_id | text | required; unique (mapping, external_execution_id) → **idempotency key** for CI result posting, at **batch level only** (items carry no key, Q-CI-13) |
| payload_hash | text | hook-only; hash of the posted payload, used to tell an identical re-POST from a changed one |
| run | relation → test_runs | **required** (bound CI run; a batch without `run_id` is refused, Q-CI-8) |
| build / branch / commit | text | CI context |
| summary | json | counts per status, `skipped` and `unmatched` items with reasons and warnings, durations |
| status | select: `in_progress`, `completed`, `failed` | |
| started_on | datetime | hook-set when processing starts (or restarts on retry) |
| error | text | reason when `failed` (import error, or `timed out after 15 minutes`) |

Rules: written by façade endpoints only (`NO_CLIENT_WRITE`); read = `MEMBER`.

Re-POST rules (same `mapping` + `external_execution_id`):
- `completed`, identical payload → `200` with the stored summary, no new results.
- Different payload (any status) → `409` "This execution id was already used with different results." (Q-CI-1).
- `in_progress` → `409` "This execution is still being processed. Try again shortly." (Q-CI-3).
- `failed`, identical payload → retry is allowed: reprocessed under the same record, status goes back to `in_progress` (a failed import wrote nothing because processing is transactional; Q-CI-2).
- **Timeout:** an execution still `in_progress` 15 minutes after `started_on` is marked `failed` (`error` = timed out) by a scheduled hook, so the client can retry; later system completion events on a finished execution are ignored (Q-CI-4).
- The whole batch, its results and its audit rows are written in one transaction; if the audit write fails nothing is recorded (atomic, as `add_result`; Q-CI-14).
- Item rules: malformed or non-postable status → the whole batch fails with `400` and `errors[]`; unmatched / deprecated case → per mapping (`on_unmatched`, `on_deprecated`); closed run → batch refused with "Run is closed. Results can no longer be changed." Results for tests that already have results append to history; the latest result wins (Q-CI-16, Q-CI-7, Q-CI-8). Each item has exactly one outcome per request.

---

## Later-milestone collections (created empty in M1 so the contract is frozen)

### defect_refs (M5)
| Field | Type | Constraints |
|---|---|---|
| project | relation → projects | required, cascade delete |
| result | relation → test_results | required, cascade delete |
| external_key | text | required (e.g. `CORE-47`) |
| url | url | optional |
| tracker | select: `jira`, `other` | default `other` |
| summary / status | text | optional, synced from tracker |

Indexes: unique (result, external_key). Rules: `MEMBER` read / `TESTER` write.

### requirements (M6)
| Field | Type | Constraints |
|---|---|---|
| project | relation → projects | required, cascade delete |
| key | text | required, unique per project (external id, e.g. a ticket key) |
| title | text | required |
| description | editor/text | optional |
| source_url | url | optional |

Rules: `MEMBER` read / `MANAGER` write.

### requirement_coverage (M6)
| Field | Type | Constraints |
|---|---|---|
| requirement | relation → requirements | required, cascade delete |
| case | relation → test_cases | required, cascade delete |
| project | relation → projects | required (scoping) |

Indexes: unique (requirement, case). Rules: `MEMBER` read / `TESTER` write.

---

## Coverage map — spec §5 → collections

All entities in the platform spec are covered above (including the later-milestone collections). Additions beyond the spec list (with rationale): `milestones` (ADR 0002 baseline), `automation_executions` (idempotent CI submission, spec §4.2), `automation_tokens` (many CI tokens per mapping, owner decision Q-CI-10), `defects` kept as an array-of-strings field on results; M5 materialises rows in `defect_refs` (gap #6). `requirements`, `requirement_coverage` and `defect_refs` are defined above and migrated empty in M1. The spec's `test_case_status_flags` maps to boolean flags on `statuses`.

## Suggested indexes & query patterns

- Reports: index (run, status) on `test_run_cases`, index (project, created) on `test_results`; heavy aggregates run through `pb_hooks` SQL, never client-side `collection.list()` loops.
- Realtime: SPA subscribes to `test_run_cases`/`test_results` per run (PocketBase SDK `subscribe`), honoring the same `MEMBER` rules.
- Pagination ceilings: native API `perPage ≤ 200`; façade `limit ≤ 500` (closing performance gap #19 partially; targets in implementation plan). Façade envelope: `{offset, limit, size, total, items}` with `size` = items in the page, `total` = all matches.
- Rate limiting: PocketBase's built-in rate limiter (Settings → Rate limiting) is enabled in production with stricter rules for `/api/v1/post_results_automation` and `/api/v1/import_*`; exceeded requests get `429` with `Retry-After`.
- Batch limits: ≤ 1,000 results per batch request and ≤ 25 MB request body (hook-enforced, 400/413).
