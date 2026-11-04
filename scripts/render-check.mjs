#!/usr/bin/env node
/**
 * TestBuddy render check. Visits every route in scripts/render-routes.json at phone (390x844)
 * and desktop (1440x900), in light and dark theme, signed in through the demo picker as the
 * route's role. Per page: console errors, page errors, failed requests, HTTP >= 400, horizontal
 * overflow, clipped buttons, axe-core scan (serious/critical), screenshot.
 *
 * It NEVER builds or starts the app. Start it yourself:  npm run build && npm run start:standalone
 *
 * Env:  BASE_URL (default http://127.0.0.1:3100)   ROUTES=substring filter   SAVE_DARK=1 also saves dark shots
 *       A11Y_FAIL=0 reports axe violations without failing the run
 * Output: testing-log/<YYYY-MM-DD>_render-check-<sha7>/{README.md,screenshots/*.jpg}
 * Exit 1 on any console/page error, overflow, clipped button, failed/4xx-5xx request or axe serious/critical.
 */
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdirSync, readFileSync, existsSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = (process.env.BASE_URL ?? 'http://127.0.0.1:3100').replace(/\/$/, '');
const SAVE_DARK = process.env.SAVE_DARK === '1';
const A11Y_FAIL = process.env.A11Y_FAIL !== '0';
const cfg = JSON.parse(readFileSync(join(ROOT, 'scripts/render-routes.json'), 'utf8'));
const routes = cfg.routes.filter((r) => !process.env.ROUTES || r.path.includes(process.env.ROUTES));
const VIEWPORTS = [{ name: 'phone', width: 390, height: 844 }, { name: 'desktop', width: 1440, height: 900 }];
const THEMES = ['light', 'dark'];

function sha7() {
  try {
    const head = readFileSync(join(ROOT, '.git/HEAD'), 'utf8').trim();
    if (!head.startsWith('ref: ')) return head.slice(0, 7);
    const ref = head.slice(5);
    const f = join(ROOT, '.git', ref);
    if (existsSync(f)) return readFileSync(f, 'utf8').trim().slice(0, 7);
    const packed = readFileSync(join(ROOT, '.git/packed-refs'), 'utf8').split('\n').find((l) => l.endsWith(` ${ref}`));
    return packed ? packed.slice(0, 7) : 'nogit';
  } catch { return 'nogit'; }
}
const date = new Date().toISOString().slice(0, 10);
const SHA = sha7(); // read once so the folder name and the report agree even if HEAD moves mid-run
let outDir = join(ROOT, 'testing-log', `${date}_render-check-${SHA}`);
for (let n = 2; existsSync(outDir); n++) outDir = join(ROOT, 'testing-log', `${date}_render-check-${SHA}-${n}`);
const shotDir = join(outDir, 'screenshots');
mkdirSync(shotDir, { recursive: true });

const slug = (p) => (p === '/' ? 'root' : p.replace(/^\//, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/-$/, ''));

async function signIn(page, name) {
  await page.goto(`${BASE}/sign-in`, { waitUntil: 'load' });
  await page.getByRole('button', { name: new RegExp(`Sign in as ${name}`) }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/sign-in'), { timeout: 15_000 });
}

/** Measure overflow and clipped controls inside the page. */
const measure = () => {
  const vw = document.documentElement.clientWidth;
  const doc = document.documentElement;
  const overflowX = Math.max(doc.scrollWidth, document.body.scrollWidth) - vw;
  const label = (el) => (el.getAttribute('aria-label') || el.textContent || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 40);
  const clipped = [];
  for (const el of document.querySelectorAll('button, a[href], [role="button"], input, select')) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    if (el.closest('.sr-only, [aria-hidden="true"]') || /sr-only/.test(el.className)) continue;
    // Off-screen horizontally (only count if not inside a horizontally scrollable ancestor).
    let scrollable = false;
    for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
      const o = getComputedStyle(a).overflowX;
      if ((o === 'auto' || o === 'scroll') && a.scrollWidth > a.clientWidth) { scrollable = true; break; }
    }
    if (!scrollable && (r.right > vw + 1 || r.left < -1)) clipped.push(`${label(el)} (off-screen: ${Math.round(r.left)}..${Math.round(r.right)} of ${vw})`);
    // Label text cut off by the control's own overflow.
    else if (el.tagName !== 'INPUT' && el.tagName !== 'SELECT' && el.scrollWidth > el.clientWidth + 1 && ['hidden', 'clip'].includes(cs.overflowX) && cs.textOverflow !== 'ellipsis') clipped.push(`${label(el)} (text clipped ${el.scrollWidth}>${el.clientWidth})`);
  }
  return { overflowX, clipped: clipped.slice(0, 8) };
};

const results = [];
const browser = await chromium.launch();
try {
  // One context per (role, viewport, theme): sign in once, then visit its routes.
  const groups = new Map();
  for (const r of routes) {
    const role = r.signIn ? r.role : 'anon';
    if (!groups.has(role)) groups.set(role, []);
    groups.get(role).push(r);
  }
  for (const vp of VIEWPORTS) for (const theme of THEMES) for (const [role, list] of groups) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, colorScheme: theme, reducedMotion: 'reduce' });
    await ctx.addInitScript((t) => { try { localStorage.setItem('theme', t); } catch { /* ignore */ } }, theme);
    try {
      if (role !== 'anon') {
        const who = cfg.roles[role];
        const p = await ctx.newPage();
        try { await signIn(p, who); } catch (e) { for (const r of list) results.push({ r, vp, theme, role, fatal: `sign-in as ${who} failed: ${e.message.split('\n')[0]}` }); await p.close(); continue; }
        await p.close();
      }
      for (const r of list) {
        const page = await ctx.newPage();
        const rec = { r, vp, theme, role, console: [], pageErrors: [], failedReqs: [], httpErrors: [], overflowX: 0, clipped: [], axe: [] };
        page.on('console', (m) => {
          if (m.type() !== 'error') return;
          // The browser logs the document's own 404 as a console error; expected on the not-found route.
          if (r.expectStatus && m.text().includes(`status of ${r.expectStatus}`)) return;
          rec.console.push(m.text().slice(0, 200));
        });
        page.on('pageerror', (e) => rec.pageErrors.push(String(e.message).slice(0, 200)));
        page.on('requestfailed', (q) => { const f = q.failure()?.errorText ?? ''; if (!/ERR_ABORTED/.test(f)) rec.failedReqs.push(`${q.method()} ${q.url().replace(BASE, '')} ${f}`); });
        page.on('response', (res) => {
          if (res.status() < 400) return;
          const isDoc = res.request().resourceType() === 'document' && res.url() === `${BASE}${r.path}`;
          if (isDoc && r.expectStatus === res.status()) return;
          rec.httpErrors.push(`${res.status()} ${res.url().replace(BASE, '')}`);
        });
        try {
          await page.goto(`${BASE}${r.path}`, { waitUntil: 'load', timeout: 30_000 });
          await page.waitForSelector('h1, h2, [role="alert"]', { timeout: 15_000 }).catch(() => {});
          await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {});
          await page.waitForTimeout(500);
          const m = await page.evaluate(measure);
          rec.overflowX = m.overflowX; rec.clipped = m.clipped;
          const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
          rec.axe = axe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
            .map((v) => ({ id: v.id, impact: v.impact, count: v.nodes.length, target: String(v.nodes[0]?.target ?? '').slice(0, 80) }));
          if (theme === 'light' || SAVE_DARK) {
            rec.shot = `${slug(r.path)}__${r.signIn ? r.role : 'anon'}__${vp.name}${theme === 'dark' ? '__dark' : ''}.jpg`;
            await page.screenshot({ path: join(shotDir, rec.shot), type: 'jpeg', quality: 70, fullPage: false });
          }
        } catch (e) { rec.fatal = e.message.split('\n')[0]; }
        results.push(rec);
        await page.close();
      }
    } finally { await ctx.close(); }
  }
} finally { await browser.close(); }

// ---- report ---------------------------------------------------------------------------------
const hardFails = (x) => [
  ...(x.fatal ? [`fatal: ${x.fatal}`] : []),
  ...(x.console ?? []).map((c) => `console error: ${c}`),
  ...(x.pageErrors ?? []).map((c) => `page error: ${c}`),
  ...(x.failedReqs ?? []).map((c) => `request failed: ${c}`),
  ...(x.httpErrors ?? []).map((c) => `HTTP: ${c}`),
  ...((x.overflowX ?? 0) > 1 ? [`horizontal overflow: ${x.overflowX}px`] : []),
  ...(x.clipped ?? []).map((c) => `clipped button: ${c}`),
  ...(A11Y_FAIL ? (x.axe ?? []).map((a) => `a11y ${a.impact} ${a.id} x${a.count} (${a.target})`) : []),
];
const failing = results.filter((x) => hardFails(x).length);
const shots = readdirSync(shotDir).reduce((n, f) => n + statSync(join(shotDir, f)).size, 0);
const key = (x) => `${x.r.path} [${x.r.signIn ? x.r.role : 'anon'}]`;
const cell = (x) => (hardFails(x).length ? `FAIL(${hardFails(x).length})` : 'ok');
const rows = [...new Set(results.map(key))].map((k) => {
  const c = (vp, th) => { const x = results.find((y) => key(y) === k && y.vp.name === vp && y.theme === th); return x ? cell(x) : '-'; };
  return `| \`${k}\` | ${c('phone', 'light')} | ${c('phone', 'dark')} | ${c('desktop', 'light')} | ${c('desktop', 'dark')} |`;
});
const axeAll = results.reduce((n, x) => n + (x.axe?.length ?? 0), 0);
const md = [
  `# Render check ${date} (${SHA})`,
  '',
  `- Command: \`BASE_URL=${BASE} npm run render:check\``,
  `- Operator: scripts/render-check.mjs (Playwright chromium); app not rebuilt by this run`,
  `- Matrix: ${routes.length} route entries x 2 viewports (390x844, 1440x900) x 2 themes = ${results.length} page checks`,
  `- Checks: console errors, page errors, failed requests, HTTP >= 400, horizontal overflow, clipped buttons, axe-core wcag2a/2aa/21aa serious+critical`,
  `- Result: **${failing.length ? 'FAIL' : 'PASS'}** - ${results.length - failing.length} ok, ${failing.length} with failures (${axeAll} axe serious/critical rule hits${A11Y_FAIL ? '' : ', not counted as failures'})`,
  `- Screenshots: ${readdirSync(shotDir).length} files, ${(shots / 1048576).toFixed(1)} MB (light theme only unless SAVE_DARK=1; dark is checked, not saved)`,
  '',
  '## Summary',
  '',
  '| Route [role] | phone light | phone dark | desktop light | desktop dark |',
  '|---|---|---|---|---|',
  ...rows,
  '',
  '## Failures',
  '',
  ...(failing.length ? failing.flatMap((x) => [`### ${key(x)} - ${x.vp.name} ${x.theme}`, ...[...new Set(hardFails(x))].map((f) => `- ${f}`), ...(x.shot ? [`- screenshot: screenshots/${x.shot}`] : []), '']) : ['None.', '']),
].join('\n');
writeFileSync(join(outDir, 'README.md'), md);
console.log(`render-check: ${results.length - failing.length}/${results.length} ok, ${failing.length} failing, shots ${(shots / 1048576).toFixed(1)} MB`);
console.log(`report: ${outDir}/README.md`);
process.exit(failing.length ? 1 : 0);
