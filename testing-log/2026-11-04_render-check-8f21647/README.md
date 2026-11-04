# Render check 2026-11-04 (8f21647)

- Command: `BASE_URL=http://localhost:3000 npm run render:check`
- Operator: scripts/render-check.mjs (Playwright chromium); app not rebuilt by this run
- Matrix: 1 route entries x 2 viewports (390x844, 1440x900) x 2 themes = 4 page checks
- Checks: console errors, page errors, failed requests, HTTP >= 400, horizontal overflow, clipped buttons, axe-core wcag2a/2aa/21aa serious+critical
- Result: **PASS** - 4 ok, 0 with failures (0 axe serious/critical rule hits)
- Screenshots: 2 files, 0.1 MB (light theme only unless SAVE_DARK=1; dark is checked, not saved)

## Summary

| Route [role] | phone light | phone dark | desktop light | desktop dark |
|---|---|---|---|---|
| `/p/prj_core/reports/run/run_web [manager]` | ok | ok | ok | ok |

## Failures

None.
