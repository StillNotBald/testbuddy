# Build contract: Milestone 0 screens

Status: active from 2026-11-04. Step 5 of the UI process: decisions, shared interfaces, file ownership.

## Decisions in force
- The **recommended option** of every D-decision in `docs/design/proposal/index.html` (once it exists) and in `docs/design/research/PRODUCT-RESEARCH.md` ("DESIGN.md decisions").
- The 45 journey decisions in `docs/journeys/DECISIONS.md`.
- Owner answers override these defaults. A screen whose decision changes is adjusted afterwards.
- Key defaults:
  - result keys P/F/B/R save and advance (D-1)
  - plans are not a default nav item (D-2)
  - repository uses virtualised scroll (D-3)
  - "Re-run failed" exists (D-4)
  - edits coalesce into one version per editing session (D-5)
  - first run offers Import / Sample project / Start empty (D-7)
  - time-on-test is captured automatically (D-9)
  - phones are read-only except a quick single-result entry
  - CI tokens and the audit log are admin-only
  - a failed step pre-selects Failed
  - single-key hotkeys are on, with a toggle
  - pass rate = passed ÷ executed (untested excluded; blocked counted as not passed)
  - results are editable by any tester until the run closes (comment, elapsed and defects only, never the status history)

## Shared, read-only for screen builders
- `src/components/ui/**`, `src/components/shell/**`, `src/lib/**`, `src/app/layout.tsx`, `src/app/providers.tsx`, `src/app/tokens.css`.
- If you need a change here, **don't make it**. Put it in your report, and the lead applies it.
- `src/services/interfaces.ts`, `src/services/mock/**`, `src/services/hooks/**`: **additive edits only** (new methods, new hooks). Never rename or change an existing signature. Re-read the file right before each edit, because another builder may have changed it. Keep the mock and the PocketBase stub in sync (the stub throws "not implemented (M1)").

## File ownership per builder
| Builder | Routes (`src/app/(app)/...`) | Own components |
|---|---|---|
| A, repository | `p/[projectId]/cases/**` (list, tree, inspector, editor, history) | `src/components/repo/**` |
| B, execution | `p/[projectId]/runs/**`, `p/[projectId]/plans/**`, `p/[projectId]/reports/**` | `src/components/exec/**` |
| C, admin | `p/[projectId]/members`, `audit`, `settings`, `milestones/**` | `src/components/admin/**` |
| D, entry | `projects/**`, `p/[projectId]/page.tsx` (overview), `(auth)/sign-in`, onboarding, `p/[projectId]/automation/**` | `src/components/entry/**` |

## Every builder must
1. **First invoke the Skill tool with skill `impeccable`.** Run its shape step before building and its critique step on your screens before finishing. Report which commands ran.
2. Follow `docs/design/DESIGN.md` §6 (screen spec), §8 (roles), §9 (a11y), §10 (responsive), §11 (copy).
3. Use the existing primitives and tokens only: no raw hex, no new UI library.
4. Implement every state: loading, empty, error, no-permission/viewer, and closed or archived where relevant.
5. Add `data-tour` targets listed in `src/guide/TARGETS.md` when that file exists.
6. Tests: a Vitest + Testing Library test per screen, covering the main flow, a role rule and the empty state. Run with `npx vitest run <your files> --maxWorkers=1`.
7. Keep `npm run typecheck` and `npm run lint` at 0 errors for your files. Don't run `next build`, start dev servers or install browsers. The lead does those. The dev server on :3000 is already running for curl checks.
8. Leave `requirements/` alone. Report the R-IDs your screens satisfy and the lead updates the RTM.
9. No real names (fictional demo people only) and no private project or client names. The repo is public.
10. No git commands.
