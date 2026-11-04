# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project aims to follow [Semantic Versioning](https://semver.org/) once it has a server.

## [Unreleased]

### 0.1.0 (Milestone 0, UI prototype on a mock local database)

#### Added
- Next.js 16, React 19, TypeScript and Tailwind CSS 4 app with house design tokens and a light and dark theme.
- Typed service interfaces and a mock local database in browser storage, seeded from deterministic fixtures, with "Reset demo data" and a sample project.
- Demo account picker with four project roles (admin, manager, tester, viewer) and role gating in the UI.
- Screens: projects, project overview, case repository (suite tree, case list, inspector, editor, version history and diff), runs, plans, test execution, milestones, reports (run and milestone), automation (mappings, executions, tokens), members, audit log, settings.
- App shell: project switcher, global search, keyboard shortcuts and help, built-in guided tour, "How it works" page, `llms.txt`.
- TestRail XML and CSV case parser with a dry-run planner (library only, no screen).
- `GET /api/health`.
- MCP server for AI agents: 15 tools over Streamable HTTP (`/api/mcp`) and stdio, demo bearer tokens mapped to roles, role rules and an audit entry per write, Claude Code and Claude Desktop setup docs.
- "Busy team" heavy demo seed (`?demo=heavy`, Reset demo data dialog, `NEXT_PUBLIC_DEMO_SEED`).
- Tests: Vitest unit tests, Playwright e2e (desktop and 390px phone), render-check harness with axe scan, requirements and traceability verifier (`npm run rtm:verify`).
- Documentation: BRD, requirements and RTM, API contract, database schema, ADRs, journey maps, design spec and clickable mockups, user guide.
- Pinned PocketBase v0.40.6 download script with checksum verification (used from Milestone 1).
- Open-source files: Apache-2.0 licence, NOTICE, README, HANDOVER, CONTRIBUTING, SECURITY, Code of Conduct, GitHub CI workflow, issue and pull request templates, Dependabot.

#### Known limitations
- No server, no real authentication and no shared data. The PocketBase backend arrives in Milestone 1.
- No UAT round has run. Requirements are a draft and not baselined.
