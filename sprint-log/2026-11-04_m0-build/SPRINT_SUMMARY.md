# Sprint summary: Milestone 0 build and open-source preparation (2026-11-04)

## Goal

Build the Milestone 0 screens on a mock local database, record the evidence, and prepare the repository to be published as Apache-2.0 open source and handed over whole.

## Scope

In:
- Governance docs: BRD, 238 requirements, RTM and its verifier, four journey maps with 45 decisions.
- Mock local database and typed mock services, with deterministic fixtures.
- Screens in four builder waves: repository (A), execution and entry (B, D), admin (C).
- TestRail case import parser and dry-run planner (library only).
- Guide: built-in guided tour, Help menu, `/how-it-works`, `llms.txt`, user-guide PDF pipeline.
- Test evidence: Playwright e2e, phone and desktop render check.
- Open-source files: README, HANDOVER, CHANGELOG, `.github/` (CI, templates, Dependabot), package.json metadata.

Out:
- Any PocketBase collection, hook or migration (Milestone 1).
- A server, real authentication, the REST API, the MCP server, CI result ingestion.
- Fixing the phone-width and accessibility findings of the render check (a fix wave was running when this entry was written; its result belongs in its own summary).
- The owner's answers to the D-decisions.

## Owner decisions

- Own clients only; Next.js frontend with PocketBase later, mock local database first (see the scaffold summary).
- Apache-2.0; hand over the whole repository.
- Journey-map open questions answered "follow standard practice" (45 decisions, `docs/journeys/DECISIONS.md`).
- Plans is not a default navigation item (D-2).

## What shipped

| Wave | Commits | Change |
|---|---|---|
| Governance | n/a (history squashed) | BRD, requirements and RTM with `rtm:verify`, NOTICE; origin tags; journey maps and decisions |
| UI foundation | n/a (history squashed) | Mock database, services, app shell; fictional demo names; clickable mockups; build contract |
| Guide | n/a (history squashed) | PRODUCT.md, built-in guided tour, Help menu, `/how-it-works`, `llms.txt`, PDF pipeline |
| Builder A | n/a (history squashed) | Repository: suite tree, virtualised case list, inspector, editor, history and diff |
| Builder C | n/a (history squashed) | Admin: milestones, members, audit log, settings |
| Builders B, D | n/a (history squashed) | Execution (plans, runs, test view, reports) and entry (projects, overview, automation) screens |
| Import | n/a (history squashed) | TestRail XML/CSV parser and dry-run planner |
| Evidence | n/a (history squashed) | Playwright e2e and render-check harness; e2e expectations updated to the built screens |
| Open-source prep | uncommitted at time of writing | README, HANDOVER, CHANGELOG, `.github/`, package.json metadata, this entry |

## Gates run and results

| Gate | Command | Result |
|---|---|---|
| RTM verifier | `npm run rtm:verify` | Pass: 238 requirements in sync (2 DONE, 82 PARTIAL, 151 TODO, 3 DEFERRED) |
| E2E | `BASE_URL=http://127.0.0.1:3100 npx playwright test --workers=2` | 47 passed, 1 skipped, 0 failed ([`testing-log/2026-11-04_e2e-6cbcd0f/`](../../testing-log/2026-11-04_e2e-6cbcd0f/README.md)) |
| Render check | `BASE_URL=http://127.0.0.1:3100 npm run render:check` | **Fail**: 53 ok of 108 checks; phone-width and axe findings ([`testing-log/2026-11-04_render-check-fe4ce44/`](../../testing-log/2026-11-04_render-check-fe4ce44/README.md)) |
| Typecheck, lint, unit tests, build | `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` | Not re-run for this entry; last recorded results are in [`testing-log/README.md`](../../testing-log/README.md) |
| UAT | `UAT-log/M0-UAT-PLAN.md` | Not run: no UAT round has happened |
| CI workflow | `.github/workflows/ci.yml` | Not run: not yet pushed to a hosted repository |

## Owner-visible changes

- All Milestone 0 screens are navigable on mock data (see README, "What works now").
- New files at the repository root: `HANDOVER.md`, `CHANGELOG.md`, `.github/`.
- `package.json` gains description, keywords and repository, homepage and bugs URLs.

## Open items

- Answer the D-decisions and baseline the BRD and requirements. Owner: owner.
- Fix the render-check findings (phone overflow, button names) and record a new render-check folder. Owner: next build wave.
- Run the first UAT round. Owner: owner.
