# Sprint log

`sprint-log/` holds the build receipts: one folder per delivery wave, recording what the wave set out to do, what it shipped, and what checks it ran.

## The rules

1. **One folder per wave, dated and immutable.** Each wave gets `sprint-log/YYYY-MM-DD_<slug>/SPRINT_SUMMARY.md`. Once written, the folder is history. Do not edit a past summary to change what it says. If a later fact contradicts it, add a correction in the newer wave's summary and link back.
2. **Summary contents.** Every `SPRINT_SUMMARY.md` has these sections, in this order:
   - **Goal**: one or two sentences on what the wave was for.
   - **Scope**: what was in and what was explicitly out.
   - **Owner decisions**: decisions the owner made that shaped the wave, in one line each.
   - **What shipped**: the change list, each item with its commit SHA(s) on `main` or the working branch.
   - **Gates run and results**: each check that ran (typecheck, lint, unit tests, build, e2e, RTM verifier, render check), its command, and its result. A gate that did not run is written as `not run`, with the reason.
   - **Owner-visible changes**: anything a person using the app or reading the docs would notice. Write `none` if nothing.
   - **Open items**: unfinished work, each with a named owner.
3. **Evidence lives in the summary.** The summary names the commands and SHAs, so anyone can re-derive the claim. Detailed test runs go in `testing-log/`, not here.
4. **No status counts that cannot be re-run.** Quote a count only when it comes from a command the summary names.
5. **Keep it short.** A wave summary is a receipt, not a diary. Link to the ADR, design doc or requirement instead of retelling it.
6. **Templates.** Start a new wave by copying the section list above. Do not copy another wave's content.

## Index

| Folder | Wave | Commits |
|---|---|---|
| [`2026-11-04_spec-foundation/`](./2026-11-04_spec-foundation/SPRINT_SUMMARY.md) | Spec foundation: API contract fixes, UI/UX spec, ADR 0003, licence | `788b1e7`, `cddd49c`, `7c69c2c` |
| [`2026-11-04_m0-scaffold/`](./2026-11-04_m0-scaffold/SPRINT_SUMMARY.md) | Milestone 0 scaffold: Next.js 16 app, design tokens, PocketBase pin | `fc025a7`, `b00dbf1` |
| [`2026-11-04_m0-build/`](./2026-11-04_m0-build/SPRINT_SUMMARY.md) | Milestone 0 build and open-source preparation | see summary |
