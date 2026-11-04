# Security policy

## Reporting a vulnerability

Report security problems privately. Do not open a public issue, pull request or discussion for them.

1. Go to the repository's **Security** tab.
2. Choose **Report a vulnerability**. This is GitHub's private security advisory channel.
3. Describe the problem, the steps to reproduce it, the affected version or commit, and the impact you expect.

Only the maintainers can see the report. We will reply in the advisory thread. Please give us a reasonable time to fix the problem before you disclose it publicly.

## Supported versions

Only `main` is supported. Fixes land on `main`. There are no older release lines.

## Scope

In scope: the TestBuddy app in this repository, its API, its PocketBase hooks and migrations, and the MCP and automation endpoints when they land.

Out of scope: third-party services, PocketBase itself (report those upstream), and findings that need a compromised account on your own machine.

## Secret handling

These rules come from `docs/database-schema.md` and apply to every contribution.

- **No secret values in the database.** A connector stores the name of the environment variable that holds its secret (`credential_env`), never the value. Secrets are never stored in `pb_data/`.
- **No secret values in any API response.** `credential_env` values are never returned by any endpoint.
- **CI tokens are hashed.** Only the token hash and a short display prefix are stored. The full token is shown once, in the create response. The hash field is hidden from every API response.
- **Keep env files out of git.** `.env*` is ignored, except `.env.example`, which holds names and placeholders only. Never commit `.env.local`.
- **No secrets in reports.** Do not paste tokens, passwords, cookies or connector secrets into issues, pull requests, logs, screenshots or test output. If one leaks, rotate it first, then report it.
- **Mock passwords are for mock mode only.** The mock accounts in `docs/design/mock-data.md` exist for the prototype and must never be used against a real backend.
- **Test data stays synthetic.** Do not use real customer data in fixtures, seeds or screenshots.

## Security model to keep intact

- Permissions are checked on the server. The UI hiding a control is not a permission check, and the server stays authoritative (`docs/design/DESIGN.md`, section 8).
- Admin-visible audit log entries are written for governed changes (`docs/design/DESIGN.md`, section 6.15). Do not add a write path that skips the audit trail.
