# Gate run: Milestone 0 scaffold (2026-11-04)

- **Covers:** commits `fc025a7` and `b00dbf1` (see `sprint-log/2026-11-04_m0-scaffold/SPRINT_SUMMARY.md`).
- **Method:** npm scripts from the repo root, run in sequence on the scaffold branch.
- **Operator:** Claude agent.
- **Environment:** not recorded at run time. The repo's `engines` field requires Node `>=24`; a re-run should record `node -v` in its own folder.

## Commands and results

| Gate | Command | Result |
|---|---|---|
| Typecheck | `npm run typecheck` | Pass |
| Lint | `npm run lint` | Pass |
| Unit tests | `npm test` | Pass: 1 test (smoke, `src/app/page.test.tsx`) |
| Build | `npm run build` | Pass |
| PocketBase binary | `npm run pb:download` | Pass: v0.40.6 downloaded, SHA-256 matched the pinned checksum |

## Gaps

- **No e2e run.** `npm run e2e` was not executed: Playwright browsers are not installed, and the one smoke spec is a placeholder. Surface: Playwright e2e, `MISSING`.
- **No phone-width render check.** No 390px or desktop screenshot check exists yet. Surface: render check, `MISSING`.
- **Unit coverage is one smoke test.** Gate passes show the scaffold compiles and renders; they do not show behaviour. Real behaviour checks start with the Milestone 0 screens.

## What this run does not prove

It does not prove any screen works. It proves the scaffold compiles, lints, passes its one test, builds, and that the PocketBase binary matches the pinned release.
