# Testing log

`testing-log/` is the evidence record for test runs: that a run happened, what it proved, and where it fell short. The tests themselves live beside the code (`src/**/*.test.ts[x]`, `e2e/`, `scripts/`). This folder only records runs.

## The evidence contract

1. **Dated, immutable folders.** Each run is recorded in `testing-log/YYYY-MM-DD_<slug>/README.md`. Once written, a folder is not edited to change its findings.
2. **Re-runs get new folders.** Running the same gate next week produces a new dated folder. If a later run contradicts an earlier one, the later folder says so and links back. It does not erase the earlier record.
3. **The summary is the evidence.** Each folder's `README.md` states what was run (the exact command), the operator, the method, the result, and the gaps. Every claim must be re-derivable by re-running the command it names. Raw output (logs, screenshots, JSON reports) may be attached, but do not commit large or binary captures. Commit the summary and, if useful, a short pasted tail.
4. **One status, one place.** This index points to test surfaces and dated runs. It does not restate pass/fail counts. Counts belong in the dated folder that produced them.
5. **Honesty over completeness.** If no test covers a surface, the index says `MISSING`. A gap written down is a known gap. A gap hidden by silence is a live risk.

## Test surfaces

| Surface | Where | How to run | Status |
|---|---|---|---|
| Vitest unit tests | co-located `src/**/*.test.ts` and `*.test.tsx` | `npm test` | Present: 142 tests across all screens, the importer and the mock services (2026-11-04) |
| Playwright e2e | `e2e/*.spec.ts` | `BASE_URL=http://127.0.0.1:3100 npm run e2e` (run `npx playwright install chromium` once; app must already be running) | Present: sign-in, redirect, role sidebar, search, help, theme, mock DB. First run: [`2026-11-04_e2e-4011733/`](./2026-11-04_e2e-4011733/README.md). Built screens: [`2026-11-04_e2e-6cbcd0f/`](./2026-11-04_e2e-6cbcd0f/README.md), 47 passed, 1 skipped |
| RTM verifier | `scripts/rtm-verify.mjs` | `npm run rtm:verify` | Present: 238 in sync |
| Lint, typecheck, build gates | ESLint, `tsc --noEmit`, `next build` | `npm run lint`, `npm run typecheck`, `npm run build` | Present |
| Phone (390px) and desktop screenshot render check | `scripts/render-check.mjs`, routes in `scripts/render-routes.json` | `BASE_URL=http://127.0.0.1:3100 npm run render:check` (never builds; run `npm run build && npm run start:standalone` first) | Present. Last full run 104 of 108 ok (4 phone-width checks failed); spot re-run passes. First run: [`2026-11-04_render-check-0662317/`](./2026-11-04_render-check-0662317/README.md) |
| Mock data determinism | `src/mocks/seed.ts` (planned) | none | **MISSING**: not yet in the repo |

Re-check this table each time a surface lands. When a surface moves from `MISSING` to present, record the first run in a new dated folder.

## Dated entries

- [`2026-11-04_m0-scaffold-gates/`](./2026-11-04_m0-scaffold-gates/README.md): typecheck, lint, unit test, build and PocketBase binary checks on the Milestone 0 scaffold. Gaps: no e2e run, no phone-width render check.
- [`2026-11-04_e2e-4011733/`](./2026-11-04_e2e-4011733/README.md): first Playwright e2e run against the production build.
- [`2026-11-04_render-check-0662317/`](./2026-11-04_render-check-0662317/README.md): first phone/desktop, light/dark render check with axe scan. Phone width fails.
