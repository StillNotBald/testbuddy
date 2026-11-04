# TestBuddy journey maps

Four draft maps of TestBuddy's core lifecycles, written with a journey-mapping tool
(a state-map engine that turns a decided map into state tables, Gherkin tests, UAT sheets
and a coverage verdict). They are a DRAFT for the product owner to decide, not a spec.

| Map | Covers |
| --- | --- |
| `run-lifecycle.yaml` | Plans and runs: open to closed (irreversible), plan entries, add_case_to_run, close_run, writes after close |
| `test-result-lifecycle.yaml` | A test in a run: status from the latest result, Untested, retest, step results, attachments, admin result delete and recompute |
| `case-lifecycle.yaml` | Cases: create and ref numbering, update to new version, deprecate, delete rules, snapshot refresh and freeze in open runs |
| `ci-execution.yaml` | CI posting and file import: token auth, idempotency by external_execution_id, unmatched refs, deprecated-case guard |

Actors: admin, manager, tester, viewer (project roles), the CI token, the MCP agent (declared,
fires no event until agent auth is decided, see ADR 0003) and the system. Role rules appear as
which actors may fire each event; the kit then writes a "denied" case for every other role.

## How a cell was decided

- A cell is pre-decided only where the spec states the rule. Its `ref` names the spec file and section
  (`database-schema.md`, `api/openapi.yaml`, `design/DESIGN.md`, `implementation-plan.md`, `adr/0003-*`).
- Every other cell is `decision: open` with a question id (`q:`). Each question lists what the spec says today,
  the options, and a recommended answer under `suggestion`. The recommendation is never applied.
- Where the spec contradicts itself the question says `SPEC CONFLICT`.

## Regenerate the outputs

```bash
J=path/to/journey-mapping-cli.mjs   # the journey mapping CLI used to generate out/ (not part of this repo)
for m in run-lifecycle test-result-lifecycle case-lifecycle ci-execution; do
  node $J validate docs/journeys/$m.yaml
  node $J build docs/journeys/$m.yaml --out docs/journeys/out/$m
done
```

Each `out/<map>/` holds `state-tables.md`, `cases.md`, `features/*.feature` (Gherkin), `uat/` (UAT CSV),
`flows/`, `coverage.md`, `completeness.md`, `questions.md` and `decisions-sheet.csv`.
Outputs are deterministic: same map, same files. Do not edit them by hand.

## The owner loop

1. The owner reads `out/<map>/questions.md` and fills `out/<map>/decisions-sheet.csv`
   (Decision, Goes to state, Message, Reason, Decided by, Date).
2. `node $J decide docs/journeys/<map>.yaml --sheet out/<map>/decisions-sheet.csv` appends the answers
   to `decisions.yaml` beside the map; add `decisions: ./decisions.yaml` to the map once.
3. Rebuild, then `node $J diff out/<map> out-new/<map>` to see which test cases changed.

## Current verdict

All 45 open questions are decided (see DECISIONS.md and the *.decisions.yaml files). Coverage is still FAIL: no test results exist yet, so every tier-A case is "not run" (nothing passes by omission). Numbers are in each `out/<map>/coverage.md`.
The numbers are in each `out/<map>/coverage.md` and `completeness.md`.

## Before backend work

Open owner questions must be decided before M1 (roles, audit and token model, which touch the
authorization rules and the `automation_mappings` schema) and before M3 (run, result, snapshot and
CI behaviour). Questions marked priority 1 in `questions.md` come first. Several answers change
`docs/database-schema.md` or `docs/api/openapi.yaml` (for example a per-mapping unmatched policy,
a tokens collection); update those in the same change, as the implementation plan requires.
