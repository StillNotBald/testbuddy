# Milestone 0 UAT plan

Status: **DRAFT**, ready to run. This plan is for a person, not a script. It covers the Milestone 0 prototype (UI on mock data) and is the gate before any backend work starts (`docs/implementation-plan.md`, owner review gate).

Each screen below comes from `docs/design/DESIGN.md` section 6. Each table has one test per relevant role, with a desktop row and a phone row. Permissions come from the role table in DESIGN.md section 8.

## Before you start

1. **Start the prototype once.** A developer runs `npm install`, then `npm run dev`, and opens http://localhost:3000. The app runs on mock data (`NEXT_PUBLIC_MOCK=1`, see `docs/design/mock-data.md`).
2. **Reset the demo data.** Click **Reset demo data** (in the dev toolbar) before each block of tests. Edits you make are kept in the browser until you reset. Reset again when you finish the round.
3. **Pick a role.** Use the dev toolbar role switcher. The mock accounts are:

   | Role | Mock account | Used for |
   |---|---|---|
   | Admin | Avery Quinn | Everything |
   | Manager | Raj Patel | Milestones, plans, reports, settings (announcement and import) |
   | Tester | Dana Lee | Cases, runs, executing tests |
   | Viewer | Mia Chen | Read-only checks |
   | Inactive | Pat Doe | Sign-in rejection only |

4. **Set the two screen sizes.**
   - **Desktop:** the browser window at 1280px wide or more.
   - **Phone 390px:** in Chrome, open DevTools, turn on the device toolbar, and set the size to 390 x 844. A real phone at 390px width also works.
5. **Record each result.** Tick Pass or Fail. On a fail, write what you saw in Notes and add a row to `01-FINDINGS.md`. Use a screenshot if you can.

## Rules for reading the expected results

- **Phone rule.** On a phone (under 768px) the app is read-only. Creating, editing, importing and executing are hidden, with the note "Open on a larger screen to edit". If you see an edit control on the phone, that is a Fail.
- **Hidden means hidden.** If a control is hidden for a role, it must not appear. If the role types the address of a screen it cannot use, the screen shows a no-access message. A control that is present but fails when used is a Fail.
- **Disabled means explained.** A disabled control must show a tooltip that says why.
- **Layout.** At 390px there is no sideways page scroll, text is not cut off, and buttons are fully visible.

---

## 6.1 Sign in `/sign-in`

Role: anyone, signed out.

| Test ID | Role | Device | Steps | Expected result | Pass / fail | Notes |
|---|---|---|---|---|---|---|
| 6.1-Any-D | Any | Desktop | 1. Open `/sign-in`. 2. Type Dana Lee's email and a wrong password. Press Sign in. 3. Check the message and where the cursor is. 4. Type Dana's correct password. Press Sign in. 5. Sign out. 6. Sign in as Pat Doe (inactive account). | Step 2: message "Email or password is incorrect"; focus moves to the email field. Step 4: you land on `/projects` (or on the page you asked for before signing in). Step 6: message "This account is disabled. Ask an admin." | ☐ Pass ☐ Fail | |
| 6.1-Any-P | Any | Phone 390px | Same steps as 6.1-Any-D. | Same results. Both fields and the Sign in button are fully visible without sideways scrolling. | ☐ Pass ☐ Fail | |

## 6.2 Workspace and project list `/projects`

| Test ID | Role | Device | Steps | Expected result | Pass / fail | Notes |
|---|---|---|---|---|---|---|
| 6.2-Admin-D | Admin | Desktop | 1. Open `/projects`. 2. Check the list shows CORE and MOB with prefix, name, your role, case count and open runs. 3. Click **+ New project**. 4. Type name "UAT Test Project" and prefix "UAT". Watch the prefix check. 5. Save. | Step 2: both projects shown as rows, with case and run counts. Step 3: a dialog with name, ref prefix and announcement fields. Step 4: the prefix check says whether "UAT" is free. Step 5: the new project appears in the list. | ☐ Pass ☐ Fail | Do not reset demo data again until 6.16-Admin-D is done, or this project is lost. |
| 6.2-Admin-P | Admin | Phone 390px | 1. Open `/projects`. 2. Look for **+ New project**. | Projects are readable as rows or cards. **+ New project** is hidden, with the note "Open on a larger screen to edit". | ☐ Pass ☐ Fail | |
| 6.2-Manager-D | Manager | Desktop | 1. Open `/projects`. 2. Click **+ New project** and cancel. | Both projects shown. **+ New project** is visible and opens the dialog. | ☐ Pass ☐ Fail | |
| 6.2-Manager-P | Manager | Phone 390px | 1. Open `/projects`. | Projects readable. No create button; note shown. | ☐ Pass ☐ Fail | |
| 6.2-Tester-D | Tester | Desktop | 1. Open `/projects`. 2. Look for **+ New project**. | CORE is listed with your role Tester. No create button. | ☐ Pass ☐ Fail | |
| 6.2-Tester-P | Tester | Phone 390px | 1. Open `/projects`. | Projects readable. No create button. | ☐ Pass ☐ Fail | |
| 6.2-Viewer-D | Viewer | Desktop | 1. Open `/projects`. 2. Look for **+ New project**. | CORE is listed with your role Viewer. No create button. | ☐ Pass ☐ Fail | |
| 6.2-Viewer-P | Viewer | Phone 390px | 1. Open `/projects`. | Projects readable. No create button. | ☐ Pass ☐ Fail | |

## 6.3 Project overview `/p/{projectId}`

| Test ID | Role | Device | Steps | Expected result | Pass / fail | Notes |
|---|---|---|---|---|---|---|
| 6.3-Admin-D | Admin | Desktop | 1. Open project CORE. 2. Read the four tiles (Cases, Open runs, Pass rate, Failing). 3. Find the active milestone "Release 2.4". 4. Check **+ New run**, **+ New case** and the announcement "Release freeze Friday 18:00". 5. Dismiss the announcement and reload. | Step 2: four tiles with numbers, not blank. Step 3: milestone shows a due date and progress. Step 4: both buttons visible. Step 5: announcement stays hidden for you after reload. | ☐ Pass ☐ Fail | |
| 6.3-Admin-P | Admin | Phone 390px | 1. Open CORE on the phone. 2. Read the tiles and the milestone. 3. Look for **+ New run** and **+ New case**. | Tiles stack in one column with no cut-off text. Milestone readable. Both buttons hidden, with the note "Open on a larger screen to edit". | ☐ Pass ☐ Fail | |
| 6.3-Manager-D | Manager | Desktop | 1. Open CORE. 2. Check the tiles, milestone and both buttons. 3. Read the announcement. | Same tiles, milestone and buttons as 6.3-Admin-D. Announcement readable. | ☐ Pass ☐ Fail | Spec check: DESIGN 6.3 says the announcement is editable by admin, while 6.16 gives the Manager an announcement control. Record which you see as a Minor finding. |
| 6.3-Manager-P | Manager | Phone 390px | 1. Open CORE on the phone. | Tiles and milestone readable. Create buttons hidden, with note. | ☐ Pass ☐ Fail | |
| 6.3-Tester-D | Tester | Desktop | 1. Open CORE. 2. Check **+ New run** and **+ New case**. 3. Find "My assigned tests" and **Start next untested**. | Both buttons visible. "My assigned tests" lists Dana's tests. **Start next untested** visible. | ☐ Pass ☐ Fail | |
| 6.3-Tester-P | Tester | Phone 390px | 1. Open CORE on the phone. 2. Look for **Start next untested**. | "My assigned tests" readable. **Start next untested** hidden, with note. Create buttons hidden. | ☐ Pass ☐ Fail | |
| 6.3-Viewer-D | Viewer | Desktop | 1. Open CORE. 2. Look for any create button. | Tiles and milestone readable. No create buttons. | ☐ Pass ☐ Fail | |
| 6.3-Viewer-P | Viewer | Phone 390px | 1. Open CORE on the phone. | Tiles readable. No create buttons. | ☐ Pass ☐ Fail | |

## 6.4 Case repository `/p/{projectId}/cases`

| Test ID | Role | Device | Steps | Expected result | Pass / fail | Notes |
|---|---|---|---|---|---|---|
| 6.4-Tester-D | Tester | Desktop | 1. Open the Cases page. 2. Click the "Login" suite in the tree. 3. Tick two cases. 4. Click **+ New case** and cancel. 5. Search for "lockout". | Step 1: three areas: tree, list, inspector. Step 2: list filters to Login cases. Step 3: bulk bar says "2 selected" with bulk actions. Step 4: a new-case form opens. Step 5: the list narrows to matching cases. Deprecated cases are dimmed and hidden unless you choose to show them. | ☐ Pass ☐ Fail | |
| 6.4-Tester-P | Tester | Phone 390px | 1. Open Cases on the phone. 2. Open a case. 3. Look for checkboxes, **+ New case** and an Edit button. | Cases readable (cards or rows). Opening a case shows its details. No checkboxes, no create or edit controls, note shown. | ☐ Pass ☐ Fail | |
| 6.4-Viewer-D | Viewer | Desktop | 1. Open Cases. 2. Click a case. 3. Look for checkboxes, **+ New case** and Edit in the inspector. 4. Open the case's History tab. | Inspector shows the case read-only. No checkboxes, no bulk bar, no create or edit controls. History readable. | ☐ Pass ☐ Fail | |
| 6.4-Viewer-P | Viewer | Phone 390px | 1. Open Cases on the phone. 2. Open a case. | Read-only view. No edit controls. | ☐ Pass ☐ Fail | |

## 6.5 Case editor and version history `/p/{projectId}/cases/{caseId}`

| Test ID | Role | Device | Steps | Expected result | Pass / fail | Notes |
|---|---|---|---|---|---|---|
| 6.5-Tester-D | Tester | Desktop | 1. Open CORE-C41. 2. Click Edit. 3. Change the title by adding "(UAT)". 4. Try to leave the page without saving. 5. Stay, then click **Save as v4**. 6. Open History. | Step 2: form with title, steps, suite, priority, tags. Step 4: a warning about unsaved changes. Step 5: button reads "Save as v4" and saves a new version. Step 6: a v4 entry at the top; the earlier version still listed. | ☐ Pass ☐ Fail | Reset demo data afterwards. |
| 6.5-Tester-P | Tester | Phone 390px | 1. Open CORE-C41 on the phone. 2. Look for Edit. | Case readable. No Edit button. Note shown. | ☐ Pass ☐ Fail | |
| 6.5-Viewer-D | Viewer | Desktop | 1. Open CORE-C41. 2. Look for Edit, Save and Restore. 3. Open History and select two versions to compare. | Fields shown as text. No Edit, Save or Restore. History and comparison work. | ☐ Pass ☐ Fail | |
| 6.5-Viewer-P | Viewer | Phone 390px | 1. Open CORE-C41 on the phone. | Read-only. No edit controls. | ☐ Pass ☐ Fail | |

## 6.6 Milestones `/p/{projectId}/milestones`

| Test ID | Role | Device | Steps | Expected result | Pass / fail | Notes |
|---|---|---|---|---|---|---|
| 6.6-Manager-D | Manager | Desktop | 1. Open Milestones. 2. Check Release 2.4 (open, due in 6 days) and Release 2.3 (completed). 3. Click **+ New milestone** and cancel. 4. Open Release 2.4 and click Complete. Cancel. | Step 2: open and completed milestones shown separately, with progress. Step 3: form opens. Step 4: confirmation lists the open runs still attached. | ☐ Pass ☐ Fail | |
| 6.6-Manager-P | Manager | Phone 390px | 1. Open Milestones on the phone. 2. Check Release 2.4's past-due or due-soon label. | Milestones readable. The due state uses text, not only colour. No create or complete controls. | ☐ Pass ☐ Fail | |
| 6.6-Tester-D | Tester | Desktop | 1. Open Milestones. 2. Look for **+ New milestone** and Complete. | Milestones readable. No create or complete controls. | ☐ Pass ☐ Fail | |
| 6.6-Tester-P | Tester | Phone 390px | 1. Open Milestones on the phone. | Read-only. | ☐ Pass ☐ Fail | |
| 6.6-Viewer-D | Viewer | Desktop | 1. Open Milestones. 2. Look for create or complete controls. | Read-only. | ☐ Pass ☐ Fail | |
| 6.6-Viewer-P | Viewer | Phone 390px | 1. Open Milestones on the phone. | Read-only. | ☐ Pass ☐ Fail | |

## 6.7 Plans `/p/{projectId}/plans`

| Test ID | Role | Device | Steps | Expected result | Pass / fail | Notes |
|---|---|---|---|---|---|---|
| 6.7-Manager-D | Manager | Desktop | 1. Open Plans. 2. Open "Release 2.4 regression". 3. Read the runs grouped by suite. 4. Click **+ New plan** and cancel. | Plan shows its milestone, owner, runs and progress. Runs grouped by suite. Form opens for a new plan. | ☐ Pass ☐ Fail | |
| 6.7-Manager-P | Manager | Phone 390px | 1. Open Plans on the phone. 2. Open the plan. | Readable. No create or edit controls. | ☐ Pass ☐ Fail | |
| 6.7-Tester-D | Tester | Desktop | 1. Open Plans. 2. Open the plan. 3. Look for **+ New plan**, **Add run to plan** and **Complete plan**. | Plan readable. None of the three controls shown. | ☐ Pass ☐ Fail | |
| 6.7-Tester-P | Tester | Phone 390px | 1. Open Plans on the phone. | Read-only. | ☐ Pass ☐ Fail | |
| 6.7-Viewer-D | Viewer | Desktop | 1. Open Plans. 2. Open the plan. 3. Look for create or edit controls. | Read-only. | ☐ Pass ☐ Fail | |
| 6.7-Viewer-P | Viewer | Phone 390px | 1. Open Plans on the phone. | Read-only. | ☐ Pass ☐ Fail | |

## 6.8 Run list `/p/{projectId}/runs`

| Test ID | Role | Device | Steps | Expected result | Pass / fail | Notes |
|---|---|---|---|---|---|---|
| 6.8-Tester-D | Tester | Desktop | 1. Open Runs. 2. Switch between Open, Closed and All. 3. Find "Release 2.3 full regression" (closed). 4. Check **+ New run**. | Each filter changes the list. Closed run shows a lock icon and "Closed". Progress shows as a bar, a percentage and a failed count. **+ New run** visible. | ☐ Pass ☐ Fail | |
| 6.8-Tester-P | Tester | Phone 390px | 1. Open Runs on the phone. | Runs readable with progress. No **+ New run**. Note shown. | ☐ Pass ☐ Fail | |
| 6.8-Viewer-D | Viewer | Desktop | 1. Open Runs. 2. Check the filters and for **+ New run**. | Filters work. No **+ New run**. | ☐ Pass ☐ Fail | |
| 6.8-Viewer-P | Viewer | Phone 390px | 1. Open Runs on the phone. | Read-only. | ☐ Pass ☐ Fail | |

## 6.9 Create run `/p/{projectId}/runs/new`

| Test ID | Role | Device | Steps | Expected result | Pass / fail | Notes |
|---|---|---|---|---|---|---|
| 6.9-Tester-D | Tester | Desktop | 1. Open **+ New run**. 2. Press the create button with the name empty. 3. Type name "UAT smoke". 4. Look at the Plan and Milestone fields. 5. Choose "Select specific cases". Tick three cases. 6. Click **Create run with 3 tests**. | Step 2: inline error on the name field, not a pop-up. Step 4: Plan and Milestone are disabled, with a tooltip saying testers cannot attach runs. Step 5: the right panel counts 3 selected. Step 6: progress "Snapshotting 3 cases", then the run detail page. | ☐ Pass ☐ Fail | Reset demo data afterwards. |
| 6.9-Tester-P | Tester | Phone 390px | 1. Type `/p/CORE/runs/new` on the phone. | No create form. A note says to open on a larger screen. | ☐ Pass ☐ Fail | |
| 6.9-Manager-D | Manager | Desktop | 1. Open **+ New run**. 2. Choose Plan "Release 2.4 regression" and Milestone "Release 2.4". 3. Choose "Include all active cases" in the suite. Check the count. 4. Cancel. | Plan and Milestone fields enabled. The count matches the active cases in the chosen suite. | ☐ Pass ☐ Fail | |
| 6.9-Manager-P | Manager | Phone 390px | 1. Type `/p/CORE/runs/new` on the phone. | No create form. Note shown. | ☐ Pass ☐ Fail | |
| 6.9-Viewer-D | Viewer | Desktop | 1. Type `/p/CORE/runs/new` in the address bar. | No create form. A no-access message is shown. | ☐ Pass ☐ Fail | |
| 6.9-Viewer-P | Viewer | Phone 390px | 1. Type `/p/CORE/runs/new` on the phone. | No create form. No-access message or note shown. | ☐ Pass ☐ Fail | |

## 6.10 Run detail `/p/{projectId}/runs/{runId}`

| Test ID | Role | Device | Steps | Expected result | Pass / fail | Notes |
|---|---|---|---|---|---|---|
| 6.10-Tester-D | Tester | Desktop | 1. Open "Web smoke 2.4-rc1". 2. Read the bar and the counts (Passed, Failed, Blocked, Retest, Untested). 3. Click the Untested filter. 4. Check **Start next untested**, **Add cases**, **Assign**, **Close run**. 5. Click **Close run**, then cancel. 6. Open "Release 2.3 full regression" (closed). | Step 2: counts shown as text as well as the bar. Step 3: only untested tests listed. Step 4: all four visible. Step 5: confirmation names the untested count; cancelling changes nothing. Step 6: header says "Closed" with date and person; progress frozen; write controls hidden or disabled with tooltip "This run is closed". | ☐ Pass ☐ Fail | |
| 6.10-Tester-P | Tester | Phone 390px | 1. Open "Web smoke 2.4-rc1" on the phone. 2. Read the counts. 3. Look for action buttons. | Counts and list readable. No action buttons. Note shown. | ☐ Pass ☐ Fail | |
| 6.10-Viewer-D | Viewer | Desktop | 1. Open "Web smoke 2.4-rc1". 2. Use the filters. 3. Look for action buttons and Close run. | Filters work. Status column visible. No action buttons, no Close run. | ☐ Pass ☐ Fail | |
| 6.10-Viewer-P | Viewer | Phone 390px | 1. Open the run on the phone. | Read-only. | ☐ Pass ☐ Fail | |

## 6.11 Test execution `/p/{projectId}/runs/{runId}/tests/{testId}`

| Test ID | Role | Device | Steps | Expected result | Pass / fail | Notes |
|---|---|---|---|---|---|---|
| 6.11-Tester-D | Tester | Desktop | 1. Open CORE-C41 from "Web smoke 2.4-rc1". 2. Mark step 1 Passed and step 2 Failed. 3. Click **Save and next** with no comment. 4. Type a comment and save again. 5. Read the toast. 6. Check the defects field and the attachment button. 7. Open the History tab. | Step 2: the test status pre-selects Failed; focus moves to the comment box. Step 3: save is blocked, with an inline message (not a pop-up). Step 4: saves. Step 5: toast "Saved Failed for CORE-C41" with Undo for about 10 seconds. Step 6: both controls present. Step 7: newest result first. | ☐ Pass ☐ Fail | Reset demo data afterwards. |
| 6.11-Tester-P | Tester | Phone 390px | 1. Open the same test on the phone. | Read-only. The status bar is replaced by the latest result. Note shows "Open on a larger screen to edit". Steps and history readable. | ☐ Pass ☐ Fail | |
| 6.11-Viewer-D | Viewer | Desktop | 1. Open CORE-C41. 2. Look for the Passed, Failed, Blocked and Retest buttons. 3. Press the keyboard shortcut "?". | No status buttons. The bottom bar shows the latest result. Shortcut list says why shortcuts are off. | ☐ Pass ☐ Fail | |
| 6.11-Viewer-P | Viewer | Phone 390px | 1. Open the same test on the phone. | Read-only. Steps and history readable. | ☐ Pass ☐ Fail | |

## 6.12 Reports `/p/{projectId}/reports`

| Test ID | Role | Device | Steps | Expected result | Pass / fail | Notes |
|---|---|---|---|---|---|---|
| 6.12-Manager-D | Manager | Desktop | 1. Open Reports. 2. Choose Milestone report, Release 2.4. 3. Check the totals and the by-run table. 4. Switch to "Show as table" on a chart. 5. Click **Export CSV**. 6. Click **Print** and check the print preview. | Totals match the run detail counts. Each chart has a table twin. Export CSV downloads a file. Print shows one column in light colours with patterns kept. | ☐ Pass ☐ Fail | |
| 6.12-Manager-P | Manager | Phone 390px | 1. Open Reports on the phone. | Reports readable. Export CSV hidden, with note. | ☐ Pass ☐ Fail | |
| 6.12-Tester-D | Tester | Desktop | 1. Open Reports. 2. Look for Export CSV. | Reports readable. No Export CSV. | ☐ Pass ☐ Fail | |
| 6.12-Tester-P | Tester | Phone 390px | 1. Open Reports on the phone. | Readable. No export. | ☐ Pass ☐ Fail | |
| 6.12-Viewer-D | Viewer | Desktop | 1. Open Reports. 2. Look for Export CSV. | Reports readable. No export. | ☐ Pass ☐ Fail | |
| 6.12-Viewer-P | Viewer | Phone 390px | 1. Open Reports on the phone. | Readable. No export. | ☐ Pass ☐ Fail | |

## 6.13 Automation `/p/{projectId}/automation`

| Test ID | Role | Device | Steps | Expected result | Pass / fail | Notes |
|---|---|---|---|---|---|---|
| 6.13-Admin-D | Admin | Desktop | 1. Open Automation. 2. Open the Mappings tab. Check the JUnit mapping and its match preview. 3. Open CI tokens. Click **+ New**, name it "uat-token", create it. 4. Read the dialog. Tick "I have saved it" and click Done. 5. Revoke "uat-token" and type its name to confirm. 6. Open Executions and read one failed execution. | Step 2: field map shown as a table with a sample match. Step 4: the full token is shown once, with Copy; after Done, only the prefix and last four characters appear. Step 5: revoke asks for the typed name. Step 6: failed execution shows its error text. | ☐ Pass ☐ Fail | Revoke the test token. |
| 6.13-Admin-P | Admin | Phone 390px | 1. Open Automation on the phone. 2. Read the Executions list. 3. Look for token creation and mapping edit controls. | Executions readable. Create and edit controls hidden, with note. | ☐ Pass ☐ Fail | |
| 6.13-Manager-D | Manager | Desktop | 1. Open Automation. 2. Open Mappings and check the edit control. 3. Open CI tokens. | Mappings can be edited. No create-token control anywhere. Revoke not offered. | ☐ Pass ☐ Fail | |
| 6.13-Manager-P | Manager | Phone 390px | 1. Open Automation on the phone. | Readable. No edit controls, with note. | ☐ Pass ☐ Fail | |
| 6.13-Tester-D | Tester | Desktop | 1. Open Automation. 2. Look for the Mappings and CI tokens tabs. 3. Open Executions and check for "Create case from this". | Only Executions is shown, read-only. No "Create case from this". | ☐ Pass ☐ Fail | |
| 6.13-Tester-P | Tester | Phone 390px | 1. Open Automation on the phone. | Executions readable, read-only. | ☐ Pass ☐ Fail | |
| 6.13-Viewer-D | Viewer | Desktop | 1. Open Automation. 2. Check which tabs appear. | Only Executions, read-only. | ☐ Pass ☐ Fail | |
| 6.13-Viewer-P | Viewer | Phone 390px | 1. Open Automation on the phone. | Executions readable, read-only. | ☐ Pass ☐ Fail | |

## 6.14 Members and roles `/p/{projectId}/members`

| Test ID | Role | Device | Steps | Expected result | Pass / fail | Notes |
|---|---|---|---|---|---|---|
| 6.14-Admin-D | Admin | Desktop | 1. Open Members. 2. Change Dana Lee's role to Viewer, then click Undo. 3. Try to change your own role (you are the last admin). 4. Click **+ Add member** and cancel. | Step 2: change applies with a toast and an Undo. Step 3: control disabled, with tooltip about the last admin. Step 4: side panel lists workspace users not already in the project. | ☐ Pass ☐ Fail | Click Undo, then reset demo data. |
| 6.14-Admin-P | Admin | Phone 390px | 1. Open `/p/CORE/members` on the phone. | List readable. Role changes and add-member hidden, with note. | ☐ Pass ☐ Fail | |
| 6.14-Manager-D | Manager | Desktop | 1. Open Members. 2. Look for role selects and **+ Add member**. | List readable. Role selects and add-member not usable. | ☐ Pass ☐ Fail | |
| 6.14-Manager-P | Manager | Phone 390px | 1. Open Members on the phone. | Readable. No edit controls. | ☐ Pass ☐ Fail | |
| 6.14-Tester-D | Tester | Desktop | 1. Look for Members in the navigation. 2. Type `/p/CORE/members` in the address bar. | No Members link. The address shows the no-permission state. | ☐ Pass ☐ Fail | |
| 6.14-Viewer-D | Viewer | Desktop | 1. Look for Members in the navigation. 2. Type `/p/CORE/members` in the address bar. | No Members link. No-permission state shown. | ☐ Pass ☐ Fail | |

## 6.15 Audit log `/p/{projectId}/audit`

| Test ID | Role | Device | Steps | Expected result | Pass / fail | Notes |
|---|---|---|---|---|---|---|
| 6.15-Admin-D | Admin | Desktop | 1. Open Audit. 2. Filter by actor "Dana Lee". 3. Click a row. 4. Read the before and after view. 5. Find a row marked "Deleted". 6. Look for any edit or delete control. | Step 2: list narrows. Step 3: inspector shows changed fields only, with a raw JSON toggle. Step 5: deleted entity shown as "Deleted", not a broken link. Step 6: none. | ☐ Pass ☐ Fail | |
| 6.15-Admin-P | Admin | Phone 390px | 1. Open Audit on the phone. 2. Open a row. | DESIGN.md does not state a phone rule for Audit. Record what you see. Any edit control is a Fail. | ☐ Pass ☐ Fail | Phone rule not specified. Record a Minor finding if the layout is unusable. |
| 6.15-Manager-D | Manager | Desktop | 1. Look for Audit in the navigation. 2. Type `/p/CORE/audit` in the address bar. | No link. No-permission state shown. | ☐ Pass ☐ Fail | |
| 6.15-Tester-D | Tester | Desktop | 1. Look for Audit in the navigation. 2. Type `/p/CORE/audit` in the address bar. | No link. No-permission state shown. | ☐ Pass ☐ Fail | |

## 6.16 Settings `/p/{projectId}/settings`

| Test ID | Role | Device | Steps | Expected result | Pass / fail | Notes |
|---|---|---|---|---|---|---|
| 6.16-Admin-D | Admin | Desktop | 1. Open Settings for "UAT Test Project". 2. On General, check the ref prefix is read-only. 3. Change the announcement and save. 4. Open Import. Choose a TestRail XML sample and check the preview. Run the import into "UAT Test Project" only. 5. Open Danger zone. Read the Archive text. Click Delete project and cancel without typing a name. | Step 2: prefix locked after the first case. Step 3: saved. Step 4: preview shows suites, sections and cases counts; result says "N imported, M skipped". Step 5: archive consequence explained. Delete asks for the typed project name and lists what will be removed. Nothing is deleted. | ☐ Pass ☐ Fail | Use a sample file with a small number of cases. |
| 6.16-Admin-P | Admin | Phone 390px | 1. Open Settings on the phone. | General readable. Import and Danger zone edit controls hidden, with note. | ☐ Pass ☐ Fail | |
| 6.16-Manager-D | Manager | Desktop | 1. Open Settings for CORE. 2. Check the tabs. 3. On General, check the announcement control. 4. Open Import and read the preview. Cancel. | Only General (announcement) and Import shown. No Danger zone tab. Import preview works. | ☐ Pass ☐ Fail | |
| 6.16-Manager-P | Manager | Phone 390px | 1. Open Settings on the phone. | Readable. No edit or import controls, with note. | ☐ Pass ☐ Fail | |
| 6.16-Tester-D | Tester | Desktop | 1. Look for Settings in the navigation. 2. Type `/p/CORE/settings` in the address bar. | No link. No-permission state shown. | ☐ Pass ☐ Fail | |

## 6.17 Heavy data (busy team) `/p/{projectId}/...`

Role: as shown per row. Start from the standard seed, then switch to the heavy seed (6.17-01 or 6.17-02). The heavy seed has 6 projects (one archived, Legacy portal), about 900 Core cases, about 1,300 cases in total, 14 milestones, 38 runs, about 600 audit rows and one run with about 300 tests. Test 6.17-19 switches back. Use the R-ID in brackets to find the rule behind each row. Rows with no matching R-ID say "none".

| Test ID | Role | Device | Steps | Expected result | Pass / fail | Notes |
|---|---|---|---|---|---|---|
| 6.17-01 (R-181) | Admin | Desktop | 1. Open the user menu. 2. Choose **Reset demo data**. 3. Select **Busy team (heavy)**. 4. Confirm **Reset demo data**. | Dialog offers "Standard demo" and "Busy team (heavy)". After the reset, the project list shows 6 projects, with Legacy portal marked archived. | ☐ Pass ☐ Fail | |
| 6.17-02 (R-181) | Admin | Desktop | 1. Close the browser tab. 2. Open the app at `http://localhost:3000/?demo=heavy`. 3. Sign in as Avery Quinn. | The same heavy data as 6.17-01 loads. The project list shows 6 projects, one archived. | ☐ Pass ☐ Fail | Alternative entry point. Use 6.17-01 if 6.17-02 fails only because the URL is not picked up. |
| 6.17-03 (none) | Tester | Desktop | 1. Sign in as Dana Lee. 2. Open the project list. 3. Open CORE from the list. | CORE shows the Tester role and a case count close to 900. Legacy portal is listed as archived and is not editable (see 6.17-17). | ☐ Pass ☐ Fail | |
| 6.17-04 (R-043, R-057) | Tester | Desktop | 1. Open CORE Cases. 2. Check the suite tree. 3. Read the pager text. 4. Expand a suite with many cases. | Tree and list both load without a blank screen. The pager shows "1-50 of N", with N close to 900. Deprecated cases stay hidden unless you show them. Counts on the tree match the list. | ☐ Pass ☐ Fail | |
| 6.17-05 (R-057, R-189) | Tester | Desktop | 1. Scroll to the bottom of the list. 2. Go to page 2. 3. Set page size to 200. 4. Go to the last page. | Each page loads with no blank rows. The pager changes to "201-400 of N" at 200 per page. The last page ends at N. Scrolling feels smooth (no pause of more than about a second). | ☐ Pass ☐ Fail | |
| 6.17-06 (R-056) | Tester | Desktop | 1. Set Priority to High. 2. Add a Type filter. 3. Add a tag filter. 4. Add an automation status filter. 5. Check the address bar. 6. Click **Clear filters**. | Each filter narrows the count. The address bar shows the filters. **Clear filters** returns the full count. | ☐ Pass ☐ Fail | |
| 6.17-07 (R-056) | Tester | Desktop | 1. Search "lockout". 2. Clear the search. 3. Search "CORE-C41". | Step 1: list narrows to matching titles. Step 3: CORE-C41 is the only result (the 120 standard cases are kept in the heavy seed). | ☐ Pass ☐ Fail | |
| 6.17-08 (R-058, R-071) | Manager | Desktop | 1. Apply a suite filter. 2. Tick three cases. 3. Choose "Select all N matching filter". 4. Read the side panel counts. 5. Clear the selection. | Step 2: bulk bar says "3 selected". Step 3: count matches the filter. Side panel shows counts by priority. Selection clears in step 5. | ☐ Pass ☐ Fail | |
| 6.17-09 (R-067) | Manager | Desktop | 1. Open CORE Milestones. 2. Find each state. | Each state is written as text: Hotfix 2.4.1 "Past due" (still open), Release 2.4 "Due soon", Release 2.5 "Upcoming", Release 2.2 "Completed". Open and completed are listed separately. | ☐ Pass ☐ Fail | |
| 6.17-10 (R-068) | Manager | Desktop | 1. Open Plans. 2. Open a plan with several runs. 3. Read the runs grouped by suite. | Runs are grouped under suite headings. Plan progress equals the sum of its runs. | ☐ Pass ☐ Fail | |
| 6.17-11 (R-087, R-095) | Tester | Desktop | 1. Open Runs. 2. Switch Open, Closed and All. 3. Open a closed run. | Open shows fewer rows than All. Closed rows show a lock and "Closed". The closed run's write controls are hidden or disabled with "This run is closed". | ☐ Pass ☐ Fail | |
| 6.17-12 (R-069) | Tester | Desktop | 1. Open Runs. 2. On a run with failed tests, click **Re-run failed** in its row. | Toast says "Created a re-run with N tests". The app opens a new run named "<name> (re-run)" with only the failed and blocked tests. N equals that count. | ☐ Pass ☐ Fail | |
| 6.17-13 (R-114, R-092) | Tester | Desktop | 1. Open the largest run in CORE (about 300 tests). 2. Read the progress bar and counts. 3. Click the Untested filter. 4. Check **Start next untested**. | Dashboard appears within about a second with no freeze. Counts (Passed, Failed, Blocked, Retest, Untested) add up to the total. Filter lists only untested tests. **Start next untested** is visible. | ☐ Pass ☐ Fail | Do not change statuses on this run; it is shared test data. |
| 6.17-14 (R-115, R-117, R-122) | Manager | Desktop | 1. Open Reports. 2. Choose Milestone report for Release 2.5. 3. Click "Show as table" on a chart. 4. Click **Export CSV**. | Each chart has a table with the same numbers. Chart uses a pattern and a label, not colour alone. A CSV file downloads and its totals match the report. | ☐ Pass ☐ Fail | |
| 6.17-15 (none) | Tester | Phone 390px | 1. Open CORE Cases on the phone. 2. Scroll the list. 3. Open a case. 4. Open the Runs page, then the largest run. | Case list and run counts are readable. No sideways page scroll, no cut-off text. No checkboxes, Re-run failed, or edit controls. Note "Open on a larger screen to edit" shown. | ☐ Pass ☐ Fail | |
| 6.17-16 (R-215, R-216, R-213) | Admin | Desktop | 1. Open CORE Audit. 2. Read the pager (about 600 rows across the seed). 3. Filter by actor "Dana Lee". 4. Add a date range. 5. Go to page 2, then back to page 1. 6. Click a row. 7. Find a row marked "Deleted". | Step 2: pager shows a total in the hundreds. Step 3 and 4: list narrows each time. Step 5: rows keep their positions. Step 6: inspector shows changed fields only, with a raw JSON toggle. Step 7: "Deleted" is text, not a broken link. No edit or delete control. | ☐ Pass ☐ Fail | |
| 6.17-17 (R-035) | Admin | Desktop | 1. Open Legacy portal (archived). 2. Read the banner. 3. Look for **+ New case**, **+ New run** and Edit. 4. Look for **Unarchive**. | Persistent archived banner. No create or edit controls. **Unarchive** is shown to Admin only. | ☐ Pass ☐ Fail | Do not unarchive. |
| 6.17-18 (R-035) | Tester | Desktop | 1. Open Legacy portal (archived). 2. Look for any write control. | Read-only with the same banner. No write controls. No **Unarchive**. | ☐ Pass ☐ Fail | |
| 6.17-19 (R-181) | Admin | Desktop | 1. Open the user menu. 2. Choose **Reset demo data**. 3. Select **Standard demo**. 4. Confirm. 5. Open CORE Cases. | The project list shows only the standard projects (CORE and MOB). The case count is about 120 and CORE-C41 is present. Any test project created in 6.2 is gone. | ☐ Pass ☐ Fail | Do this before the next round. |

## 6.18 AI agent access (MCP) `/api/mcp`

Role: as shown per row. Device "Terminal" means Claude Code on this machine. Run `npm run dev` first and keep it running. The MCP server runs on its own in-memory copy of the standard demo fixtures, one per server process, and resets when the server restarts. **This data is separate from the browser.** The browser demo data (Reset demo data) does not change MCP data, and what an agent writes does not show in the browser UI in M0. Demo tokens are fake and work only in dev. Demo people are fictional. Commands below are from `docs/mcp/README.md`.

| Test ID | Role | Device | Steps | Expected result | Pass / fail | Notes |
|---|---|---|---|---|---|---|
| 6.18-01 (R-131, R-133) | Tester (Dana Lee) | Terminal | 1. Run `claude mcp add --transport http testbuddy http://localhost:3000/api/mcp --header "Authorization: Bearer tb_demo_tester_local_only"`. 2. Start Claude Code. 3. Run `/mcp`. | `testbuddy` is listed as connected. Its tools include list_projects, list_cases, add_run, add_result and close_run (15 tools in total). | ☐ Pass ☐ Fail | |
| 6.18-02 (R-133, R-136) | Tester | Terminal | 1. Ask Claude Code: "List my TestBuddy projects." | Response lists CORE with your role as tester, a case count and open runs. Projects Dana is not a member of do not appear. | ☐ Pass ☐ Fail | |
| 6.18-03 (R-133) | Tester | Terminal | 1. Ask: "List 5 cases in CORE." 2. Ask: "Search CORE cases for 'lockout'." 3. Ask for the next page of step 1, if there is one. | Step 1: 5 cases with refs and titles, plus a cursor if more exist. Step 2: only matching cases. Step 3: the next 5 cases, with no repeats. | ☐ Pass ☐ Fail | Cases here are the standard fixtures (about 120), not the heavy seed. |
| 6.18-04 (R-069, R-136) | Tester | Terminal | 1. Ask: "Create a run in CORE named 'MCP UAT run' with cases CORE-C41, CORE-C42 and CORE-C43." Do not set a milestone or plan. | Run created with 3 tests. The response gives the run id and test count. The run appears in the run list when you ask for CORE runs. | ☐ Pass ☐ Fail | Testers cannot attach runs to milestones (Manager+). |
| 6.18-05 (R-076) | Tester | Terminal | 1. Ask: "Record Passed on the first test in 'MCP UAT run', with comment 'UAT pass'." 2. Ask: "Get that test's results." | Step 1: result saved. Step 2: the test shows status passed with one new result. Run progress counts 1 passed. | ☐ Pass ☐ Fail | |
| 6.18-06 (R-078, R-138) | Tester | Terminal | 1. Ask: "Record Failed on the second test in 'MCP UAT run' with no comment." | The call is rejected with a tool error (isError) that names the missing comment. No stack trace. The test stays untested. | ☐ Pass ☐ Fail | Expected rejection. Do not work around it. |
| 6.18-07 (R-136, R-138) | Viewer (Mia Chen) | Terminal | 1. Run `claude mcp remove testbuddy`. 2. Run the add command with `--header "Authorization: Bearer tb_demo_viewer_local_only"`. 3. Restart Claude Code. 4. Ask: "Create a case in CORE titled 'viewer try'." 5. Ask: "List 5 cases in CORE." | Step 4: rejected with a forbidden error (403, code forbidden). No case created. Step 5: still succeeds, because viewers can read. | ☐ Pass ☐ Fail | Expected forbidden. |
| 6.18-08 (R-087) | Tester | Terminal | 1. Run `claude mcp remove testbuddy`, then the add command with the tester token, and restart Claude Code. 2. Ask: "Close 'MCP UAT run' now." Do not confirm if Claude Code asks for confirmation. | Close is rejected: `close_run` needs `confirm: true`. Run stays open, and "Get run" shows it is not closed. | ☐ Pass ☐ Fail | Do not close this run with confirm. A closed run cannot be reopened. |
| 6.18-09 (R-211, R-136) | Tester; then Admin | Terminal, then Desktop | 1. Ask Claude Code for the audit rows of 'MCP UAT run', if a tool shows them. 2. Open the browser at `/p/CORE/audit` as Avery Quinn (Admin). 3. Look for rows from the agent. | Expected: an audit row `agent.add_run` (and `agent.add_result` for 6.18-05) with actor Dana Lee, marked agent and via mcp. **M0 gap:** no MCP tool lists audit rows and the browser audit log reads browser data only. Until a read path exists, record Blocked, not Pass. Browser audit does not show the agent rows (expected in M0). | ☐ Pass ☐ Fail | Blocked until a read path exists. Add a finding for the owner. |

---

## After the round

1. Click **Reset demo data**.
2. Record each Fail in `01-FINDINGS.md` with the next Finding ID, the test ID in the Steps column, and the device.
3. Write the round's summary in a new dated folder under `testing-log/` if the owner asks for one. Do not put totals in this file.
