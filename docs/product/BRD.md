# TestBuddy Business Requirements Document (BRD)

Status: **DRAFT v0.1, 2026-11-04, not baselined.** Agent-drafted and not yet reviewed by the owner or the originator. Sign-off is in section 10, after the mockup D-decisions.
Companion documents: `requirements/REQUIREMENTS.md` (testable contract, R-IDs), `requirements/TRACEABILITY.md` (RTM), `docs/implementation-plan.md`, `docs/design/DESIGN.md`, `docs/adr/`.
Licence: Apache-2.0.

## 1. Purpose and problem

TestBuddy is an open-source test management application: teams keep their test cases in a versioned repository, plan and execute test runs against builds, record results with evidence, and report where a release stands.

The problem it addresses:

- Teams doing manual and automated testing need one place that holds cases, runs, results and CI output. Spreadsheets lose history; heavyweight commercial tools cost per seat and cannot be self-hosted freely.
- Execution is the daily work. A tester running a regression of 200 tests loses most of the time to mouse travel, page loads and re-finding the next test. The tool must make the keyboard the fast path.
- Test evidence must be trustworthy. A passed result is worthless if the case it passed against can be edited afterwards, a closed run can be reopened, or the audit trail can be changed.
- Teams now want AI agents to read cases, create runs and record results. Agents must act under the same rules and audit as people.
- Teams migrating from another tool need their cases brought across without re-typing them.

TestBuddy keeps a familiar test-management domain model (suites, sections, cases, plans, runs, results) but is its own product: its own API, its own clients, its own look.

## 2. Goals and non-goals

### Goals

1. A tester can execute a full regression keyboard-only, quickly and without losing context.
2. History is honest: versioned cases, snapshotted tests, immutable audit log, irreversible run close.
3. CI results arrive idempotently and are traceable to builds, branches and commits.
4. People and agents work through the same permission model and the same audit log.
5. A team can self-host the whole product from one repository with two processes (web and PocketBase) and a documented backup.
6. Migration from an existing tool is a data import (XML or CSV), not a compatibility layer.
7. The look-and-feel is approved by the owner on a clickable prototype before any backend work starts.
8. The repository is handed over whole to its originator and published as open source, with a user guide and an in-app guided tour.

### Non-goals

- No wire compatibility with any other test-management product's API or clients (ADR 0003).
- No import of historical results from another tool in v1 (cases only).
- No SSO/SAML, 2FA, per-project custom statuses or priorities, shared steps, BDD/Gherkin or datasets in v1 (deferred decisions register).
- No point-of-sale, time tracking, bug tracker or requirements-management product; integration with an external tracker only.
- No phone-based execution in v1 (phones are read-only; pending owner confirmation).
- No hosted multi-tenant SaaS offering as part of this repository.
- No AI model vendor is selected; M6 prepares contracts and exports only.

## 3. Target users and personas

| Persona | Needs | Typical project role | Key capabilities |
|---|---|---|---|
| QA tester | Execute assigned tests fast, record status, comment, defects and evidence, retest | Tester | Run detail, test execution with hotkeys, case editing, attachments |
| QA lead | Design the repository, plan releases, assign work, watch progress, close runs | Manager (or Admin) | Cases, milestones, plans, runs, assignment, reports, automation mappings, import |
| Engineering manager | See release readiness without operating the tool | Viewer (or Manager) | Overview, milestone and run reports, executive summary, CSV export (Manager) |
| Admin | Run the instance and the project: people, roles, tokens, audit, archive, backup | Admin (project) and workspace admin | Members, CI tokens, audit log, settings, project archive/delete |
| CI system | Post build results automatically without a human session | Service identity mapped to a role (run_as) | `X-API-Token` posting, JUnit and Robot import, idempotent re-post |
| AI agent | Read the repository, create runs, record results on a user's behalf | The role of the token owner | MCP tools (`/api/mcp`, stdio) over the same API and rules |

Project roles: Admin, Manager, Tester, Viewer. The full matrix is in `requirements/REQUIREMENTS.md` (Identity & roles) and `docs/design/DESIGN.md` section 8.

## 4. Business capabilities and scope per milestone

### Capabilities

1. Identity and access: sign-in, workspace and project roles, membership.
2. Repository: suites, sections, cases, steps, tags, versions, deprecation, import.
3. Execution: milestones, plans, runs, tests, results, step results, evidence, close.
4. Automation: CI tokens, result posting, JUnit and Robot importers, executions.
5. Reporting: dashboards, milestone and run reports, trends, exports.
6. Integrations: issue tracker, Xray-shaped export, signed webhooks.
7. Agent access: MCP server.
8. Governance: immutable audit log, traceability of requirements to tests.
9. Learning and handover: guided tour, PDF user guide, operator guide, open-source community files, handover package.

### Scope by milestone

| Milestone | In scope | Out of scope (until later) |
|---|---|---|
| M0 UI prototype | Next.js app on typed mock services and a local mock database (browser storage, seeded, reset). All 16 screens, shell, role gating via a dev role switcher, keyboard map, accessibility baseline, guided tour component, owner look-and-feel gate with numbered decisions | Any server, real auth, real persistence beyond the browser, imports that write real data |
| M1 Foundation | PocketBase v0.40.6 pinned, all collections migrated, seeds for lookups, auth, project and membership transactions, role rules and the 4-role test matrix, audit log core, health, CI pipeline, README | Case repository logic, execution logic |
| M2 Repository | Suite/section tree, case CRUD and versions, history and compare, filters, delete and deprecate rules, tags, generic JSON import | Runs and results |
| M3 Execution | Milestones, plans, runs with snapshots, results, step results, batch results, attachments, close, realtime progress, first guided tours | Automation tokens, reports beyond the run dashboard |
| M3b MCP | `/api/mcp` Streamable HTTP, stdio entry, thin tool set, agent auth decision | Business logic in the route |
| M4 Automation | Mappings, CI tokens, idempotent posting, JUnit and Robot importers, executions UI, TestRail XML/CSV import | Importing TestRail result history |
| M5 Reporting and integrations | Server-side reports and trends, executive summary, CSV export, issue-tracker integration, Xray-shaped export, webhooks, backup and restore drill, error capture | AI features |
| M6 AI preparation and handover | `requirements` and coverage collections used, corpus export, draft contracts, PDF user guide, operator guide, licence inventory, community files, hygiene scan, handover package | A selected AI vendor, a production AI feature |

Every milestone ends with a runnable app, a recorded acceptance demo and an owner decision in the UAT log.

## 5. Delivery evidence and governance

- Requirements are the contract. `requirements/REQUIREMENTS.md` is canonical; the RTM mirrors it; both change in the same commit; `node scripts/rtm-verify.mjs` enforces it.
- A requirement is DONE only with a test listed in the RTM.
- Each milestone leaves a sprint log, a testing log and a UAT log in the repository.
- Architecture decisions are ADRs. Contract changes (`docs/api/openapi.yaml`) precede code.
- The owner decides at the look-and-feel gate; the numbered decision list is committed and later UI changes that contradict it need a new decision.
- Open UX defaults awaiting owner confirmation: phones read-only; CI tokens and audit log admin-only; a failed step pre-selects Failed; single-key hotkeys on with a toggle.

## 6. Business rules

| # | Rule | Where enforced |
|---|---|---|
| BR-1 | Immutability: case versions, test snapshots with results, results of closed runs and audit rows are never edited by any client. Corrections are new versions or new results. | Hooks and API rules; integration tests |
| BR-2 | Closing a run is irreversible. No reopen exists in the UI, API or MCP. Untested tests stay untested. | `close_run`, rules after close |
| BR-3 | Versioning: every case save creates version n+1 with a full snapshot (case plus steps). A test snapshots the case when it enters a run; the snapshot is refreshed only until the first result, then frozen. A result records the case version executed. | `update_case`, `add_run` |
| BR-4 | Deprecate, do not delete: a case with results is deprecated and removed from open runs, never hard-deleted by a client; a case without results is hard-deleted. Deprecated cases cannot join new runs. Suite delete is Admin only and audit-logged. | `delete_case`, suite rules |
| BR-5 | Idempotent CI: posting the same external execution id twice creates no duplicate results. Re-importing a case file with the same source keys creates no duplicate cases. | `automation_executions`, `source_key` |
| BR-6 | Role model: Admin, Manager, Tester, Viewer per project; workspace roles Admin and Member. Hide what a role never needs; disable (with a reason) what it could do in another state. The server is authoritative. | Collection rules; `RoleGate` |
| BR-7 | Flagged statuses (Failed, Blocked) require a comment. Untested is derived and cannot be posted. | Hook and UI |
| BR-8 | Agents and CI act with a token owned by a person or a service identity, are bound by that role, and are audited like humans. No privileged back door. | MCP route, token auth |
| BR-9 | Secrets are never stored in the database or the repository. CI tokens are shown once and stored hashed. | Hooks, env |
| BR-10 | Case references `{prefix}-C{n}` are never reused. | `add_case` counter |
| BR-11 | Every mutation writes exactly one audit row. | Hooks |

## 7. Success metrics

| Metric | Target | Measured by |
|---|---|---|
| Keyboard-only execution | A tester executes 200 tests with no mouse use | Scripted Playwright run plus timed manual UAT |
| Case list latency | 300 ms or less at 5000 cases per project | Perf seed, browser timing, then PocketBase |
| Run dashboard latency | 500 ms or less at 1000 tests | Same |
| Result save feedback | Visible change under 100 ms (optimistic) | Browser timing |
| Idempotent CI | 100 percent of replayed payloads produce zero new results | Integration tests |
| Role matrix | Every row of the matrix holds on the UI and on the server for all four roles | Role-matrix test suite |
| Accessibility | Zero serious or critical axe violations on all screens; WCAG 2.1 AA goal | CI axe run, manual screen-reader pass per milestone |
| Requirements health | 0 RTM verifier failures; every DONE has a test | `rtm-verify` in CI |
| Time to first value | A new user completes the "run my first test" tour in under 5 minutes | UAT observation |
| Migration | A real TestRail case export imports with no duplicates on re-import | M4 fixtures |

## 8. Assumptions, constraints and risks

### Assumptions

- Teams are small to medium: tens of users, thousands of cases per project, hundreds of tests per run.
- One workspace is active at a time per user; installations are single-node and self-hosted.
- Browsers: latest Chrome, Edge, Firefox and Safari. Desktop and tablet for work; phone read-only.
- The originator reviews the prototype before backend work and accepts or amends each numbered decision.

### Constraints

- Stack is fixed by ADRs: Next.js 16, React 19, Tailwind v4, Radix, TanStack Query and Table; PocketBase v0.40.6 is the only backend; npm only; Node 24 or newer.
- API first: the OpenAPI contract precedes code. No other database, ORM or backend.
- Licence is Apache-2.0; all dependencies must be compatible and listed.
- The repository will be public: no secrets, personal data, private project names or third-party confidential material in the tree or its history.
- Original look and naming; no copied assets or layouts from other products.

### Risks

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| RK-1 | PocketBase upstream moved (repository archived and relocated); release location or cadence may change | Medium | High | Pin exactly v0.40.6, verify checksum, record the release location, upgrade by deliberate PR, keep data access behind services |
| RK-2 | SQLite single-node limits at large scale or many concurrent writers | Medium | Medium | Documented supported scale, pagination ceilings, server-side aggregates, perf budgets tested, documented backup, signs-of-strain section in the operator guide |
| RK-3 | Licence incompatibility or an unlicensed asset enters the repository | Low | High | Licence inventory, CI licence listing, NOTICE, review of the guided-tour component licence (MIT) |
| RK-4 | UI rework after real data shapes arrive (hook errors, permissions) | Medium | Medium | Typed service interfaces from the contract, mock obeys real field names, error toggles in the dev toolbar |
| RK-5 | Agent access widens the attack surface | Medium | High | Token auth bound to roles, no back door, rate limits, auth decision recorded before M3b |
| RK-6 | Accessibility or keyboard model regressions | Medium | Medium | Axe in CI, keyboard-only scripted run, manual screen-reader pass per milestone |
| RK-7 | Public repository leaks private or confidential material | Low | High | Hygiene scan of tree and history before publishing; review of fixtures and docs |
| RK-8 | Scope growth past the milestone plan | Medium | Medium | Deferred decisions register, owner gate per milestone |

## 9. Dependencies and glossary

### Dependencies

- PocketBase v0.40.6 release binary and its checksum.
- Node 24, npm, the pinned packages in `package.json`.
- A guided-tour component under the MIT licence.
- For M5: an issue tracker API (Jira), a webhook receiver for testing.
- For M4: a real TestRail case export (XML and CSV) as fixtures.
- Owner availability for the look-and-feel gate and per-milestone UAT.

### Glossary

| Term | Meaning |
|---|---|
| Case | A reusable test definition: title, preconditions, steps; has versions |
| Step | One action with an expected result |
| Suite, section | Top-level and nested folders of cases |
| Test | A case inside a run, carrying a snapshot and the latest status |
| Run | A set of tests executed against a build; closing is permanent |
| Plan | A group of runs for one release effort |
| Milestone | A release or date goal that plans and runs roll up into |
| Result | One recorded outcome of a test: status, comment, time, defects, evidence |
| Snapshot | The frozen copy of a case a test uses, labelled with its version |
| Deprecated | A case kept for history but excluded from new runs |
| Mapping | Rule connecting CI test names to case refs |
| CI token | Secret a CI job uses to post results; shown once, stored hashed |
| Idempotent | Repeating the same request yields the same state, with no duplicates |
| Façade | The custom `/api/v1` API served by PocketBase hooks |
| MCP | Model Context Protocol, the way agents call tools |
| Gate | An owner approval point before the next stage starts |
| RTM | Requirements traceability matrix |
| R-ID | Stable requirement identifier, never reused |
| Pass rate | Passed tests divided by tests with a result in scope (definition to be confirmed by the owner; see spec gaps) |

## 10. Sign-off

Sign-off covers this BRD and the requirement set in `requirements/REQUIREMENTS.md` at the commit recorded below. Each milestone acceptance is recorded separately in the UAT log.

Baseline commit: ______________________

| Role | Name | Date | Decision (approved / approved with changes / rejected) |
|---|---|---|---|
| Product owner / originator | | | |
| QA lead representative | | | |
| Engineering lead | | | |
| Security reviewer | | | |
| Accessibility reviewer | | | |
