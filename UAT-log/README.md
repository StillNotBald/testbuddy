# UAT log

Status: **DRAFT**. No UAT round has run against the Milestone 0 prototype yet. This folder holds the templates and the test plan for the first round.

## Purpose

`UAT-log/` tracks user acceptance testing: a person (the owner, or a stand-in playing a tester or manager role) works through the product and records what they find, from first report to closure. It is separate from `testing-log/` (scripted and automated evidence) and from `sprint-log/` (build receipts). UAT starts from a person's judgement of whether the product does what it should.

## Files

| File | Role in a round |
|---|---|
| [`M0-UAT-PLAN.md`](./M0-UAT-PLAN.md) | The test plan a non-developer runs for the Milestone 0 prototype, one table per screen. |
| `01-FINDINGS.md` | Raw intake. Every defect gets one Finding ID here, once, at first report. |
| `02-ROOT-CAUSES.md` | Triage. Each Finding ID gets a root-cause note once someone investigates it. |
| `03-RETEST-SHEET.md` | Closure. Each Finding ID gets a retest entry once a fix ships. |

Run the plan, log what fails into `01-FINDINGS.md`, then work through `02` and `03` in order.

## Column set

All three sheets use the same column headers so rows can be joined on Finding ID:

`Finding ID | Date | Screen | Role | Device (desktop / phone 390px) | Steps | Expected | Actual | Severity | Status | Owner-visible?`

- **Finding ID:** `UAT-NNN`, numbered in order, never reused.
- **Device:** `desktop` (1280px and wider) or `phone 390px`.
- **Severity:** `Critical` (blocks a core job or loses data), `Major` (a job works only with a workaround), `Minor` (cosmetic or wording, job still works).
- **Owner-visible?:** `yes` if the owner must decide or see it before release, `no` otherwise.

## Owner rules

- **Mint IDs once.** A Finding ID is created only in `01-FINDINGS.md`. `02` and `03` never mint IDs.
- **New defects get new IDs.** A retest that finds a different defect gets its own row and ID in `01`. It is not folded into the retested ID. The same defect resurfacing after a failed fix reopens the existing ID.
- **No pass/fail counts in this folder.** Each row records one finding, one cause, or one retest. Totals belong in a dated `testing-log/` entry.
- **Corrections are appended.** If a root cause turns out wrong, add a correction note; do not delete the original.

## Status legend

| Status | Meaning |
|---|---|
| DRAFT | Template only, no round has populated it. |
| OPEN | Reported, not yet triaged. |
| TRIAGED | Root cause recorded in `02-ROOT-CAUSES.md`. |
| FIXED-PENDING-RETEST | Fix shipped, retest not yet run. |
| CLOSED | Retest in `03-RETEST-SHEET.md` confirmed the fix. |
| REOPENED | Retest failed. The same ID gets a new retest row. |
| WONT-FIX | Owner decided to leave it, with a one-line reason. |

## Current state

Templates only. Start the first round at `M0-UAT-PLAN.md`.
