# Render check 2026-11-04 (9e08566)

- Command: `BASE_URL=http://localhost:3000 npm run render:check`
- Operator: scripts/render-check.mjs (Playwright chromium); app not rebuilt by this run
- Matrix: 27 route entries x 2 viewports (390x844, 1440x900) x 2 themes = 108 page checks
- Checks: console errors, page errors, failed requests, HTTP >= 400, horizontal overflow, clipped buttons, axe-core wcag2a/2aa/21aa serious+critical
- Result: **FAIL** - 104 ok, 4 with failures (0 axe serious/critical rule hits)
- Screenshots: 54 files, 2.4 MB (light theme only unless SAVE_DARK=1; dark is checked, not saved)

## Summary

| Route [role] | phone light | phone dark | desktop light | desktop dark |
|---|---|---|---|---|
| `/sign-in [anon]` | ok | ok | ok | ok |
| `/does-not-exist [anon]` | ok | ok | ok | ok |
| `/projects [admin]` | ok | ok | ok | ok |
| `/projects/new [admin]` | ok | ok | ok | ok |
| `/p/prj_core [admin]` | ok | ok | ok | ok |
| `/p/prj_core/members [admin]` | ok | ok | ok | ok |
| `/p/prj_core/audit [admin]` | ok | ok | ok | ok |
| `/p/prj_core/settings [admin]` | ok | ok | ok | ok |
| `/p/prj_core [viewer]` | ok | ok | ok | ok |
| `/p/prj_mob [viewer]` | ok | ok | ok | ok |
| `/p/prj_core/cases [tester]` | ok | ok | ok | ok |
| `/p/prj_core/cases/new [tester]` | ok | ok | ok | ok |
| `/p/prj_core/cases/c_1 [tester]` | ok | ok | ok | ok |
| `/p/prj_core/cases/c_1/history [tester]` | ok | ok | ok | ok |
| `/p/prj_core/runs [tester]` | ok | ok | ok | ok |
| `/p/prj_core/runs/new [tester]` | ok | ok | ok | ok |
| `/p/prj_core/runs/run_web [tester]` | ok | ok | ok | ok |
| `/p/prj_core/runs/run_web/tests/t_run_web_1 [tester]` | ok | ok | ok | ok |
| `/p/prj_core/milestones [manager]` | ok | ok | ok | ok |
| `/p/prj_core/milestones/ms_24 [manager]` | ok | ok | ok | ok |
| `/p/prj_core/plans [manager]` | ok | ok | ok | ok |
| `/p/prj_core/plans/plan_24 [manager]` | ok | ok | ok | ok |
| `/p/prj_core/reports [manager]` | ok | ok | ok | ok |
| `/p/prj_core/reports/run/run_web [manager]` | FAIL(1) | FAIL(2) | FAIL(2) | FAIL(1) |
| `/p/prj_core/reports/milestone/ms_24 [manager]` | ok | ok | ok | ok |
| `/p/prj_core/automation [manager]` | ok | ok | ok | ok |
| `/p/prj_core/automation/executions/ex_1 [manager]` | ok | ok | ok | ok |

## Failures

### /p/prj_core/reports/run/run_web [manager] - phone light
- console error: Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — 
- screenshot: screenshots/p-prj-core-reports-run-run-web__manager__phone.jpg

### /p/prj_core/reports/run/run_web [manager] - phone dark
- console error: Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — 

### /p/prj_core/reports/run/run_web [manager] - desktop light
- console error: Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — 
- screenshot: screenshots/p-prj-core-reports-run-run-web__manager__desktop.jpg

### /p/prj_core/reports/run/run_web [manager] - desktop dark
- console error: Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — 
