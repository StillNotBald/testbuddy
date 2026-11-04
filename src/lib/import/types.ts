import type { Id } from '@/services/types';
import type { StepInput } from '@/services/interfaces';

export type { StepInput };

/** A problem found while parsing or planning. `error` blocks the item, `warning` needs a look, `info` is FYI. */
export interface ImportIssue {
  severity: 'error' | 'warning' | 'info';
  code:
    | 'malformed_xml' | 'malformed_csv' | 'no_suites' | 'missing_column'
    | 'unknown_priority' | 'unknown_type' | 'empty_title' | 'section_created'
    | 'no_source_key' | 'duplicate_source_key';
  message: string;
  sourceKey?: string;
  /** 1-based position of the case in the file (document order). */
  index?: number;
}

export interface ImportCase {
  /** TestRail case id, e.g. "C123". Empty string when the file carries none. */
  sourceKey: string;
  title: string;
  /** Preconditions. Stored as given (the TestBuddy `content` field is rich text). */
  content: string;
  /** Raw TestRail label; mapped to a TestBuddy value only by planImport. */
  priorityLabel?: string;
  typeLabel?: string;
  refs?: string;
  /** Seconds. */
  estimate?: number;
  steps: StepInput[];
}

export interface ImportSection {
  name: string;
  cases: ImportCase[];
  sections: ImportSection[];
}

export interface ImportSuite {
  name: string;
  description?: string;
  sections: ImportSection[];
}

export interface ImportBundle {
  format: 'testrail-xml' | 'testrail-csv';
  suites: ImportSuite[];
  /** Parse-time issues. A fatal one leaves `suites` empty. */
  issues: ImportIssue[];
}

export interface FlatCase {
  suite: string;
  sectionPath: string[];
  case: ImportCase;
  /** 1-based document order. */
  index: number;
}

export interface ExistingCase {
  id: Id;
  source_key?: string;
  title: string;
  content?: string;
  /** Priority name (TestBuddy lookup row), not id. */
  priority?: string;
  type?: string;
  refs?: string;
  estimate?: number;
  sectionPath?: string[];
  steps: StepInput[];
  deprecated?: boolean;
}

export interface PlanItem {
  flat: FlatCase;
  existingId?: Id;
  /** Names of the fields that differ (updates only). */
  changes?: string[];
  /** Why the item is a conflict. */
  reason?: string;
  /** Resolved TestBuddy values (create/update). */
  priority?: string;
  type?: string;
}

export interface ImportPlan {
  create: PlanItem[];
  update: PlanItem[];
  unchanged: PlanItem[];
  conflicts: PlanItem[];
  warnings: ImportIssue[];
  summary: { suites: number; sections: number; cases: number };
}
