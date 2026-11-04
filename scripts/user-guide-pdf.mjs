#!/usr/bin/env node
/**
 * TestBuddy user guide: Markdown chapters + screenshots -> one print-styled HTML -> A4 PDF.
 *
 *   node scripts/user-guide-pdf.mjs            render docs/user-guide/*.md to dist/TestBuddy-User-Guide.{html,pdf}
 *   node scripts/user-guide-pdf.mjs --shots    first capture the screenshots listed in docs/user-guide/screenshots.json
 *                                              by visiting each route on BASE_URL (default: baseUrl in the config)
 *   node scripts/user-guide-pdf.mjs --html     write the HTML only (no browser needed)
 *
 * Needs Playwright with chromium for --shots and the PDF (`npx playwright install chromium`). It never builds or
 * starts the app; for --shots start it yourself and pass BASE_URL.
 *
 * Config: docs/user-guide/screenshots.json (chapters in print order, route -> screenshot list).
 * Images in the Markdown: `![alt](img/name.png)` or a path into testing-log with a '*' folder segment, which resolves
 * to the newest matching folder. A missing image prints a "screenshot pending" box instead of failing.
 * Output: docs/user-guide/dist/TestBuddy-User-Guide.pdf (A4, light theme, header and footer with page numbers,
 * table of contents).
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'docs', 'user-guide');
const DIST = join(DIR, 'dist');
const cfg = JSON.parse(readFileSync(join(DIR, 'screenshots.json'), 'utf8'));
const args = new Set(process.argv.slice(2));
const BASE = (process.env.BASE_URL ?? cfg.baseUrl).replace(/\/$/, '');

/* ---------- screenshots ---------- */
async function captureShots() {
  const { chromium } = await import('@playwright/test');
  mkdirSync(join(DIR, 'img'), { recursive: true });
  const browser = await chromium.launch();
  try {
    for (const signedOut of [true, false]) {
      const shots = cfg.shots.filter((s) => !!s.signedOut === signedOut);
      if (!shots.length) continue;
      const ctx = await browser.newContext({ viewport: cfg.viewport, colorScheme: 'light', reducedMotion: 'reduce' });
      const page = await ctx.newPage();
      if (!signedOut) {
        await page.goto(`${BASE}/sign-in`, { waitUntil: 'networkidle' });
        await page.getByRole('button', { name: new RegExp(`Sign in as ${cfg.signInAs}`) }).click();
        await page.waitForURL((u) => !u.pathname.startsWith('/sign-in'));
      }
      for (const s of shots) {
        const route = s.route.replace('{projectId}', cfg.projectId);
        await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' });
        if (s.waitFor) await page.locator(s.waitFor).first().waitFor({ timeout: 10_000 });
        await page.screenshot({ path: join(DIR, 'img', s.file), fullPage: !!s.fullPage });
        console.log(`shot ${s.file}  <-  ${route}`);
      }
      await ctx.close();
    }
  } finally {
    await browser.close();
  }
}

/* ---------- Markdown (small subset: headings, paragraphs, lists, tables, code, quotes, images, links) ---------- */
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const slug = (s) => s.toLowerCase().replace(/<[^>]+>/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function resolveImage(src) {
  if (/^https?:|^data:/.test(src)) return src;
  const parts = src.split('/');
  let cur = DIR;
  for (let i = 0; i < parts.length; i += 1) {
    const part = parts[i];
    if (part.includes('*')) {
      const re = new RegExp(`^${part.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`);
      const hit = readdirSync(cur).filter((n) => re.test(n)).sort().pop();
      if (!hit) return null;
      cur = join(cur, hit);
    } else {
      cur = resolve(cur, part);
    }
  }
  return existsSync(cur) ? cur : null;
}
function dataUri(file) {
  const type = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml' }[extname(file).toLowerCase()] ?? 'application/octet-stream';
  return `data:${type};base64,${readFileSync(file).toString('base64')}`;
}

function inline(s) {
  const codes = [];
  s = s.replace(/`([^`]+)`/g, (_, c) => { codes.push(c); return `\u0000${codes.length - 1}\u0000`; });
  s = esc(s);
  s = s.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, src) => {
    const file = resolveImage(src.trim());
    return file
      ? `<figure><img src="${file.startsWith('data:') || /^https?:/.test(file) ? file : dataUri(file)}" alt="${alt}"><figcaption>${alt}</figcaption></figure>`
      : `<figure class="pending"><div>Screenshot pending: ${alt || src}</div><figcaption>${alt}</figcaption></figure>`;
  });
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${esc(codes[Number(i)])}</code>`);
}

function renderMarkdown(md, chapterId, toc) {
  const lines = md.replace(/\r/g, '').split('\n');
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i += 1; continue; }
    let m;
    if ((m = line.match(/^(#{1,3})\s+(.*)$/))) {
      const level = m[1].length;
      const id = `${chapterId}-${slug(m[2])}`;
      if (level <= 2) toc.push({ level, id, text: m[2].replace(/`/g, '') });
      out.push(`<h${level} id="${id}"${level === 1 ? ' class="chapter"' : ''}>${inline(m[2])}</h${level}>`);
      i += 1;
    } else if (line.startsWith('```')) {
      const buf = [];
      i += 1;
      while (i < lines.length && !lines[i].startsWith('```')) { buf.push(lines[i]); i += 1; }
      i += 1;
      out.push(`<pre><code>${esc(buf.join('\n'))}</code></pre>`);
    } else if (line.startsWith('>')) {
      const buf = [];
      while (i < lines.length && lines[i].startsWith('>')) { buf.push(lines[i].replace(/^>\s?/, '')); i += 1; }
      const text = buf.join(' ');
      out.push(`<blockquote${/^DRAFT/.test(text) ? ' class="draft"' : ''}>${inline(text)}</blockquote>`);
    } else if (line.startsWith('|')) {
      const rows = [];
      while (i < lines.length && lines[i].startsWith('|')) { rows.push(lines[i]); i += 1; }
      const cells = (r) => r.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      const head = cells(rows[0]);
      const body = rows.slice(2).map(cells);
      out.push(`<table><thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>${body.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`);
    } else if (/^\s*(\d+\.|-)\s+/.test(line)) {
      const ordered = /^\s*\d+\./.test(line);
      const items = [];
      while (i < lines.length && /^\s*(\d+\.|-)\s+/.test(lines[i])) { items.push(lines[i].replace(/^\s*(\d+\.|-)\s+/, '')); i += 1; }
      const tag = ordered ? 'ol' : 'ul';
      out.push(`<${tag}>${items.map((t) => `<li>${inline(t)}</li>`).join('')}</${tag}>`);
    } else if (/^!\[/.test(line.trim())) {
      out.push(inline(line.trim()));
      i += 1;
    } else {
      const buf = [];
      while (i < lines.length && lines[i].trim() && !/^(#{1,3}\s|```|>|\||\s*(\d+\.|-)\s)/.test(lines[i])) { buf.push(lines[i]); i += 1; }
      out.push(`<p>${inline(buf.join(' '))}</p>`);
    }
  }
  return out.join('\n');
}

const CSS = `
@page { size: A4; margin: 22mm 18mm 20mm; }
:root { color-scheme: light; --ink:#1b2430; --muted:#5b6675; --line:#d5dbe3; --accent:#1f5fbf; --tint:#f3f6fa; }
* { box-sizing: border-box; }
body { font: 10.5pt/1.55 -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: var(--ink); background: #fff; margin: 0; }
h1, h2, h3 { line-height: 1.25; break-after: avoid; }
h1.chapter { font-size: 22pt; margin: 0 0 6mm; padding-bottom: 3mm; border-bottom: 2px solid var(--accent); }
section.chapter { break-before: page; }
h2 { font-size: 14pt; margin: 8mm 0 3mm; } h3 { font-size: 11.5pt; margin: 5mm 0 2mm; }
p, ul, ol { margin: 0 0 3mm; } li { margin: 0 0 1mm; }
code { font: 9.5pt ui-monospace, Menlo, Consolas, monospace; background: var(--tint); border: 1px solid var(--line); border-radius: 3px; padding: 0 3px; }
pre { background: var(--tint); border: 1px solid var(--line); border-radius: 4px; padding: 3mm; overflow: hidden; white-space: pre-wrap; break-inside: avoid; }
pre code { border: 0; padding: 0; background: none; }
table { border-collapse: collapse; width: 100%; margin: 0 0 4mm; break-inside: avoid; font-size: 9.5pt; }
th, td { border: 1px solid var(--line); padding: 1.5mm 2.5mm; text-align: left; vertical-align: top; } th { background: var(--tint); }
blockquote { margin: 0 0 4mm; padding: 2.5mm 4mm; border-left: 3px solid var(--accent); background: var(--tint); color: var(--muted); }
blockquote.draft { border-left-color: #b45309; background: #fff7ed; color: #7c2d12; }
figure { margin: 3mm 0 5mm; break-inside: avoid; text-align: center; }
figure img { max-width: 100%; max-height: 110mm; border: 1px solid var(--line); border-radius: 4px; }
figure.pending div { border: 1.5px dashed var(--line); color: var(--muted); padding: 14mm 4mm; border-radius: 4px; background: var(--tint); }
figcaption { font-size: 9pt; color: var(--muted); margin-top: 1.5mm; }
a { color: var(--accent); text-decoration: none; }
.cover { height: 235mm; display: flex; flex-direction: column; justify-content: center; }
.cover h1 { font-size: 34pt; margin: 0 0 4mm; } .cover p { font-size: 13pt; color: var(--muted); }
.cover .draft-tag { display: inline-block; margin-top: 8mm; padding: 1mm 3mm; border: 1px solid #b45309; color: #7c2d12; background: #fff7ed; font-size: 10pt; border-radius: 3px; width: fit-content; }
nav.toc { break-before: page; } nav.toc h1 { font-size: 20pt; }
nav.toc ol { list-style: none; padding: 0; } nav.toc li.l1 { font-weight: 600; margin-top: 3mm; } nav.toc li.l2 { margin-left: 6mm; font-weight: 400; }
`;

function buildHtml() {
  const toc = [];
  const chapters = cfg.chapters.map((file, n) => {
    const id = `c${n + 1}`;
    const md = readFileSync(join(DIR, file), 'utf8');
    return `<section class="chapter">${renderMarkdown(md, id, toc)}</section>`;
  });
  const hasDraft = cfg.chapters.some((f) => /DRAFT/.test(readFileSync(join(DIR, f), 'utf8')));
  const date = new Date().toISOString().slice(0, 10);
  const tocHtml = `<nav class="toc"><h1>Contents</h1><ol>${toc.map((t) => `<li class="l${t.level}"><a href="#${t.id}">${esc(t.text)}</a></li>`).join('')}</ol></nav>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>TestBuddy user guide</title><style>${CSS}</style></head><body>
<div class="cover"><h1>TestBuddy user guide</h1><p>Write test cases, run test cycles, record results and see how a release is going.</p><p>${date}</p>${hasDraft ? '<span class="draft-tag">DRAFT: screens are placeholders</span>' : ''}</div>
${tocHtml}
${chapters.join('\n')}
</body></html>`;
}

/* ---------- main ---------- */
if (args.has('--shots')) await captureShots();
const html = buildHtml();
mkdirSync(DIST, { recursive: true });
const htmlPath = join(DIST, 'TestBuddy-User-Guide.html');
writeFileSync(htmlPath, html);
console.log(`wrote ${htmlPath}`);
if (args.has('--html')) process.exit(0);

let chromium;
try {
  ({ chromium } = await import('@playwright/test'));
} catch {
  console.error('Playwright is not installed. Run npm install, then `npx playwright install chromium`.');
  process.exit(1);
}
let browser;
try {
  browser = await chromium.launch();
} catch (e) {
  console.error(`Could not start chromium (${String(e.message).split('\n')[0]}). Run \`npx playwright install chromium\`, then re-run.`);
  process.exit(1);
}
try {
  const page = await browser.newPage();
  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'load' });
  await page.emulateMedia({ media: 'print', colorScheme: 'light' });
  const pdfPath = join(DIST, 'TestBuddy-User-Guide.pdf');
  const bar = 'style="font-family: Helvetica, Arial, sans-serif; font-size: 8px; color: #5b6675; width: 100%; padding: 0 18mm;"';
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    displayHeaderFooter: true,
    margin: { top: '22mm', bottom: '20mm', left: '18mm', right: '18mm' },
    headerTemplate: `<div ${bar}><span>TestBuddy user guide</span></div>`,
    footerTemplate: `<div ${bar}><span style="float:right">Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div>`,
  });
  console.log(`wrote ${pdfPath}`);
} finally {
  await browser.close();
}
