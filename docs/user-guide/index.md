# TestBuddy user guide

> DRAFT. This guide is written from the design spec (docs/design/DESIGN.md) and the in-app guide. Screens are still placeholders, so screenshots are marked pending and wording may change. Remove this note when the screens are approved and the screenshots are captured.

TestBuddy is an open-source test management app. You write test cases, group them into runs, record results (by keyboard if you like), and see how a release is going. CI jobs can post results into the same runs.

## Who this guide is for

| Chapter | Read it if you are | Core tasks |
|---|---|---|
| Getting started | Anyone new | Sign in, find your way around, take the in-app guide |
| Tester | A tester | Write cases, run tests, record results fast |
| Test lead | A lead | Plan a cycle, assign work, close a run |
| Manager | A manager | Milestones, plans, reports, release call |
| Admin | An administrator | Members, roles, tokens, audit log, settings |
| CI | A developer or build engineer | Send automated results with a token |

## How roles map to chapters

Access follows the project role: Viewer, Tester, Manager or Admin. A test lead usually has the Manager role on the project. If a button described here is missing on your screen, your role does not allow it; ask an admin.

## Words used in this guide

| Term | Meaning |
|---|---|
| Case | A reusable test with steps and expected results. It has versions. |
| Run | A set of tests executed together against a build. Closing a run is permanent. |
| Plan | A group of runs, usually for one release effort. |
| Milestone | A release or date goal that plans and runs roll up into. |
| Snapshot | The frozen copy of a case that a test in a run uses. |
| Mapping | A rule that connects CI test names to cases. |
| Token | A secret a CI job uses to post results. It is shown once. |

Status words are always Passed, Failed, Blocked, Retest and Untested.
