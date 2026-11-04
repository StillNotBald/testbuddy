# TestBuddy MCP server

Lets an AI agent (Claude Code, Claude Desktop, a claude.ai custom connector) list and read test cases, runs and results, and add cases, runs and results, under a person's token and role. Decision record: [ADR 0004](../adr/0004-mcp-server.md). Repo: https://github.com/StillNotBald/testbuddy

> **M0 demo data, separate from your browser; M1 uses PocketBase.**
> The app's demo database lives in your browser. The MCP server cannot see it; it runs on its own in-memory copy of the standard demo fixtures, one per server process, reset on restart. What an agent writes does not show up in the browser UI yet.

## Run it

```bash
npm run dev            # serves POST http://localhost:3000/api/mcp
npm run mcp:smoke      # end-to-end check against the running server
npm run mcp:stdio      # stdio server (needs TESTBUDDY_MCP_TOKEN)
```

## Tokens (M0)

A token maps to a fictional demo user from the fixtures. Send `Authorization: Bearer <token>` or `X-API-Token: <token>`.

| Default token (dev only) | Demo user | Role in the Core project |
| --- | --- | --- |
| `tb_demo_admin_local_only` | Avery Quinn | Admin |
| `tb_demo_manager_local_only` | Raj Patel | Manager |
| `tb_demo_tester_local_only` | Dana Lee | Tester |
| `tb_demo_viewer_local_only` | Mia Chen | Viewer |

Set your own with `MCP_DEMO_TOKENS=token:role,token:role` (role is `admin`, `manager`, `tester`, `viewer`, or a fixture user id). The defaults are ignored in production: if `MCP_DEMO_TOKENS` is unset there, every call is 401. Other env: `MCP_ALLOWED_ORIGINS`, `MCP_RATE_LIMIT_PER_MIN` (default 120). See `.env.example`.

## Connect

**Claude Code (HTTP)**

```bash
claude mcp add --transport http testbuddy http://localhost:3000/api/mcp --header "Authorization: Bearer tb_demo_tester_local_only"
```

**Claude Code (stdio)**

```bash
claude mcp add testbuddy --env TESTBUDDY_MCP_TOKEN=tb_demo_tester_local_only -- node /absolute/path/to/testbuddy/mcp/server.mjs
```

**Claude Desktop** (`claude_desktop_config.json`; Node 24 on the PATH)

```json
{
  "mcpServers": {
    "testbuddy": {
      "command": "node",
      "args": ["/absolute/path/to/testbuddy/mcp/server.mjs"],
      "env": { "TESTBUDDY_MCP_TOKEN": "tb_demo_tester_local_only" }
    }
  }
}
```

**claude.ai custom connector**

claude.ai calls connectors from Anthropic's servers, so it needs a **public HTTPS URL**; `localhost` does not work.

1. Deploy the app (`npm run build`, `npm start`, or the standalone output) on a host with HTTPS and set `MCP_DEMO_TOKENS` to throwaway tokens. The URL is `https://<your-host>/api/mcp`.
2. In claude.ai, Settings, Connectors, add a custom connector with that URL.
3. Custom connectors take a URL plus optional OAuth. **M0 uses bearer tokens only; the OAuth flow is not implemented and is an M1 item** (with PocketBase-issued tokens). Until then, use Claude Code or Desktop, or a client that lets you set a header.
4. Keep the demo data in mind: the host's dataset is separate from every browser.

## Tools

All tools carry the note "M0 demo data, separate from your browser; M1 uses PocketBase" in their description.

| Tool | Kind | Needs role | What it does |
| --- | --- | --- | --- |
| `list_projects` | read | member | Your projects, role, case count, open runs |
| `get_project` | read | member | Project overview |
| `list_suites` | read | member | Suites with section tree and counts |
| `list_cases` | read | member | Cases; filters `suite_id`, `section_id`, `q`, `priority_ids`, `type_ids`, `automation_status`, `tag_ids`, `include_deprecated`; `limit` (1-200) and `cursor` |
| `get_case` | read | member | Case with steps and version |
| `list_milestones` | read | member | Milestones with progress |
| `list_runs` | read | member | Runs with progress; `state`, `milestone_id`, `q`, `limit`, `cursor` |
| `get_run` | read | member | Run with progress (counts, done %, pass %) |
| `list_run_tests` | read | member | Tests in a run; `status` filter, paging |
| `get_test` | read | member | A test with its result history |
| `add_case` | write | Tester+ | New case (version 1) |
| `update_case` | write | Tester+ | Saves a **new version**; stale `expected_version` is a conflict |
| `add_run` | write | Tester+ (milestone: Manager+) | Run from `case_ids` or `include_all` |
| `add_result` | write | Tester+ | `passed`, `failed`, `blocked`, `retest`; **Failed and Blocked need a comment**; `untested` cannot be posted |
| `close_run` | write, irreversible | Tester+ | Needs `confirm: true`; a closed run cannot be reopened |

Roles come from `src/lib/permissions.ts`, the same matrix as the UI, per project.

## Safety model

- **Same rules as people (BR-8).** The agent acts as the token's user. The role check uses the UI's permission matrix, and the service layer checks again.
- **Audited.** Every successful write adds an audit entry `agent.<tool>` marked `agent: true, via: "mcp"`, with the token owner as actor.
- **Irreversible actions are gated.** `close_run` does nothing without `confirm: true`; tool descriptions tell the model to ask the user first.
- **Legible errors.** Tool failures are `isError` results with `{ code, status, message }` (for example `forbidden`, 403). Protocol problems are JSON-RPC errors: -32700 parse, -32600 invalid request, -32601 unknown method, -32602 bad params. No stack traces.
- **HTTP status.** 401 missing or unknown token, 403 disabled user or disallowed `Origin`, 405 for `GET`/`DELETE` (stateless, no SSE stream, no sessions), 413 body over 256 KB, 429 rate limit (per token, `Retry-After`).
- **Secrets.** Tokens are compared in constant time, never logged, never echoed. The demo tokens are fake and only for the in-memory demo data.
- **Not a back door.** The route holds no domain logic and no store; it forwards to the data seam `src/mcp/data-source.ts`, which M1 replaces with PocketBase calls made with the caller's token.

## Limits and next steps

- M1: PocketBase-backed data seam, real tokens (caller token or personal access token), OAuth for the claude.ai connector, `import_cases`.
- The server is stateless: no `Mcp-Session-Id`, no server-initiated messages.
