import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { flattenBundle, mapPriority, mapType, parseCsvRows, parseTestRailCsv, parseTestRailXml, planImport } from './index';
import type { ExistingCase, ImportBundle } from './index';

const fx = (n: string) => readFileSync(join(__dirname, '__fixtures__', n), 'utf8');
const xml = () => parseTestRailXml(fx('account-portal.xml'));
const csv = () => parseTestRailCsv(fx('account-portal.csv'), {}, { suiteName: 'Account Portal' });

/** Pretend the bundle was already imported. */
function asExisting(b: ImportBundle): ExistingCase[] {
  return flattenBundle(b).map((f, i) => ({
    id: `c${i}`, source_key: f.case.sourceKey, title: f.case.title, content: f.case.content, sectionPath: f.sectionPath,
    steps: f.case.steps, priority: mapPriority(f.case.priorityLabel).value, type: mapType(f.case.typeLabel).value, refs: f.case.refs,
  }));
}

describe('TestRail importer', () => {
  it('XML and CSV fixtures parse into the same suites', () => {
    expect(xml().issues).toEqual([]);
    expect(csv().issues).toEqual([]);
    expect(csv().suites.at(0)!.name).toBe(xml().suites.at(0)!.name);
    expect(csv().suites.at(0)!.sections).toEqual(xml().suites.at(0)!.sections); // suite description exists only in XML
  });

  it('builds a nested section hierarchy', () => {
    const login = xml().suites.at(0)!.sections.at(0)!;
    expect(login.name).toBe('Login');
    expect(login.sections.at(0)!.name).toBe('Social');
    expect(login.sections.at(0)!.cases.at(0)!.sourceKey).toBe('C103');
    expect(flattenBundle(csv()).find((f) => f.case.sourceKey === 'C103')?.sectionPath).toEqual(['Login', 'Social']);
  });

  it('handles separated and plain steps', () => {
    const cases = flattenBundle(xml()).map((f) => f.case);
    expect(cases.at(0)!.steps).toEqual([
      { description: 'Open the sign-in page', expected_result: 'The form is shown' },
      { description: 'Enter valid credentials and submit', expected_result: 'The dashboard opens' },
    ]);
    expect(cases.at(1)!.steps).toEqual([{ description: 'Enter the wrong password & submit', expected_result: 'An error is shown' }]);
  });

  it('parses quoted multiline, comma and quote fields (RFC 4180)', () => {
    const rows = parseCsvRows('a,b\r\n"line1\nline2, with comma","say ""hi"""\r\n');
    expect(rows).toEqual([['a', 'b'], ['line1\nline2, with comma', 'say "hi"']]);
    const b = parseTestRailCsv('ID,Title,Steps\n1,"A, B","one\ntwo"\n');
    expect(b.suites.at(0)!.sections.at(0)!.cases.at(0)!).toMatchObject({ sourceKey: 'C1', title: 'A, B', steps: [{ description: 'one\ntwo' }] });
  });

  it('strips a UTF-8 BOM and honours an explicit column mapping', () => {
    expect(fx('account-portal.csv').charCodeAt(0)).toBe(0xfeff);
    expect(csv().suites.at(0)!.sections.at(0)!.cases.at(0)!.sourceKey).toBe('C101');
    const b = parseTestRailCsv('﻿Case No,Summary\n7,Hello\n', { id: 'Case No', title: 'Summary' });
    expect(b.suites.at(0)!.sections.at(0)!.cases.at(0)!).toMatchObject({ sourceKey: 'C7', title: 'Hello' });
  });

  it('reports a missing title column clearly', () => {
    const b = parseTestRailCsv('ID,Foo\n1,x\n');
    expect(b.suites).toEqual([]);
    expect(b.issues.at(0)!.code).toBe('missing_column');
  });

  it('round-trips unicode and entities', () => {
    for (const b of [xml(), csv()]) {
      const c = flattenBundle(b).find((f) => f.case.sourceKey === 'C103')!.case;
      expect(c.title).toBe('Anmeldung über Konto 登录 🙂');
      expect(c.content).toBe('Café “Zoë” account linked.');
      expect(c.steps.at(0)!).toEqual({ description: 'Choose 社交登录', expected_result: 'Redirect works ✓' });
    }
    const esc = parseTestRailCsv('ID,Title\n9,"Use &lt;b&gt; &amp; <i>tags</i>"\n');
    expect(esc.suites.at(0)!.sections.at(0)!.cases.at(0)!.title).toBe('Use <b> & tags');
  });

  it('re-importing the same file plans 0 creates (BR-5)', () => {
    const b = xml();
    const first = planImport(b, []);
    expect(first.create).toHaveLength(4);
    const again = planImport(b, asExisting(b));
    expect(again.create).toHaveLength(0);
    expect(again.update).toHaveLength(0);
    expect(again.unchanged).toHaveLength(4);
    // CSV of the same suite matches the XML-imported cases too.
    expect(planImport(csv(), asExisting(b)).create).toHaveLength(0);
  });

  it('plans an update for a changed title and never mutates input', () => {
    const b = xml();
    const ex = asExisting(b);
    ex.at(3)!.title = 'Old name';
    const snapshot = JSON.stringify([b, ex]);
    const plan = planImport(b, ex);
    expect(plan.update).toHaveLength(1);
    expect(plan.update.at(0)!.changes).toEqual(['title']);
    expect(plan.update.at(0)!.existingId).toBe('c3');
    expect(JSON.stringify([b, ex])).toBe(snapshot);
  });

  it('maps labels and warns on an unknown priority', () => {
    const b = parseTestRailCsv('ID,Title,Priority,Type\n1,A,Must Test,Weird\n2,B,High,Usability\n');
    const plan = planImport(b, []);
    expect(plan.warnings.map((w) => w.code)).toEqual(expect.arrayContaining(['unknown_priority', 'unknown_type']));
    expect(plan.create.at(0)!).toMatchObject({ priority: 'Minor', type: 'Functional' });
    expect(plan.create.at(1)!).toMatchObject({ priority: 'Major', type: 'UI' });
    const ok = planImport(b, [], { priorityOverrides: { 'must test': 'Critical' } });
    expect(ok.create.at(0)!.priority).toBe('Critical');
  });

  it('warns on empty titles, missing keys, duplicate keys and new sections', () => {
    const b = parseTestRailCsv('ID,Title,Section\nC1,,Alpha\n,No key,Alpha\nC2,Dup,Alpha\nC2,Dup again,Alpha\n');
    const plan = planImport(b, [{ id: 'x', source_key: 'Z', title: 't', sectionPath: ['Other'], steps: [] }]);
    const codes = plan.warnings.map((w) => w.code);
    expect(codes).toEqual(expect.arrayContaining(['empty_title', 'no_source_key', 'duplicate_source_key', 'section_created']));
    expect(plan.conflicts).toHaveLength(2);
    expect(plan.create).toHaveLength(2);
  });

  it('gives a clear error for malformed XML instead of throwing', () => {
    const b = parseTestRailXml('<suite><name>Oops</name><sections></suite>');
    expect(b.suites).toEqual([]);
    expect(b.issues.at(0)!).toMatchObject({ severity: 'error', code: 'malformed_xml' });
    expect(b.issues.at(0)!.message).toMatch(/not valid XML/);
    expect(parseTestRailXml('').issues.at(0)!.code).toBe('malformed_xml');
    expect(parseTestRailXml('<html/>').issues.at(0)!.code).toBe('no_suites');
  });
});
