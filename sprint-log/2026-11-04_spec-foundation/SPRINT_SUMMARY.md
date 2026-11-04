# Sprint summary: spec foundation (2026-11-04)

## Goal

Make the written spec internally consistent and buildable before any code: a valid API contract, a reconciled schema, a UI/UX spec for Milestone 0, the licence, and the architecture decisions that the build depends on.

## Scope

In:
- Fix the API contract (`docs/api/openapi.yaml`) so it validates, and align it with `docs/database-schema.md`.
- Reconcile delete rules with the Milestone 2 acceptance criteria.
- Add the Untested status, nullable unique indexes and CI token storage rules to the schema.
- Add ADR 0003 (own-client API, TestRail import, MCP agent access, UI-first).
- Add the Apache-2.0 licence.
- Add the UI/UX design spec, design tokens and mock data plan for Milestone 0.
- Rename ADR 0001 to match its revised decision, and record the local mock database decision for Milestone 0.

Out:
- Any application code (see `2026-11-04_m0-scaffold`).
- The backend (Milestone 1 onward).

## Owner decisions

- Own clients only.
- Next.js frontend, with PocketBase v0.40.6 as the database and app server (ADR 0001).
- PocketBase later, with a local mock database first: Milestone 0 runs on typed mock services, and PocketBase is wired in at Milestone 1 behind the same interfaces.
- Tailwind plus house-style primitives: the UI uses Tailwind v4 and shadcn-style primitives re-created in-repo.
- Apache-2.0 licence for the open-source repo.
- Hand over the whole repo.
- UI process: research, then measure, then one screen per job, then mockups with numbered decisions approved before build, then a build contract, then journey-map odd cases, then review, e2e and screenshots.

## What shipped

| Commit | Change |
|---|---|
| `788b1e7` | Spec fixes: `openapi.yaml` validates (component refs fixed, schemas aligned with the schema doc, missing endpoints specced for projects, plans, delete case, imports and health); delete rules reconciled with Milestone 2 acceptance (deprecate when results exist); Untested status; CI token storage rules; nullable unique indexes; rule macros. ADR 0003 added. Apache-2.0 `LICENSE` added. |
| `cddd49c` | UI/UX design spec (`docs/design/DESIGN.md`), design tokens (`docs/design/tokens.css`), mock data plan (`docs/design/mock-data.md`). |
| `7c69c2c` | ADR 0001 renamed to `0001-pocketbase-backend-nextjs-frontend.md` and revised for Next.js 16. Local mock database recorded as the Milestone 0 decision (`docs/implementation-plan.md`). Private project names removed from docs. Small follow-up edits to `docs/design/DESIGN.md`, `docs/design/tokens.css` and `src/app/tokens.css`. |

Files changed across the wave (from `git show --stat`): `AGENTS.md`, `LICENSE`, `docs/adr/0001`, `docs/adr/0002`, `docs/adr/0003`, `docs/api/README.md`, `docs/api/openapi.yaml`, `docs/database-schema.md`, `docs/implementation-plan.md`, `docs/design/DESIGN.md`, `docs/design/mock-data.md`, `docs/design/tokens.css`, `src/app/tokens.css`.

## Gates run and results

| Gate | Command | Result |
|---|---|---|
| Spec commits reviewed in git history | `git log --oneline` and `git show --stat` on each SHA | Pass: five commits, one concern each, as listed above |
| OpenAPI validity | none | **Not gated.** No OpenAPI validation script exists in `package.json`. Validity was checked by reading in `788b1e7`, not by a repeatable command. Gap. |
| Typecheck, lint, build | Not applicable to docs-only commits | Covered by `2026-11-04_m0-scaffold` |

## Owner-visible changes

- The Milestone 0 UI/UX spec is now in the repo (`docs/design/DESIGN.md`). It is the reference for the owner's review gate.
- ADR 0001 has a new file name (see `7c69c2c` for the reference updates).
- The repo is now under Apache-2.0.

## Open items

- Owner review gate: the owner reviews and approves or amends the Milestone 0 UI before any backend work starts. Owner: owner.
- OpenAPI validation is not yet a repeatable gate. Owner: the build agent that adds the scaffold CI. Reason: the contract must stay valid as endpoints are added.
