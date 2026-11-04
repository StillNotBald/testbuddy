# TestBuddy requirements traceability matrix (RTM)

Mirror of `REQUIREMENTS.md` (canonical). One row per R-ID. Update the matching row in the same commit as the change. Verify with `node scripts/rtm-verify.mjs`.

Code and Tests list repo paths in backticks; the verifier checks that each path exists. A DONE row needs at least one test path. `—` means nothing exists yet.

| R-ID | Title | Milestone | Status | Spec | Code | Tests |
|------|-------|-----------|--------|------|------|-------|
| R-001 | Email and password sign-in | M1 | TODO | DESIGN.md §6.1; ADR 0001 §1 | — | — |
| R-002 | Sign out and session expiry | M1 | TODO | DESIGN.md §6.1 | — | — |
| R-003 | Inactive account rejected | M1 | TODO | DESIGN.md §6.1; database-schema.md users | — | — |
| R-004 | OAuth2 sign-in available but off by default | M1 | TODO | implementation-plan.md M1; database-schema.md users | — | — |
| R-005 | Forgot-password behaviour | M1 | TODO | DESIGN.md §6.1 | — | — |
| R-006 | Project role model | M1 | TODO | database-schema.md project_members | — | — |
| R-007 | Workspace role model | M1 | TODO | database-schema.md workspace_members | — | — |
| R-008 | Role matrix is a single source in code | M0 | PARTIAL | DESIGN.md §8, §4.2 | `src/lib/permissions.ts` | — |
| R-009 | Hide versus disable rule | M0 | TODO | DESIGN.md §1.6, §8 | — | — |
| R-010 | Matrix: create project | M0 | TODO | DESIGN.md §8 | — | — |
| R-011 | Matrix: cases, suites and sections write | M0 | TODO | DESIGN.md §8 | — | — |
| R-012 | Matrix: milestones and plans write | M0 | PARTIAL | DESIGN.md §8 | `src/components/admin/milestones-screen.tsx`, `src/components/admin/milestone-detail-screen.tsx` | `src/components/admin/milestones-screen.test.tsx`, `src/components/admin/milestone-detail-screen.test.tsx` |
| R-013 | Matrix: runs create, add cases, assign | M0 | PARTIAL | DESIGN.md §8 | `src/components/exec/run-create-screen.tsx`, `src/components/exec/run-detail-screen.tsx` | `src/components/exec/run-create-screen.test.tsx`, `src/components/exec/run-detail-screen.test.tsx` |
| R-014 | Matrix: attach run to plan or milestone | M0 | PARTIAL | DESIGN.md §8, §6.9 | `src/components/exec/run-create-screen.tsx` | `src/components/exec/run-create-screen.test.tsx` |
| R-015 | Matrix: execute and edit own result | M0 | PARTIAL | DESIGN.md §8, §6.11 | `src/components/exec/test-execution-screen.tsx` | `src/components/exec/test-execution-screen.test.tsx` |
| R-016 | Matrix: delete a result is admin only | M0 | TODO | DESIGN.md §8; database-schema.md test_results | — | — |
| R-017 | Matrix: close run, never reopen | M0 | PARTIAL | DESIGN.md §8 | `src/components/exec/run-detail-screen.tsx` | `src/components/exec/run-detail-screen.test.tsx` |
| R-018 | Matrix: reports and CSV export | M0 | TODO | DESIGN.md §8 | — | — |
| R-019 | Matrix: automation mappings and executions | M0 | PARTIAL | DESIGN.md §8, §6.13 | `src/components/entry/automation.tsx` | `src/app/(app)/p/[projectId]/automation/page.test.tsx` |
| R-020 | Matrix: CI tokens admin only | M0 | PARTIAL | DESIGN.md §8; database-schema.md automation_mappings | `src/components/entry/automation.tsx` | `src/app/(app)/p/[projectId]/automation/page.test.tsx` |
| R-021 | Matrix: members | M0 | PARTIAL | DESIGN.md §8, §6.14 | `src/components/admin/members-screen.tsx` | `src/components/admin/members-screen.test.tsx` |
| R-022 | Matrix: audit log admin only | M0 | PARTIAL | DESIGN.md §8, §6.15 | `src/components/admin/audit-screen.tsx` | `src/components/admin/audit-screen.test.tsx` |
| R-023 | Matrix: settings | M0 | PARTIAL | DESIGN.md §8, §6.16 | `src/components/admin/settings-screen.tsx` | `src/components/admin/settings-screen.test.tsx` |
| R-024 | Matrix: archive and delete project | M0 | PARTIAL | DESIGN.md §8 | `src/components/admin/settings-screen.tsx` | `src/components/admin/settings-screen.test.tsx` |
| R-025 | Matrix: attachments upload and delete | M0 | TODO | DESIGN.md §8; database-schema.md test_attachments | — | — |
| R-026 | Archived and completed states override roles | M0 | TODO | DESIGN.md §8 | — | — |
| R-027 | Last admin protected | M1 | TODO | DESIGN.md §6.14 | — | — |
| R-028 | Dev role switcher in mock mode | M0 | TODO | mock-data.md Users | — | — |
| R-029 | Server enforces the matrix per role and route | M1 | TODO | implementation-plan.md M1; database-schema.md Conventions | — | — |
| R-030 | No cross-project privilege escalation | M1 | TODO | database-schema.md Conventions | — | — |
| R-031 | Non-member gets 403 and a no-access screen | M1 | TODO | implementation-plan.md M1 acceptance; DESIGN.md §2.2 | — | — |
| R-032 | Create project transaction | M1 | TODO | openapi.yaml /add_project; implementation-plan.md M1 | — | — |
| R-033 | Project reference prefix rules | M1 | TODO | DESIGN.md §6.2; database-schema.md projects | — | — |
| R-034 | Update project and announcement | M1 | PARTIAL | openapi.yaml /update_project; DESIGN.md §6.3 | `src/components/admin/settings-screen.tsx` | `src/components/admin/settings-screen.test.tsx` |
| R-035 | Archive project is reversible and read-only | M1 | PARTIAL | DESIGN.md §2.1, §6.16 | `src/components/admin/settings-screen.tsx` | `src/components/admin/settings-screen.test.tsx` |
| R-036 | Delete project with typed confirmation | M1 | TODO | openapi.yaml /delete_project; DESIGN.md §6.16 | — | — |
| R-037 | Case reference numbering | M2 | TODO | database-schema.md Case numbering | — | — |
| R-038 | Membership administration | M1 | PARTIAL | DESIGN.md §6.14; implementation-plan.md M1 | `src/components/admin/members-screen.tsx` | `src/components/admin/members-screen.test.tsx` |
| R-039 | Workspace switcher | M2 | TODO | implementation-plan.md deferred #9 | — | — |
| R-040 | Project switcher with recents | M0 | TODO | DESIGN.md §2.1 | — | — |
| R-041 | Last-project redirect | M0 | TODO | DESIGN.md §2.2 | — | — |
| R-042 | Health endpoint | M1 | PARTIAL | openapi.yaml /health; implementation-plan.md cross-cutting | `src/app/api/health/route.ts` | — |
| R-043 | Suites and sections tree | M2 | PARTIAL | database-schema.md test_sections; DESIGN.md §6.4 | `src/components/repo/suite-tree.tsx` | `src/components/repo/repository-screen.test.tsx` |
| R-044 | Tree counts include descendants | M0 | PARTIAL | DESIGN.md §4.2 | `src/components/repo/suite-tree.tsx` | `src/components/repo/repository-screen.test.tsx` |
| R-045 | Tree keyboard and ARIA behaviour | M0 | TODO | DESIGN.md §4.2, §9 | — | — |
| R-046 | Section ordering | M2 | PARTIAL | implementation-plan.md M2; DESIGN.md §4.2 | `src/components/repo/suite-tree.tsx` | `src/components/repo/repository-screen.test.tsx`, `src/services/mock/repo-additions.test.ts` |
| R-047 | Create case | M2 | PARTIAL | openapi.yaml /add_case; implementation-plan.md M2 | `src/components/repo/case-editor-screen.tsx` | `src/components/repo/case-editor-screen.test.tsx` |
| R-048 | Case fields | M2 | PARTIAL | database-schema.md test_cases | `src/components/repo/case-editor-screen.tsx` | `src/components/repo/case-editor-screen.test.tsx` |
| R-049 | Step editor | M0 | TODO | database-schema.md test_steps; DESIGN.md §4.2 | — | — |
| R-050 | Every save creates a new version | M2 | PARTIAL | database-schema.md Snapshot policy; DESIGN.md §6.5 | `src/components/repo/case-editor-screen.tsx` | `src/components/repo/case-editor-screen.test.tsx`, `src/services/mock/repo-additions.test.ts` |
| R-051 | Change note | M2 | PARTIAL | DESIGN.md §6.5 | `src/components/repo/case-editor-screen.tsx` | `src/components/repo/case-editor-screen.test.tsx` |
| R-052 | Version history and compare | M2 | PARTIAL | DESIGN.md §6.5, §4.2 | `src/components/repo/case-history-screen.tsx` | `src/components/repo/case-history-screen.test.tsx` |
| R-053 | Restore as new version | M2 | PARTIAL | DESIGN.md §6.5 | `src/components/repo/case-history-screen.tsx` | `src/components/repo/case-history-screen.test.tsx` |
| R-054 | Concurrent edit conflict | M2 | PARTIAL | DESIGN.md §6.5 | `src/components/repo/case-editor-screen.tsx` | `src/components/repo/case-editor-screen.test.tsx` |
| R-055 | Unsaved changes guard and local draft | M0 | TODO | DESIGN.md §6.5, §7 | — | — |
| R-056 | Case list filters and search | M2 | PARTIAL | DESIGN.md §6.4, §2.2; implementation-plan.md M2 | `src/components/repo/case-list.tsx` | `src/components/repo/repository-screen.test.tsx` |
| R-057 | Case list pagination | M2 | TODO | database-schema.md Suggested indexes; DESIGN.md §4.1 | — | — |
| R-058 | Bulk case actions | M2 | PARTIAL | DESIGN.md §6.4 | `src/components/repo/bulk-actions.tsx` | `src/components/repo/repository-screen.test.tsx` |
| R-059 | Delete case without results | M2 | PARTIAL | database-schema.md Delete rules; implementation-plan.md M2 | `src/components/repo/bulk-actions.tsx` | `src/components/repo/repository-screen.test.tsx` |
| R-060 | Delete case with results deprecates | M2 | PARTIAL | database-schema.md Delete rules | `src/components/repo/bulk-actions.tsx` | `src/components/repo/repository-screen.test.tsx` |
| R-061 | No direct client delete of cases | M1 | TODO | database-schema.md test_cases | — | — |
| R-062 | Suite delete admin only with guard | M2 | TODO | database-schema.md Delete rules | — | — |
| R-063 | Deprecated cases excluded from new runs | M2 | PARTIAL | DESIGN.md §6.4, §6.9 | `src/components/repo/bulk-actions.tsx` | `src/components/repo/repository-screen.test.tsx` |
| R-064 | Tags management | M2 | PARTIAL | database-schema.md tags, test_case_tags | `src/components/repo/case-editor-screen.tsx` | `src/components/repo/case-editor-screen.test.tsx` |
| R-065 | Case inspector | M0 | PARTIAL | DESIGN.md §6.4, §1.4 | `src/components/repo/case-inspector.tsx` | `src/components/repo/repository-screen.test.tsx` |
| R-066 | Case content is escaped | M0 | PARTIAL | mock-data.md Project CORE structure | `src/components/repo/case-inspector.tsx` | `src/components/repo/repository-screen.test.tsx` |
| R-067 | Milestones | M3 | PARTIAL | database-schema.md milestones; DESIGN.md §6.6 | `src/components/admin/milestone-detail-screen.tsx` | `src/components/admin/milestone-detail-screen.test.tsx` |
| R-068 | Plans | M3 | PARTIAL | database-schema.md test_plans; openapi.yaml /add_plan; DESIGN.md §6.7 | `src/components/exec/plans-screens.tsx` | `src/components/exec/plans-screens.test.tsx` |
| R-069 | Create run with include-all or explicit cases | M3 | PARTIAL | database-schema.md test_runs; DESIGN.md §6.9 | `src/components/exec/run-create-screen.tsx` | `src/components/exec/run-create-screen.test.tsx` |
| R-070 | Run creation snapshots cases | M3 | TODO | database-schema.md Snapshot policy; DESIGN.md §6.9 | — | — |
| R-071 | Select all matching filter | M3 | PARTIAL | DESIGN.md §6.9 | `src/components/repo/bulk-actions.tsx` | `src/components/repo/repository-screen.test.tsx` |
| R-072 | Snapshot refresh then freeze | M3 | TODO | database-schema.md Snapshot policy | — | — |
| R-073 | Newer case version banner | M3 | TODO | DESIGN.md §1.5, §6.11 | — | — |
| R-074 | Add and remove cases on an open run | M3 | TODO | openapi.yaml /add_case_to_run; DESIGN.md §6.10 | — | — |
| R-075 | Assign tests | M3 | PARTIAL | DESIGN.md §6.10, §6.3 | `src/components/exec/run-detail-screen.tsx` | `src/components/exec/run-detail-screen.test.tsx` |
| R-076 | Record a result | M3 | PARTIAL | database-schema.md test_results; openapi.yaml /add_result | `src/components/exec/test-execution-screen.tsx` | `src/components/exec/test-execution-screen.test.tsx` |
| R-077 | Untested is derived and not postable | M3 | TODO | database-schema.md statuses; DESIGN.md §3.2 | — | — |
| R-078 | Comment required for flagged statuses | M3 | PARTIAL | database-schema.md test_results; DESIGN.md §6.11 | `src/components/exec/test-execution-screen.tsx` | `src/components/exec/test-execution-screen.test.tsx` |
| R-079 | Per-step results | M3 | TODO | database-schema.md test_step_results | — | — |
| R-080 | Step status pre-selects result status | M0 | PARTIAL | DESIGN.md §6.11 | `src/components/exec/test-execution-screen.tsx` | `src/components/exec/test-execution-screen.test.tsx` |
| R-081 | Save and next flow | M0 | TODO | DESIGN.md §6.11, §1.7 | — | — |
| R-082 | Elapsed timer | M0 | PARTIAL | DESIGN.md §6.11, §9 | `src/components/exec/test-execution-screen.tsx` | `src/components/exec/test-execution-screen.test.tsx` |
| R-083 | Unsaved result survives a save failure | M0 | PARTIAL | DESIGN.md §6.11 | `src/components/exec/test-execution-screen.tsx` | `src/components/exec/test-execution-screen.test.tsx` |
| R-084 | Retest history | M3 | TODO | DESIGN.md §6.11; openapi.yaml /get_results | — | — |
| R-085 | Result edit window | M3 | TODO | database-schema.md test_results | — | — |
| R-086 | Admin result delete recomputes status | M3 | TODO | database-schema.md Snapshot policy, test_results | — | — |
| R-087 | Close run is irreversible | M3 | PARTIAL | database-schema.md test_runs; DESIGN.md §6.10 | `src/components/exec/run-detail-screen.tsx` | `src/components/exec/run-detail-screen.test.tsx` |
| R-088 | Writes rejected after close | M3 | TODO | implementation-plan.md M3 acceptance; openapi.yaml /add_result | — | — |
| R-089 | Stale case version rejected | M3 | TODO | openapi.yaml /add_result | — | — |
| R-090 | Batch results | M3 | TODO | openapi.yaml /add_results; implementation-plan.md M3 | — | — |
| R-091 | Attachments on results | M3 | TODO | database-schema.md test_attachments; DESIGN.md §6.11 | — | — |
| R-092 | Run progress and live updates | M3 | PARTIAL | DESIGN.md §6.10; implementation-plan.md M3 | `src/components/exec/run-detail-screen.tsx` | `src/components/exec/run-detail-screen.test.tsx` |
| R-093 | Defect references on results | M3 | TODO | database-schema.md test_results; implementation-plan.md M3 | — | — |
| R-094 | Bulk status set on a run | M3 | PARTIAL | DESIGN.md §6.10 | `src/components/exec/run-detail-screen.tsx` | `src/components/exec/run-detail-screen.test.tsx` |
| R-095 | Closed run is read-only everywhere | M0 | PARTIAL | DESIGN.md §6.10, §6.11 | `src/components/exec/run-detail-screen.tsx`, `src/components/exec/test-execution-screen.tsx` | `src/components/exec/run-detail-screen.test.tsx`, `src/components/exec/test-execution-screen.test.tsx` |
| R-096 | Automation mappings | M4 | TODO | database-schema.md automation_mappings; DESIGN.md §6.13 | — | — |
| R-097 | CI token creation shown once | M4 | PARTIAL | database-schema.md automation_mappings; DESIGN.md §6.13 | `src/components/entry/automation.tsx` | `src/app/(app)/p/[projectId]/automation/page.test.tsx` |
| R-098 | CI token authentication | M4 | TODO | openapi.yaml security; ADR 0003 §1 | — | — |
| R-099 | Revoke CI token | M4 | PARTIAL | DESIGN.md §6.13 | `src/components/entry/automation.tsx` | `src/app/(app)/p/[projectId]/automation/page.test.tsx` |
| R-100 | Idempotent automation posting | M4 | TODO | openapi.yaml /post_results_automation; database-schema.md automation_executions | — | — |
| R-101 | Item-level errors and unmatched cases | M4 | TODO | implementation-plan.md M4 | — | — |
| R-102 | JUnit XML importer | M4 | TODO | openapi.yaml /import_results_file; implementation-plan.md M4 | — | — |
| R-103 | Robot Framework importer | M4 | TODO | implementation-plan.md M4 | — | — |
| R-104 | CI run binding | M4 | TODO | database-schema.md automation_executions; implementation-plan.md M4 | — | — |
| R-105 | Executions list and detail | M4 | TODO | DESIGN.md §6.13 | — | — |
| R-106 | Mapping editor with match preview | M4 | TODO | DESIGN.md §6.13 | — | — |
| R-107 | Generic JSON case import | M2 | PARTIAL | openapi.yaml /import_cases; implementation-plan.md M2 | `src/lib/import/plan.ts` | `src/lib/import/import.test.ts` |
| R-108 | source_key uniqueness | M2 | PARTIAL | database-schema.md test_cases | `src/lib/import/plan.ts` | `src/lib/import/import.test.ts` |
| R-109 | TestRail XML and CSV import | M4 | PARTIAL | openapi.yaml /import_testrail; ADR 0003 §2 | `src/lib/import/xml.ts`, `src/lib/import/csv.ts` | `src/lib/import/import.test.ts` |
| R-110 | Import dry-run and report | M4 | PARTIAL | DESIGN.md §6.16 | `src/lib/import/plan.ts` | `src/lib/import/import.test.ts` |
| R-111 | Import and automation rate limits | M4 | TODO | database-schema.md Suggested indexes; openapi.yaml responses | — | — |
| R-112 | TestRail results history import | M4 | DEFERRED | ADR 0003 §2; implementation-plan.md deferred #12 | — | — |
| R-113 | Project overview KPIs | M0 | PARTIAL | DESIGN.md §6.3 | `src/components/entry/overview.tsx` | `src/app/(app)/p/[projectId]/page.test.tsx` |
| R-114 | Run dashboard performance | M3 | TODO | implementation-plan.md cross-cutting | — | — |
| R-115 | Milestone report | M0 | PARTIAL | DESIGN.md §6.12 | `src/components/exec/reports-screens.tsx` | `src/components/exec/reports-screens.test.tsx` |
| R-116 | Run summary report | M0 | PARTIAL | DESIGN.md §6.12 | `src/components/exec/reports-screens.tsx` | `src/components/exec/reports-screens.test.tsx` |
| R-117 | Charts have table twins and patterns | M0 | TODO | DESIGN.md §6.12, §9 | — | — |
| R-118 | Report empty, loading and error states | M0 | PARTIAL | DESIGN.md §6.12 | `src/components/exec/reports-screens.tsx` | `src/components/exec/reports-screens.test.tsx` |
| R-119 | Print stylesheet | M0 | TODO | DESIGN.md §6.12, §10 | — | — |
| R-120 | Pass/fail/block trends | M5 | TODO | implementation-plan.md M5; database-schema.md Suggested indexes | — | — |
| R-121 | Executive summary | M5 | TODO | implementation-plan.md M5 | — | — |
| R-122 | CSV export of cases and results | M5 | TODO | implementation-plan.md M5; DESIGN.md §8 | — | — |
| R-123 | Reports endpoints in the contract | M5 | TODO | ADR 0002 process rules 1 | — | — |
| R-124 | Integration configs admin only | M5 | TODO | database-schema.md integration_configs | — | — |
| R-125 | Jira connectivity test | M5 | TODO | implementation-plan.md M5 | — | — |
| R-126 | Create or link Jira issue from a failed result | M5 | TODO | implementation-plan.md M5 | — | — |
| R-127 | Defect refs populated | M5 | TODO | database-schema.md defect_refs | — | — |
| R-128 | Xray results export | M5 | TODO | implementation-plan.md M5 | — | — |
| R-129 | Outbound signed webhooks | M5 | TODO | implementation-plan.md M5 | — | — |
| R-130 | Git integration type | M5 | DEFERRED | database-schema.md integration_configs | — | — |
| R-131 | MCP over Streamable HTTP | M3b | PARTIAL | ADR 0003 §3; implementation-plan.md M3b | `src/app/api/mcp/route.ts`, `src/mcp/protocol.ts` | `src/app/api/mcp/route.test.ts` |
| R-132 | MCP over stdio | M3b | TODO | ADR 0003 §3 | — | — |
| R-133 | MCP tool set | M3b | PARTIAL | implementation-plan.md M3b | `src/mcp/tools.ts` | `src/app/api/mcp/route.test.ts` |
| R-134 | No tool without a specified endpoint | M3b | TODO | ADR 0003 §3; ADR 0002 | — | — |
| R-135 | Agent auth decision | M3b | PARTIAL | implementation-plan.md deferred #11 | `docs/adr/0004-mcp-server.md` | `src/app/api/mcp/route.test.ts` |
| R-136 | Agents obey rules and audit | M3b | PARTIAL | ADR 0003 §3; implementation-plan.md M3b | `src/mcp/auth.ts`, `src/mcp/tools.ts` | `src/app/api/mcp/route.test.ts` |
| R-137 | MCP route holds no business logic | M3b | TODO | ADR 0001 §2; ADR 0003 §3 | — | — |
| R-138 | MCP errors are legible | M3b | PARTIAL | openapi.yaml responses | `src/mcp/protocol.ts` | `src/app/api/mcp/route.test.ts` |
| R-139 | MCP acceptance demo | M3b | TODO | implementation-plan.md M3b acceptance | — | — |
| R-140 | Owner look-and-feel gate for M0 | M0 | TODO | implementation-plan.md M0; ADR 0003 §5 | — | — |
| R-141 | Screen: Sign in | M0 | PARTIAL | DESIGN.md §6.1 | `src/app/(auth)/sign-in/page.tsx` | `src/app/(auth)/sign-in/page.test.tsx` |
| R-142 | Screen: Workspace and project list | M0 | PARTIAL | DESIGN.md §6.2 | `src/components/entry/project-list.tsx` | `src/app/(app)/projects/page.test.tsx` |
| R-143 | Screen: Project overview | M0 | PARTIAL | DESIGN.md §6.3 | `src/components/entry/overview.tsx` | `src/app/(app)/p/[projectId]/page.test.tsx` |
| R-144 | Screen: Case repository | M0 | TODO | DESIGN.md §6.4 | — | — |
| R-145 | Screen: Case editor and version history | M0 | TODO | DESIGN.md §6.5 | — | — |
| R-146 | Screen: Milestones | M0 | TODO | DESIGN.md §6.6 | — | — |
| R-147 | Screen: Plans | M0 | PARTIAL | DESIGN.md §6.7 | `src/components/exec/plans-screens.tsx` | `src/components/exec/plans-screens.test.tsx` |
| R-148 | Screen: Run list | M0 | PARTIAL | DESIGN.md §6.8 | `src/components/exec/run-list-screen.tsx` | `src/components/exec/run-list-screen.test.tsx` |
| R-149 | Screen: Create run | M0 | PARTIAL | DESIGN.md §6.9 | `src/components/exec/run-create-screen.tsx` | `src/components/exec/run-create-screen.test.tsx` |
| R-150 | Screen: Run detail | M0 | PARTIAL | DESIGN.md §6.10 | `src/components/exec/run-detail-screen.tsx` | `src/components/exec/run-detail-screen.test.tsx` |
| R-151 | Screen: Test execution | M0 | PARTIAL | DESIGN.md §6.11 | `src/components/exec/test-execution-screen.tsx` | `src/components/exec/test-execution-screen.test.tsx` |
| R-152 | Screen: Reports | M0 | PARTIAL | DESIGN.md §6.12 | `src/components/exec/reports-screens.tsx` | `src/components/exec/reports-screens.test.tsx` |
| R-153 | Screen: Automation | M0 | PARTIAL | DESIGN.md §6.13 | `src/components/entry/automation.tsx` | `src/app/(app)/p/[projectId]/automation/page.test.tsx` |
| R-154 | Screen: Members and roles | M0 | TODO | DESIGN.md §6.14 | — | — |
| R-155 | Screen: Audit log | M0 | TODO | DESIGN.md §6.15 | — | — |
| R-156 | Screen: Settings | M0 | TODO | DESIGN.md §6.16 | — | — |
| R-157 | App shell and navigation | M0 | TODO | DESIGN.md §2.1, §4.0 | — | — |
| R-158 | Route map and URL state | M0 | TODO | DESIGN.md §2.2, §1.4 | — | — |
| R-159 | Design tokens | M0 | PARTIAL | DESIGN.md §3 | `docs/design/tokens.css`, `src/app/tokens.css` | — |
| R-160 | Status, priority and automation chips | M0 | TODO | DESIGN.md §3.2, §3.3, §4.1 | — | — |
| R-161 | Data table | M0 | TODO | DESIGN.md §4.3 | — | — |
| R-162 | Filter bar | M0 | TODO | DESIGN.md §4.1 | — | — |
| R-163 | Split view | M0 | TODO | DESIGN.md §4.0 | — | — |
| R-164 | Common screen states | M0 | TODO | DESIGN.md §6 intro | — | — |
| R-165 | Keyboard map | M0 | TODO | DESIGN.md §4.4, §1.1 | — | — |
| R-166 | Single-key shortcut toggle | M0 | TODO | DESIGN.md §4.4, §9 | — | — |
| R-167 | Keyboard help overlay | M0 | TODO | DESIGN.md §4.2, §6.11 | — | — |
| R-168 | Keyboard-only execution | M0 | PARTIAL | DESIGN.md §1.1; BRD §7 | `src/components/exec/test-execution-screen.tsx` | `src/components/exec/test-execution-screen.test.tsx` |
| R-169 | Global search | M0 | TODO | DESIGN.md §2.1 | — | — |
| R-170 | Theme and density preferences | M0 | TODO | DESIGN.md §2.1, §4.3 | — | — |
| R-171 | Destructive confirmation pattern | M0 | TODO | DESIGN.md §1.7, §7 | — | — |
| R-172 | Undo toast | M0 | TODO | DESIGN.md §1.7, §4.1 | — | — |
| R-173 | Responsive layouts | M0 | TODO | DESIGN.md §10 | — | — |
| R-174 | Phone read-only | M0 | TODO | DESIGN.md §10 | — | — |
| R-175 | Accessibility: contrast, focus, targets | M0 | TODO | DESIGN.md §9 | — | — |
| R-176 | Accessibility: semantics and live regions | M0 | TODO | DESIGN.md §9 | — | — |
| R-177 | Accessibility: reflow, motion, forms | M0 | TODO | DESIGN.md §9 | — | — |
| R-178 | Accessibility checks in CI | M0 | TODO | DESIGN.md §9; implementation-plan.md cross-cutting | — | — |
| R-179 | Copy style guide | M0 | TODO | DESIGN.md §11 | — | — |
| R-180 | Typed service interfaces | M0 | PARTIAL | implementation-plan.md M0; ADR 0003 §5 | `src/services/interfaces.ts`, `src/services/types.ts` | — |
| R-181 | Local mock database | M0 | PARTIAL | ADR 0003 §5; mock-data.md | `src/services/mock/mockdb.ts` | `src/services/mock/mockdb.test.ts` |
| R-182 | Deterministic mock dataset | M0 | PARTIAL | mock-data.md | `src/services/mock/fixtures.ts`, `src/services/mock/rng.ts` | — |
| R-183 | Mock dev toolbar | M0 | TODO | mock-data.md Edge-case checklist | — | — |
| R-184 | Mock performance seed | M0 | TODO | mock-data.md Edge-case checklist | — | — |
| R-185 | Unicode and long-text safety | M0 | TODO | mock-data.md Edge-case checklist | — | — |
| R-186 | Guided tour component | M0 | TODO | DESIGN.md §4.2, §7 | — | — |
| R-187 | Guided tours for core goals | M3 | TODO | DESIGN.md §7 | — | — |
| R-188 | PDF user guide | M6 | TODO | BRD §4 | — | — |
| R-189 | Case list performance | M2 | TODO | implementation-plan.md cross-cutting | — | — |
| R-190 | Pagination ceilings enforced | M1 | TODO | database-schema.md Suggested indexes; openapi.yaml parameters | — | — |
| R-191 | Result save feels instant | M3 | TODO | DESIGN.md §1.7 | — | — |
| R-192 | Authorisation is server-side | M1 | TODO | DESIGN.md §8; ADR 0001 §1 | — | — |
| R-193 | Secrets never stored in the database | M1 | TODO | database-schema.md integration_configs | — | — |
| R-194 | Attachment allow-list | M3 | TODO | database-schema.md test_attachments | — | — |
| R-195 | Output escaping and injection safety | M1 | TODO | mock-data.md; ADR 0001 | — | — |
| R-196 | Rate limiting | M1 | TODO | implementation-plan.md deferred #13; openapi.yaml responses | — | — |
| R-197 | Pinned PocketBase | M1 | PARTIAL | ADR 0001 §0 | `scripts/pb-download.mjs` | — |
| R-198 | Dependency pinning and licence check | M1 | TODO | package.json; ADR 0001 | — | — |
| R-199 | Dev topology and rewrites | M1 | PARTIAL | ADR 0001 §2 | `next.config.ts` | — |
| R-200 | Production topology | M1 | TODO | ADR 0001 §2; implementation-plan.md M1 | — | — |
| R-201 | Backup and restore | M5 | TODO | implementation-plan.md cross-cutting | — | — |
| R-202 | Structured logs and health | M1 | TODO | implementation-plan.md cross-cutting | — | — |
| R-203 | Frontend error capture | M5 | TODO | implementation-plan.md deferred #8 | — | — |
| R-204 | Scaffold quality gates | M0 | DONE | package.json; README | `package.json`, `vitest.config.mts`, `playwright.config.ts`, `eslint.config.mjs` | `src/app/(auth)/sign-in/page.test.tsx`, `e2e/smoke.spec.ts` |
| R-205 | CI pipeline | M1 | TODO | implementation-plan.md cross-cutting | — | — |
| R-206 | Integration tests against PocketBase | M1 | TODO | implementation-plan.md cross-cutting | — | — |
| R-207 | Seed data is a script, not a migration | M1 | TODO | implementation-plan.md cross-cutting; database-schema.md | — | — |
| R-208 | All collections migrated at M1 | M1 | TODO | implementation-plan.md M1 | — | — |
| R-209 | Scale limit documented | M5 | TODO | ADR 0001 Consequences | — | — |
| R-210 | Browser support statement | M0 | TODO | BRD §8 | — | — |
| R-211 | Every mutation writes one audit row | M1 | TODO | database-schema.md audit_logs | — | — |
| R-212 | Audit log is immutable | M1 | TODO | database-schema.md Conventions, audit_logs | — | — |
| R-213 | Audit read is admin only | M1 | TODO | database-schema.md audit_logs; DESIGN.md §8 | — | — |
| R-214 | Audit rows survive project delete | M1 | TODO | database-schema.md audit_logs | — | — |
| R-215 | Audit filters and pagination | M1 | TODO | DESIGN.md §6.15 | — | — |
| R-216 | Audit before/after diff | M0 | TODO | DESIGN.md §6.15 | — | — |
| R-217 | Audit action catalogue | M1 | TODO | mock-data.md Audit log | — | — |
| R-218 | Immutable versions and results history | M2 | TODO | database-schema.md Snapshot policy | — | — |
| R-219 | Audit retention policy | M6 | DEFERRED | implementation-plan.md deferred #6 | — | — |
| R-220 | Requirements traceability verifier | M0 | DONE | requirements/REQUIREMENTS.md | `scripts/rtm-verify.mjs` | `scripts/rtm-verify.mjs` |
| R-221 | Requirements and RTM update together | M1 | TODO | requirements/REQUIREMENTS.md | — | — |
| R-222 | Deferred decisions register kept | M0 | PARTIAL | implementation-plan.md deferred decisions | `docs/implementation-plan.md` | — |
| R-223 | Contract before code | M1 | TODO | ADR 0002 process rules; openapi.yaml | — | — |
| R-224 | Architecture decisions recorded | M0 | PARTIAL | AGENTS.md; docs/adr | `docs/adr/0001-pocketbase-backend-nextjs-frontend.md`, `docs/adr/0002-api-first-design-testrail-reference.md`, `docs/adr/0003-own-client-api-and-agent-access.md` | — |
| R-225 | API contract maintained | M0 | PARTIAL | openapi.yaml | `docs/api/openapi.yaml`, `docs/api/README.md` | — |
| R-226 | Database schema document maintained | M0 | PARTIAL | database-schema.md | `docs/database-schema.md` | — |
| R-227 | UI design specification | M0 | PARTIAL | DESIGN.md | `docs/design/DESIGN.md`, `docs/design/mock-data.md` | — |
| R-228 | README setup and commands | M0 | PARTIAL | README.md | `README.md` | — |
| R-229 | Operator guide | M6 | TODO | implementation-plan.md cross-cutting | — | — |
| R-230 | Journey and scenario catalogue | M3 | TODO | docs/journeys | — | — |
| R-231 | Sprint, test and UAT evidence logs | M0 | TODO | BRD §5 | — | — |
| R-232 | Apache-2.0 licence and NOTICE | M0 | PARTIAL | LICENSE; NOTICE | `LICENSE`, `NOTICE` | — |
| R-233 | Third-party licence inventory | M6 | TODO | BRD §8 | — | — |
| R-234 | Open-source community files | M6 | TODO | BRD §4 | — | — |
| R-235 | Public repository hygiene scan | M6 | TODO | BRD §8 | — | — |
| R-236 | Release and versioning process | M6 | TODO | BRD §4 | — | — |
| R-237 | Owner acceptance per milestone | M0 | TODO | implementation-plan.md; BRD §10 | — | — |
| R-238 | Handover package | M6 | TODO | BRD §4 | — | — |
