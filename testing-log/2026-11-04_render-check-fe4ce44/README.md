# Render check 2026-11-04 (fe4ce44)

- Command: `BASE_URL=http://127.0.0.1:3100 npm run render:check`
- Operator: scripts/render-check.mjs (Playwright chromium); app not rebuilt by this run
- Matrix: 27 route entries x 2 viewports (390x844, 1440x900) x 2 themes = 108 page checks
- Checks: console errors, page errors, failed requests, HTTP >= 400, horizontal overflow, clipped buttons, axe-core wcag2a/2aa/21aa serious+critical
- Result: **FAIL** - 53 ok, 55 with failures (65 axe serious/critical rule hits)
- Screenshots: 54 files, 2.3 MB (light theme only unless SAVE_DARK=1; dark is checked, not saved)

## Summary

| Route [role] | phone light | phone dark | desktop light | desktop dark |
|---|---|---|---|---|
| `/sign-in [anon]` | ok | ok | ok | ok |
| `/does-not-exist [anon]` | ok | ok | ok | ok |
| `/projects [admin]` | FAIL(1) | FAIL(1) | ok | ok |
| `/projects/new [admin]` | ok | ok | ok | ok |
| `/p/prj_core [admin]` | FAIL(1) | FAIL(1) | ok | ok |
| `/p/prj_core/members [admin]` | FAIL(1) | FAIL(1) | ok | ok |
| `/p/prj_core/audit [admin]` | FAIL(1) | FAIL(1) | ok | ok |
| `/p/prj_core/settings [admin]` | FAIL(1) | FAIL(1) | ok | ok |
| `/p/prj_core [viewer]` | FAIL(1) | FAIL(1) | ok | ok |
| `/p/prj_mob [viewer]` | FAIL(1) | FAIL(1) | ok | ok |
| `/p/prj_core/cases [tester]` | FAIL(3) | FAIL(2) | FAIL(2) | FAIL(1) |
| `/p/prj_core/cases/new [tester]` | FAIL(1) | FAIL(1) | ok | ok |
| `/p/prj_core/cases/c_1 [tester]` | FAIL(2) | FAIL(1) | ok | ok |
| `/p/prj_core/cases/c_1/history [tester]` | FAIL(1) | FAIL(1) | ok | ok |
| `/p/prj_core/runs [tester]` | FAIL(2) | FAIL(2) | FAIL(1) | FAIL(1) |
| `/p/prj_core/runs/new [tester]` | FAIL(1) | FAIL(1) | FAIL(1) | ok |
| `/p/prj_core/runs/run_web [tester]` | FAIL(1) | FAIL(1) | FAIL(1) | ok |
| `/p/prj_core/runs/run_web/tests/t_run_web_1 [tester]` | FAIL(3) | FAIL(2) | FAIL(1) | ok |
| `/p/prj_core/milestones [manager]` | FAIL(1) | FAIL(1) | ok | ok |
| `/p/prj_core/milestones/ms_24 [manager]` | FAIL(1) | FAIL(1) | ok | ok |
| `/p/prj_core/plans [manager]` | FAIL(1) | FAIL(1) | ok | ok |
| `/p/prj_core/plans/plan_24 [manager]` | FAIL(1) | FAIL(1) | ok | ok |
| `/p/prj_core/reports [manager]` | FAIL(1) | FAIL(1) | ok | ok |
| `/p/prj_core/reports/run/run_web [manager]` | FAIL(2) | FAIL(2) | ok | ok |
| `/p/prj_core/reports/milestone/ms_24 [manager]` | FAIL(2) | FAIL(2) | ok | ok |
| `/p/prj_core/automation [manager]` | FAIL(2) | FAIL(2) | ok | ok |
| `/p/prj_core/automation/executions/ex_1 [manager]` | FAIL(1) | FAIL(1) | ok | ok |

## Failures

### /projects [admin] - phone light
- a11y critical button-name x1 (button[data-tour="topbar-search"])
- screenshot: screenshots/projects__admin__phone.jpg

### /p/prj_core [admin] - phone light
- a11y critical button-name x1 (button[data-tour="topbar-search"])
- screenshot: screenshots/p-prj-core__admin__phone.jpg

### /p/prj_core/members [admin] - phone light
- a11y critical button-name x1 (button[data-tour="topbar-search"])
- screenshot: screenshots/p-prj-core-members__admin__phone.jpg

### /p/prj_core/audit [admin] - phone light
- a11y critical button-name x1 (button[data-tour="topbar-search"])
- screenshot: screenshots/p-prj-core-audit__admin__phone.jpg

### /p/prj_core/settings [admin] - phone light
- a11y critical button-name x1 (button[data-tour="topbar-search"])
- screenshot: screenshots/p-prj-core-settings__admin__phone.jpg

### /p/prj_core [viewer] - phone light
- a11y critical button-name x1 (.border-strong)
- screenshot: screenshots/p-prj-core__viewer__phone.jpg

### /p/prj_mob [viewer] - phone light
- a11y critical button-name x1 (.border-strong)
- screenshot: screenshots/p-prj-mob__viewer__phone.jpg

### /p/prj_core/cases [tester] - phone light
- a11y critical aria-required-children x1 (.min-h-0)
- a11y critical button-name x1 (button[data-tour="topbar-search"])
- a11y serious color-contrast x37 (div[aria-rowindex="3"] > span[role="cell"]:nth-child(3) > .text-priority-p2.gap-)
- screenshot: screenshots/p-prj-core-cases__tester__phone.jpg

### /p/prj_core/cases/new [tester] - phone light
- a11y critical button-name x1 (button[data-tour="topbar-search"])
- screenshot: screenshots/p-prj-core-cases-new__tester__phone.jpg

### /p/prj_core/cases/c_1 [tester] - phone light
- a11y critical button-name x1 (button[data-tour="topbar-search"])
- a11y serious color-contrast x2 (.gap-0\.5)
- screenshot: screenshots/p-prj-core-cases-c-1__tester__phone.jpg

### /p/prj_core/cases/c_1/history [tester] - phone light
- a11y critical button-name x1 (button[data-tour="topbar-search"])
- screenshot: screenshots/p-prj-core-cases-c-1-history__tester__phone.jpg

### /p/prj_core/runs [tester] - phone light
- a11y critical aria-valid-attr-value x1 (#radix-_r_o_-trigger-open)
- a11y critical button-name x1 (button[data-tour="topbar-search"])
- screenshot: screenshots/p-prj-core-runs__tester__phone.jpg

### /p/prj_core/runs/new [tester] - phone light
- a11y critical button-name x1 (.border-strong)
- screenshot: screenshots/p-prj-core-runs-new__tester__phone.jpg

### /p/prj_core/runs/run_web [tester] - phone light
- a11y critical button-name x1 (button[data-tour="topbar-search"])
- screenshot: screenshots/p-prj-core-runs-run-web__tester__phone.jpg

### /p/prj_core/runs/run_web/tests/t_run_web_1 [tester] - phone light
- horizontal overflow: 4px
- a11y critical button-name x1 (button[data-tour="topbar-search"])
- a11y serious color-contrast x1 (.gap-0\.5)
- screenshot: screenshots/p-prj-core-runs-run-web-tests-t-run-web-1__tester__phone.jpg

### /p/prj_core/milestones [manager] - phone light
- a11y critical button-name x1 (.border-strong)
- screenshot: screenshots/p-prj-core-milestones__manager__phone.jpg

### /p/prj_core/milestones/ms_24 [manager] - phone light
- a11y critical button-name x1 (button[data-tour="topbar-search"])
- screenshot: screenshots/p-prj-core-milestones-ms-24__manager__phone.jpg

### /p/prj_core/plans [manager] - phone light
- a11y critical button-name x1 (.border-strong)
- screenshot: screenshots/p-prj-core-plans__manager__phone.jpg

### /p/prj_core/plans/plan_24 [manager] - phone light
- a11y critical button-name x1 (button[data-tour="topbar-search"])
- screenshot: screenshots/p-prj-core-plans-plan-24__manager__phone.jpg

### /p/prj_core/reports [manager] - phone light
- a11y critical button-name x1 (button[data-tour="topbar-search"])
- screenshot: screenshots/p-prj-core-reports__manager__phone.jpg

### /p/prj_core/reports/run/run_web [manager] - phone light
- horizontal overflow: 143px
- a11y critical button-name x1 (button[data-tour="topbar-search"])
- screenshot: screenshots/p-prj-core-reports-run-run-web__manager__phone.jpg

### /p/prj_core/reports/milestone/ms_24 [manager] - phone light
- horizontal overflow: 124px
- a11y critical button-name x1 (button[data-tour="topbar-search"])
- screenshot: screenshots/p-prj-core-reports-milestone-ms-24__manager__phone.jpg

### /p/prj_core/automation [manager] - phone light
- a11y critical button-name x1 (.border-strong)
- a11y serious scrollable-region-focusable x1 (pre)
- screenshot: screenshots/p-prj-core-automation__manager__phone.jpg

### /p/prj_core/automation/executions/ex_1 [manager] - phone light
- a11y critical button-name x1 (.border-strong)
- screenshot: screenshots/p-prj-core-automation-executions-ex-1__manager__phone.jpg

### /projects [admin] - phone dark
- a11y critical button-name x1 (button[data-tour="topbar-search"])

### /p/prj_core [admin] - phone dark
- a11y critical button-name x1 (button[data-tour="topbar-search"])

### /p/prj_core/members [admin] - phone dark
- a11y critical button-name x1 (button[data-tour="topbar-search"])

### /p/prj_core/audit [admin] - phone dark
- a11y critical button-name x1 (button[data-tour="topbar-search"])

### /p/prj_core/settings [admin] - phone dark
- a11y critical button-name x1 (button[data-tour="topbar-search"])

### /p/prj_core [viewer] - phone dark
- a11y critical button-name x1 (.border-strong)

### /p/prj_mob [viewer] - phone dark
- a11y critical button-name x1 (.border-strong)

### /p/prj_core/cases [tester] - phone dark
- a11y critical aria-required-children x1 (.min-h-0)
- a11y critical button-name x1 (button[data-tour="topbar-search"])

### /p/prj_core/cases/new [tester] - phone dark
- a11y critical button-name x1 (button[data-tour="topbar-search"])

### /p/prj_core/cases/c_1 [tester] - phone dark
- a11y critical button-name x1 (button[data-tour="topbar-search"])

### /p/prj_core/cases/c_1/history [tester] - phone dark
- a11y critical button-name x1 (button[data-tour="topbar-search"])

### /p/prj_core/runs [tester] - phone dark
- a11y critical aria-valid-attr-value x1 (#radix-_r_f_-trigger-open)
- a11y critical button-name x1 (button[data-tour="topbar-search"])

### /p/prj_core/runs/new [tester] - phone dark
- a11y critical button-name x1 (.border-strong)

### /p/prj_core/runs/run_web [tester] - phone dark
- a11y critical button-name x1 (button[data-tour="topbar-search"])

### /p/prj_core/runs/run_web/tests/t_run_web_1 [tester] - phone dark
- horizontal overflow: 4px
- a11y critical button-name x1 (button[data-tour="topbar-search"])

### /p/prj_core/milestones [manager] - phone dark
- a11y critical button-name x1 (.border-strong)

### /p/prj_core/milestones/ms_24 [manager] - phone dark
- a11y critical button-name x1 (button[data-tour="topbar-search"])

### /p/prj_core/plans [manager] - phone dark
- a11y critical button-name x1 (.border-strong)

### /p/prj_core/plans/plan_24 [manager] - phone dark
- a11y critical button-name x1 (button[data-tour="topbar-search"])

### /p/prj_core/reports [manager] - phone dark
- a11y critical button-name x1 (button[data-tour="topbar-search"])

### /p/prj_core/reports/run/run_web [manager] - phone dark
- horizontal overflow: 143px
- a11y critical button-name x1 (button[data-tour="topbar-search"])

### /p/prj_core/reports/milestone/ms_24 [manager] - phone dark
- horizontal overflow: 124px
- a11y critical button-name x1 (button[data-tour="topbar-search"])

### /p/prj_core/automation [manager] - phone dark
- a11y critical button-name x1 (.border-strong)
- a11y serious scrollable-region-focusable x1 (pre)

### /p/prj_core/automation/executions/ex_1 [manager] - phone dark
- a11y critical button-name x1 (.border-strong)

### /p/prj_core/cases [tester] - desktop light
- a11y critical aria-required-children x2 (ul[role="tree"])
- a11y serious color-contrast x91 (div[aria-rowindex="2"] > .md\:block.hidden[role="cell"] > .gap-1.inline-flex.tex)
- screenshot: screenshots/p-prj-core-cases__tester__desktop.jpg

### /p/prj_core/runs [tester] - desktop light
- a11y critical aria-valid-attr-value x1 (#radix-_r_l_-trigger-open)
- screenshot: screenshots/p-prj-core-runs__tester__desktop.jpg

### /p/prj_core/runs/new [tester] - desktop light
- a11y serious color-contrast x17 (tr[data-row-index="1"] > td:nth-child(4) > .text-priority-p2.gap-0\.5[data-state)
- screenshot: screenshots/p-prj-core-runs-new__tester__desktop.jpg

### /p/prj_core/runs/run_web [tester] - desktop light
- a11y serious color-contrast x11 (tr[data-row-index="4"] > td:nth-child(4) > .text-priority-p2.gap-0\.5[data-state)
- screenshot: screenshots/p-prj-core-runs-run-web__tester__desktop.jpg

### /p/prj_core/runs/run_web/tests/t_run_web_1 [tester] - desktop light
- a11y serious color-contrast x1 (.gap-0\.5)
- screenshot: screenshots/p-prj-core-runs-run-web-tests-t-run-web-1__tester__desktop.jpg

### /p/prj_core/cases [tester] - desktop dark
- a11y critical aria-required-children x2 (ul[role="tree"])

### /p/prj_core/runs [tester] - desktop dark
- a11y critical aria-valid-attr-value x1 (#radix-_r_f_-trigger-open)
