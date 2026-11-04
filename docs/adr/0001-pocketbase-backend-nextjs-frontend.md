# ADR 0001: PocketBase as backend; Node.js + Next.js for frontend

- Status: Accepted (frontend half revised 2026-11-04: Next.js 16 replaces Vite/Mantine; see below and ADR 0003)
- Date: 2026-11-04

## Context

This project is built with coding agents ("vibecoding"). We need a stack that is
fast to bootstrap, requires minimal infrastructure, and is easy for agents to
reason about and extend without bespoke tooling.

## Decision

### 0. Pinned version

PocketBase is pinned to **exactly v0.40.6** (GitHub release 2026-10-23). Note:
the `github.com/pocketbase/pocketbase` repository was archived in Oct 2026 and
moved to `ganigeorgiev.com/pocketbase/pocketbase`; download the release binary
from the current official release location and verify its checksum. Upgrades are
deliberate PRs that bump the version in `package.json` scripts, the Dockerfile
and this ADR together.

### 1. Database and app server: PocketBase

Use [PocketBase](https://pocketbase.io) as the single backend. It provides the
database (embedded SQLite), REST API, real-time subscriptions, file storage, and
authentication (email/password + OAuth2) in one binary.

Rules for agents:

- Do not add a separate database, ORM, back-end server, or migration tool. All
  data lives in PocketBase collections; schema changes go through version
  controlled migrations in `pb_migrations/` — never by hand-editing `pb_data/`.
- Access data from the frontend via the official `pocketbase` JS SDK. Do not
  hand-roll fetch calls against the REST API unless the SDK genuinely cannot
  do it.
- Use PocketBase built-ins instead of custom code wherever possible:
  - Auth → PocketBase auth collections and `authWithPassword(...)`.
  - Authorization → collection API rules, not custom middleware.
  - File uploads → PocketBase file storage.
  - Server-side logic → JS hooks (`pb_hooks/*.pb.js`); the TestRail-style
    `/api/v1` façade lives there (see ADR 0002).
- Never commit `pb_data/` (database + uploads) to git; add it to `.gitignore`.
  Commit `pb_hooks/`, `pb_migrations/`, and the superuser bootstrap instructions.

### 2. Frontend: Next.js (revised 2026-11-04, owner decision)

Originally Node.js + Vite + React + TanStack Router + Mantine. Superseded by the
owner's choice: **Next.js 16 (App Router) + React 19 + TypeScript + Tailwind v4 +
Radix**, with shadcn-style primitives re-created in-repo (house design-system
look). **TanStack Query** stays for client data and **@tanstack/react-table** for
tables. Why: owner's choice; it matches the maintainers' house stack; and it
gives server route handlers for the MCP/agent connector (ADR 0003).

Rules for agents:

- Use npm — one package manager consistently; do not mix lockfiles.
- The ban on Next.js is removed. Remix and Nuxt remain out; anything beyond the
  stack above needs a new ADR.
- **PocketBase v0.40.6 stays the only backend** (DB, auth, files, rules,
  `pb_hooks` façade). Data access is client-side via the `pocketbase` SDK.
  Next route handlers may hold only thin agent-access/proxy code (e.g. the MCP
  endpoint) — never business logic or a second data store.
- **Topology, dev:** `next dev` on `:3000` plus PocketBase on `:8090`
  (`npm run pb:start`, the pinned binary — a script that downloads/verifies
  v0.40.6 into an ignored `.pb/` folder, serving on `127.0.0.1:8090`; no Docker
  needed in development). `next.config` rewrites `/api/:path*` and `/_/:path*`
  to PocketBase, so the browser uses relative URLs and there is no CORS.
  Next filesystem routes such as `src/app/api/mcp/route.ts` take precedence over
  `afterFiles` rewrites, so `/api/mcp` stays in Next.
- **Topology, production only:** Docker Compose with two services — Next
  (`output: 'standalone'`) and PocketBase. There is no official PocketBase
  image, so PocketBase is built from a small project `Dockerfile` that
  downloads the pinned v0.40.6 binary plus its checksum, verifies it, and runs
  `pocketbase serve`. The SPA is no longer served from `pb_public/`.
- Keep `pb_data/` out of git (named volume in production Docker); commit
  `pb_hooks/` and `pb_migrations/` instead.

### Repository structure

Authoritative tree is in `docs/implementation-plan.md`; starting layout:

```text
project-root/
├── src/                  # Next.js App Router app (React 19 + TS, Tailwind v4, Radix)
├── pb_hooks/             # PocketBase JS hooks (/api/v1 façade + transactions)
├── pb_migrations/        # version-controlled collection schemas & seeds
├── mcp/                  # optional stdio MCP entry (mcp/server.mjs); HTTP MCP is src/app/api/mcp
├── pb_data/              # IGNORED — runtime SQLite DB + uploads
├── docs/
│   ├── adr/              # this ADR series
│   ├── api/              # openapi.yaml + README.md (contract-first)
│   ├── database-schema.md
│   └── implementation-plan.md
├── next.config.ts        # rewrites /api/* and /_/* to PocketBase
├── Dockerfile.pocketbase # production only: pinned binary + checksum
└── package.json
```

## Consequences

- One backend process to run, deploy, and back up (the `pb_data/` directory).
- Auth, realtime, and storage come for free; agents spend effort on features.
- Trade-offs accepted: SQLite-scale limits (fine for small/medium teams), and
  PocketBase-specific patterns that would need rework if we ever switch backends.
