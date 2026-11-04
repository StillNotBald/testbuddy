# Playwright e2e, 2026-11-04 (specs at 4011733)

- Command: `BASE_URL=http://127.0.0.1:3100 npm run e2e` (production standalone build; the run does not build or start the app)
- Operator: Claude agent on the Mac (Chromium, 2 workers, retries 0)
- Projects: `chromium` (desktop) and `mobile-390` (Chromium, 390x844, touch)
- Result: **48 passed, 0 failed** (about 35 s). 24 tests per project.
- Specs: `e2e/smoke.spec.ts`, `e2e/auth.spec.ts`, `e2e/shell.spec.ts` (helpers in `e2e/helpers.ts`)

## What is covered

| Area | Test |
|---|---|
| Sign-in picker | lists the demo users with their CORE role; inactive user shows Disabled and cannot sign in; sign in as admin, manager, tester, viewer; `next` is honoured; sign out |
| Signed out | `/projects`, `/p/prj_core`, `/p/prj_core/cases`, `/p/prj_core/settings` redirect to `/sign-in?next=...` |
| Role-filtered sidebar | admin sees Members, Audit log, Settings; manager sees Members, Settings; tester and viewer see none (matches `src/lib/permissions.ts`) |
| Global search and help | `/` and Cmd/Ctrl+K open search; `?` opens keyboard help; Escape closes |
| Theme | toggle to dark persists across reload; back to light persists |
| Mock DB | an edit survives reload and the session survives; Reset demo data: Cancel keeps the edit, confirm restores the seed |
| Smoke | home redirects to the sign-in picker; `/api/health` answers |

## Gaps and notes

- Screens are still placeholders ("Coming in the next wave"), so no screen content is asserted. Add specs as screens land.
- The mock DB edit is made by writing the localStorage envelope (no UI path to edit data exists yet).
- At 390px the account menu, its items and the reset dialog buttons are driven with keyboard focus + Enter. Pointer clicks do not reach them because the topbar is wider than the phone viewport (app defect, see `../2026-11-04_render-check-0662317/README.md`). When that is fixed, these can go back to plain clicks.
