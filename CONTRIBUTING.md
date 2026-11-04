# Contributing to TestBuddy

Thanks for helping. TestBuddy is an open-source (Apache-2.0) test management app: Next.js 16 frontend, PocketBase v0.40.6 backend. The docs are the contract, so read them before you change code.

## Set up

Requirements: Node 24 (`fnm use 24`), npm, and `unzip`.

```bash
npm install
cp .env.example .env.local     # defaults use mock data, no backend needed
npm run dev                    # http://localhost:3000
```

With the real backend (from Milestone 1):

```bash
npm run pb:download            # pinned PocketBase v0.40.6, SHA-256 verified
npm run pb:start               # http://127.0.0.1:8090, data in pb_data/
# set NEXT_PUBLIC_DATA_SOURCE=pocketbase in .env.local
```

Before you open a pull request, run the gates locally:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

`npm run e2e` runs Playwright. Install the browser once with `npx playwright install chromium`.

## Read first

- `AGENTS.md`: the architecture decisions you must follow and the project docs index.
- `docs/adr/`: decisions that are hard to reverse. New ones get the next number.
- `docs/implementation-plan.md`: milestones and what each one must deliver. The current milestone is the one to work on.
- `docs/design/DESIGN.md`: the UI/UX spec. UI changes follow it.

## Spec before code

- **Contract first.** New or changed API endpoints are specified in `docs/api/openapi.yaml` before the code that implements them (ADR 0002).
- **Schema changes move together.** A change to a collection, field, index or rule updates `docs/database-schema.md` and adds a migration in `pb_migrations/` in the same pull request.
- **Decisions go in ADRs.** Anything architectural or hard to reverse gets a new file in `docs/adr/`.
- **UI follows the design spec.** Screens follow `docs/design/DESIGN.md`, with mock data first (Milestone 0) and the owner review gate before backend work.

## Requirements and the RTM

- Every behaviour change maps to a requirement ID in `requirements/` (being added).
- Update the matching row in the requirements traceability matrix in the same commit as the change.
- `scripts/rtm-verify.mjs` checks the matrix once it is in the repo. A change that breaks it does not merge.

## Tests are required

- New logic gets unit tests (Vitest, beside the code as `*.test.ts` or `*.test.tsx`).
- A new user journey gets a Playwright spec in `e2e/` once browsers are set up for the milestone.
- A bug fix comes with a test that fails before the fix and passes after.
- Do not weaken or delete an existing test to make a change pass. Explain the change in the pull request if a test really must change.

## Branches and pull requests

- Branch from `main`. Use a short descriptive branch name, for example `docs/contributing` or `feat/case-editor`.
- One concern per pull request. Split unrelated changes.
- Open the pull request against `main`. Describe what changed, why, which requirement ID it maps to, and how you tested it.
- Do not force-push a branch that someone else is reviewing.
- Do not commit secrets, `.env*` files (except `.env.example`), `pb_data/`, or the `bin/` PocketBase binary.
- Commit messages use a short type prefix, as in the history: `docs:`, `feat:`, `fix:`, `chore:`, `test:`.
- Keep UI changes to the agreed scope. If a change needs a new pattern, say so in the pull request and link the design spec section.

## Reporting bugs and asking for features

Open a GitHub issue for bugs and feature requests. Include steps to reproduce, what you expected, and what happened. For security problems, do not open an issue: follow [SECURITY.md](./SECURITY.md).

## Code of conduct

Participation is governed by the [Code of Conduct](./CODE_OF_CONDUCT.md).

## Licence

TestBuddy is licensed under Apache-2.0 (see `LICENSE`). By submitting a contribution you agree that it is licensed under the same terms. Only submit code you have the right to contribute.
