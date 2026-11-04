# Render check 2026-11-04 (0662317)

- Command: `BASE_URL=http://127.0.0.1:3100 npm run render:check`
- Operator: scripts/render-check.mjs (Playwright chromium); app not rebuilt by this run
- Matrix: 27 route entries x 2 viewports (390x844, 1440x900) x 2 themes = 108 page checks
- Checks: console errors, page errors, failed requests, HTTP >= 400, horizontal overflow, clipped buttons, axe-core wcag2a/2aa/21aa serious+critical
- Result: **FAIL** - 58 ok, 50 with failures (0 axe serious/critical rule hits)
- Screenshots: 54 files, 1.0 MB (light theme only unless SAVE_DARK=1; dark is checked, not saved)

## Summary

| Route [role] | phone light | phone dark | desktop light | desktop dark |
|---|---|---|---|---|
| `/sign-in [anon]` | ok | ok | ok | ok |
| `/does-not-exist [anon]` | ok | ok | ok | ok |
| `/projects [admin]` | FAIL(3) | FAIL(3) | ok | ok |
| `/projects/new [admin]` | FAIL(3) | FAIL(3) | ok | ok |
| `/p/prj_core [admin]` | FAIL(6) | FAIL(6) | ok | ok |
| `/p/prj_core/members [admin]` | FAIL(6) | FAIL(6) | ok | ok |
| `/p/prj_core/audit [admin]` | FAIL(6) | FAIL(6) | ok | ok |
| `/p/prj_core/settings [admin]` | FAIL(6) | FAIL(6) | ok | ok |
| `/p/prj_core [viewer]` | FAIL(5) | FAIL(5) | ok | ok |
| `/p/prj_mob [viewer]` | FAIL(5) | FAIL(5) | ok | ok |
| `/p/prj_core/cases [tester]` | FAIL(6) | FAIL(6) | ok | ok |
| `/p/prj_core/cases/new [tester]` | FAIL(6) | FAIL(6) | ok | ok |
| `/p/prj_core/cases/c_1 [tester]` | FAIL(6) | FAIL(6) | ok | ok |
| `/p/prj_core/cases/c_1/history [tester]` | FAIL(6) | FAIL(6) | ok | ok |
| `/p/prj_core/runs [tester]` | FAIL(6) | FAIL(6) | ok | ok |
| `/p/prj_core/runs/new [tester]` | FAIL(6) | FAIL(6) | ok | ok |
| `/p/prj_core/runs/run_web [tester]` | FAIL(6) | FAIL(6) | ok | ok |
| `/p/prj_core/runs/run_web/tests/t_run_web_1 [tester]` | FAIL(6) | FAIL(6) | ok | ok |
| `/p/prj_core/milestones [manager]` | FAIL(6) | FAIL(6) | ok | ok |
| `/p/prj_core/milestones/ms_24 [manager]` | FAIL(6) | FAIL(6) | ok | ok |
| `/p/prj_core/plans [manager]` | FAIL(6) | FAIL(6) | ok | ok |
| `/p/prj_core/plans/plan_24 [manager]` | FAIL(6) | FAIL(6) | ok | ok |
| `/p/prj_core/reports [manager]` | FAIL(6) | FAIL(6) | ok | ok |
| `/p/prj_core/reports/run/run_web [manager]` | FAIL(6) | FAIL(6) | ok | ok |
| `/p/prj_core/reports/milestone/ms_24 [manager]` | FAIL(6) | FAIL(6) | ok | ok |
| `/p/prj_core/automation [manager]` | FAIL(6) | FAIL(6) | ok | ok |
| `/p/prj_core/automation/executions/ex_1 [manager]` | FAIL(6) | FAIL(6) | ok | ok |

## Failures

### /projects [admin] - phone light
- horizontal overflow: 54px
- clipped button: Keyboard shortcuts (off-screen: 364..400 of 390)
- clipped button: User menu (off-screen: 408..444 of 390)
- screenshot: screenshots/projects__admin__phone.jpg

### /projects/new [admin] - phone light
- horizontal overflow: 54px
- clipped button: Keyboard shortcuts (off-screen: 364..400 of 390)
- clipped button: User menu (off-screen: 408..444 of 390)
- screenshot: screenshots/projects-new__admin__phone.jpg

### /p/prj_core [admin] - phone light
- horizontal overflow: 259px
- clipped button: Search/ (off-screen: 357..423 of 390)
- clipped button: Create (off-screen: 431..517 of 390)
- clipped button: Theme: light (off-screen: 525..561 of 390)
- clipped button: Keyboard shortcuts (off-screen: 569..605 of 390)
- clipped button: User menu (off-screen: 613..649 of 390)
- screenshot: screenshots/p-prj-core__admin__phone.jpg

### /p/prj_core/members [admin] - phone light
- horizontal overflow: 259px
- clipped button: Search/ (off-screen: 357..423 of 390)
- clipped button: Create (off-screen: 431..517 of 390)
- clipped button: Theme: light (off-screen: 525..561 of 390)
- clipped button: Keyboard shortcuts (off-screen: 569..605 of 390)
- clipped button: User menu (off-screen: 613..649 of 390)
- screenshot: screenshots/p-prj-core-members__admin__phone.jpg

### /p/prj_core/audit [admin] - phone light
- horizontal overflow: 259px
- clipped button: Search/ (off-screen: 357..423 of 390)
- clipped button: Create (off-screen: 431..517 of 390)
- clipped button: Theme: light (off-screen: 525..561 of 390)
- clipped button: Keyboard shortcuts (off-screen: 569..605 of 390)
- clipped button: User menu (off-screen: 613..649 of 390)
- screenshot: screenshots/p-prj-core-audit__admin__phone.jpg

### /p/prj_core/settings [admin] - phone light
- horizontal overflow: 259px
- clipped button: Search/ (off-screen: 357..423 of 390)
- clipped button: Create (off-screen: 431..517 of 390)
- clipped button: Theme: light (off-screen: 525..561 of 390)
- clipped button: Keyboard shortcuts (off-screen: 569..605 of 390)
- clipped button: User menu (off-screen: 613..649 of 390)
- screenshot: screenshots/p-prj-core-settings__admin__phone.jpg

### /p/prj_core [viewer] - phone light
- horizontal overflow: 165px
- clipped button: Search/ (off-screen: 357..423 of 390)
- clipped button: Theme: light (off-screen: 431..467 of 390)
- clipped button: Keyboard shortcuts (off-screen: 475..511 of 390)
- clipped button: User menu (off-screen: 519..555 of 390)
- screenshot: screenshots/p-prj-core__viewer__phone.jpg

### /p/prj_mob [viewer] - phone light
- horizontal overflow: 140px
- clipped button: Search/ (off-screen: 332..398 of 390)
- clipped button: Theme: light (off-screen: 406..442 of 390)
- clipped button: Keyboard shortcuts (off-screen: 450..486 of 390)
- clipped button: User menu (off-screen: 494..530 of 390)
- screenshot: screenshots/p-prj-mob__viewer__phone.jpg

### /p/prj_core/cases [tester] - phone light
- horizontal overflow: 259px
- clipped button: Search/ (off-screen: 357..423 of 390)
- clipped button: Create (off-screen: 431..517 of 390)
- clipped button: Theme: light (off-screen: 525..561 of 390)
- clipped button: Keyboard shortcuts (off-screen: 569..605 of 390)
- clipped button: User menu (off-screen: 613..649 of 390)
- screenshot: screenshots/p-prj-core-cases__tester__phone.jpg

### /p/prj_core/cases/new [tester] - phone light
- horizontal overflow: 259px
- clipped button: Search/ (off-screen: 357..423 of 390)
- clipped button: Create (off-screen: 431..517 of 390)
- clipped button: Theme: light (off-screen: 525..561 of 390)
- clipped button: Keyboard shortcuts (off-screen: 569..605 of 390)
- clipped button: User menu (off-screen: 613..649 of 390)
- screenshot: screenshots/p-prj-core-cases-new__tester__phone.jpg

### /p/prj_core/cases/c_1 [tester] - phone light
- horizontal overflow: 259px
- clipped button: Search/ (off-screen: 357..423 of 390)
- clipped button: Create (off-screen: 431..517 of 390)
- clipped button: Theme: light (off-screen: 525..561 of 390)
- clipped button: Keyboard shortcuts (off-screen: 569..605 of 390)
- clipped button: User menu (off-screen: 613..649 of 390)
- screenshot: screenshots/p-prj-core-cases-c-1__tester__phone.jpg

### /p/prj_core/cases/c_1/history [tester] - phone light
- horizontal overflow: 259px
- clipped button: Search/ (off-screen: 357..423 of 390)
- clipped button: Create (off-screen: 431..517 of 390)
- clipped button: Theme: light (off-screen: 525..561 of 390)
- clipped button: Keyboard shortcuts (off-screen: 569..605 of 390)
- clipped button: User menu (off-screen: 613..649 of 390)
- screenshot: screenshots/p-prj-core-cases-c-1-history__tester__phone.jpg

### /p/prj_core/runs [tester] - phone light
- horizontal overflow: 259px
- clipped button: Search/ (off-screen: 357..423 of 390)
- clipped button: Create (off-screen: 431..517 of 390)
- clipped button: Theme: light (off-screen: 525..561 of 390)
- clipped button: Keyboard shortcuts (off-screen: 569..605 of 390)
- clipped button: User menu (off-screen: 613..649 of 390)
- screenshot: screenshots/p-prj-core-runs__tester__phone.jpg

### /p/prj_core/runs/new [tester] - phone light
- horizontal overflow: 259px
- clipped button: Search/ (off-screen: 357..423 of 390)
- clipped button: Create (off-screen: 431..517 of 390)
- clipped button: Theme: light (off-screen: 525..561 of 390)
- clipped button: Keyboard shortcuts (off-screen: 569..605 of 390)
- clipped button: User menu (off-screen: 613..649 of 390)
- screenshot: screenshots/p-prj-core-runs-new__tester__phone.jpg

### /p/prj_core/runs/run_web [tester] - phone light
- horizontal overflow: 259px
- clipped button: Search/ (off-screen: 357..423 of 390)
- clipped button: Create (off-screen: 431..517 of 390)
- clipped button: Theme: light (off-screen: 525..561 of 390)
- clipped button: Keyboard shortcuts (off-screen: 569..605 of 390)
- clipped button: User menu (off-screen: 613..649 of 390)
- screenshot: screenshots/p-prj-core-runs-run-web__tester__phone.jpg

### /p/prj_core/runs/run_web/tests/t_run_web_1 [tester] - phone light
- horizontal overflow: 259px
- clipped button: Search/ (off-screen: 357..423 of 390)
- clipped button: Create (off-screen: 431..517 of 390)
- clipped button: Theme: light (off-screen: 525..561 of 390)
- clipped button: Keyboard shortcuts (off-screen: 569..605 of 390)
- clipped button: User menu (off-screen: 613..649 of 390)
- screenshot: screenshots/p-prj-core-runs-run-web-tests-t-run-web-1__tester__phone.jpg

### /p/prj_core/milestones [manager] - phone light
- horizontal overflow: 259px
- clipped button: Search/ (off-screen: 357..423 of 390)
- clipped button: Create (off-screen: 431..517 of 390)
- clipped button: Theme: light (off-screen: 525..561 of 390)
- clipped button: Keyboard shortcuts (off-screen: 569..605 of 390)
- clipped button: User menu (off-screen: 613..649 of 390)
- screenshot: screenshots/p-prj-core-milestones__manager__phone.jpg

### /p/prj_core/milestones/ms_24 [manager] - phone light
- horizontal overflow: 259px
- clipped button: Search/ (off-screen: 357..423 of 390)
- clipped button: Create (off-screen: 431..517 of 390)
- clipped button: Theme: light (off-screen: 525..561 of 390)
- clipped button: Keyboard shortcuts (off-screen: 569..605 of 390)
- clipped button: User menu (off-screen: 613..649 of 390)
- screenshot: screenshots/p-prj-core-milestones-ms-24__manager__phone.jpg

### /p/prj_core/plans [manager] - phone light
- horizontal overflow: 259px
- clipped button: Search/ (off-screen: 357..423 of 390)
- clipped button: Create (off-screen: 431..517 of 390)
- clipped button: Theme: light (off-screen: 525..561 of 390)
- clipped button: Keyboard shortcuts (off-screen: 569..605 of 390)
- clipped button: User menu (off-screen: 613..649 of 390)
- screenshot: screenshots/p-prj-core-plans__manager__phone.jpg

### /p/prj_core/plans/plan_24 [manager] - phone light
- horizontal overflow: 259px
- clipped button: Search/ (off-screen: 357..423 of 390)
- clipped button: Create (off-screen: 431..517 of 390)
- clipped button: Theme: light (off-screen: 525..561 of 390)
- clipped button: Keyboard shortcuts (off-screen: 569..605 of 390)
- clipped button: User menu (off-screen: 613..649 of 390)
- screenshot: screenshots/p-prj-core-plans-plan-24__manager__phone.jpg

### /p/prj_core/reports [manager] - phone light
- horizontal overflow: 259px
- clipped button: Search/ (off-screen: 357..423 of 390)
- clipped button: Create (off-screen: 431..517 of 390)
- clipped button: Theme: light (off-screen: 525..561 of 390)
- clipped button: Keyboard shortcuts (off-screen: 569..605 of 390)
- clipped button: User menu (off-screen: 613..649 of 390)
- screenshot: screenshots/p-prj-core-reports__manager__phone.jpg

### /p/prj_core/reports/run/run_web [manager] - phone light
- horizontal overflow: 259px
- clipped button: Search/ (off-screen: 357..423 of 390)
- clipped button: Create (off-screen: 431..517 of 390)
- clipped button: Theme: light (off-screen: 525..561 of 390)
- clipped button: Keyboard shortcuts (off-screen: 569..605 of 390)
- clipped button: User menu (off-screen: 613..649 of 390)
- screenshot: screenshots/p-prj-core-reports-run-run-web__manager__phone.jpg

### /p/prj_core/reports/milestone/ms_24 [manager] - phone light
- horizontal overflow: 259px
- clipped button: Search/ (off-screen: 357..423 of 390)
- clipped button: Create (off-screen: 431..517 of 390)
- clipped button: Theme: light (off-screen: 525..561 of 390)
- clipped button: Keyboard shortcuts (off-screen: 569..605 of 390)
- clipped button: User menu (off-screen: 613..649 of 390)
- screenshot: screenshots/p-prj-core-reports-milestone-ms-24__manager__phone.jpg

### /p/prj_core/automation [manager] - phone light
- horizontal overflow: 259px
- clipped button: Search/ (off-screen: 357..423 of 390)
- clipped button: Create (off-screen: 431..517 of 390)
- clipped button: Theme: light (off-screen: 525..561 of 390)
- clipped button: Keyboard shortcuts (off-screen: 569..605 of 390)
- clipped button: User menu (off-screen: 613..649 of 390)
- screenshot: screenshots/p-prj-core-automation__manager__phone.jpg

### /p/prj_core/automation/executions/ex_1 [manager] - phone light
- horizontal overflow: 259px
- clipped button: Search/ (off-screen: 357..423 of 390)
- clipped button: Create (off-screen: 431..517 of 390)
- clipped button: Theme: light (off-screen: 525..561 of 390)
- clipped button: Keyboard shortcuts (off-screen: 569..605 of 390)
- clipped button: User menu (off-screen: 613..649 of 390)
- screenshot: screenshots/p-prj-core-automation-executions-ex-1__manager__phone.jpg

### /projects [admin] - phone dark
- horizontal overflow: 54px
- clipped button: Keyboard shortcuts (off-screen: 364..400 of 390)
- clipped button: User menu (off-screen: 408..444 of 390)

### /projects/new [admin] - phone dark
- horizontal overflow: 54px
- clipped button: Keyboard shortcuts (off-screen: 364..400 of 390)
- clipped button: User menu (off-screen: 408..444 of 390)

### /p/prj_core [admin] - phone dark
- horizontal overflow: 259px
- clipped button: Search/ (off-screen: 357..423 of 390)
- clipped button: Create (off-screen: 431..517 of 390)
- clipped button: Theme: dark (off-screen: 525..561 of 390)
- clipped button: Keyboard shortcuts (off-screen: 569..605 of 390)
- clipped button: User menu (off-screen: 613..649 of 390)

### /p/prj_core/members [admin] - phone dark
- horizontal overflow: 259px
- clipped button: Search/ (off-screen: 357..423 of 390)
- clipped button: Create (off-screen: 431..517 of 390)
- clipped button: Theme: dark (off-screen: 525..561 of 390)
- clipped button: Keyboard shortcuts (off-screen: 569..605 of 390)
- clipped button: User menu (off-screen: 613..649 of 390)

### /p/prj_core/audit [admin] - phone dark
- horizontal overflow: 259px
- clipped button: Search/ (off-screen: 357..423 of 390)
- clipped button: Create (off-screen: 431..517 of 390)
- clipped button: Theme: dark (off-screen: 525..561 of 390)
- clipped button: Keyboard shortcuts (off-screen: 569..605 of 390)
- clipped button: User menu (off-screen: 613..649 of 390)

### /p/prj_core/settings [admin] - phone dark
- horizontal overflow: 259px
- clipped button: Search/ (off-screen: 357..423 of 390)
- clipped button: Create (off-screen: 431..517 of 390)
- clipped button: Theme: dark (off-screen: 525..561 of 390)
- clipped button: Keyboard shortcuts (off-screen: 569..605 of 390)
- clipped button: User menu (off-screen: 613..649 of 390)

### /p/prj_core [viewer] - phone dark
- horizontal overflow: 165px
- clipped button: Search/ (off-screen: 357..423 of 390)
- clipped button: Theme: dark (off-screen: 431..467 of 390)
- clipped button: Keyboard shortcuts (off-screen: 475..511 of 390)
- clipped button: User menu (off-screen: 519..555 of 390)

### /p/prj_mob [viewer] - phone dark
- horizontal overflow: 140px
- clipped button: Search/ (off-screen: 332..398 of 390)
- clipped button: Theme: dark (off-screen: 406..442 of 390)
- clipped button: Keyboard shortcuts (off-screen: 450..486 of 390)
- clipped button: User menu (off-screen: 494..530 of 390)

### /p/prj_core/cases [tester] - phone dark
- horizontal overflow: 259px
- clipped button: Search/ (off-screen: 357..423 of 390)
- clipped button: Create (off-screen: 431..517 of 390)
- clipped button: Theme: dark (off-screen: 525..561 of 390)
- clipped button: Keyboard shortcuts (off-screen: 569..605 of 390)
- clipped button: User menu (off-screen: 613..649 of 390)

### /p/prj_core/cases/new [tester] - phone dark
- horizontal overflow: 259px
- clipped button: Search/ (off-screen: 357..423 of 390)
- clipped button: Create (off-screen: 431..517 of 390)
- clipped button: Theme: dark (off-screen: 525..561 of 390)
- clipped button: Keyboard shortcuts (off-screen: 569..605 of 390)
- clipped button: User menu (off-screen: 613..649 of 390)

### /p/prj_core/cases/c_1 [tester] - phone dark
- horizontal overflow: 259px
- clipped button: Search/ (off-screen: 357..423 of 390)
- clipped button: Create (off-screen: 431..517 of 390)
- clipped button: Theme: dark (off-screen: 525..561 of 390)
- clipped button: Keyboard shortcuts (off-screen: 569..605 of 390)
- clipped button: User menu (off-screen: 613..649 of 390)

### /p/prj_core/cases/c_1/history [tester] - phone dark
- horizontal overflow: 259px
- clipped button: Search/ (off-screen: 357..423 of 390)
- clipped button: Create (off-screen: 431..517 of 390)
- clipped button: Theme: dark (off-screen: 525..561 of 390)
- clipped button: Keyboard shortcuts (off-screen: 569..605 of 390)
- clipped button: User menu (off-screen: 613..649 of 390)

### /p/prj_core/runs [tester] - phone dark
- horizontal overflow: 259px
- clipped button: Search/ (off-screen: 357..423 of 390)
- clipped button: Create (off-screen: 431..517 of 390)
- clipped button: Theme: dark (off-screen: 525..561 of 390)
- clipped button: Keyboard shortcuts (off-screen: 569..605 of 390)
- clipped button: User menu (off-screen: 613..649 of 390)

### /p/prj_core/runs/new [tester] - phone dark
- horizontal overflow: 259px
- clipped button: Search/ (off-screen: 357..423 of 390)
- clipped button: Create (off-screen: 431..517 of 390)
- clipped button: Theme: dark (off-screen: 525..561 of 390)
- clipped button: Keyboard shortcuts (off-screen: 569..605 of 390)
- clipped button: User menu (off-screen: 613..649 of 390)

### /p/prj_core/runs/run_web [tester] - phone dark
- horizontal overflow: 259px
- clipped button: Search/ (off-screen: 357..423 of 390)
- clipped button: Create (off-screen: 431..517 of 390)
- clipped button: Theme: dark (off-screen: 525..561 of 390)
- clipped button: Keyboard shortcuts (off-screen: 569..605 of 390)
- clipped button: User menu (off-screen: 613..649 of 390)

### /p/prj_core/runs/run_web/tests/t_run_web_1 [tester] - phone dark
- horizontal overflow: 259px
- clipped button: Search/ (off-screen: 357..423 of 390)
- clipped button: Create (off-screen: 431..517 of 390)
- clipped button: Theme: dark (off-screen: 525..561 of 390)
- clipped button: Keyboard shortcuts (off-screen: 569..605 of 390)
- clipped button: User menu (off-screen: 613..649 of 390)

### /p/prj_core/milestones [manager] - phone dark
- horizontal overflow: 259px
- clipped button: Search/ (off-screen: 357..423 of 390)
- clipped button: Create (off-screen: 431..517 of 390)
- clipped button: Theme: dark (off-screen: 525..561 of 390)
- clipped button: Keyboard shortcuts (off-screen: 569..605 of 390)
- clipped button: User menu (off-screen: 613..649 of 390)

### /p/prj_core/milestones/ms_24 [manager] - phone dark
- horizontal overflow: 259px
- clipped button: Search/ (off-screen: 357..423 of 390)
- clipped button: Create (off-screen: 431..517 of 390)
- clipped button: Theme: dark (off-screen: 525..561 of 390)
- clipped button: Keyboard shortcuts (off-screen: 569..605 of 390)
- clipped button: User menu (off-screen: 613..649 of 390)

### /p/prj_core/plans [manager] - phone dark
- horizontal overflow: 259px
- clipped button: Search/ (off-screen: 357..423 of 390)
- clipped button: Create (off-screen: 431..517 of 390)
- clipped button: Theme: dark (off-screen: 525..561 of 390)
- clipped button: Keyboard shortcuts (off-screen: 569..605 of 390)
- clipped button: User menu (off-screen: 613..649 of 390)

### /p/prj_core/plans/plan_24 [manager] - phone dark
- horizontal overflow: 259px
- clipped button: Search/ (off-screen: 357..423 of 390)
- clipped button: Create (off-screen: 431..517 of 390)
- clipped button: Theme: dark (off-screen: 525..561 of 390)
- clipped button: Keyboard shortcuts (off-screen: 569..605 of 390)
- clipped button: User menu (off-screen: 613..649 of 390)

### /p/prj_core/reports [manager] - phone dark
- horizontal overflow: 259px
- clipped button: Search/ (off-screen: 357..423 of 390)
- clipped button: Create (off-screen: 431..517 of 390)
- clipped button: Theme: dark (off-screen: 525..561 of 390)
- clipped button: Keyboard shortcuts (off-screen: 569..605 of 390)
- clipped button: User menu (off-screen: 613..649 of 390)

### /p/prj_core/reports/run/run_web [manager] - phone dark
- horizontal overflow: 259px
- clipped button: Search/ (off-screen: 357..423 of 390)
- clipped button: Create (off-screen: 431..517 of 390)
- clipped button: Theme: dark (off-screen: 525..561 of 390)
- clipped button: Keyboard shortcuts (off-screen: 569..605 of 390)
- clipped button: User menu (off-screen: 613..649 of 390)

### /p/prj_core/reports/milestone/ms_24 [manager] - phone dark
- horizontal overflow: 259px
- clipped button: Search/ (off-screen: 357..423 of 390)
- clipped button: Create (off-screen: 431..517 of 390)
- clipped button: Theme: dark (off-screen: 525..561 of 390)
- clipped button: Keyboard shortcuts (off-screen: 569..605 of 390)
- clipped button: User menu (off-screen: 613..649 of 390)

### /p/prj_core/automation [manager] - phone dark
- horizontal overflow: 259px
- clipped button: Search/ (off-screen: 357..423 of 390)
- clipped button: Create (off-screen: 431..517 of 390)
- clipped button: Theme: dark (off-screen: 525..561 of 390)
- clipped button: Keyboard shortcuts (off-screen: 569..605 of 390)
- clipped button: User menu (off-screen: 613..649 of 390)

### /p/prj_core/automation/executions/ex_1 [manager] - phone dark
- horizontal overflow: 259px
- clipped button: Search/ (off-screen: 357..423 of 390)
- clipped button: Create (off-screen: 431..517 of 390)
- clipped button: Theme: dark (off-screen: 525..561 of 390)
- clipped button: Keyboard shortcuts (off-screen: 569..605 of 390)
- clipped button: User menu (off-screen: 613..649 of 390)
