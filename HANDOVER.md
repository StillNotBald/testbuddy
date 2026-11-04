# Handover

For the originator taking over TestBuddy. Original idea and specification by maxlinux (https://github.com/maxlinux/testbuddy). The repository is published at https://github.com/StillNotBald/testbuddy. This is the state of the repository on 2026-11-04.

## 1. What was built, and how it maps to your spec

Your original spec (database schema, API contract, implementation plan, ADR 0001 and 0002) is in `docs/`. Everything in this repository traces back to it or to a design decision recorded next to it.

Built (Milestone 0): a Next.js 16 UI on typed mock services and a browser-storage mock database. It covers projects, the case repository (tree, list, editor, versions), runs and test execution, plans, milestones, reports, the automation screens, members, audit log and settings. Role gating is enforced in the UI only. See the README for the full list and for what is explicitly not built.

Not built: any server code. `pb_migrations/` and `pb_hooks/` are empty, `src/services/pocketbase/` is a stub, and the REST API and CI ingestion exist only as specification. The MCP server is built (`src/mcp`, `/api/mcp`, `mcp/server.mjs`) on a server-side demo dataset; `src/mcp/data-source.ts` is the one seam to switch to PocketBase in M1.

Requirement origin: `requirements/REQUIREMENTS.md` has 238 requirements, each tagged. **120 are "original spec"** (traced to your schema, API, plan and ADRs). **118 are "our design"** (from the UI/UX design spec, research, BRD or ADR 0003, written on 2026-11-04). Review the 118 first. They are the part you have not seen before, and they are proposals, not decisions.

## 2. Decided and open

**Decided**
- Own clients only, no third-party client compatibility. Next.js frontend, PocketBase v0.40.6 backend, UI first on a mock database, then the backend. Tailwind with in-repo shadcn-style primitives. Apache-2.0. Whole repository handed over. (ADR 0001 to 0003, `sprint-log/2026-11-04_m0-scaffold/`.)
- **45 journey-map decisions** across run, result, case and CI lifecycles, all answered "standard practice": `docs/journeys/DECISIONS.md`, with machine-readable files `docs/journeys/*.decisions.yaml`. Their effects are already written into `docs/database-schema.md` and `docs/api/openapi.yaml`. Re-read them: they were answered quickly, as a block.

**Open**
- **D1 to D27**, the design decisions in `docs/design/proposal/index.html` (open it in a browser). Each has options and a recommendation. D1 to D12 come from the product research, D13 to D17 are open UX defaults, D18 and D19 are spec gaps, D20 to D26 are contradictions found in the spec, D27 was found while drawing. Your answers are saved in your browser only; use "Copy answers" and paste them into a file in the repo, for example `docs/design/DECISIONS.md`.
- Several screens already implement a recommended default (for example Plans out of the default menu, a virtualised case list, merged quick edits to one case version, a sample project). Treat those as provisional until you answer.
- The deferred-decisions register in `docs/implementation-plan.md` (rate limits, MCP authentication, results-history import, and others).
- The BRD and requirements are a **draft, not baselined**. Baselining means pruning and merging after you answer the D-decisions, then signing off the BRD and requirements together.
- Owner review gate: ADR 0003 and the plan require your approval of the M0 UI before M1 starts.

## 3. Requirements health

Run on 2026-11-04:

```
$ npm run rtm:verify
RTM OK: 238 requirements in sync (2 DONE, 82 PARTIAL, 151 TODO, 3 DEFERRED).
```

DONE needs a test path in the RTM; a claim without a test stays PARTIAL. The large TODO count is mostly M1 to M6 server work. Re-run the command for current numbers.

## 4. Test evidence

Index: [`testing-log/README.md`](testing-log/README.md). Runs are dated and immutable.

| Run | What it shows |
|---|---|
| `testing-log/2026-11-04_m0-scaffold-gates/` | Typecheck, lint, unit test, build and PocketBase binary checks on the scaffold |
| `testing-log/2026-11-04_e2e-4011733/` | First Playwright run |
| `testing-log/2026-11-04_e2e-6cbcd0f/` | Playwright on the built screens: 47 passed, 1 skipped |
| `testing-log/2026-11-04_render-check-0662317/` | First phone and desktop render check |
| `testing-log/2026-11-04_render-check-9e08566/` | Latest full run: **104 of 108 ok** (4 phone-width page checks failed); spot re-run after the fix: 4 of 4 ok. The earlier run fe4ce44 (53 of 108) is superseded. Screenshots are in the folder |

UAT: `UAT-log/` has a plan (`M0-UAT-PLAN.md`) for a non-developer to run, plus empty findings, root-cause and retest sheets. **No UAT round has been run.**

## 5. How to run every gate

Node 24 and `npm ci` first. E2E and render check need a running production build; they never build for you.

| Gate | Command |
|---|---|
| Lint | `npm run lint` |
| Typecheck | `npm run typecheck` |
| Unit tests | `npm test` |
| Requirements and RTM | `npm run rtm:verify` |
| Build | `npm run build` |
| E2E | `npm run build && npm run start:standalone` in one terminal, then `npx playwright install chromium` once and `npm run e2e` in another (default `BASE_URL=http://127.0.0.1:3100`; reports go to `playwright-report/`) |
| Render check | with the standalone build running, `BASE_URL=http://127.0.0.1:3100 npm run render:check` |
| Formatting | `npm run format` |

CI (`.github/workflows/ci.yml`) runs lint, typecheck, tests, `rtm:verify`, build and e2e on every push and pull request. It has not yet run on a hosted repository, so expect to fix small things on the first run. Render check is not in CI.

## 6. Known gaps and next milestone

Known gaps
- No server, no real auth, data is per browser.
- No UAT round. No visual regression baseline (screenshots are evidence, not assertions).
- TestRail import is a library without a screen or endpoint.
- Automation screens have nothing to post to. Jira, Xray, webhooks, CSV export and AI features are specification only. The MCP server has no OAuth yet, so a claude.ai custom connector needs a public HTTPS deploy plus M1 auth; Claude Code and Claude Desktop work locally today (see `docs/mcp/README.md`).
- Mock data determinism is tested through the fixtures; the testing-log index may list stale `MISSING` rows, so re-check it.
- `docs/user-guide/dist/` (PDF output) is git-ignored and must be rebuilt with `npm run user-guide:pdf`.

**Next: Milestone 1, PocketBase foundation** (`docs/implementation-plan.md`). Do not start before you pass the M0 review gate. First tasks:
1. Answer D1 to D27 and baseline the BRD and requirements.
2. Fix the render-check findings and re-run it into a new `testing-log/` folder.
3. `npm run pb:download`, then write migrations for **all** collections in `docs/database-schema.md` (later-milestone ones empty) in `pb_migrations/`.
4. Seed migration (statuses, priorities, case types) and a documented, env-driven superuser bootstrap. No committed passwords.
5. Implement `src/services/pocketbase/` against `src/services/interfaces.ts`, switch with `NEXT_PUBLIC_DATA_SOURCE=pocketbase`; the UI must not change.
6. API rule tests for all four project roles, including a cross-project escalation case; add them to CI.
7. Enable GitHub private vulnerability reporting on the repository (SECURITY.md relies on it).

## 7. Governance docs and how to keep them in sync

| Doc | Role | Rule |
|---|---|---|
| `docs/product/BRD.md` | Business context | Draft; baseline with the requirements |
| `requirements/REQUIREMENTS.md` | Contract: R-IDs with acceptance, source, origin, milestone, status | IDs are never renumbered or reused |
| `requirements/TRACEABILITY.md` | RTM mirroring the requirements, with test paths | Update both in the same commit; `npm run rtm:verify` enforces it |
| `sprint-log/` | Build receipts, one dated folder per wave | Immutable; correct in a newer wave |
| `testing-log/` | Evidence of test runs | Dated, immutable; re-runs get new folders; the index states gaps as `MISSING` |
| `UAT-log/` | Human acceptance findings, root causes, retests | One Finding ID per defect |
| `docs/api/openapi.yaml`, `docs/database-schema.md` | Contract | Change with the code, in the same PR |
| `PRODUCT.md`, `DESIGN.md`, `docs/design/BUILD-CONTRACT.md` | Product and UI rules | Read before any UI change |

Working rhythm: change code, change the requirement and RTM line, run `npm run rtm:verify` and the other gates, add a `testing-log/` folder for any notable run, add a `sprint-log/` summary for each wave. The pull request template asks for exactly this.
