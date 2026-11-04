/**
 * Label mapping from TestRail to TestBuddy lookups.
 * TestBuddy priorities and case types are lookup rows (not enums); the seeded names are used here.
 * planImport returns the TestBuddy NAME; the service layer resolves it to a row id.
 */
export const DEFAULT_PRIORITY = 'Minor';
export const DEFAULT_TYPE = 'Functional';

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

export const PRIORITY_MAP: Record<string, string> = {
  critical: 'Critical', p1: 'Critical', '4 - critical': 'Critical', '4': 'Critical',
  high: 'Major', major: 'Major', p2: 'Major', '3 - high': 'Major', '3': 'Major',
  medium: 'Minor', minor: 'Minor', p3: 'Minor', '2 - medium': 'Minor', '2': 'Minor',
  low: 'Trivial', trivial: 'Trivial', p4: 'Trivial', '1 - low': 'Trivial', '1': 'Trivial',
};

export const TYPE_MAP: Record<string, string> = {
  functional: 'Functional', acceptance: 'Functional', compatibility: 'Functional', destructive: 'Functional',
  automated: 'Functional', other: 'Functional',
  smoke: 'Smoke', 'smoke & sanity': 'Smoke', 'smoke &amp; sanity': 'Smoke', sanity: 'Smoke',
  regression: 'Regression',
  ui: 'UI', usability: 'UI', accessibility: 'UI',
  performance: 'Performance',
  security: 'Security',
};

export interface Mapped { value: string | undefined; known: boolean }

/** Empty label -> value undefined, known true (nothing to map). Unknown -> default, known false. */
function mapLabel(label: string | undefined, table: Record<string, string>, fallback: string, extra?: Record<string, string>): Mapped {
  if (!label || !label.trim()) return { value: undefined, known: true };
  const k = norm(label);
  const hit = extra?.[k] ?? table[k];
  return hit ? { value: hit, known: true } : { value: fallback, known: false };
}

/** `overrides` maps lower-cased TestRail labels to TestBuddy names, e.g. { 'must test': 'Critical' }. */
export function mapPriority(label: string | undefined, overrides?: Record<string, string>): Mapped {
  return mapLabel(label, PRIORITY_MAP, DEFAULT_PRIORITY, lower(overrides));
}
export function mapType(label: string | undefined, overrides?: Record<string, string>): Mapped {
  return mapLabel(label, TYPE_MAP, DEFAULT_TYPE, lower(overrides));
}
function lower(o?: Record<string, string>): Record<string, string> | undefined {
  if (!o) return undefined;
  return Object.fromEntries(Object.entries(o).map(([k, v]) => [norm(k), v]));
}
