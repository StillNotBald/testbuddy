import type { ImportBundle, ImportCase, ImportIssue, ImportSection, StepInput } from './types';
import { normalizeSourceKey, parseEstimate, toPlainText, toRichText } from './text';

export class CsvSyntaxError extends Error {}

/** RFC 4180 parser: quoted fields, "" escapes, embedded commas/newlines, CRLF/LF/CR, UTF-8 BOM. Returns rows of fields. */
export function parseCsvRows(input: string, delimiter = ','): string[][] {
  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let fieldStarted = false;
  const endField = () => { row.push(field); field = ''; fieldStarted = false; };
  const endRow = () => {
    endField();
    if (!(row.length === 1 && row[0] === '')) rows.push(row); // skip blank lines
    row = [];
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false;
      } else field += c;
    } else if (c === '"' && !fieldStarted) {
      inQuotes = true; fieldStarted = true;
    } else if (c === delimiter) endField();
    else if (c === '\n') endRow();
    else if (c === '\r') { if (text[i + 1] === '\n') i++; endRow(); }
    else { field += c; fieldStarted = true; }
  }
  if (inQuotes) throw new CsvSyntaxError('A quoted field is never closed (missing closing quote).');
  if (field !== '' || row.length > 0) endRow();
  return rows;
}

export type CsvField =
  | 'id' | 'title' | 'section' | 'sectionHierarchy' | 'type' | 'priority' | 'preconditions' | 'steps' | 'expected'
  | 'stepsSeparated' | 'expectedSeparated' | 'refs' | 'estimate';
/** Override: field -> header text (case-insensitive) or 0-based column index. */
export type CsvMapping = Partial<Record<CsvField, string | number>>;

const ALIASES: Record<CsvField, string[]> = {
  id: ['id', 'caseid', 'testcaseid'],
  title: ['title', 'testcasetitle'],
  section: ['section'],
  sectionHierarchy: ['sectionhierarchy', 'sectionpath'],
  type: ['type'],
  priority: ['priority'],
  preconditions: ['preconditions', 'preconds'],
  steps: ['steps'],
  expected: ['expectedresult', 'expected'],
  stepsSeparated: ['stepsseparated', 'stepsstep'],
  expectedSeparated: ['expectedresultseparated', 'stepsexpectedresult'],
  refs: ['references', 'refs'],
  estimate: ['estimate'],
};
const key = (h: string) => h.toLowerCase().replace(/[^a-z0-9]/g, '');

function resolveColumns(header: string[], mapping: CsvMapping): Partial<Record<CsvField, number>> {
  const keys = header.map(key);
  const out: Partial<Record<CsvField, number>> = {};
  (Object.keys(ALIASES) as CsvField[]).forEach((f) => {
    const m = mapping[f];
    if (typeof m === 'number') { out[f] = m; return; }
    const wanted = m !== undefined ? [key(m)] : ALIASES[f];
    const idx = keys.findIndex((k) => wanted.includes(k));
    if (idx >= 0) out[f] = idx;
  });
  return out;
}

const MARK = /^\s*(\d+)[.)]\s+/;
function splitNumbered(text: string): string[] {
  const lines = text.split('\n');
  const parts: string[] = [];
  for (const line of lines) {
    if (MARK.test(line) || parts.length === 0) parts.push(line.replace(MARK, ''));
    else parts[parts.length - 1] += `\n${line}`;
  }
  return parts.map((p) => p.trim()).filter((p) => p !== '' || parts.length === 1);
}

function buildSteps(c: (f: CsvField) => string): StepInput[] {
  const sep = toRichText(c('stepsSeparated'));
  const sepExp = toRichText(c('expectedSeparated') || (c('stepsSeparated') ? c('expected') : ''));
  if (sep) {
    const descs = splitNumbered(sep);
    const exps = sepExp ? splitNumbered(sepExp) : [];
    return descs.map((d, i) => {
      // Expected results align by position when counts match; otherwise they all attach to the last step.
      const e = exps.length === descs.length ? exps[i] : i === descs.length - 1 ? exps.join('\n') : '';
      return { description: toPlainText(d), expected_result: e ? toPlainText(e) : undefined };
    });
  }
  const plain = toRichText(c('steps'));
  const exp = toRichText(c('expected'));
  if (!plain && !exp) return [];
  return [{ description: toPlainText(plain), expected_result: exp ? toPlainText(exp) : undefined }];
}

export function parseTestRailCsv(csv: string, mapping: CsvMapping = {}, options: { suiteName?: string; delimiter?: string } = {}): ImportBundle {
  const suiteName = options.suiteName ?? 'Imported from TestRail';
  const fail = (code: ImportIssue['code'], message: string): ImportBundle => ({ format: 'testrail-csv', suites: [], issues: [{ severity: 'error', code, message }] });
  let rows: string[][];
  try {
    rows = parseCsvRows(csv, options.delimiter);
  } catch (e) {
    return fail('malformed_csv', e instanceof Error ? e.message : 'The CSV could not be read.');
  }
  if (rows.length === 0) return fail('malformed_csv', 'The CSV file is empty.');
  const header = rows[0] ?? [];
  const cols = resolveColumns(header, mapping);
  if (cols.title === undefined) {
    return fail('missing_column', `No "Title" column found. Headers seen: ${header.join(', ')}. Pass a column mapping to choose one.`);
  }

  const root: ImportSection[] = [];
  const issues: ImportIssue[] = [];
  const place = (path: string[]): ImportSection => {
    let level = root;
    let node!: ImportSection;
    for (const name of path) {
      let next = level.find((s) => s.name === name);
      if (!next) { next = { name, cases: [], sections: [] }; level.push(next); }
      node = next; level = next.sections;
    }
    return node;
  };

  rows.slice(1).forEach((r) => {
    const c = (f: CsvField) => (cols[f] === undefined ? '' : r[cols[f] as number] ?? '');
    const hier = c('sectionHierarchy').split('>').map((s) => toPlainText(s)).filter(Boolean);
    const single = toPlainText(c('section'));
    const path = hier.length ? hier : single ? [single] : ['Imported'];
    const item: ImportCase = {
      sourceKey: normalizeSourceKey(c('id')),
      title: toPlainText(c('title')),
      content: toRichText(c('preconditions')),
      priorityLabel: c('priority').trim() || undefined,
      typeLabel: c('type').trim() || undefined,
      refs: c('refs').trim() || undefined,
      estimate: parseEstimate(c('estimate')),
      steps: buildSteps(c),
    };
    place(path).cases.push(item);
  });
  return { format: 'testrail-csv', suites: [{ name: suiteName, sections: root }], issues };
}
