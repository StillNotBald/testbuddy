# E2E run, 2026-11-04, build 6cbcd0f

- **Target:** standalone production build at http://127.0.0.1:3100 (`npm run build && npm run start:standalone`).
- **Command:** `BASE_URL=http://127.0.0.1:3100 npx playwright test --workers=2`
- **Projects:** chromium (desktop) and mobile-390.
- **Result:** 47 passed, 1 skipped, 0 failed (33.8 s).
- **Skipped:** the theme toggle on mobile-390. Phones follow the system theme, and the toggle is desktop and tablet only.

## Before this run
23 tests failed on the first run against the built screens. All 23 failures were stale expectations from the placeholder era, not app defects:
- the sign-in heading text changed
- home now opens the first project instead of `/projects`
- disabled demo accounts are now disabled buttons
- the overview's "Project sections" nav clashed with a non-exact name match
- the theme toggle is hidden on phones (phone topbar fix)

The tests were updated to match.
