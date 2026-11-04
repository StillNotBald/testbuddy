/**
 * TestRail case importer (pure functions; no React, no service calls).
 *
 * Scope: TestRail's EXPORT FILE formats (suite XML, CSV) as a data import only. No API/wire compatibility.
 * Cases only in v1 (R-112: results history is not imported).
 *
 * Decisions
 * - source_key = TestRail case id normalised to "C<digits>" ("123" and "c123" become "C123"). Re-import
 *   matches on it, so the same file plans 0 creates (BR-5). Cases without an id always plan as create, with a warning.
 * - Field mapping: title -> title; preconditions -> content; priority/type labels -> TestBuddy lookup NAMES via
 *   ./mapping (Critical/High/Medium/Low -> Critical/Major/Minor/Trivial; Smoke & Sanity -> Smoke, Usability -> UI ...).
 *   Unknown labels map to a default (Minor / Functional) with a warning. Empty labels stay unset.
 * - Steps: <steps_separated> (or CSV "Steps (Separated)" with "1." markers) gives one step per entry; otherwise the
 *   plain <steps>/<expected> become a single step.
 * - Character safety: Unicode is never altered. title and step description/expected_result are plain text in
 *   TestBuddy, so HTML tags and light markdown are stripped there (block tags become newlines, tags are removed
 *   BEFORE entities are decoded so "&lt;b&gt;" stays the literal "<b>"). `content` is a rich-text field and is
 *   kept as written (only newlines and outer whitespace are normalised).
 * - Parsers never throw on bad input; they return an empty bundle with an error in `issues`.
 * - planImport is a pure dry run: create / update / unchanged / conflicts plus warnings.
 */
export * from './types';
export { parseTestRailXml } from './xml';
export { parseTestRailCsv, parseCsvRows } from './csv';
export type { CsvMapping, CsvField } from './csv';
export { planImport, flattenBundle } from './plan';
export type { PlanOptions } from './plan';
export { mapPriority, mapType, PRIORITY_MAP, TYPE_MAP, DEFAULT_PRIORITY, DEFAULT_TYPE } from './mapping';
