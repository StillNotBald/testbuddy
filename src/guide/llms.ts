import { guide } from './guide.content';
import { ALL_PATH } from './tour/model';
import type { TourContent } from './tour/types';

const SUMMARY = 'TestBuddy is an open-source test management app: write test cases, run test cycles, record results and see how a release is going.';

export type LlmsFiles = { 'llms.txt': string; 'llms-full.txt': string };

/**
 * /llms.txt and /llms-full.txt, generated from the same content as the in-app tour and the How it works page.
 * Links are site-relative paths, so they work on any host.
 */
export function llmsFiles(content: TourContent = guide): LlmsFiles {
  return {
    'llms.txt': short(content),
    'llms-full.txt': full(content),
  };
}

function short(c: TourContent): string {
  const lines = [
    `# ${c.title}`,
    '',
    `> ${SUMMARY}`,
    '',
    'Full text: /llms-full.txt',
    '',
    '## Guide goals',
    ...c.goals.map((g) => `- ${g.label}: ${g.hint}`),
    '',
    '## Screens',
    ...Object.values(c.screens).map((s) => `- ${s.label}: ${s.href}`),
    '',
    '## How it works',
    `- ${c.screens[c.howItWorks.screen]?.label ?? 'How it works'}: ${c.screens[c.howItWorks.screen]?.href ?? '/how-it-works'}`,
    '',
  ];
  return lines.join('\n');
}

function full(c: TourContent): string {
  const h = c.howItWorks;
  const lines: string[] = [`# ${c.title}`, '', h.lead, ''];

  lines.push('## Flow');
  h.flow.forEach((f, i) => lines.push(`${i + 1}. ${f.title} (${f.who === 'you' ? 'you' : 'system'}): ${f.body}`));
  lines.push('');

  lines.push('## Topics');
  for (const t of h.topics) {
    lines.push(`### ${t.title}`, t.summary, ...t.detail.map((d) => `- ${d}`), `Code: ${t.codeRef}`, '');
  }

  lines.push('## Use cases');
  for (const u of h.useCases) lines.push(`- ${u.title} (${u.who}): ${u.value}`);
  lines.push('');

  lines.push('## Glossary');
  for (const g of h.glossary) lines.push(`- ${g.term}: ${g.plain}`);
  lines.push('');

  lines.push('## Guide goals and steps');
  for (const g of c.goals) {
    lines.push(`### ${g.label}`, g.hint);
    const ids = c.paths[g.id] ?? [];
    ids.forEach((id, i) => {
      const s = c.steps[id];
      if (s) lines.push(`${i + 1}. ${s.title} (${c.screens[s.screen]?.href ?? s.screen}): ${s.text}`);
    });
    lines.push('');
  }
  lines.push('## Everything');
  (c.paths[ALL_PATH] ?? []).forEach((id, i) => {
    const s = c.steps[id];
    if (s) lines.push(`${i + 1}. ${s.title} (${c.screens[s.screen]?.href ?? s.screen}): ${s.text}`);
  });
  lines.push('');

  if (h.notes.length) {
    lines.push('## Notes', ...h.notes.map((n) => `- ${n}`), '');
  }
  return lines.join('\n');
}

export function textResponse(body: string, type = 'text/plain'): Response {
  return new Response(body, { headers: { 'content-type': `${type}; charset=utf-8` } });
}
