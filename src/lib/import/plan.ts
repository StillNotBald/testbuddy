import type { ExistingCase, FlatCase, ImportBundle, ImportCase, ImportIssue, ImportPlan, ImportSection, PlanItem, StepInput } from './types';
import { mapPriority, mapType } from './mapping';

export function flattenBundle(bundle: ImportBundle): FlatCase[] {
  const out: FlatCase[] = [];
  const walk = (suite: string, path: string[], s: ImportSection) => {
    const here = [...path, s.name];
    s.cases.forEach((c) => out.push({ suite, sectionPath: here, case: c, index: out.length + 1 }));
    s.sections.forEach((n) => walk(suite, here, n));
  };
  bundle.suites.forEach((su) => su.sections.forEach((s) => walk(su.name, [], s)));
  return out;
}

const n = (s: string | undefined) => (s ?? '').replace(/\r\n?/g, '\n').trim();
const stepsKey = (steps: StepInput[]) => JSON.stringify(steps.map((s) => [n(s.description), n(s.expected_result)]));

function diff(c: ImportCase, path: string[], prio: string | undefined, type: string | undefined, ex: ExistingCase): string[] {
  const ch: string[] = [];
  if (n(c.title) !== n(ex.title)) ch.push('title');
  if (n(c.content) !== n(ex.content)) ch.push('content');
  if (prio !== undefined && prio !== ex.priority) ch.push('priority');
  if (type !== undefined && type !== ex.type) ch.push('type');
  if (c.refs !== undefined && n(c.refs) !== n(ex.refs)) ch.push('refs');
  if (c.estimate !== undefined && c.estimate !== ex.estimate) ch.push('estimate');
  if (stepsKey(c.steps) !== stepsKey(ex.steps)) ch.push('steps');
  if (ex.sectionPath && ex.sectionPath.join('\u0000') !== path.join('\u0000')) ch.push('section');
  return ch;
}

export interface PlanOptions {
  /** Section paths already in the project, besides those implied by `existing`. */
  existingSectionPaths?: string[][];
  priorityOverrides?: Record<string, string>;
  typeOverrides?: Record<string, string>;
}

/** Dry run. Matches by source_key, never mutates its inputs. */
export function planImport(bundle: ImportBundle, existing: ExistingCase[], options: PlanOptions = {}): ImportPlan {
  const plan: ImportPlan = { create: [], update: [], unchanged: [], conflicts: [], warnings: [...bundle.issues], summary: { suites: bundle.suites.length, sections: 0, cases: 0 } };
  const byKey = new Map<string, ExistingCase>();
  existing.forEach((e) => { if (e.source_key) byKey.set(e.source_key, e); });

  const knownPaths = new Set<string>();
  const addPath = (p: string[]) => p.forEach((_, i) => knownPaths.add(p.slice(0, i + 1).join('\u0000')));
  existing.forEach((e) => e.sectionPath && addPath(e.sectionPath));
  options.existingSectionPaths?.forEach(addPath);

  const flat = flattenBundle(bundle);
  plan.summary.cases = flat.length;
  const seenSections = new Set<string>();
  const seenKeys = new Set<string>();
  const warn = (w: ImportIssue) => plan.warnings.push(w);

  for (const f of flat) {
    const c = f.case;
    const base = { sourceKey: c.sourceKey || undefined, index: f.index };
    f.sectionPath.forEach((_, i) => seenSections.add([f.suite, ...f.sectionPath.slice(0, i + 1)].join('\u0000')));
    const pathKey = f.sectionPath.join('\u0000');
    if (!knownPaths.has(pathKey)) {
      knownPaths.add(pathKey);
      warn({ severity: 'info', code: 'section_created', message: `Section "${f.sectionPath.join(' > ')}" does not exist and will be created.`, ...base });
    }

    if (!c.title.trim()) {
      warn({ severity: 'warning', code: 'empty_title', message: 'Case has an empty title and was not imported.', ...base });
      plan.conflicts.push({ flat: f, reason: 'Empty title' });
      continue;
    }
    if (c.sourceKey && seenKeys.has(c.sourceKey)) {
      warn({ severity: 'warning', code: 'duplicate_source_key', message: `Source key ${c.sourceKey} appears more than once in the file; only the first is imported.`, ...base });
      plan.conflicts.push({ flat: f, reason: 'Duplicate source key in file' });
      continue;
    }
    if (c.sourceKey) seenKeys.add(c.sourceKey);
    else warn({ severity: 'warning', code: 'no_source_key', message: 'Case has no id, so a re-import cannot recognise it and will create it again.', ...base });

    const p = mapPriority(c.priorityLabel, options.priorityOverrides);
    const t = mapType(c.typeLabel, options.typeOverrides);
    if (!p.known) warn({ severity: 'warning', code: 'unknown_priority', message: `Priority "${c.priorityLabel}" is not known; mapped to ${p.value}.`, ...base });
    if (!t.known) warn({ severity: 'warning', code: 'unknown_type', message: `Type "${c.typeLabel}" is not known; mapped to ${t.value}.`, ...base });

    const item: PlanItem = { flat: f, priority: p.value, type: t.value };
    const ex = c.sourceKey ? byKey.get(c.sourceKey) : undefined;
    if (!ex) { plan.create.push(item); continue; }
    const changes = diff(c, f.sectionPath, p.value, t.value, ex);
    item.existingId = ex.id;
    if (changes.length) { item.changes = changes; plan.update.push(item); } else plan.unchanged.push(item);
  }
  plan.summary.sections = seenSections.size;
  return plan;
}
