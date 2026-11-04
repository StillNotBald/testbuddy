# Guide targets for screen builders

The in-app tour (`src/guide/guide.content.ts`, run by `src/guide/tour/`) rings elements by `data-tour="<name>"`. Add the attribute to the element named below when you build the screen. Keep the name exactly. A step whose target is missing is shown centred with a plain message, so a missing target is visible when you open the tour on that screen.

Element must be visible on first load of the route, for the demo project (`prj_core`), demo run (`run_web`) and demo test (`t_run_web_1`) used by the default content. If a target only exists for some roles, mark the step's `requires` in the content (already done where known).

## Already in the shell (done)

| data-tour | Element | File |
|---|---|---|
| `nav-overview`, `nav-cases`, `nav-milestones`, `nav-runs`, `nav-reports`, `nav-automation`, `nav-members`, `nav-audit`, `nav-settings` | Sidebar links (`nav-<NavItem.id>`) | `components/shell/project-sidebar.tsx` |
| `topbar-search` | Search button | `components/shell/topbar.tsx` |
| `topbar-create` | Create menu trigger | `components/shell/topbar.tsx` |
| `topbar-help` | Help menu trigger ("Take the guide", shortcuts, How it works) | `components/shell/topbar.tsx` |
| `user-menu` | User menu trigger ("Take the guide" item) | `components/shell/user-menu.tsx` |

## To add per screen

| Screen (route) | data-tour | Put it on | Used by goal |
|---|---|---|---|
| Overview `/p/{id}` | `overview-stats` | The row of four stat tiles (Cases, Open runs, Pass rate, Failing) | release-status |
| Overview | `overview-milestone` | The active-milestone progress card | release-status |
| Repository `/p/{id}/cases` | `repo-tree` | The suite and section tree on the left | first-case |
| New case `/p/{id}/cases/new` | `case-title` | The title input | first-case |
| New case | `case-steps` | The steps editor (step list with expected results) | first-case |
| New case | `case-save` | The Save button | first-case |
| Milestones `/p/{id}/milestones` | `milestones-list` | The milestone list or table | release-status |
| Runs `/p/{id}/runs` | `runs-create` | The "New run" button in the page header (only for roles that can create runs) | run-cycle |
| New run `/p/{id}/runs/new` | `run-picker` | The case picker (tree or list with checkboxes and count) | run-cycle |
| New run | `run-submit` | The "Create run" button | run-cycle |
| Run detail `/p/{id}/runs/{runId}` | `run-progress` | The progress bar with status counts | run-cycle |
| Run detail | `run-close` | The "Close run" button (only when the role can close) | run-cycle |
| Run detail | `run-tests` | The tests table or list | record-fast |
| Test execution `/p/{id}/runs/{runId}/tests/{testId}` | `exec-status` | The sticky status bar (P / F / B / R buttons) | record-fast |
| Test execution | `exec-hotkeys` | The same status bar, or the key hints (`Kbd`) next to the buttons. A second target on the same bar is fine if the content selector is changed | record-fast |
| Test execution | `exec-save-next` | The "Save and next" button | record-fast |
| Reports `/p/{id}/reports` | `reports-index` | The list of milestone and run reports | release-status |
| Reports | `reports-export` | The CSV export button (managers and admins only) | release-status |
| Automation `/p/{id}/automation?tab=tokens` | `automation-tokens` | The tokens tab content, or its Create token button | connect-ci |
| Automation `?tab=mappings` | `automation-mappings` | The mappings tab content | connect-ci |
| Automation `?tab=executions` | `automation-executions` | The executions tab content | connect-ci |
| Members `/p/{id}/members` | `members-invite` | The "Add member" button (admins only) | invite-team |
| Members | `members-roles` | The role column or role select in the member list | invite-team |

Notes for builders

- Put the attribute on a stable wrapper, not on text that changes. If an element is drawn after a fetch, that is fine: the tour waits up to 3 seconds.
- When a desktop and a phone version of an element both exist, give both the same name; the guide rings the first visible one.
- If a route uses tabs, the tab must follow `?tab=` in the URL; the guide navigates there with that parameter.
- Run ids and test ids in the default content come from the mock fixtures. When the app is wired to PocketBase, pass real ids to `createGuide({ runId, testId })` or point those two steps at a list screen.
