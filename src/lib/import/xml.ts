import type { ImportBundle, ImportCase, ImportIssue, ImportSection, ImportSuite, StepInput } from './types';
import { normalizeSourceKey, parseEstimate, toPlainText, toRichText } from './text';

const kids = (el: Element, name: string): Element[] => Array.from(el.children).filter((c) => c.localName === name);
const kid = (el: Element | undefined, name: string): Element | undefined => (el ? kids(el, name)[0] : undefined);
const txt = (el: Element | undefined): string => el?.textContent ?? '';

function parseCase(el: Element): ImportCase {
  // TestRail nests template fields under <custom>; tolerate them directly on <case> too.
  const custom = kid(el, 'custom');
  const field = (n: string) => kid(custom, n) ?? kid(el, n);

  const steps: StepInput[] = [];
  const sepRoot = field('steps_separated');
  for (const s of sepRoot ? kids(sepRoot, 'step') : []) {
    const description = toPlainText(txt(kid(s, 'content')));
    const expected = toPlainText(txt(kid(s, 'expected')));
    if (description || expected) steps.push({ description, expected_result: expected || undefined });
  }
  if (steps.length === 0) {
    const description = toPlainText(txt(field('steps')));
    const expected = toPlainText(txt(field('expected')));
    if (description || expected) steps.push({ description, expected_result: expected || undefined });
  }
  return {
    sourceKey: normalizeSourceKey(txt(kid(el, 'id'))),
    title: toPlainText(txt(kid(el, 'title'))),
    content: toRichText(txt(field('preconds'))),
    priorityLabel: txt(kid(el, 'priority')).trim() || undefined,
    typeLabel: txt(kid(el, 'type')).trim() || undefined,
    refs: txt(kid(el, 'references')).trim() || undefined,
    estimate: parseEstimate(txt(kid(el, 'estimate'))),
    steps,
  };
}

function parseSection(el: Element): ImportSection {
  return {
    name: toPlainText(txt(kid(el, 'name'))),
    cases: kids(kid(el, 'cases') ?? el, 'case').map(parseCase),
    sections: kids(kid(el, 'sections') ?? el, 'section').map(parseSection),
  };
}

function parseSuite(el: Element): ImportSuite {
  const desc = toPlainText(txt(kid(el, 'description')));
  return {
    name: toPlainText(txt(kid(el, 'name'))) || 'Imported from TestRail',
    description: desc || undefined,
    sections: kids(kid(el, 'sections') ?? el, 'section').map(parseSection),
  };
}

/** Parses a TestRail suite XML export. Never throws on bad input: problems come back in `issues`. */
export function parseTestRailXml(xml: string): ImportBundle {
  const fail = (code: ImportIssue['code'], message: string): ImportBundle => ({ format: 'testrail-xml', suites: [], issues: [{ severity: 'error', code, message }] });
  if (!xml.trim()) return fail('malformed_xml', 'The XML file is empty.');
  let doc: Document;
  try {
    doc = new DOMParser().parseFromString(xml.charCodeAt(0) === 0xfeff ? xml.slice(1) : xml, 'application/xml');
  } catch (e) {
    return fail('malformed_xml', `The XML could not be read: ${e instanceof Error ? e.message : 'unknown error'}.`);
  }
  const bad = doc.getElementsByTagName('parsererror')[0];
  if (bad) {
    const detail = (bad.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 200);
    return fail('malformed_xml', `The file is not valid XML. ${detail}`);
  }
  const root = doc.documentElement;
  const suiteEls = root.localName === 'suite' ? [root] : kids(root, 'suite');
  if (suiteEls.length === 0) {
    return fail('no_suites', `Expected a TestRail <suite> export but the root element is <${root.localName}>.`);
  }
  return { format: 'testrail-xml', suites: suiteEls.map(parseSuite), issues: [] };
}
