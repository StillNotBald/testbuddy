import type { SectionNode, SuiteNode } from '@/services/interfaces';
import type { AutomationStatus, Id, TestCaseVersion } from '@/services/types';

export const AUTOMATION_OPTIONS: Array<{ value: AutomationStatus; label: string }> = [
  { value: 'not_specified', label: 'Not specified' },
  { value: 'needs_review', label: 'Needs review' },
  { value: 'needs_automation', label: 'Needs automation' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'automated', label: 'Automated' },
  { value: 'not_automatable', label: 'Not automatable' },
];

/** Relative within 7 days, absolute otherwise (DESIGN.md section 11). */
export function when(iso: string | undefined, now = Date.now()): string {
  if (!iso) return '';
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '';
  const s = Math.max(0, Math.round((now - t) / 1000));
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)}d ago`;
  return new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function absWhen(iso: string | undefined): string {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function estimateText(seconds: number | undefined): string {
  if (!seconds) return 'Not set';
  const m = Math.round(seconds / 60);
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m} min`;
}

/** Estimate text field: accepts "5", "5m", "1h 30m", "00:05:00". Returns seconds, undefined when empty, NaN when invalid. */
export function parseEstimate(text: string): number | undefined {
  const t = text.trim();
  if (!t) return undefined;
  if (/^\d+:\d{2}(:\d{2})?$/.test(t)) {
    const p = t.split(':').map(Number);
    return p.length === 3 ? (p[0] ?? 0) * 3600 + (p[1] ?? 0) * 60 + (p[2] ?? 0) : (p[0] ?? 0) * 60 + (p[1] ?? 0);
  }
  if (/^\d+$/.test(t)) return Number(t) * 60;
  const m = /^(?:(\d+)\s*h)?\s*(?:(\d+)\s*m)?$/i.exec(t);
  if (m && (m[1] || m[2])) return Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60;
  return Number.NaN;
}

export function estimateInput(seconds: number | undefined): string {
  if (!seconds) return '';
  const m = Math.round(seconds / 60);
  return m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ''}` : `${m}m`;
}

// ---- tree helpers ----------------------------------------------------------------------------
export interface TreeRow {
  key: string;
  kind: 'all' | 'suite' | 'section';
  label: string;
  count: number;
  level: number;
  suiteId?: Id;
  sectionId?: Id;
  parentSectionId?: Id;
  expandable: boolean;
  expanded: boolean;
  setSize: number;
  posInSet: number;
  /** Key of the parent row (for Left-arrow navigation). */
  parentKey?: string;
}

export function flattenTree(tree: SuiteNode[], total: number, expanded: Set<string>): TreeRow[] {
  const rows: TreeRow[] = [{ key: 'all', kind: 'all', label: 'All cases', count: total, level: 1, expandable: false, expanded: false, setSize: tree.length + 1, posInSet: 1 }];
  const walk = (nodes: SectionNode[], suiteId: Id, level: number, parentKey: string) => {
    nodes.forEach((n, i) => {
      const key = `sec:${n.section.id}`;
      const open = expanded.has(key);
      rows.push({ key, kind: 'section', label: n.section.name, count: n.count, level, suiteId, sectionId: n.section.id, parentSectionId: n.section.parent, expandable: n.children.length > 0, expanded: open, setSize: nodes.length, posInSet: i + 1, parentKey });
      if (open) walk(n.children, suiteId, level + 1, key);
    });
  };
  tree.forEach((s, i) => {
    const key = `suite:${s.suite.id}`;
    const open = expanded.has(key);
    rows.push({ key, kind: 'suite', label: s.suite.name, count: s.count, level: 1, suiteId: s.suite.id, expandable: s.sections.length > 0, expanded: open, setSize: tree.length + 1, posInSet: i + 2 });
    if (open) walk(s.sections, s.suite.id, 2, key);
  });
  return rows;
}

export function allKeys(tree: SuiteNode[]): string[] {
  const out: string[] = [];
  const walk = (nodes: SectionNode[]) => nodes.forEach((n) => { out.push(`sec:${n.section.id}`); walk(n.children); });
  tree.forEach((s) => { out.push(`suite:${s.suite.id}`); walk(s.sections); });
  return out;
}

export function sectionTrail(tree: SuiteNode[], sectionId: Id): string {
  for (const s of tree) {
    const find = (nodes: SectionNode[], trail: string[]): string | null => {
      for (const n of nodes) {
        if (n.section.id === sectionId) return [...trail, n.section.name].join(' / ');
        const r = find(n.children, [...trail, n.section.name]);
        if (r) return r;
      }
      return null;
    };
    const r = find(s.sections, [s.suite.name]);
    if (r) return r;
  }
  return '';
}

/** Valid destinations for "Move to": top level of any suite, or under another top-level section (only when the moved section has no sub-sections). */
export function moveTargets(tree: SuiteNode[], movingId: Id, hasChildren: boolean): Array<{ value: string; label: string }> {
  const out: Array<{ value: string; label: string }> = [];
  for (const s of tree) {
    out.push({ value: `${s.suite.id}|`, label: `${s.suite.name} (top level)` });
    if (hasChildren) continue;
    for (const sec of s.sections) if (sec.section.id !== movingId) out.push({ value: `${s.suite.id}|${sec.section.id}`, label: `${s.suite.name} / ${sec.section.name}` });
  }
  return out;
}

/** Flat section choices for the case editor and bulk "Move to": every section with its trail. */
export function sectionChoices(tree: SuiteNode[]): Array<{ value: string; label: string; suiteId: Id }> {
  const out: Array<{ value: string; label: string; suiteId: Id }> = [];
  for (const s of tree) {
    const walk = (nodes: SectionNode[], trail: string[]) => nodes.forEach((n) => {
      out.push({ value: n.section.id, label: [...trail, n.section.name].join(' / '), suiteId: s.suite.id });
      walk(n.children, [...trail, n.section.name]);
    });
    walk(s.sections, [s.suite.name]);
  }
  return out;
}

// ---- version diff -----------------------------------------------------------------------------
export interface SnapshotView {
  title: string;
  content: string;
  priority: string;
  type: string;
  automation: string;
  estimate: string;
  refs: string;
  steps: Array<{ description: string; expected: string }>;
}

export function viewOf(v: TestCaseVersion): SnapshotView {
  const c = v.snapshot.case as Record<string, unknown>;
  return {
    title: String(c.title ?? ''),
    content: String(c.content ?? ''),
    priority: String(c.priority ?? ''),
    type: String(c.type ?? ''),
    automation: String(c.automation_status ?? ''),
    estimate: c.estimate ? String(c.estimate) : '',
    refs: String(c.refs ?? ''),
    steps: v.snapshot.steps.map((s) => ({ description: String(s.description ?? ''), expected: String(s.expected_result ?? '') })),
  };
}

export interface DiffLine { kind: 'same' | 'add' | 'del'; text: string }

/** Longest-common-subsequence line diff; small inputs only (case steps). */
export function diffLines(a: string[], b: string[]): DiffLine[] {
  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i]![j] = a[i] === b[j] ? (dp[i + 1]![j + 1] ?? 0) + 1 : Math.max(dp[i + 1]![j] ?? 0, dp[i]![j + 1] ?? 0);
  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) { out.push({ kind: 'same', text: a[i] as string }); i++; j++; }
    else if ((dp[i + 1]![j] ?? 0) >= (dp[i]![j + 1] ?? 0)) { out.push({ kind: 'del', text: a[i] as string }); i++; }
    else { out.push({ kind: 'add', text: b[j] as string }); j++; }
  }
  while (i < n) out.push({ kind: 'del', text: a[i++] as string });
  while (j < m) out.push({ kind: 'add', text: b[j++] as string });
  return out;
}

export function snapshotLines(s: SnapshotView, names: { priority: (id: string) => string; type: (id: string) => string }): string[] {
  const lines = [
    `Title: ${s.title}`,
    `Priority: ${names.priority(s.priority) || 'None'}`,
    `Type: ${names.type(s.type) || 'None'}`,
    `Automation: ${AUTOMATION_OPTIONS.find((o) => o.value === s.automation)?.label ?? s.automation}`,
  ];
  if (s.refs) lines.push(`Refs: ${s.refs}`);
  if (s.content) lines.push(`Preconditions: ${s.content}`);
  s.steps.forEach((st, i) => {
    lines.push(`Step ${i + 1}: ${st.description}`);
    if (st.expected) lines.push(`Step ${i + 1} expected: ${st.expected}`);
  });
  return lines;
}
