# Components and hooks

Every screen is a client component. Data comes only from `src/services/hooks` (TanStack Query over typed services). Use the semantic token utilities (`bg-surface`, `text-ink-muted`, `border-subtle`), never raw hex. Import primitives from `@/components/ui`.

## `ui/` primitives
- `Button` (variant, size, loading, iconLeft, kbd), `buttonStyles` - the one button.
- `Card`, `CardHeader`, `CardTitle`, `StatCard { label, value, delta?, href? }` - flat bordered surfaces and KPI tile.
- `Badge { tone, size, icon }` - tinted label.
- `StatusBadge { status: key | status row, size, showLabel, hotkey }`, `STATUS_META`, `STATUS_ORDER` - icon + word + tint; custom statuses get a diamond.
- `PriorityChip`, `AutomationChip`, `TagChip` - glyph/icon plus text.
- `Tabs { items, value, onValueChange }` or `{ urlParam, defaultValue }` - underline tabs, optionally URL-synced.
- `Dialog`, `ConfirmDialog { confirmLabel, tone, requireText }` - modal and destructive confirmation.
- `toast.success/error/info/undo({ message, onUndo })` - sonner wrappers (undo is 10 s).
- `Skeleton`, `TableSkeleton`, `CardSkeleton` - loading in final geometry.
- `Input`, `Textarea`, `FormField { label, hint, error, required }` - labelled controls, aria wired.
- `Select` (Radix, clearable), `Combobox` (searchable, multi) - option pickers.
- `Checkbox`, `Switch`, `RadioGroup` + `RadioItem`, `Tooltip` (+ `TooltipProvider`), `DropdownMenu*`, `Popover*` - Radix wrappers.
- `Kbd` - hotkey hint chip.
- `FilterBar { search, facets, value, onChange, resultCount }` - controlled search + facet chips; wire to `useUrlState`.
- `DataTable<T>` - react-table, virtual above 100 rows, J/K + arrows roving focus, Enter opens, Space/Shift+Space/X selection, density toggle, sticky header, aria-sort.
- `Pagination { page, pageSize, total, onChange }` - "1-50 of 212", sizes 25/50/100/200.
- `StepList` (read + per-step result buttons) and `Stepper` (wizard header).

## `shell/`
- `AppShell` - session guard, topbar, role-filtered sidebar, global hotkeys, help and search dialogs (used by `(app)/layout.tsx`).
- `ProjectSidebar`, `NAV_ITEMS` (nav-config.ts) - add a nav entry in one place.
- `Topbar`, `ProjectSwitcher` (+ workspace select), `GlobalSearch`, `ThemeToggle` (+ `setTheme`, `useTheme`), `UserMenu` (single-key toggle, demo sign-in-as, Reset demo data).
- `PageHeader { title, badge, meta, actions, tabs, breadcrumbs }`, `Breadcrumbs`.
- `SplitView { list, detail, detailOpen, onClose, storageKey }` - resizable list/detail; overlay under 1024px.
- `SidePanel { open, onOpenChange, title, footer }` - right-hand form panel.
- `MockDbNotice` - one-time "Changes won't be saved in this browser" toast.

## `tb/`
- `EmptyState { icon, title, description, action, tone }`.
- `ProjectBoundary` (project layout), `useProjectContext()`, `useProjectRole()`, `useCan(action)` - membership loaded once; no-access, not-found and archived states.
- `RoleGate { action | allow, mode: hide|disable, reason, blockedReason }` - the only place the hide/disable rule lives.
- `KeyboardHelp` - the `?` overlay; lists every scope registered by `useHotkeys`.
- `ComingSoon` - route placeholder (PageHeader + EmptyState, optional `requires`).

## `lib/`
- `useHotkeys(scope, map, { enabled })` - ignores inputs and dialogs for single keys, honours the Single-key toggle; specs `p`, `shift+n`, `mod+s`, `g o`; value may be `{ label, run }` to appear in the help overlay.
- `useSingleKeyShortcuts()`, `setSingleKeyShortcuts()`, `isEditableTarget()`.
- `useUrlState()` (`get/getList/getNumber/set`) and `useUrlParam(key, fallback)` - URL is the source of truth.
- `announce(msg, 'polite'|'assertive')` + `LiveRegion` (mounted in Providers).
- `can(role, action)`, `ROLE_LABEL`, `DISABLED_REASON` (permissions.ts) - the DESIGN.md section 8 matrix.
- `useMediaQuery`, `safeGet/safeSet` (never-throwing localStorage), `useActiveWorkspace()`.

## `services/hooks` (TanStack Query)
Session: `useSession`, `useDemoUsers`, `useSignInAs`, `useSignOut`. Projects: `useProjects`, `useProject`, `useMyProjectRole`, `useProjectOverview`, `useCreateProject`, `useUpdateProject`, `useSetArchived`, `useRemoveProject`. Members, lookups (`useCaseTypes`, `usePriorities`, `useStatuses`, `useTags`), suites (`useSuiteTree`, `useSuiteMutations`), cases (`useCases`, `useCase`, `useCaseVersions`, `useCaseUsage`, `useCaseMutations`), milestones, plans, runs (`useRuns`, `useRun`, `useRunMutations`), tests (`useRunTests`, `useRunTestOrder`, `useTest`), results (`useAddResult` optimistic + rollback, `useUndoResult`, `useResultMutations`), reports, automation, audit (`useAudit`), import (`useImport`). Query keys are in `hooks/keys.ts` (`qk`).
