# TestBuddy UI/UX Design Spec

Status: v0.2. Stack (owner decision): Next.js 16 App Router + React 19 + Tailwind v4 + Radix primitives + shadcn-style components written fresh in `src/components/ui/` + lucide-react icons + sonner toasts + TanStack Table/Query. All data is fetched client-side (PocketBase SDK + TanStack Query via typed services); pages are client components under server layouts. Tokens live in `docs/design/tokens.css`.

Reference: functional parity with a TestRail-style workflow only. The look, layout, colour and naming are original. House style re-expresses a house "apex" preset (crisp white + blue, data-dense) as independent TestBuddy tokens. No external source is copied.

Domain source of truth: `docs/database-schema.md` (field names in screens below are the schema's names).

---

## 1. Principles

1. **Keyboard first for execution.** A tester running 200 tests never needs the mouse: `P`/`F`/`B`/`R` set a result, `N` jumps to the next untested test, `J`/`K` move, `Enter` opens, `Esc` closes. Every hotkey has a visible button twin.
2. **Status is shape + label + colour.** Never colour alone. Five statuses, five distinct icons, always with the word.
3. **Dense but calm.** 14px body, 44px/32px rows (comfortable/compact toggle), one accent colour, hairline borders, almost no shadows. Whitespace goes to grouping, not decoration.
4. **Context never lost.** List + detail side by side (split view); opening a case or test does not navigate away from the list. Filters, selection and scroll position survive back/forward and live in the URL.
5. **Snapshots are honest.** A test shows the case as it was when added to the run, labelled with its version. If the live case moved on, say so and offer "View latest", never silently swap.
6. **Show what you cannot do, once.** Hide what a role never needs; disable (with a reason tooltip) what it could do in another state (closed run, archived project). See section 8.
7. **Fast feedback, safe undo.** Saving a result is optimistic with an Undo toast (10 s). Irreversible actions (close run, delete project, revoke token) need a typed or explicit confirmation naming the target.

---

## 2. Information architecture

### 2.1 Navigation model
- **Topbar (52px):** workspace + project switcher (combobox with search, recent first), global search (`/` or `Cmd/Ctrl+K`: cases by ref/title, runs, milestones), "Create" quick menu (New case / New run, role-gated), theme toggle (light/dark/system), help (`?` shortcut overlay), user menu (profile, sign out).
- **Left sidebar (232px, collapsible to 60px icon rail), per project:** Overview, Repository (Cases), Milestones, Plans, Runs, Reports, Automation. Footer group (admin/manager only): Members, Audit log, Settings. The active item has a 3px accent marker plus bold text.
- **Breadcrumb row** under the topbar on deep pages: Project > Runs > Run name > Test. Each crumb is a link; the last is plain text.
- **Page header pattern:** title (h1), status badge, meta line (owner, dates, build), primary action right-aligned, tab strip below when the page has sub-views.
- Archived projects show a persistent banner "This project is archived. Read-only." under the topbar.

### 2.2 Route map (Next.js App Router)

URL on the left, file under `src/app/` on the right. Route groups `(auth)` (no shell) and `(app)` (shell: topbar + sidebar). Query params carry filters and selection so views are shareable; read them with `useSearchParams` in client components. Server layouts only render the shell and providers.

| URL | File | Screen |
|---|---|---|
| `/sign-in` | `(auth)/sign-in/page.tsx` | Sign in |
| `/` | `(app)/page.tsx` | Redirect to last project, else `/w/{workspaceId}` |
| `/w/{workspaceId}` | `(app)/w/[workspaceId]/page.tsx` | Workspace and project list |
| `/w/{workspaceId}/projects/new` | `(app)/w/[workspaceId]/projects/new/page.tsx` | Create project (modal presentation) |
| `/p/{projectId}` | `(app)/p/[projectId]/page.tsx` | Project overview |
| `/p/{projectId}/cases?suite=&section=&q=&priority=&type=&automation=&tag=&deprecated=&case=` | `.../cases/page.tsx` | Repository (tree + list + inspector); `case` = selected id |
| `/p/{projectId}/cases/new?suite=&section=` | `.../cases/new/page.tsx` | New case |
| `/p/{projectId}/cases/{caseId}` | `.../cases/[caseId]/page.tsx` | Case editor |
| `/p/{projectId}/cases/{caseId}/history?v=` | `.../cases/[caseId]/history/page.tsx` | Version history and compare |
| `/p/{projectId}/milestones` | `.../milestones/page.tsx` | Milestone list |
| `/p/{projectId}/milestones/{milestoneId}` | `.../milestones/[milestoneId]/page.tsx` | Milestone detail |
| `/p/{projectId}/plans` | `.../plans/page.tsx` | Plan list |
| `/p/{projectId}/plans/{planId}` | `.../plans/[planId]/page.tsx` | Plan detail |
| `/p/{projectId}/runs?state=&milestone=&plan=&assignee=&q=` | `.../runs/page.tsx` | Run list |
| `/p/{projectId}/runs/new?plan=&milestone=` | `.../runs/new/page.tsx` | Create run (case picker) |
| `/p/{projectId}/runs/{runId}?status=&assignee=&section=&q=&test=` | `.../runs/[runId]/page.tsx` | Run detail |
| `/p/{projectId}/runs/{runId}/tests/{testId}` | `.../runs/[runId]/tests/[testId]/page.tsx` | Test execution |
| `/p/{projectId}/reports` | `.../reports/page.tsx` | Reports index |
| `/p/{projectId}/reports/milestone/{milestoneId}` | `.../reports/milestone/[milestoneId]/page.tsx` | Milestone report |
| `/p/{projectId}/reports/run/{runId}` | `.../reports/run/[runId]/page.tsx` | Run summary |
| `/p/{projectId}/automation?tab=mappings\|tokens\|executions` | `.../automation/page.tsx` | Automation |
| `/p/{projectId}/automation/executions/{executionId}` | `.../automation/executions/[executionId]/page.tsx` | Execution detail |
| `/p/{projectId}/members` | `.../members/page.tsx` | Members and roles |
| `/p/{projectId}/audit?actor=&action=&entity=&from=&to=` | `.../audit/page.tsx` | Audit log |
| `/p/{projectId}/settings?tab=general\|import\|danger` | `.../settings/page.tsx` | Settings |
| (any) | `not-found.tsx`, `forbidden` state component | 404 and no-access (rendered in-shell) |

`(app)/p/[projectId]/layout.tsx` loads the membership once (TanStack Query) and exposes `useProjectRole()`; it renders the no-access state for non-members so the switcher stays usable. Filters use a `useUrlState()` hook (replace, not push, for typing).

---

## 3. Design tokens

All values are final hex and implemented in `docs/design/tokens.css` (Tailwind v4 `@theme inline` plus `:root` / `.dark` variables, prefix `--tb-`). Utilities: `bg-canvas bg-surface bg-grouped text-ink text-ink-muted border-subtle text-status-failed-text bg-status-failed-bg rounded-md shadow-sm`. Dark mode = `.dark` on `<html>` (next-themes, attribute class).

### 3.1 Colour (light / dark)

| Token | Light | Dark | House var |
|---|---|---|---|
| `--tb-bg-canvas` | `#ffffff` | `#0e0f13` | `--f-bg-canvas` |
| `--tb-bg-surface` | `#ffffff` | `#16181d` | `--f-bg-surface` |
| `--tb-bg-grouped` (app background behind cards) | `#f5f6f9` | `#0e0f13` | `--f-bg-grouped` |
| `--tb-bg-sunken` (table header, code, inputs group) | `#eceef2` | `#1e2027` | `--f-bg-sunken` |
| `--tb-border-subtle` | `#e2e4ea` | `#272a32` | `--f-border-subtle` |
| `--tb-border-strong` (inputs, >= 3:1) | `#8e93a1` | `#4a4e5c` | `--f-border-strong` |
| `--tb-ink` | `#171a22` | `#e8e9ee` | `--f-ink` |
| `--tb-ink-secondary` | `#3f4454` | `#b5b9c4` | `--f-ink-secondary` |
| `--tb-ink-muted` (5.9:1 on white) | `#5b6070` | `#8d92a0` | `--f-ink-muted` |
| `--tb-accent` | `#2d6bf5` | `#4d86ff` | `--f-accent` / `--f-primary` |
| `--tb-accent-hover` | `#1a5ce8` | `#6b9bff` | `--f-accent-hover` |
| `--tb-accent-ink` (text on accent) | `#ffffff` | `#06142e` | `--f-accent-ink` |
| `--tb-accent-text` (links, active nav text) | `#1a5ce8` | `#7ba6fb` | derived |
| `--tb-selected-row` | `#eaf1ff` | `rgba(77,134,255,.14)` | new |
| `--tb-info` / `--tb-success` / `--tb-warning` / `--tb-danger` | `#0a6fd6` / `#0b8a6a` / `#c27803` / `#d03a2f` | `#4db3f0` / `#2ec4a0` / `#f0a82e` / `#ff6b5e` | `--f-info` etc. |

Accent is never used for a status. Rebrand = change the six root vars `--tb-accent`, `--tb-accent-hover`, `--tb-accent-ink`, `--tb-primary`, `--tb-primary-fg`, `--tb-bg-canvas`.

### 3.2 Test status (colour-blind safe, Okabe-Ito inspired)

Icons are lucide-react; shape differs per status. Pattern is applied in stacked progress bars so segments differ without colour.

| Status | Icon | Hotkey | Light solid | Light tint bg | Light text | Dark solid | Dark text | Bar pattern |
|---|---|---|---|---|---|---|---|---|
| Passed | `CircleCheck` | `P` | `#0b8a6a` | `#e3f6f0` | `#066048` | `#2ec4a0` | `#6fe0c3` | solid |
| Failed | `CircleX` | `F` | `#d03a2f` | `#fdeceb` | `#a3231a` | `#ff6b5e` | `#ff9a90` | diagonal stripes |
| Blocked | `Ban` | `B` | `#c27803` | `#fff3dc` | `#7d4c00` | `#f0a82e` | `#f6c668` | cross-hatch |
| Retest | `RotateCw` | `R` | `#0072b2` | `#e2f1fa` | `#004f7c` | `#4db3f0` | `#8fd0f8` | dots |
| Untested | `CircleDashed` | `U` (clear) | `#8e93a1` | `#eef0f3` | `#4b5060` | `#7a7f8e` | `#b5b9c4` | none (outline only) |

Notes: "Untested" is derived (a test with no result, shown when `test_run_cases.status` is the default). Seed statuses in the schema are Passed/Blocked/Retest/Failed; custom statuses (global) fall back to a grey diamond icon and their stored `color` as the dot only (label and shape still shown). Bar order is always Passed, Failed, Blocked, Retest, Untested.

### 3.3 Priority and automation

| Priority | Label | Glyph | Light | Dark |
|---|---|---|---|---|
| P1 | Critical | `ChevronsUp` | `#d03a2f` | `#ff6b5e` |
| P2 | Major | `ChevronUp` | `#c27803` | `#f0a82e` |
| P3 | Minor | `Minus` | `#2d6bf5` | `#6b9bff` |
| P4 | Trivial | `ChevronDown` | `#6b7080` | `#9ba0ae` |

Rendered as glyph + "P1" text (label in tooltip). Automation status (`automation_status` values): not_specified (`CircleDashed`, `#6b7080`), needs_review (`Eye`, `#c27803`), needs_automation (`Bot`, `#0072b2`), in_progress (`Loader`, `#2d6bf5`), automated (`Zap`, `#0b8a6a`), not_automatable (`Hand`, `#6b7080`). Always icon + label.

### 3.4 Typography
Font: Inter (fallback system UI stack). Mono: `ui-monospace, "SF Mono", "JetBrains Mono", Menlo`. Numerals in tables, counts and progress use tabular figures.

| Role | Size / line | Weight |
|---|---|---|
| Page title (h1) | 24 / 30 | 600 |
| Section title (h2) | 20 / 26 | 600 |
| Card title (h3) | 17 / 23 | 600 |
| Subhead (h4) | 15 / 21 | 600 |
| Body | 14 / 21 | 400 |
| Body large (test title in execution) | 17 / 25 | 500 |
| Meta / table | 13 / 18 | 400 |
| Overline / caption | 12 / 17 | 500, +0.02em |
| KPI figure | 28 / 31 | 700, tabular |
| Case ref / ids / tokens | 13 mono | 500 |

Nothing below 12px. Inputs 14px on desktop, 16px on touch devices (no zoom).

### 3.5 Spacing, radius, shadow, motion
- Spacing scale (px): 4, 6, 8, 14, 20, 28, 40. Page padding 20 (desktop), 14 (tablet), 12 (phone). Card padding 16. Row height 44 (comfortable) or 32 (compact).
- Radius: 3 (chips), 5 (inputs small), 8 (buttons, inputs, cards), 11 (modals), 14 (large panels).
- Shadows: `sm` `0 1px 3px -.5px rgba(23,26,34,.08), 0 2px 6px -1px rgba(23,26,34,.06)` for cards and sticky bars; `md` `0 4px 16px rgba(23,26,34,.09)` for popovers; `lg` `0 12px 32px rgba(23,26,34,.14)` for modals and drawers. Dark mode relies on borders, shadows are halved.
- Motion: 120 ms feedback, 200 ms panels, ease-out. Under `prefers-reduced-motion` everything is instant and skeleton shimmer stops.
- Layout: sidebar 232 / 60, topbar 52, split-view detail pane min 360, default 45% of the content width, drag-resizable, width remembered per user.

---

## 4. Component inventory

Components are written fresh in `src/components/ui/` (primitives) and `src/components/tb/` (TestBuddy-specific), styled with Tailwind utilities from `tokens.css`; Radix supplies behaviour for dialog, popover, dropdown, tabs, tooltip, select, checkbox, switch. Icons: lucide-react. Toasts: sonner. Prop sketches are guidance, not frozen API. The "House pattern" column says which house pattern the component re-expresses (look and behaviour only; never copy source).

### 4.0 Shell and layout
| House pattern | TestBuddy component | Props sketch / notes |
|---|---|---|
| AppShell | `AppShell` | `{ sidebar, topbar, banner?, children }`; CSS grid, sidebar 232/60 via `--tb-sidebar-w`; main scrolls, topbar sticky; under 1024px sidebar is a Radix Dialog slide-over |
| Sidebar | `ProjectSidebar` | `{ projectId, role, collapsed, onToggle }`; items from a typed nav config filtered by role; `aria-current="page"`; collapsed shows icons with tooltips |
| Topbar | `Topbar` | `{ switcher, onSearch, user }`; contains `ProjectSwitcher` (Radix Popover + cmdk-style list), `GlobalSearch` (dialog, `/` or Cmd/Ctrl+K), `ThemeToggle`, `UserMenu` (Radix DropdownMenu) |
| InspectorSplit | `SplitView` | `{ list, detail, detailOpen, onClose, defaultSize=45, minDetail=360, storageKey }`; drag handle is a `role="separator"` with arrow-key resize; below 1024px detail is a full-width overlay with Back |
| RightPushPanel | `SidePanel` | `{ open, onOpenChange, title, width=480, footer, children }`; Radix Dialog modal variant; used for forms that should keep context (invite, token, milestone) |
| Page header | `PageHeader` | `{ title, badge?, meta?, actions, tabs? }` plus `Breadcrumbs { items }` |

### 4.1 Primitives (shadcn-style, in `ui/`)
| House primitive | TestBuddy component | Props sketch / notes |
|---|---|---|
| Button | `Button` | `variant: primary\|secondary\|ghost\|outline\|danger`, `size: sm\|md\|lg`, `loading`, `iconLeft`, `kbd?` (hotkey hint chip); min 32px high desktop, 44px coarse pointer |
| Card | `Card`, `CardHeader`, `StatCard { label, value, delta?, href? }` | flat, hairline border + `shadow-sm`, 16px padding, no nested cards |
| Badge | `Badge` | `tone: neutral\|info\|success\|warning\|danger\|accent`, `size`, `icon?`; tint bg + text token |
| StatusBadge | `StatusBadge` | `{ status: TestStatus, size?: sm\|md, showLabel=true, hotkey? }`; icon + label from the 3.2 table; custom statuses use `DiamondIcon` + stored colour dot. Plus `PriorityChip { priority }`, `AutomationChip { value }`, `TagChip { name, color }` |
| Tabs | `Tabs` (Radix) | `{ value, onValueChange, items }`; underline style; `urlParam="tab"` option syncs to the query string |
| Dialog | `Dialog`, `ConfirmDialog` | `ConfirmDialog { title, description, confirmLabel, tone: 'danger'\|'default', requireText?: string, onConfirm }` |
| Toast | `toast()` over sonner | wrappers `toast.success/error/undo({ message, onUndo })`; bottom-left, max 3 |
| Stepper | `StepList` (read) and `Stepper` (wizard) | `StepList { steps, results?, onStepStatus?, activeIndex }`; `Stepper { steps, current }` for multi-step flows (import wizard, run creation sections) |
| Skeleton | `Skeleton`, `TableSkeleton { rows, cols }`, `CardSkeleton` | static under reduced motion |
| Input / Textarea | `Input`, `Textarea`, `FormField { label, hint, error, required }` | 14px desktop, 16px coarse; error linked with `aria-describedby`; 1.5px `border-strong` |
| Select | `Select` (Radix Select) and `Combobox` (Popover + listbox, searchable, multi) | `{ options, value, onChange, placeholder, clearable }` |
| Checkbox, Switch, RadioGroup, Tooltip, DropdownMenu, Popover | Radix wrappers | standard shadcn shapes |
| FilterBar | `FilterBar` | `{ search, facets: FacetDef[], value, onChange, resultCount }`; chips for active filters (x removes), "Filters" Popover with all facets, "Clear all"; state serialised to URL by `useUrlState` |
| DataTable | `DataTable<T>` over `@tanstack/react-table` | see 4.3 |
| Pagination | `Pagination { page, pageSize, total, onChange }` | "1-50 of 212", sizes 25/50/100/200 |

### 4.2 TestBuddy-specific (in `tb/`)
| Component | Props sketch | Behaviour |
|---|---|---|
| `SuiteSectionTree` | `{ suites: SuiteNode[], selected: {suiteId?, sectionId?}, onSelect, counts, canEdit, onAddSection, onRename, onDelete }` | Custom accessible tree (no Radix): `role="tree"`, `treeitem` with `aria-level/expanded/selected`, roving tabindex, Up/Down move, Right expand / enter child, Left collapse / parent, Home/End, type-ahead, `F2` rename, `Delete` removes (confirm). Counts include descendants. Expanded state persisted. Drag reorder deferred |
| `StepListEditor` | `{ steps: {id, description, expected}[], onChange, readOnly }` | Ordered rows with two textareas, add / remove / move up-down buttons, `Alt+Up/Down` reorder, `Cmd/Ctrl+Enter` add below, announces moves via live region, validation per row |
| `ResultBar` | `{ testId, statuses, requireComment: Set<StatusId>, elapsedSeed, onSave, disabledReason?, isLast }` | Sticky bottom; buttons Passed/Failed/Blocked/Retest with `kbd` hints; hotkeys `P F B R U C A S`; comment, elapsed timer, defects chips input, attach; `Save and next`; optimistic save with Undo; uses `useHotkeys` that ignores editable targets and respects the user's "single-key shortcuts" setting |
| `RunProgressBar` | `{ counts: Record<TestStatus, number>, size: sm\|md\|lg, showLegend, onSegmentClick? }` | Stacked segments in fixed order with the status patterns from `tokens.css`, `role="img"` + text summary, tooltip with counts and percents; clickable segments filter the table |
| `VersionDiff` | `{ before: CaseSnapshot, after: CaseSnapshot }` | Two-column field and step diff; changed fields get +/- icons and a "Changed" label; step reorders shown as "moved from 3 to 1" |
| `EmptyState` | `{ icon, title, description, action?, secondaryAction?, tone }` | One sentence reason + one action; `action` omitted for viewers |
| `KeyboardHelp` | `{ scopes: ShortcutScope[] }` | `?` dialog; current screen scope first; searchable; includes the toggle for single-key shortcuts |
| `CaseInspector` | `{ caseId }` | Read view of a case (details, steps, history tab, used-in-runs tab) |
| `TestStepsPanel`, `ResultHistory`, `AttachmentTile`, `AttachmentDropzone` | per 6.11 | |
| `CopyOnceSecret` | `{ value, onAcknowledge }` | monospace, copy button, "I have saved it" gate |
| `RoleGate` | `{ allow: Role[], mode: 'hide'\|'disable', reason?, children }` | the single place that implements the hide/disable rule from section 8; reads `useProjectRole()` |
| `GuidedTour` | `{ id, steps }` | 4-step coachmarks, dismissal stored per user |

### 4.3 DataTable
`DataTable<T>` is built on **@tanstack/react-table** (headless) with **@tanstack/react-virtual** for row virtualisation above 100 rows, rendered with plain `<table>` semantics and Tailwind. Reasons: the owner's stack already includes it; full control of row focus and per-row hotkeys (required for execution); URL-synced sorting and filtering; no wrapper styling to fight. Props sketch: `{ columns, data, rowId, state: {sort, selection}, onStateChange, density, onRowOpen, isRowSelected, emptyState, loading, pageSize, serverPagination }`. Features: sticky header, `aria-sort`, checkbox selection with shift-range, roving row focus (J/K and arrows, `Enter` opens, `Space` selects), column visibility menu, comfortable/compact toggle (44/32px), tabular numerals.

### 4.4 Keyboard map

| Scope | Keys |
|---|---|
| Global | `?` shortcuts, `/` or `Cmd/Ctrl+K` search, `g` then `o/c/m/p/r/e/a` go to Overview/Cases/Milestones/Plans/Runs/Reports(e)/Automation(a) |
| Lists | `J`/`K` or arrows move, `Enter` open, `Space` toggle select, `X` select range, `Esc` close inspector |
| Run detail | `N` next untested, `Shift+N` next failed, `1`-`5` filter by status chip |
| Test execution | `P` passed, `F` failed, `B` blocked, `R` retest, `U` clear, `C` focus comment, `A` attach, `S` or `Cmd/Ctrl+Enter` save and next, `[` `]` previous/next step, `Shift+P/F/B/R` set status on the focused step |
| Editors | `Cmd/Ctrl+S` save, `Alt+Up/Down` move step, `Cmd/Ctrl+Enter` add step below |

Rules: single-letter hotkeys are active only when focus is not in an input, textarea, rich-text, select or dialog; they can be switched off in the user menu ("Single-key shortcuts", default on) to satisfy WCAG 2.1.4; every one has a button equivalent.

---

## 5. Implementation notes for Next.js
- Server layouts render only the shell, theme provider (next-themes, class strategy) and `QueryClientProvider`; every screen is a client component (`"use client"`). No server data fetching.
- Services (`src/services/*.ts`) wrap the PocketBase SDK and the `/api/v1/` facade with typed functions; screens use TanStack Query hooks (`useRun`, `useRunTests`, `useAddResult`). Result saves are optimistic mutations with rollback.
- Realtime: subscribe to `test_run_cases` per run in a hook, patch the query cache, announce via a polite live region.
- Hotkeys: one `useHotkeys(scope, map, { enabled })` hook; scopes mount and unmount with the screen.
- Tokens: import `tokens.css` once in `src/app/globals.css`. Components use semantic utilities only (`bg-surface`, `text-ink-muted`), never raw hex.

---

## 6. Screen specs (M0)

Common states for every data screen: **loading** (skeleton in final geometry, no spinner pages), **empty** (reason + primary action), **error** (inline, with Retry; 403 shows "You do not have access to this project", 404 shows "Not found" with link back), **read-only** (viewer: edit controls hidden, fields rendered as text), **archived project** (banner, all writes disabled with reason tooltip). Screens below only add what is specific.

### 6.1 Sign in `/sign-in`
```
+--------------------------------------------+
|              [logo] TestBuddy              |
|        Sign in to your workspace           |
|  Email    [______________________]         |
|  Password [______________________] (show)  |
|  [ Sign in ]            Forgot password?   |
|  ---------- or ----------                  |
|  [ Continue with OAuth provider ] (if on)  |
+--------------------------------------------+
```
- States: submitting (button spinner, fields locked), wrong credentials ("Email or password is incorrect", focus to email, `role=alert`), inactive account ("This account is disabled. Ask an admin."), network error.
- Actions: Sign in, OAuth (only if enabled in PocketBase settings). Redirect to the originally requested URL.
- Forgot password shown only if email is configured; otherwise a line "Ask your admin to reset your password".

### 6.2 Workspace and project list `/projects`
```
| Workspace: Acme QA v |                         [ + New project ] |
| Search projects [_________]   [ ] Show archived                  |
+------------------------------------------------------------------+
| CORE  Core platform        You: Manager   412 cases  2 open runs |
|       Last activity 2h ago   [progress ====----]                 |
| MOB   Mobile app           You: Tester    188 cases  1 open run  |
+------------------------------------------------------------------+
```
- Cards or rows (toggle, default rows). Each: prefix, name, my role badge, case count, open runs, latest run progress, archived badge.
- Empty: "No projects yet. Create your first project." (workspace admin/manager) or "You are not in any project yet. Ask an admin to add you." (others).
- Create project (modal): name, ref prefix (2-10 chars A-Z0-9, live uniqueness check, cannot change later), announcement optional.

### 6.3 Project overview `/p/{projectId}`
```
Core platform  [CORE]                      [ + New run ] [ + New case ]
Announcement: "Release freeze Friday" (dismissible per user, editable by admin)
+-----------+-----------+-----------+-----------+
| Cases 412 | Open runs | Pass rate | Failing   |
| +12 /wk   | 2         | 87% (7d)  | 9 tests   |
+-----------+-----------+-----------+-----------+
| Active milestone: Release 2.4  due in 6 days  [=====|===--] 71%   |
+--------------------------------+---------------------------------+
| Open runs                      | Recent activity                 |
| Smoke 2.4  ####.. 64%  3 fail  | Dana failed CORE-C41  10:42     |
| Regression ##.... 31%          | Raj created run "Smoke"         |
+--------------------------------+---------------------------------+
| My assigned tests (12)  [Start next untested]                    |
```
- States: no milestone (card hidden), no runs ("No open runs. Create one from the repository."), loading skeletons for KPIs.
- Primary actions: New run, New case, Start next untested (tester with assignments).

### 6.4 Case repository `/p/{projectId}/cases`
```
[Search cases..] [Priority v][Type v][Automation v][Tags v] [Filters] [+ New case]
+--------------+-----------------------------------+------------------------+
| Suites       | [] Ref     Title        Pri Auto  | CORE-C41  v3     [Edit]|
| v Web app 212| [] C40  Login valid       P1  bolt | Login with valid creds |
|   Login   18 | [x] C41 Login lockout     P1  eye  | Priority P1  Type Func |
|   Checkout 40| [] C42  Reset password    P2  --   | Preconditions ...      |
| > API     140| ...                               | Steps                  |
| > Mobile   60|                                    | 1 Open /login          |
| + Add suite  | 1-50 of 212      < 1 2 3 4 5 >    |   Expect: form shows   |
+--------------+-----------------------------------+------------------------+
 Bulk bar when selected: 3 selected [Set priority][Move][Add to run][Deprecate][Delete]
```
- Three panes: tree (240px, collapsible), list, inspector (read view of the selected case, tabs: Details, History, Used in runs).
- Tree: node click filters the list (`suite`, `section`). Counts include descendants. Tester+ sees "+ Add suite/section" and a node menu.
- List: columns Ref, Title, Priority, Type, Automation, Tags, Version, Updated; deprecated cases dimmed with "Deprecated" badge and hidden unless `deprecated=1`.
- Empty (no cases): "No cases in this section. Add the first case." with New case. Empty (filters): "No cases match these filters" with Clear filters.
- Viewer: no checkboxes beyond "Add to run" is hidden too; inspector has no Edit.
- Actions: New case, bulk set priority/type, move to section, add to run (starts Create run with the selection), deprecate, delete (tester+; confirm names count; warns that results are kept).

### 6.5 Case editor `/p/{projectId}/cases/{caseId}` and version history
```
< Cases   CORE-C41  v3   [Automated: eye]            [Cancel] [Save as v4]
+---------------------------------------------+-------------------------+
| Title [Login lockout after 5 attempts_____] | Suite    [Web app v]    |
| Preconditions (rich text)                   | Section  [Login v]      |
| [____________________________________]      | Priority [P1 Critical v]|
| Steps                                       | Type     [Functional v] |
| 1 [Open /login___________]  Expected        | Automation [..]         |
|   [Form is shown__________]  [up][dn][x]    | Estimate [00:05:00]     |
| 2 [Enter wrong pw 5 times] Expected [...]   | Refs     [JIRA-12]      |
| [+ Add step]                                | Tags [smoke][auth][+]   |
| Change note (optional) [_____________]      | Milestone [..]          |
+---------------------------------------------+-------------------------+
Tabs: Edit | History (4)
History: list of versions (v4 now, v3 Dana 2d ago "note") ; select 2 -> diff view
```
- Dirty indicator, "unsaved changes" guard on leave, draft kept locally, conflict state if `version` changed on server ("Dana saved v4 while you were editing. Review changes" with diff).
- Validation: title required, each step needs a description. Save creates a new version (never overwrites); button reads "Save as v4".
- History: version, author, date, change note, "View", "Compare with current", "Restore as new version" (tester+). Read-only for viewers.
- Closed/frozen note: cases used by runs with results show "Results exist for earlier versions. Editing creates v{n+1} and does not change existing results."

### 6.6 Milestones `/p/{projectId}/milestones`
```
[ Open (2) | Completed (5) ]                        [ + New milestone ]
Release 2.4        due Nov 20 (6 days)       ##########-- 71%  [Active]
  3 runs, 1 plan, 412 tests, 9 failed
Hotfix 2.3.1       past due 3 days (warning icon)   ####------ 38%
```
- Detail: description, due date, linked plans and runs (table), stacked progress, "Open report". Edit and complete: manager+. Completing asks confirmation and lists open runs still attached.
- Empty: "No milestones. Group runs under a release goal." + New milestone (manager+).
- Past due shows icon + text "Past due", not only red.

### 6.7 Plans `/p/{projectId}/plans` and detail
```
Plans                                              [ + New plan ]
Release 2.4 regression   Milestone: Release 2.4   Owner: Raj   3 runs  71%
Detail: description, builds, refs, milestones; runs grouped by suite:
  Web app  | Run "Web smoke"   ####.. 64% | assignee | build 2.4-rc1 | [Open]
  API      | Run "API suite"   ######100% closed
  [ + Add run to plan ]   rollup stacked progress on top   [Complete plan]
```
- Create plan (side panel): name, type label, milestones (multi), builds, refs, owner, description.
- States: plan with no runs ("Add the first run"), completed plan read-only.
- Manager+ create/edit; others read.

### 6.8 Run list `/p/{projectId}/runs`
```
[Open | Closed | All]  [Milestone v][Plan v][Assignee v][Search]   [ + New run ]
Name           Plan/Milestone      Build     Assignee  Progress          Started
Web smoke      R2.4 regression     2.4-rc1   Dana      ########--  80%   Nov 2
Nightly API    --                  #4411 CI  CI bot    ##########  100%  Nov 3  [Closed icon]
```
- Progress cell = mini stacked bar + percentage + failed count. Closed runs show a lock icon and "Closed".
- Empty: "No runs yet. Build one from a set of cases." + New run (tester+).

### 6.9 Create run `/p/{projectId}/runs/new`
```
New run
Name [Web smoke 2.4-rc1]  Plan [none v]  Milestone [R2.4 v]  Build [2.4-rc1]
Assign to [Dana v]  Refs [..]   Description [..]
Cases:  (o) Include all active cases in suite [Web app v]
        (o) Select specific cases   <- default when arriving from repository
+--------------+-----------------------------------------+----------------+
| Suites tree  | [filters: priority, type, automation,   | Selected: 38   |
|              |  tags, section, search]                 | by priority    |
|              | [] CORE-C40 Login valid           P1    | P1 12  P2 20.. |
|              | [Select all 50 on page] [Select all 212 matching filter]   |
|              |                                         | [Clear]        |
+--------------+-----------------------------------------+----------------+
                                  [Cancel]  [Create run with 38 tests]
```
- Case picker reuses the repository list and filter bar; deprecated cases are excluded and cannot be selected (explained in a footnote).
- "Select all matching filter" selects by query, with the count stated. Selection persists across pages and filter changes; the right panel summarises counts by priority and est. duration.
- Validation: name required; at least 1 case unless include-all. Submit shows progress ("Snapshotting 38 cases") and lands on run detail.
- Tester+ can create; manager+ can attach to plans and milestones (fields disabled with tooltip for tester).

### 6.10 Run detail `/p/{projectId}/runs/{runId}`
```
Web smoke 2.4-rc1  [Open]   Build 2.4-rc1  Milestone R2.4  Assignee Dana
[#########//////xxxx....]  38 tests  62% done  Passed 20 Failed 3 Blocked 1 Retest 0 Untested 14
[Start next untested N]  [Add cases] [Assign] [Close run]
Filters: [All][Untested][Failed][Blocked][Retest][Passed]  [Assignee v][Section v][Search]
+------------------------------------------------+---------------------------+
| [] Test            Pri  Section    Assigned St | CORE-C41 Login lockout    |
| [] CORE-C40 Login  P1   Login      Dana  P      | Latest result: Failed     |
| [] CORE-C41 Lockout P1  Login      Dana  F      | Dana 10:42 "Locked after 4"|
| [] CORE-C42 Reset  P2   Login      --    U      | [Open test]  history (3)  |
+------------------------------------------------+---------------------------+
```
- Table virtualised; status column uses status badge; row `Enter` or click opens the inspector; double-click or `E` opens the full execution page; selection bar: Assign, Set status (bulk, requires comment for flagged statuses), Remove from run (before results only).
- Closed run: header shows "Closed on Nov 3 by Raj", progress frozen, every write control hidden or disabled with tooltip "This run is closed". Close run (tester+, irreversible): confirm lists untested count ("14 tests are untested and will stay untested").
- Empty (include-all run with no active cases): "This run has no tests."
- Realtime: new results appear with a short highlight and polite live-region announcement "CORE-C42 marked Passed by Raj".

### 6.11 Test execution `/p/{projectId}/runs/{runId}/tests/{testId}`
```
< Web smoke   Test 12 of 38  [<] [>]   Filter: Untested v      [Esc list]
CORE-C41  Login lockout after 5 attempts    P1  Functional   Snapshot v3
(banner if live case is v4: "A newer version exists. View latest")
Preconditions: user exists, not locked
+--------------------------------------------+-----------------------------+
| Steps                                      | Result history (3)          |
| 1 Open /login                [P][F][B][R]  | Failed  Dana  Nov 2  "..."  |
|   Expected: form shown                     | Retest  Raj   Nov 1         |
| 2 Enter wrong pw x5          [P][F][B][R]  | Attachments (2) [tile][tile]|
|   Expected: locked message   (F selected)  |                             |
|   Step comment [___________]               |                             |
+--------------------------------------------+-----------------------------+
STICKY BAR: ( P Passed ) ( F Failed ) ( B Blocked ) ( R Retest )  Comment [..]
            Elapsed [00:03:20 timer] Defects [JIRA-77 x][+] [Attach A]
            [ Save and next  S ]                         Untested left: 14
```
- Step statuses are optional; setting a failed step pre-selects Failed for the test and moves focus to comment. Setting all steps Passed pre-selects Passed (user still confirms with save).
- Status flagged `require_comment` makes comment required; save is blocked with an inline message, not a modal.
- Save: optimistic, toast "Saved Failed for CORE-C41. Undo" (10 s), focus lands on the next untested test's status bar. "Next" order follows the current run filter and sort.
- Attachments: drag and drop, paste image, progress bar per file, type and 25 MB limit errors inline ("report.exe is not an allowed type").
- History tab shows earlier results (status, user, build, version executed, comment, defects) newest first; results from older case versions are labelled "v2".
- Read-only (viewer or closed run): status bar replaced by the latest result summary; hotkeys disabled and the shortcut overlay says why.
- Offline/save error: result stays in the bar with "Not saved. Retry" and is kept locally until saved.
- Timer: optional, starts on open, pausable, editable; prefilled into `elapsed`.

### 6.12 Reports `/p/{projectId}/reports`, milestone and run reports
```
Reports   [Milestone report v][Run summary][Trends (M5)]
Milestone: Release 2.4 v     Range [all]            [Export CSV] [Print]
Overall  ##########//xxx..  412 tests 87% passed
By run table: run | passed | failed | blocked | retest | untested | %
By suite / by assignee (toggle) as stacked horizontal bars + table twin
Top failing cases: CORE-C41 (3 runs), ...
Trend: pass rate per day line chart (data table twin)
```
- Every chart has a table twin (toggle "Show as table"), patterns plus labels, never colour alone.
- Run summary: same blocks for one run plus slowest tests and tests with defects.
- States: no data ("No results yet for this milestone"), generating (skeleton), error with Retry. Export CSV role-gated (manager+).
- Print stylesheet: single column, light theme, patterns kept.

### 6.13 Automation `/p/{projectId}/automation`
```
Automation   [Mappings | CI tokens | Executions]                [ + New ]
Mappings: framework (robot/junit/pytest/custom) | reporting config | rules | active | [Edit]
CI tokens:
  Name           Mapping       Created   Last used   [Revoke]
  gh-actions     JUnit main    Oct 30    2h ago
  Create token (side panel): name, mapping -> [Create]
  -> Dialog: "Copy your token now. You will not see it again."
     tb_demo_9f3a...  [Copy]   [ ] I have saved it   [Done]
Executions:
  External id  Build     Branch  Commit   Status     Counts            When
  gh-4411      2.4-rc1   main    a1b2c3d  Completed  120 pass 3 fail   10:02
  gh-4410      2.4-rc0   main    9f8e7d6  Failed (import error)        Nov 3
```
- Executions table: status badge (in_progress, completed, failed), build/branch/commit (commit mono, copy, links if repo URL set), counts from `summary`, bound run link. Execution detail lists unmatched external ids and item-level errors with a "Create case from this" shortcut (manager+).
- Mapping editor: framework, field_map as a key/value table with test-match preview ("classname.name -> CORE-C41"), active toggle, JUnit sample upload to test the mapping.
- Tokens: hashed at rest, so only the creation dialog ever shows the value; list shows prefix + last 4. Revoke needs typed token name.
- Roles: admin and manager see Automation; admin-only for tokens; testers/viewers see Executions read-only (tab hidden for the others).
- Empty: "No mappings. Connect your CI to post results automatically." + docs link.

### 6.14 Members and roles `/p/{projectId}/members`
```
Members (8)                                         [ + Add member ]
Name         Email            Role                 Last access
Dana Lee     dana@..          [Tester v]           2h ago
Raj Patel    raj@..           [Manager v]          today
You (Avery)  avery@..           Admin (cannot demote last admin)
```
- Role select with an inline hint panel describing the 4 roles; change applies immediately with toast and Undo; removing a member needs confirmation. The last admin cannot be demoted or removed (disabled with tooltip).
- Add member (side panel): search workspace users, choose role. Workspace users not in the project only.
- Admin only to change; manager sees the list read-only. Hidden from tester/viewer (route shows the no-permission state).
- Role-explainer table (section 8) is linked from "What can each role do?".

### 6.15 Audit log `/p/{projectId}/audit`
```
[Actor v][Action v][Entity v][From][To]  [Export CSV]
Time        Actor  Action        Entity              Summary
10:42 Nov 3 Dana   result.create test CORE-C41        Failed (was Retest)
09:10 Nov 3 Raj    run.close     run Nightly API      --
```
- Row click opens the inspector with before/after JSON as a field diff (changed fields only, raw JSON toggle), IP, entity link (or "Deleted" if the entity is gone).
- Immutable: no edit or delete controls anywhere. Admin only. Empty: "No audit entries for these filters."
- Pagination: offset/limit; infinite scroll is not used so positions stay referenceable.

### 6.16 Settings `/p/{projectId}/settings`
```
[General | Import | Danger zone]
General: Name, Ref prefix (read-only after first case), Announcement (shown on overview), Tags manager
Import: (o) TestRail XML  (o) JSON   [Choose file]  -> Preview: 3 suites, 12 sections, 120 cases
        Options: [x] map priorities  [ ] skip duplicates by title   [Import]
        Result: "118 imported, 2 skipped" with downloadable report
Danger zone: Archive project (reversible, becomes read-only) / Delete project (type name)
```
- Import: dry-run preview first; progress for long imports; per-row errors listed; import is audit-logged. Max file size stated.
- Archive: admin; shows consequence ("Runs can no longer be changed"). Delete: admin, typed project name, lists counts of cases/runs/results being removed.
- Manager sees General (announcement only) and Import; admin sees everything.

---

## 7. Cross-screen patterns
- **Confirm for destructive**: names the target and the count ("Delete 3 cases? Results in closed runs are kept.").
- **Unsaved changes**: leave guard on editors and on result bar with text.
- **Long lists**: server-side pagination with "1-50 of 212" and page size 25/50/100/200.
- **Saved views**: filter sets can be saved per user (deferred, URL sharing covers M0).
- **First-run guidance**: 4-step guided tour on repository and execution; empty states double as onboarding.
- **Notifications**: no inbox in M0; toasts only.

---

## 8. Role-based UI rules

Roles: Admin (A), Manager (M), Tester (T), Viewer (V). **Rule:** hide a control or screen when the role can never use it in that area (e.g. Members for tester/viewer); disable with an explanatory tooltip when the role normally can but the state forbids it (closed run, archived project, completed milestone, last admin). Never show a control that will 403. Server remains authoritative.

| Screen / action | A | M | T | V |
|---|---|---|---|---|
| Sign in, project list, switcher | yes | yes | yes | yes |
| Create project (workspace) | yes | yes | no (hidden) | no (hidden) |
| Overview | full | full | full | read, no create buttons |
| Cases: view, filter, history | yes | yes | yes | yes |
| Cases: create, edit, move, deprecate, delete, tags | yes | yes | yes | no (hidden) |
| Suites and sections: add/rename/delete | yes | yes | yes | no |
| Milestones: view | yes | yes | yes | yes |
| Milestones: create, edit, complete | yes | yes | no (hidden) | no (hidden) |
| Plans: view / create, edit | yes / yes | yes / yes | yes / no | yes / no |
| Runs: view | yes | yes | yes | yes |
| Runs: create, add cases, assign | yes | yes | yes | no |
| Runs: attach to plan or milestone | yes | yes | disabled (tooltip) | hidden |
| Execute (set results, attach, comment) | yes | yes | yes | no (status bar replaced by summary) |
| Edit own result while run open | yes | yes | yes | no |
| Delete a result | yes | no | no | no |
| Close run | yes | yes | yes | no |
| Reopen closed run | not possible (irreversible), no UI for anyone | | | |
| Reports: view | yes | yes | yes | yes |
| Reports: export CSV | yes | yes | no | no |
| Automation: mappings (view / edit) | yes / yes | yes / yes | hidden | hidden |
| Automation: executions (view) | yes | yes | yes (read) | yes (read) |
| CI tokens: create, revoke | yes | no | hidden | hidden |
| Members: view / change | yes / yes | yes / no | hidden | hidden |
| Audit log | yes | hidden | hidden | hidden |
| Settings: general / import | yes | announcement + import | hidden | hidden |
| Archive, delete project | yes | hidden | hidden | hidden |
| Attachments: upload / delete | yes / any | yes / own | yes / own | no |

Open question: schema marks Audit read as ADMIN only and mappings as ADMIN/MANAGER, so those match the table; CI token creation follows mapping access (ADMIN) as a conservative default.

Archived project: all write controls disabled for every role (reason tooltip), except admin Unarchive. Completed milestone/plan: edit disabled, view allowed.

---

## 9. Accessibility (WCAG 2.1 AA)
- Contrast: text >= 4.5:1, large text and UI borders >= 3:1 (input borders use `--tb-border-strong`); all status text colours are the "text" variants on their tints.
- Focus: visible 2px ring plus 2px offset on every focusable element (`--tb-focus-ring`), never removed; focus order follows visual order; after Save and next, focus moves to the next test's first status control and the change is announced.
- Hotkeys: single-key shortcuts are off while typing and can be disabled (SC 2.1.4); no shortcut overrides browser or screen-reader keys (no bare Ctrl combos except Save/Search, no Insert/CapsLock); `?` documents them.
- Semantics: tables are real tables with `aria-sort`, row selection via checkbox, `aria-rowcount` and `aria-rowindex` when virtualised; the tree uses `role=tree` with arrow keys; tabs and dialogs follow the ARIA patterns; dialogs trap focus and restore it.
- Live regions: polite for realtime result updates and "Saved", assertive for errors. Progress bars expose `role=img` with a text summary ("38 tests: 20 passed, 3 failed, 1 blocked, 14 untested").
- Status never by colour alone: icon, label and bar pattern. Charts have table twins.
- Targets: >= 24px minimum on desktop, 44px on touch (status buttons are 44px high in execution at every size).
- Motion: honours `prefers-reduced-motion`; no auto-playing animation; timers do not announce every second.
- Forms: visible labels, errors tied with `aria-describedby`, first invalid field focused on submit, required fields marked in text ("required"), not only with an asterisk.
- Zoom/reflow: usable at 200% and 320 CSS px width without two-dimensional scroll (tables scroll inside their own region).
- Testing: axe checks in the smoke E2E, plus one manual screen-reader pass per milestone on Run detail and Test execution.

## 10. Responsive rules
| Width | Behaviour |
|---|---|
| >= 1280 | Full three-pane layouts; inspector inline; sidebar expanded |
| 1024-1279 | Sidebar collapses to icon rail; inspector 40%; tree collapsible |
| 768-1023 (tablet) | Execution is first-class: sidebar is an overlay, run detail becomes list with full-width inspector overlay, test execution single column, sticky status bar with 44px buttons, steps full-width. Repository usable (tree in a drawer) |
| < 768 (phone) | Read-only: browse projects, cases, runs, results, reports. Editing, creating, importing and executing are hidden with a note "Open on a larger screen to edit"; one exception for later: a single-test quick result. Tables turn into cards |
Print: reports and test case view only (light theme, no chrome).

## 11. Copy style guide
- Sentence case everywhere. Buttons start with a verb: "Create run", "Save as v4", "Add member", "Close run". No "Submit" or "OK".
- Short and direct; say what happened and what to do next. Errors: cause first ("Run is closed. Results can no longer be changed."), not "Something went wrong".
- Empty states: one sentence of why it is empty plus the action ("No runs yet. Create a run from your cases.").
- Numbers with units and totals ("14 of 38 tests untested"). Dates relative within 7 days ("2h ago") with absolute on hover; ISO-like absolute otherwise ("Nov 3, 2026 10:42").
- Confirmations repeat the target name and the verb on the button ("Delete 3 cases").
- Do not blame ("You have no access" becomes "You do not have access to this project. Ask an admin."). No exclamation marks, no emoji, no jargon like "entity" in UI (audit log uses "Item").
- Hotkey hints use `<kbd>` styling next to the label: "Passed  P".
- Status words are fixed: Passed, Failed, Blocked, Retest, Untested.

### Glossary
| Term | Meaning |
|---|---|
| Case | A reusable test definition: title, preconditions, steps. Lives in a suite section. Has versions. |
| Step | One action with an expected result inside a case. |
| Test | A case inside a run (`test_run_cases`). Carries a snapshot of the case and the latest status. |
| Run | A set of tests executed together against a build. Closing is permanent. |
| Plan | A group of runs, usually for one release effort, optionally across suites. |
| Milestone | A release or date goal that plans and runs roll up into. |
| Result | One recorded outcome of a test: status, comment, time spent, defects, attachments, step results. |
| Snapshot | The frozen copy of a case a test uses; shows its version (v3). |
| Suite / Section | Top-level and nested folders for organising cases. |
| Mapping | Rule that connects CI test names to case refs. |
| Token | Secret a CI job uses to post results; shown once. |

---

## 12. Build notes for agents
- Build order: tokens and shell, status/priority primitives, data table + filter bar, repository, run detail, test execution, then the rest. Execution speed (hotkeys, next-untested, optimistic save) is the acceptance bar for M3.
- URL is the source of truth for filters, selection and tabs.
- Fixture data: see `docs/design/mock-data.md`.
- No TestRail names, layouts or colours; no references to private house projects in shipped code or docs.
