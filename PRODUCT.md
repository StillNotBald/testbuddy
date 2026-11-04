# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Testers and QA leads have **equal weight**. Every screen is designed for both (owner, 2026-11-04).

- **QA tester:** works through assigned tests in a run and records Passed / Failed / Blocked / Retest with comments, defects and evidence. Execution is the daily work: a regression of 200 tests in one sitting.
- **QA lead:** designs the case repository, plans releases and milestones, assigns work, watches progress, closes runs and reads reports.
- **Secondary:**
  - an engineering manager (release readiness, read-only)
  - an admin (people, roles, CI tokens, audit log, archive)
  - a CI system and AI agents acting under a person's role

## Product Purpose

TestBuddy is an open-source test management application. Teams keep test cases in a versioned repository, plan and execute test runs against builds, record results with evidence, and report where a release stands.

Success means:

- a tester can run a full regression keyboard-only without losing context
- the history can be trusted
- CI and agents work under the same rules and audit as people

## Positioning

Open, fast and agent-ready (owner, 2026-11-04):

- **Open:** Apache-2.0 and self-hostable: one repo, a web process plus a PocketBase binary. Roles, audit log and scoped tokens are free, with no seat tax.
- **Fast:** keyboard-first execution. One result key records and advances, and a result is never lost.
- **Agent-ready:** a documented API plus an MCP endpoint. Agents and CI act under a person's role and are audited like humans.
- **Painless in and out:** TestRail XML/CSV case import with no duplicates on re-import, plus complete export.

## Operating Context

- Testers run long sessions at a desktop, often next to the app under test, so screen space and keyboard flow matter.
- Leads switch between the repository, plans, runs and reports.
- CI posts JUnit/Robot results with an `X-API-Token`.
- People are invited to a workspace and get a project role.
- The domain model is familiar to users of other test-management tools: suites, sections, cases, plans, runs, tests, results, milestones.

## Capabilities and Constraints

- **Stack:** Next.js App Router frontend. Milestone 0 runs on a mock local database in the browser; PocketBase comes in M1.
- **Roles:** Admin, Manager, Tester, Viewer per project. Workspace roles are Admin and Member. Hide what a role never needs; disable, with a reason, what it could do in another state.
- **Statuses:** Passed, Failed, Blocked, Retest, Untested (the default, derived). Failed and Blocked require a comment.
- **History is honest:**
  - every case save makes a new version
  - a test snapshots its case
  - closing a run is irreversible
  - the audit log is immutable
  - cases with results are deprecated, never deleted
- **No TestRail look-alike:** reuse familiar concepts and import TestRail files, but never copy its look, naming or wire format (no API compatibility).
- **Public repo, fictional data only:** demo people and data are fictional (`@example.test`). No real people, client or employer names anywhere.
- **Undecided:** whether phones are read-only in M0, plus the open D-decisions in `docs/design/proposal/index.html`.

## Brand Commitments

- The name is **TestBuddy**.
- Voice: plain, direct, task-first copy (see `docs/design/DESIGN.md` §11).
- No logo or brand assets exist yet.

## Evidence on Hand

- Fictional demo fixtures in `src/services/mock/fixtures.ts` and `docs/design/mock-data.md`.
- Product research: `docs/design/research/PRODUCT-RESEARCH.md`.
- None of these exist, and none may be fabricated: customers, testimonials, benchmarks, pricing.

## Product Principles

1. The keyboard is the fast path. Never make a tester reach for the mouse to record and advance.
2. Never lose or rewrite evidence. Corrections are new versions or new results.
3. People, CI and agents share one permission model and one audit log.
4. Getting data in and out is painless.
5. Show what matters for the role. Hide what a role never needs.

## Accessibility & Inclusion

- WCAG 2.2 AA (owner, 2026-11-04): full keyboard operation, screen-reader labels and live announcements, and AA contrast in light and dark themes.
- Zero serious or critical axe violations on every screen.
