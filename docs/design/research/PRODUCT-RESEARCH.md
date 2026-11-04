# TestBuddy product research (UI process, step 1)

Status: v1, accessed 2026-11-04. Purpose: learn how category leaders and open-source tools do each job, so TestBuddy mockups are informed. Patterns are described in our own words. TestBuddy must not reproduce any product's layout, names or colours.

Evidence tags used below:
- **[V]** verified by reading the cited page during this research.
- **[S]** seen only in a search-result snippet or a secondary/competitor article (treat with caution; vendor comparison pages are biased).
- **[U]** could not be verified. Listed in section 14.

Limits of this research (read first): no Reddit/forum thread could be retrieved by the search tool, so "complaints" come from review aggregators (G2, Capterra), vendor-neutral blogs, one migration write-up, GitHub issue lists, and competitor pages (flagged). Several vendor docs (Testmo help centre) returned HTTP 403 and were read only via snippets. Review sites are small samples. Nothing here was tried hands-on in a live product.

---

## 1. Landscape in one page

| Product | Type | What it is known for (from sources) |
|---|---|---|
| Qase | Commercial SaaS | Modern UI, run wizard, hotkeys, saved queries (QQL), AI test designer, reviews of cases like pull requests [V] |
| Testiny | Commercial SaaS | Fast, simple, folder tree, optional plan layer, re-run, MCP server, TestRail importer [V/S] |
| TestRail | Commercial, long-time leader | Plans/runs/milestones, keyboard keys (j/k/p/r), slow with large projects per reviews [V/S] |
| Testmo | Commercial SaaS | Runs + exploratory sessions + automation runs under milestones; sources/threads for CI [S] |
| Xray, Zephyr Scale | Jira apps | Jira-native; criticised for UI and scale [S] |
| PractiTest, TestLodge, Tuskr | Commercial | Easy onboarding praised (Tuskr sample data trial) [S]; little else verified |
| BrowserStack Test Management | Commercial | Documented single-key result shortcuts [V] |
| Testpad | Commercial | Checklist-style, result keys that auto-advance [V] |
| Kiwi TCMS | Open source | Plan > run > execution model; mature but plain UI [V/S] |
| TestLink | Open source, ageing | 1.9.20 stated as last of 1.9.x; dated UI [S] |
| Squash TM | Open core | Keyword/BDD editor, Orchestrator; many features tiered [S] |
| UnitTCMS | OSS (GPL-3.0) | Built to avoid full-page reloads; small (~84 stars) [S] |
| Checkmate (DreamSports Labs) | OSS (MIT) | Self-hosted, CSV import/export, Google OAuth [S] |
| TTGO | Source-available (PolyForm Shield) | Single Go binary + SQLite, live sync, AI triage with accuracy tracking [V] |
| EZTest | OSS newcomer (2026, alpha) | Next.js, Docker, CSV/Excel import, built with AI coding tools [V] |
| Allure Report / ReportPortal | Results/analytics | Flaky marks, retries, history; grouped errors with ML suggestions [V] |

---

## 2. Job 1: Organise the repository

### (a) How products do it
- **Qase**: repository of suites; single-key `C` (new case), `S` (new suite), `F` (filters); saved queries in a query language that can feed a run; AI can turn plain English into a saved query [V].
- **Testiny**: nested folders, folder click shows its cases plus sub-folder cases; "All cases" and "cases in no folder" virtual groups; sorting alphabetical or manual; move by drag and drop or "Move to"; bulk bar for duplicate, delete, edit; differing fields show a "[Multiple values]" placeholder and ask for confirmation; moving to another project loses history [V].
- **TestRail**: sections inside suites; keys `c` add case, `s` add section, `j/k` next/previous case in a three-pane view, `q` toggles three-pane [V].
- **Kiwi TCMS**: plans hold cases; only reviewed ("confirmed") cases can enter a run; search widgets (quick and advanced) rather than a tree [V].
- **Testmo**: per-project repository of folders, groupable by priority, state, status or template [S].
- **BrowserStack**: list shortcuts: `C` create, `E` edit selected, `Shift+E` bulk edit, `Shift+R` start a run from selected cases [V].

### (b) Best pattern
Tree + list + preview with **virtual groups** and a **bulk bar that carries "[Multiple values]" safety**. Testiny's mixed-value placeholder is the smallest safe bulk-edit design: it shows the truth about the selection before overwriting. Qase's single-key list verbs and BrowserStack's "Shift+R starts a run from the selection" cut clicks.

### (c) Pain points
- TestRail: slow with large projects, dated UI, multiple clicks for common tasks (Capterra and G2 reviews; TestLink similar) [S]. https://www.capterra.com/p/128204/TestRail/reviews , https://testsigma.com/blog/testlink-alternatives/
- Kiwi TCMS: creating a run from "test executions" with more than 173 selected tests returned 502/503 (#3387); multiselect dropdown collapses after each pick (#3325) [S]. https://github.com/kiwitcms/Kiwi/issues . Kiwi docs warn search pages "fully load all the results" (10,000 records ~5 MB) [V]. https://kiwitcms.readthedocs.io/en/stable/hardware_performance.html
- Testiny: moving a case between projects drops history and may hide custom fields [V].
- Qase: custom queries paywalled above a plan level (migration write-up) [V]. https://dev.to/samelawrence/why-we-migrated-from-testrail-to-qase-and-how-we-did-it-4n54
- Qase reviews: "limited customization" is the top G2 con (18 reviews) [S].

### (d) Recommendation for TestBuddy
- Keep tree + list + inspector (DESIGN 6.4). Add two virtual tree nodes: "All cases" and "No section".
- Bulk edit shows `[Multiple values]` and a confirm that names the count and fields changed.
- Targets: select-all-matching-filter + set priority on 1,000 cases in **≤ 4 interactions and < 2 s server time**; list scroll stays 60 fps at 10,000 cases (virtualised, no page buttons; see D-3).
- Every list verb has a one-key twin (C, E, Shift+E, Shift+R) and a visible button.
- "Saved filter" (named, shareable via URL) ships in M2 not later, since saved queries are a paid or advanced feature elsewhere.

---

## 3. Job 2: Write and edit a case

### (a) How products do it
- **Testiny**: three templates (steps, text, BDD). Steps template gives each step an expected result; multi-line fields open on double-click or an edit button; "History" tab tracks changes; no documented shared steps [V]. https://www.testiny.io/docs/test-management/test-cases/basics/
- **Testmo**: two default templates (text, steps), admin-configurable per project; BDD template added Jan 2026; step-level sub-fields for expected result/test data [S]. https://support.testmo.com/hc/en-us/articles/40464014149133-Test-Case-Repository
- **Qase**: editor shortcuts `Cmd/Ctrl+.` add a step, `Cmd/Ctrl+Shift+.` add a child step, `Alt+S` quick save, `Cmd/Ctrl+R` send to review; cases can be reviewed like pull requests; parameters supported [V].
- **TestRail**: `<mod>+.` adds a step after current, `<mod>+Up/Down` moves a step, `Alt+.` adds after the last step [V].
- **Kiwi TCMS**: cases have a review status; only confirmed cases can be executed [V].
- **TTGO**: rich-text steps with version history and diff view [V].
- **Squash TM**: visual BDD editor with reusable action-word library, export to Gherkin/Robot (tier-gated) [S].

### (b) Best pattern
Steps editor driven entirely by keyboard (add, move, indent) with **template choice per project** and a **lightweight review state** (draft / ready) rather than blocking workflows. Kiwi's rule "only confirmed cases can run" is the cleanest guard but forces a review step on tiny teams; make it optional.

### (c) Pain points
- "Creating steps is an awful editing experience" and input rejected for hidden reasons (Zephyr reviews quoted by a competitor page; product unspecified) [S]. https://aqua-cloud.io/zephyr-review-and-insights-what-users-actually-say-about-this-tms/
- Migration: TestRail import garbled names with special characters; "References" field did not map and URL auto-linking was lost [V]. https://dev.to/samelawrence/why-we-migrated-from-testrail-to-qase-and-how-we-did-it-4n54
- Testmo help centre did not confirm a shared-steps feature nor explicit per-case versions [S/U].

### (d) Recommendation
- Steps are rows with description + expected, reorder with `Alt+Up/Down`, add below with `Cmd/Ctrl+Enter` (already in DESIGN 4.4). Target: **write a 10-step case with zero mouse use; first keystroke to saved < 2 minutes** for a user who knows the shortcuts.
- Three templates at launch: Steps, Text, BDD (Gherkin). Text-only is what fast-moving teams actually use; do not force steps.
- Optional "Ready for use" flag (project setting, default off). Do not copy Kiwi's hard gate.
- **Version history**: DESIGN says every save is a new version. Prefer coalescing (D-5): edits by one author inside a short window merge into one version; a new version is cut only when results already exist for the current one, or the author presses "Save as new version".
- Autosave drafts locally (already in DESIGN) so a rejected save never loses text; every validation error is shown inline next to the field (target: 0 "silent" rejections).
- Shared steps: defer, but reserve the schema slot (reusable step blocks are widely requested; not verified as a pain point here).

---

## 4. Job 3: Build a run from a filtered set; plans vs runs vs milestones

### (a) How products do it
- **Qase**: "express run" from the repository selection; "regular run" from the Runs page with full settings; sources can be repository picks, a test plan, or a **saved query**; configurations create every combination; recurring scheduled runs; **Clone run** with only Failed/Blocked cases; or "push to retest" inside the same run (the failure moves to a Retries tab) [V]. https://docs.qase.io/general/execution/create-a-test-run
- **Testiny**: run created from a plan, the Cases view (all, folder, folder + subfolders, selected) or the Runs view; filters narrow the table inside a run but are not a creation source; **Create re-run** from a menu with failed/blocked cases only, clean state, same plan, no milestone copied [V]. https://www.testiny.io/docs/test-management/test-runs/basics/
- **Testiny plans**: a layer between cases and runs holding selected cases; **dynamic queries** (by condition or folder) auto-include new matching cases; static lists by id; runs from one plan share an ancestor so the plan overview can show most-failing and most-blocked cases [V]. https://www.testiny.io/docs/test-management/test-plans/basics/
- **Kiwi**: plan is the container, one run per build, execution per case [V].
- **TestRail**: a plan holds many runs, mainly used for configuration matrices; milestones group plans and runs, can nest [S]. Official "when to use a plan" guidance was not found.
- **Testmo**: milestone is a container for runs, exploratory sessions and automation runs; milestone reports count only directly linked runs [S].
- **BrowserStack**: `Shift+R` starts a run from selected cases [V].

### (b) Best pattern
**Run-first, plan-optional.** Qase's express run (selection to running in one step) plus Testiny's one-menu re-run covers 90% of daily use. A "plan" earns its place only as a **saved dynamic selection** (Testiny) or a configuration matrix. Milestone = a release goal that groups runs; keep it dumb.

### (c) Pain points
- TestRail-style plans confuse newcomers ("plan vs run" has no official decision rule found) [S/U].
- Kiwi: run on a parent plan did not include child plan cases (#3573) [S]. https://github.com/kiwitcms/Kiwi/issues
- Testmo: milestone reports ignore child milestones, which surprises managers [S]. https://support.testmo.com/hc/en-us/articles/38039657939213-Milestone-Summary-Metrics
- Testiny re-run does not copy milestones (users must re-link) [V].

### (d) Recommendation
- Who needs plans? Teams with a **recurring suite** (regression per build) or **configuration matrices**; solo testers and small teams do not. Make Plans a progressive-disclosure feature (D-2): hidden from the sidebar until the project has ≥ 1 milestone or the user enables "Plans" in project settings; the run list gets a "Group" concept instead.
- Run creation entry points, all landing on the same picker: bulk bar "Run" (Shift+R), Create menu, run menu "Re-run", plan "Create run".
- **Re-run failed/blocked** is a first-class action on every run and every report row. Target: **from a finished run to a new re-run of its failures in ≤ 2 clicks and < 5 s**.
- "Select all N matching filter" (already in DESIGN 6.9) plus **save as dynamic set** (the plan equivalent). Target: build a 200-case run from filters in **≤ 6 interactions**.
- Milestone completion lists attached open runs (already in DESIGN 6.6). Add: milestone report states whether child/other-project runs are included, to avoid the Testmo surprise.

---

## 5. Job 4: Execute tests fast

### (a) How products do it
| Product | Result keys | Auto-advance | Comment | Notes |
|---|---|---|---|---|
| Qase | `P F B S I`; `V` view case, `E` edit case in new tab | wizard steps through cases | in wizard | Fast Pass setting; step and case results; defects from wizard [V] |
| BrowserStack | `P F S B R U`, `Shift+A` opens Add Result | not documented | in Add Result window | single keys disabled in inputs; `?` help [V] |
| TestRail | `p` pass in three-pane; `r` Add Result dialog; `j/k` next/prev; `Alt+m` focus comment; `Mod+Enter` submit | via j/k, manual | `m` | `q` toggles three-pane view [V] |
| Testpad | `p`/space pass, `f`, `b`, `q` query, `x` exclude | **yes, result key records and moves on** | Tab to inputs first, Tab back | `Alt-X` resume after editing [V] |
| Testiny | buttons; setting "Jump to next test case after setting result" | **yes (option)** | Details/Comments/Defects/History tabs | per-step results only with steps template; dropdown in table for bulk; shortcuts not documented [V/U] |
| Kiwi | expand row, Comment, Status button | no | optional | about 2 clicks per result plus typing; no bulk status documented [V] |
| TTGO | per-result pass/fail with defect classification | live sync across tabs | yes | WebSocket live sync [V] |

Qase timers: no live timer; it computes estimate, duration, total and elapsed from results [V].

### (b) Best pattern
**Testpad's contract: one key records the result and advances.** Combined with Testiny's opt-in auto-advance, a pass costs 1 keystroke. Failures need a comment, so the useful split is: pass = 1 key; fail = 1 key then focus lands in the comment box (then Tab/Enter to commit). TestRail's j/k separates browsing from recording, which testers like for revisiting.

### (c) Pain points
- Kiwi: no bulk status, 2+ clicks per result, no run-list filters documented on the guide page [V]. https://kiwitcms.readthedocs.io/en/latest/guide/testrun.html
- Testiny: execution order follows the case list and cannot be changed in the runner; BDD scenarios read-only in runner [V].
- Zephyr: executions failing to load for hours reported on a community forum (Zephyr Squad; quoted by a competitor) [S].
- Fedora QA decided against Kiwi for their workflow ("implementation details make it not a very good choice") [S]. https://meetbot-raw.fedoraproject.org/teams/fedora-qa/fedora-qa.2022-08-29-15.01.log.html
- Offline/flaky-network: **no verified product documents offline result capture** [U]. Unmet need; opportunity.

### (d) Recommendation
- **Result key commits and advances.** DESIGN currently says set status (P/F/B/R) then `S` to save and next, a 2-key minimum. Change so P commits immediately and moves to the next untested (setting "Advance after result", default on), with a 10 s Undo toast (D-1).
- F and B (statuses with `require_comment`) commit-on-comment: focus goes to comment; `Cmd/Ctrl+Enter` commits and advances. Targets: **pass = 1 key; fail with comment = 2 key presses plus typing; 100 passes in < 3 minutes of tester time (≈ 1.5 s each when the test is trivial)**.
- Next test is **auto-focused** (status bar ready), never needing `N`.
- Keep `J/K` to browse without recording, `[ ]` for steps, `U` to clear.
- Timer: record time-on-test **automatically** (open to commit, pause on idle/tab hidden), editable, shown quietly; no start button required. Matches Qase's computed durations without a visible clock.
- Defects: allow typing/pasting an issue key or URL as a chip in the status bar (already in DESIGN); one-click "create issue" later when a tracker is linked.
- Attachments: paste image from clipboard works anywhere on the page (target: paste-to-attached in 1 action).
- **Offline queue**: results persist in IndexedDB with an "N unsent" pill and automatic retry; execution never blocks on the network. Target: **0 lost results across a 60 s network drop** (test with throttling in e2e).
- Realtime: show who else is in the same run and prevent double-recording (last write wins with visible "Dana already marked this Failed").

---

## 6. Job 5: Watch progress

### (a) How products do it
- **Qase**: run dashboard with status donut, completion rate, and Defects and Team tabs; select cases to reassign or bulk-submit [V].
- **Testiny**: plan overview shows open runs, progress, most failing and blocking cases [V].
- **Testmo**: milestone status tab lists automation sources with pass/fail state [S].
- **TTGO**: analytics with pass-rate trends, flaky tests, slowest tests, side-by-side run comparison; WebSocket live sync [V].
- **ReportPortal/Allure**: launch pages with counts and trend charts, retries trend [V].

### (b) Best pattern
Stacked progress bar with counts per status and a **"who has what left" strip**; live updates without reload. Charts must have table twins (accessibility) which DESIGN already requires.

### (c) Pain points
- Qase reviews: reporting flexibility limited, learning curve on advanced integrations (one Capterra review) [S]. https://www.capterra.co.uk/software/200155/qase
- Testiny reviewer asks for deeper analytics and trends [S]. https://www.g2.com/products/testiny/reviews
- TestRail: slow report generation [V migration write-up].

### (d) Recommendation
- Run header = one stacked bar + "left per assignee" mini-table; **update latency < 2 s** from another tester's save (PocketBase realtime).
- Overdue/stuck hint: tests assigned but untouched for N hours show a quiet "idle" marker (opt-in; avoid surveillance feel).
- Target: **a lead sees run state in ≤ 1 click from anywhere** (global "Open runs" popover in the top bar).
- Do not build custom dashboards (a request that eats roadmaps); ship three fixed views and CSV/JSON export.

---

## 7. Job 6: Report to managers

### (a) How products do it
- **Testmo**: milestone summary & metrics page; runs, sessions and automation runs under one milestone; auto-archiving strips passing results without comments [S/V].
- **Qase**: dashboards; QQL for custom queries (paywalled tier) [V].
- **Allure Report**: trend charts, status transitions (Fixed, Regressed, Malfunctioned), retries trend, exportable metrics [V]. https://allurereport.org/docs/test-stability/
- **TTGO**: pass-rate trend, slowest tests, run comparison [V].
- **Kiwi, TestLink**: tabular reports, little visualisation [S].

### (b) Best pattern
Milestone page that answers four manager questions on one screen: **Are we done? What is failing? What changed since last build? Can I forward this?** Allure's status-transition vocabulary (fixed / regressed / new failing) is the clearest "what changed" idea.

### (c) Pain points
- Reporting/analytics requests repeat across Testiny, Qase, TestRail reviews [S]. Export capabilities rated subpar for Xray (1 G2 review) [S]. https://www.g2.com/products/xray-test-management
- Managers cannot open an app account just to look: a share link is a recurring unmet need [U as a documented complaint; inferred from the sources above, flagged as inference].

### (d) Recommendation
- Milestone report blocks: progress, failing tests with defect links, "changes since previous run" (Fixed / Regressed / New), blocked list with owner, stale tests (untested > N days).
- **Share**: read-only link with expiry (token), PDF/print, CSV, and JSON. Target: **a manager goes from "milestone page" to a sent link in ≤ 3 clicks, no account needed** (D-6).
- Pass rate always shows denominator ("87% of 412, 14 untested") so a high rate cannot hide untested work.
- No manual "executive summary" editor in M0.

---

## 8. Job 7: Automation (CI import, mapping, flaky handling)

### (a) How products do it
- **Testmo**: each automation suite has a **source**; runs of one source are compared over time; **threads** allow parallel jobs in one run; runs attach to a milestone by id or automatically by **automation tags** [S]. https://support.testmo.com/hc/en-us/articles/47713806374797-Automation-Runs
- **Testiny**: CLI imports from common report formats; mapping of automated tests to cases [V/S]. https://www.testiny.io/docs/automation/reference/
- **Qase**: API bulk results; reporters per framework (not fetched in detail) [S].
- **Allure**: flaky mark when status flips across up to 10 previous results in same environment (configurable); Retried; "Changed on retry"; `--rerun N` [V]. https://allurereport.org/docs/test-stability/
- **ReportPortal**: failures grouped by identical error (unique errors tab, counts, "Include/Exclude numbers" option); classifier suggests defect types when probability ≥ 50% [V]. https://reportportal.io/docs/analysis/UniqueErrorAnalysis/ , https://reportportal.io/docs/analysis/AutoAnalysisOfLaunches/
- **TTGO**: AI classifies failures into product bug, flaky, environment, test data, infra; accuracy of suggestions tracked per verdict [V].

### (b) Best pattern
Combine **Testmo's source concept** (a named CI job whose runs form a history) with **Allure's visible marks** (Flaky, Retried, Regressed) and **ReportPortal's grouping by identical error**. Grouping before ML is cheap and explainable.

### (c) Pain points
- Separate tools needed: teams run a test manager plus Allure or ReportPortal because results analytics is missing (inference from product positioning; flagged) [U as complaint].
- Mapping automated names to case ids is manual in most tools [U].
- Allure rerun in a changed context splits into a separate result, confusing history [V]. https://docs.qameta.io/use-testops/results-and-analytics/test-results/

### (d) Recommendation
- Keep DESIGN 6.13 (mappings, tokens, executions). Add: **Source** (named CI job) with a history strip; **stability mark** on each case (Flaky / Regressed / Fixed) computed from the last 10 results with a visible rule ("failed 3 of last 10, passed since"); **error groups** on an execution (identical normalised message, count, expandable).
- Auto-create case option for unmatched automated tests (draft state), tagged "Automated".
- Targets: **JUnit/CTRF-style file imported in one `curl` or CLI call; 5,000 results ingested < 10 s; unmatched ids listed within the same response**.
- Flaky marks never auto-change a manual result; they only annotate.

---

## 9. Job 8: Admin (members, roles, tokens, audit)

### (a) How products do it
- **Testiny**: API keys inherit the creating user's permissions; dedicated limited keys recommended for MCP; OAuth fallback; org owner adds connector first on team plans [V]. https://www.testiny.io/docs/mcp-server/
- **TTGO**: admin and regular user roles only; API tokens, webhooks [V].
- **Checkmate**: project-level access control [S].
- **Kiwi, TestLink**: permission groups; audit trail varies [U].
- Audit log availability by tier for commercial tools: [U] not verified; commonly an enterprise-tier feature.

### (b) Best pattern
Keys that inherit the creator's rights, shown once, scoped by project. Four coarse roles are enough for most (Admin, Manager, Tester, Viewer).

### (c) Pain points
- Seat pricing: "can't do individual licenses for Zephyr Scale making it very expensive" (Capterra, quoted by competitor) [S]; TestRail "expensive for small teams" (Capterra) [S].
- Paywalled admin features (custom queries in Qase) [V].

### (d) Recommendation
- Keep DESIGN 6.14/6.15/6.16. Add **scoped tokens** (read-only vs write; project-limited; expiry date) and show "last used" and the creating user. Target: **create a CI token and see it work in < 60 s; token listing shows prefix + last use**.
- Audit log and roles are **free in the open-source edition** (differentiator, section 13).
- Invite by email link plus a copyable invite URL for self-hosters without SMTP (inference; verify in M1).

---

## 10. Job 9: Onboarding

### (a) How products do it
- **Tuskr**: 30-day trial with sample data [S]. https://www.g2.com/products/tuskr/reviews
- **PractiTest**: onboarding experience praised on G2 [S].
- **Testiny**: reviewers note "onboarding takes more time than expected" and ask for more documentation [S]. https://thectoclub.com/tools/testiny-review/
- **Testiny tutorial** exists as a getting-started doc [S].
- Whether any tool creates a sample project on first login: **[U]**.
- **UnitTCMS** frames itself as the move from spreadsheets [S]. **EZTest** leads with CSV/Excel import [V].
- Importers: TestRail XML into Qase (imperfect: special characters, field mapping) [V]; Testiny has a dedicated TestRail importer [S].

### (b) Best pattern
Sample data to look at **plus** an importer that delivers a real project in minutes. First impression is "my data in the tool", not a tour.

### (c) Pain points
- Migration is the main switching cost: broken characters, lost reference links, manual field fix-ups via spreadsheets [V].
- Heavy setup for self-hosted tools (SaaSHub note on Kiwi: "setup somewhat complex for users not familiar with open source") [S]. https://www.saashub.com/compare-exploranote-vs-kiwi-tcms
- TestLink: self-hosting burden (web server, DB, upgrades) [S].

### (d) Recommendation
- First run on an empty workspace offers three buttons in this order: **Import (CSV / TestRail XML / JSON)**, **Create sample project**, **Start empty**. DESIGN currently places import only in Settings (D-7).
- Sample project: 2 suites, 24 cases, 1 run with mixed results, 1 milestone, labelled "Sample" and deletable in one click. Target: **time to first recorded result ≤ 3 minutes from docker run**.
- Install target: single `docker compose up` or one binary; **time from clone to sign-in < 5 minutes**.
- Empty states carry the one action that fills them (already in DESIGN 7); tour is 4 steps, skippable, never blocking.
- Import: dry-run preview, mapping preview with sample rows, per-row error report, never silently altering text (Qase experience). Target: **a 5,000-case TestRail export imports in < 2 minutes with 0 silent character corruption (round-trip test in CI)**.

---

## 11. Job 10: AI features in 2025-26

### (a) What shipped
- **Qase AI Test Designer** (formerly AIDEN, brand retired into "Qase AI"): requirement from Jira/GitHub/Notion/Confluence or typed; optional context up to 8,000 chars and 5 files; each batch mixes positive/negative/boundary/error cases; review, delete, then save or send to review; AI label on saved cases; discarded if you close before saving [V]. https://docs.qase.io/en/articles/9653096-ai-test-designer ; rename: https://www.qase.io/blog/aiden-is-just-qase-now/
- **Testmo AI generation (beta)**: choose folder, add requirements, AI proposes, deselect/refine, then generate in Text/Steps/BDD; 10 to 60 per request; auto-tagged AI-generated and linked to requirements; admins can disable [V]. https://www.testmo.com/blog/introducing-ai-test-case-generation-in-testmo-beta/ . Testmo also announced an MCP [S]. https://www.testmo.com/blog/introducing-the-testmo-mcp/
- **TestRail** (Sembi IQ): AI case generation (announced Sept 2025), AI script generation (open beta, 10.2), AI evaluation template, AI test prioritisation early access mid-2026; vendor claims "up to 90% faster", unverified [V]. https://www.testrail.com/blog/testrail-10-5/
- **Testiny**: MCP server with tools to list/create cases, create runs, set results (batch), comment; etag conflict protection on edits [V]. https://www.testiny.io/docs/mcp-server/
- **ReportPortal**: ML defect-type suggestions plus LLM assistant via MCP; stores and reuses triage decisions [S]. https://reportportal.io/blog/dont-analyze-the-same-failure-twice-smarter-ai-defect-triage-with-reportportal/
- **TTGO**: bring-your-own LLM, nothing saved until approved, optional critic pass, failure triage with accuracy statistics, opt-in auto-analysis, secrets redacted [V].
- **Dedupe**: no documented deduplication in Qase AI [S]. No product found advertising duplicate-case detection as a shipped feature [U].

### (b) What users find useful (honest assessment)
Evidence is thin; no per-feature satisfaction data found. Consistent signals:
1. **Useful as first drafts, not finished work**: Qase review sources say output needs editing and quality is inconsistent; "cuts 15 to 20 minutes of initial drafting" [S]. https://www.practitest.com/resource-center/blog/qase-review/
2. **Happy-path bias and invented steps**: practitioner posts report AI suites that look comprehensive but miss production bugs, and steps for UI that no longer exists [S]. https://dev.to/tudorsss-betterqa/ai-isnt-killing-creativity-in-qa-but-its-not-saving-it-either-211e , https://bugbug.io/blog/software-testing/ai-hallucinations/
3. **Failure grouping is the most concretely useful**: grouping by identical error is deterministic and reported to speed triage several-fold by ReportPortal's own docs [S/vendor].
4. **MCP/agent access** is appearing across Testiny, Testmo, ReportPortal; value is hands-free run updates and summaries [V/S].
5. TestRail's AI is described by reviewers as still limited compared with newer tools [S].

### (c) Pain points
Privacy of requirement text sent to a third-party model (all vendors add "not used for training" statements) [V]; stale/hallucinated steps [S]; cost per generation for hosted vendors [U].

### (d) Recommendation
- **No bundled LLM in M0/M1.** Ship (in order): (1) the MCP server and stable API (already planned, M3b); (2) deterministic **error grouping** in automation executions; (3) **bring-your-own-key** "Draft cases from text" with Testmo-style review gate (nothing saved until approved, AI badge, linked source, cap 10 to 30 per request). Targets: **draft-to-approved ratio is measured in-app (≥ 50% accepted is the bar to keep the feature)**; every AI case carries source + badge.
- **Dedupe**: local, non-LLM (normalised title + step text similarity) at import and at create, showing "similar to C41" before saving. Target: **flag ≥ 90% of exact-ish duplicates in a 5,000-case sample with < 5% false positives (test on a labelled set before shipping)**.
- Failure clustering by LLM: defer; copy TTGO's idea of showing the tool's own accuracy rate only after (3) proves out.
- Admin switch to disable all AI; no AI code path active by default.

---

## 12. What makes users switch tools

| Driver | Evidence |
|---|---|
| Slowness at scale | TestRail slow with large projects and slow report generation (Capterra, G2 slow performance 8 reviews, slow loading 6; migration post) [S/V]. https://www.g2.com/compare/kualitee-vs-testrail |
| Price/seat model | TestRail expensive for small teams; Zephyr Scale no individual licences [S]; EZTest founder cites $19/user/month as the motive [V]. https://www.producthunt.com/products/eztest-easy-test |
| Dated UI | TestRail, TestLink, Xray "Poor UI" (4 G2 reviews) [S] |
| Jira lock-in | Xray/Zephyr ties; users move to standalone tools [S] |
| Paywalled features | Qase custom queries above plan level [V] |
| Slowing development | TestLink 1.9.20 stated as last of 1.9.x [S] |
| Support | TestRail slow/no support (one Capterra review); Qase and Testiny praised for support [S] |

Migration pain (blockers to switching): character corruption, unmapped custom fields, lost reference links, loss of history on move between projects [V]. A switching-friendly product treats **import fidelity and an export that round-trips** as headline features.

---

## 13. Top 5 differentiators an open-source newcomer could own

1. **One-key execution that never loses a result**: result key records and advances; offline-safe queue; auto-timer. Testpad has the key idea but is closed SaaS; Kiwi needs 2+ clicks; no OSS or documented product handles offline.
2. **Painless in and out**: importers (TestRail XML/CSV, Kiwi, TestLink, Qase CSV) with dry-run and character-safe round trips, plus complete export (JSON/Markdown/CSV) and a sample project. Directly attacks the top switching blocker.
3. **Agent-native from day one**: documented MCP server, CLI and stable API; BYO model with a human-approval gate; local dedupe; no data leaves by default. Commercial vendors are bolting this on; the one open competitor with AI (TTGO) is source-available and forbids hosting it (PolyForm Shield), which an Apache-2.0 project can contrast with.
4. **Results intelligence built in**: stability marks, regression/fixed vocabulary, error grouping, and run comparison for CI results inside the same app, so teams skip a separate Allure/ReportPortal.
5. **Honest licensing and no seat tax**: roles, audit log, saved filters, scoped tokens and shareable manager reports free in self-hosted; one container to run. Counter to paywalled queries, per-seat pricing and enterprise-only audit.

---

## 14. Could not verify (open items)

- Testiny keyboard shortcuts and timer (docs silent).
- Qase hotkey for "next test" (not listed), and whether the wizard has a timer.
- Testmo help-centre pages (HTTP 403): shared steps, per-case versions, execution keyboard flow, summary exports, official MCP details (only snippets).
- Xray and Zephyr Scale hands-on execution UX; PractiTest, TestLodge, Tuskr screen structures (reviews only).
- Squash TM community vs paid scope (tier labels changed between versions).
- Checkmate repo health (stars, activity); UnitTCMS release cadence.
- Any product that creates a sample project on first login.
- Any product with documented offline result capture.
- Audit log availability by tier for commercial products.
- Reddit or forum threads: none retrievable; no direct user quotes except those quoted via competitor pages.
- AI feature satisfaction data: only anecdotal posts and vendor claims.
- Pricing figures (Testiny Starter $18.50/user/month on G2; EZTest founder cites $19 per user per month for TestRail or Testiny) are second-hand and dated.

---

## 15. DESIGN.md decisions for the owner

Numbered D-decisions drawn from this research (details in the sections referenced):

- **D-1** Result keys commit and advance (replace "status then `S` save and next"). Section 5.
- **D-2** Plans become progressive disclosure, not a primary nav item by default. Section 4.
- **D-3** Repository list: virtualised infinite scroll with count instead of page buttons (keep pagination for audit log). Section 2.
- **D-4** Add "Re-run failed/blocked" and "Save selection as dynamic set" to run creation. Section 4.
- **D-5** Version policy: coalesce edits into one version unless results exist or author asks. Section 3.
- **D-6** Add shareable read-only report links (expiring token) and "changes since previous run". Section 7.
- **D-7** Empty workspace first-run: Import, Sample project, Start empty; move import out of Settings-only. Section 10.
- **D-8** Add stability marks, sources and error grouping to Automation (M5 content pulled earlier). Section 8.
- **D-9** Automatic time-on-test capture replacing the manual timer as default. Section 5.
- **D-10** AI posture: no bundled LLM; MCP + BYO-key gated drafts + local dedupe. Section 11.
- **D-11** Offline result queue (IndexedDB) specified as a requirement with a test, not a nice-to-have. Section 5.
- **D-12** Consider a "Skipped" status (Qase, BrowserStack, Testiny all ship it) alongside the five. Section 5.

---

## 16. Sources (all accessed 2026-11-04)

Documentation and product pages
- https://docs.qase.io/en/articles/5563707-hotkeys
- https://docs.qase.io/general/execution/create-a-test-run
- https://docs.qase.io/en/articles/9653096-ai-test-designer
- https://docs.qase.io/en/articles/5563713-test-case-review
- https://www.qase.io/blog/aiden-is-just-qase-now/
- https://www.testiny.io/docs/test-management/test-runs/basics/
- https://www.testiny.io/docs/test-management/test-plans/basics/
- https://www.testiny.io/docs/test-management/test-cases/basics/
- https://www.testiny.io/docs/mcp-server/
- https://www.testiny.io/docs/automation/reference/
- https://www.browserstack.com/docs/test-management/overview/keyboard-shortcuts
- https://www.tutorialspoint.com/testrail/testrail_shortcuts_hotkeys.htm
- https://preview--testpad-website.netlify.app/keyboard-shortcuts-for-even-faster-testing
- https://www.testrail.com/blog/testrail-10-5/
- https://support.testmo.com/hc/en-us/articles/47713806374797-Automation-Runs (snippet)
- https://support.testmo.com/hc/en-us/articles/38039657939213-Milestone-Summary-Metrics (snippet)
- https://support.testmo.com/hc/en-us/articles/40464014149133-Test-Case-Repository (snippet)
- https://www.testmo.com/blog/introducing-ai-test-case-generation-in-testmo-beta/
- https://www.testmo.com/blog/introducing-the-testmo-mcp/ (snippet)
- https://kiwitcms.readthedocs.io/en/latest/guide/testrun.html
- https://kiwitcms.readthedocs.io/en/stable/guide/testplan.html (snippet)
- https://kiwitcms.readthedocs.io/en/stable/hardware_performance.html
- https://github.com/kiwitcms/Kiwi/issues (snippet)
- https://allurereport.org/docs/test-stability/
- https://allurereport.org/docs/history-and-retries/ (snippet)
- https://docs.qameta.io/use-testops/results-and-analytics/test-results/ (snippet)
- https://reportportal.io/docs/analysis/UniqueErrorAnalysis/
- https://reportportal.io/docs/analysis/AutoAnalysisOfLaunches/ (snippet)
- https://reportportal.io/blog/dont-analyze-the-same-failure-twice-smarter-ai-defect-triage-with-reportportal/ (snippet)
- https://github.com/runetsk/ttgo
- https://github.com/topics/testrail-alternative
- https://www.producthunt.com/products/eztest-easy-test
- https://github.com/kimatata/unittcms (snippet)
- https://checkmate.dreamsportslabs.com/docs/project/introduction (snippet)
- https://tm-en.doc.squashtest.com/v14/user-guide/manage-automated-tests/index.html (snippet)

Reviews, forums and third-party articles (bias noted)
- https://dev.to/samelawrence/why-we-migrated-from-testrail-to-qase-and-how-we-did-it-4n54
- https://www.capterra.com/p/128204/TestRail/reviews (snippet)
- https://www.g2.com/compare/kualitee-vs-testrail (snippet)
- https://www.capterra.co.uk/software/200155/qase (snippet)
- https://www.g2.com/products/testiny/reviews (snippet)
- https://thectoclub.com/tools/testiny-review/ (snippet)
- https://www.g2.com/products/xray-test-management (snippet)
- https://www.g2.com/products/tuskr/reviews (snippet)
- https://aqua-cloud.io/zephyr-review-and-insights-what-users-actually-say-about-this-tms/ (competitor page)
- https://testsigma.com/blog/testlink-alternatives/ (competitor page)
- https://www.saashub.com/compare-exploranote-vs-kiwi-tcms (snippet)
- https://meetbot-raw.fedoraproject.org/teams/fedora-qa/fedora-qa.2022-08-29-15.01.log.html (snippet)
- https://www.practitest.com/resource-center/blog/qase-review/ (competitor page, snippet)
- https://dev.to/tudorsss-betterqa/ai-isnt-killing-creativity-in-qa-but-its-not-saving-it-either-211e (snippet)
- https://bugbug.io/blog/software-testing/ai-hallucinations/ (snippet)
