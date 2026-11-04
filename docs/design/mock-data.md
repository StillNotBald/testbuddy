# Mock dataset for the UI prototype

Purpose: fixtures so UI agents can build every M0 screen without a backend. Field names match `docs/database-schema.md` (snake_case, PocketBase string ids, `created`/`updated` ISO strings). Generate with a deterministic seeded script (`src/mocks/seed.ts`, fixed seed, fixed "now" of 2026-11-04T09:00:00Z) so screenshots and tests are stable. Serve through the same typed services the real app uses (a `MockAdapter` behind `src/services/`), switchable by `NEXT_PUBLIC_MOCK=1`.

## Size summary

| Entity | Count | Notes |
|---|---|---|
| users | 8 | 1 per role per project plus extras; see below |
| workspaces | 1 | "Acme QA" |
| workspace_members | 8 | 1 admin, 7 member |
| projects | 2 | `CORE` (full data), `MOB` (light: 1 suite, 20 cases, 1 run, to test project switcher and empty states) |
| project_members | 12 | all 4 roles present in CORE; the signed-in user is Manager in MOB |
| test_suites (CORE) | 3 | Web app, API, Mobile web (one `is_baseline`) |
| test_sections (CORE) | 12 | Web app 5, API 4, Mobile web 3; 2 have a child section (depth 1); one section empty |
| case_types | 6 | Functional, Smoke, Regression, UI, Performance, Security |
| priorities | 4 | P1 Critical, P2 Major, P3 Minor, P4 Trivial |
| statuses | 4 | Passed, Blocked, Retest, Failed (Untested derived; plus 1 custom "Skipped" to test the fallback badge) |
| tags | 10 | smoke, regression, auth, checkout, api, mobile, flaky, slow, a11y, payments |
| test_cases (CORE) | 120 | spread: Web 60, API 40, Mobile web 20 |
| test_steps | about 480 | 2-8 steps per case, mean 4 |
| test_case_versions | about 190 | 30 cases have 2-5 versions (one has 5 for the diff screen) |
| milestones | 2 | "Release 2.4" (open, due in 6 days), "Release 2.3" (completed) |
| test_plans | 1 | "Release 2.4 regression", linked to Release 2.4, owned by the manager |
| test_runs | 3 | see below |
| test_run_cases | 38 + 120 + 60 = 218 | |
| test_results | about 420 | multiple results per test for retest history |
| test_step_results | about 700 | only on tests with failures or explicitly stepped |
| test_attachments | 14 | 10 images, 2 pdf, 1 json, 1 txt |
| automation_mappings | 2 | junit (active), robot (inactive) |
| automation_executions | 6 | 4 completed, 1 failed, 1 in_progress |
| ci tokens | 2 | not a schema collection in the schema doc; mock as `{ id, name, mapping, prefix, last4, created, last_used }` (token value never stored) |
| audit_logs | 60 | mixed actions |

## Users (all with password `demo-only` in mock only)
| id | name | Project role (CORE) |
|---|---|---|
| u_avery | Avery Quinn (default signed-in) | admin |
| u_raj | Raj Patel | manager |
| u_dana | Dana Lee | tester |
| u_sam | Sam Ortiz | tester |
| u_mia | Mia Chen | viewer |
| u_ci | CI Bot | tester (service identity) |
| u_alex | Alex Kim | tester (only in MOB) |
| u_inactive | Pat Doe | `is_active=false`, to test sign-in rejection |

A role switcher in the dev toolbar (mock mode only) swaps the signed-in user so every row of the role table (DESIGN.md section 8) can be eyeballed.

## Project CORE structure
- Prefix `CORE`, `case_counter` 120, refs `CORE-C1`..`CORE-C120`, announcement "Release freeze Friday 18:00".
- Suites and sections (case counts):
  - Web app (60): Login 12, Registration 8, Checkout 18, Profile 10, Search 12 (Checkout has child "Payments" holding 6 of its 18)
  - API (40): Auth 10, Orders 14, Products 10, Webhooks 6 (Webhooks has child "Retries" with 2)
  - Mobile web (20): Navigation 8, Forms 8, Offline 4; plus one empty section "Accessibility" (empty-state test)
- Distribution: priority P1 15%, P2 35%, P3 35%, P4 15%; type Functional 50%, Regression 20%, Smoke 15%, UI 8%, Security 5%, Performance 2%; automation: automated 35%, needs_automation 20%, needs_review 10%, in_progress 5%, not_specified 25%, not_automatable 5%.
- Make 6 cases `deprecated` (with `deprecated_reason`), 4 with very long titles (90+ chars), 3 with 12+ steps, 3 with no tags, 1 with HTML-ish content in `content` (escaping test), 2 with `refs` such as "JIRA-123, JIRA-456".
- Case titles: realistic QA phrasing ("Login locks the account after 5 failed attempts", "Checkout applies a discount code once"). Step descriptions: one imperative sentence; expected results: one sentence.

## Milestones, plan, runs
| Name | Kind | Milestone / plan | Tests | State | Progress snapshot |
|---|---|---|---|---|---|
| Release 2.4 | milestone | open, `expires_on` = now + 6 days | | | aggregate over its runs |
| Release 2.3 | milestone | `is_completed=true`, `expires_on` = now - 20 days | | | 100% |
| Release 2.4 regression | plan | milestone Release 2.4, owner Raj, builds "2.4-rc1" | | open | rollup of runs 1 and 2 |
| Web smoke 2.4-rc1 | run (plan, Release 2.4) | build 2.4-rc1, assigned Dana, `include_all=false` | 38 | open | Passed 20, Failed 3, Blocked 1, Retest 0, Untested 14 (62% done) |
| API regression 2.4-rc1 | run (plan, Release 2.4) | build 2.4-rc1, assigned Sam | 60 | open | Passed 41, Failed 5, Blocked 2, Retest 4, Untested 8 |
| Release 2.3 full regression | run (no plan, Release 2.3) | build 2.3.0, assigned Raj | 120 | `is_closed=true`, `finished_on` = now - 21 days | Passed 108, Failed 6, Blocked 3, Retest 0, Untested 3 |

Additional rules for realism:
- Retest history: 12 tests in the open runs have 2-4 results (Failed, then Retest, then Passed) with different users.
- 8 failed results carry `defects` like `["JIRA-512"]`, 3 carry two.
- `require_comment` flag on Failed and Blocked: every such result has a non-empty comment (a few with long multi-line comments).
- 5 tests in Web smoke have `case_snapshot.version` older than the live case (newer version exists) to test the "newer version" banner. 2 tests have step results (per-step Failed on step 3).
- 14 attachments sit on failed results.
- Closed run: all `test_results.updated` before `finished_on`; verifies read-only UI.
- `elapsed` seconds from 20 to 900; some null.
- Untested tests have `status` = the default "Retest" seed in the schema, but the UI derives Untested when no result exists; fixtures must include `last_result_id: null` (or equivalent) for these and the mock service must derive `status_key: "untested"`.

## Automation
- Mappings: `junit` (active, `field_map` `{ "match": "classname.name", "strip_prefix": "com.acme." }`), `robot` (inactive).
- Executions (CI context):
  1. `gh-4411`, build 2.4-rc1, branch main, commit a1b2c3d, completed, 120 pass 3 fail
  2. `gh-4410`, 2.4-rc0, main, 9f8e7d6, completed
  3. `gh-4409`, 2.4-rc0, feature/login-lockout, 5d4c3b2, completed, 2 unmatched ids
  4. `gh-4408`, 2.3.1, release/2.3, 1c2d3e4, failed (import error: "Malformed XML at line 88")
  5. `gh-4412`, 2.4-rc1, main, c0ffee1, in_progress
  6. `gh-4400`, 2.3.0, main, deadbee, completed
- Summary json: `{ passed, failed, skipped, duration_s, unmatched: [ids], errors: [{ id, message }] }`.
- Tokens: `gh-actions` (JUnit main, prefix `tb_demo_9f3a`, last4 `c21e`, last used 2h ago) and `nightly` (never used).

## Audit log (60 rows)
Actions to include: `case.create`, `case.update`, `case.delete`, `run.create`, `run.close`, `result.create`, `result.delete` (2), `member.add`, `member.role_change`, `member.remove`, `project.update`, `token.create`, `token.revoke`. Each has `before`/`after` JSON snapshots with 1-4 changed fields, `ip`, `actor` (2 rows with actor null for system), and 3 rows whose entity no longer exists ("Deleted" link state).

## Edge-case checklist (fixtures must cover)
- Empty states: section with 0 cases, project MOB with no milestones/plans, a fresh project with nothing (create via UI in mock mode).
- Long text and unicode: titles with emoji-free CJK ("登录失败后锁定账户") and RTL words; 200-character comment.
- Pagination: CORE case list of 120 needs at least 3 pages at page size 50; run list 3 rows; audit 60 rows at 25.
- Performance test seed: `?perf=1` expands to 5,000 cases and a run with 1,000 tests to check virtualisation and the 300/500 ms budgets.
- Permission paths: signed in as viewer, a user who is not a member of CORE (shows no-access), archived project (MOB switchable to archived in dev toolbar).
- Errors: dev toolbar toggles for forced 500, slow network (1.5 s), and offline on result save.
