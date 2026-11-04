# Sprint summary: Milestone 0 scaffold (2026-11-04)

## Goal

Stand up the runnable Next.js 16 app that Milestone 0 (UI prototype on typed mock services) builds on, with the design tokens wired and the PocketBase binary pinned and verified.

## Scope

In:
- Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4 with the design tokens wired into the app.
- Vitest and Testing Library set up, with one smoke test.
- Playwright configured (one smoke spec file), for later use.
- ESLint, Prettier, the health route, `.env.example`.
- PocketBase download script pinned to v0.40.6, with SHA-256 verification.
- Typed service interfaces stub (`src/services/types.ts`).

Out:
- Real screens and mock services (in progress in later commits of the same milestone).
- Any PocketBase collections or migrations (Milestone 1).
- Browser binaries for Playwright.

## Owner decisions

- Own clients only.
- Next.js frontend (ADR 0001, revised 2026-11-04).
- PocketBase later, with a local mock database first.
- Tailwind plus house-style primitives.
- Apache-2.0.
- Hand over the whole repo.
- UI process: research, measure, one screen per job, mockups with numbered decisions approved before build, build contract, journey-map odd cases, review, e2e and screenshots.

## What shipped

| Commit | Change |
|---|---|
| `fc025a7` | Next.js 16 + Tailwind 4 scaffold on PocketBase v0.40.6. Design tokens wired into `src/app/tokens.css`. Health route `src/app/api/health/route.ts`. Providers, layout, not-found page. `scripts/pb-download.mjs` (pinned v0.40.6, checksum verified). Playwright config and `e2e/smoke.spec.ts`. Vitest config and `src/app/page.test.tsx`. Lockfile added. |
| `b00dbf1` | `AGENTS.md` keeps the `next dev` agent-rules block so the file stays clean across commits. |

## Gates run and results

All gates were run from the repo root with npm scripts (see `testing-log/2026-11-04_m0-scaffold-gates/README.md` for the record).

| Gate | Command | Result |
|---|---|---|
| Typecheck | `npm run typecheck` | Pass |
| Lint | `npm run lint` | Pass |
| Unit tests | `npm test` | Pass: 1 smoke test |
| Build | `npm run build` | Pass |
| PocketBase binary | `npm run pb:download` | Pass: v0.40.6 downloaded and SHA-256 verified against the pinned checksum |
| E2E | `npm run e2e` | **Not run.** Browsers are not installed (`npx playwright install chromium` is a one-time step). Gap. |
| Phone-width render check | none | **Not run.** No phone-width render check exists yet. Gap. |

## Owner-visible changes

- `npm run dev` now starts a placeholder home page with the tokens applied. Real screens arrive in later commits of Milestone 0.
- `GET /api/health` returns a health response from Next.js.

## Open items

- Install the Playwright browser and run `npm run e2e` against the smoke spec. Owner: build agent for the next Milestone 0 wave.
- Add a phone-width (390px) and desktop screenshot render check before the owner review gate. Owner: build agent for the next Milestone 0 wave.
