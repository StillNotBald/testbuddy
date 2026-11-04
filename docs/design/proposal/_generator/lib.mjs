// Shared helpers for the TestBuddy mockup generator. Output is plain static HTML.
export const ICONS = {
  passed: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
  failed: '<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6M15 9l-6 6"/>',
  blocked: '<circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/>',
  retest: '<path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 4v5h-5"/>',
  untested: '<circle cx="12" cy="12" r="9" stroke-dasharray="3.2 3.2"/>',
  p1: '<path d="m6 11 6-6 6 6"/><path d="m6 18 6-6 6 6"/>',
  p2: '<path d="m6 15 6-6 6 6"/>',
  p3: '<path d="M6 12h12"/>',
  p4: '<path d="m6 9 6 6 6-6"/>',
  home: '<path d="M4 11 12 4l8 7v9H4z"/><path d="M10 20v-6h4v6"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
  play: '<path d="M7 4l13 8-13 8z"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  zap: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  users: '<path d="M16 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1"/><circle cx="9.5" cy="7.5" r="3.5"/><path d="M21 20v-1a4 4 0 0 0-3-3.9M16 4.1a3.5 3.5 0 0 1 0 6.8"/>',
  file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
  sliders: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  right: '<path d="m9 6 6 6-6 6"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 17h.01"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  clip: '<path d="m20 11-8.5 8.5a5 5 0 0 1-7-7L13 4a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 0 1-3-3L14 7"/>',
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',
  alert: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h.01"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
  download: '<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h8"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  archive: '<rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v10h14V9M10 13h4"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  phone: '<rect x="7" y="2.5" width="10" height="19" rx="2"/><path d="M11 18h2"/>',
  check: '<path d="m5 12 4 4 10-10"/>',
  bot: '<rect x="4" y="8" width="16" height="11" rx="3"/><path d="M12 4v4M9 13h.01M15 13h.01"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  upload: '<path d="M12 16V5M7 9l5-5 5 5M5 20h14"/>',
  sparkle: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  more: '<path d="M5 12h.01M12 12h.01M19 12h.01"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5"/>',
  wifi: '<path d="M2 9a15 15 0 0 1 20 0M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M12 19.5h.01"/>',
  left: '<path d="m15 6-6 6 6 6"/>',
  git: '<circle cx="6" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="9" r="2.5"/><path d="M6 8.5v7M18 11.5c0 4-6 3-11 5"/>',
};

export function sprite() {
  return '<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>' +
    Object.entries(ICONS).map(([k, v]) => `<symbol id="i-${k}" viewBox="0 0 24 24">${v}</symbol>`).join('') + '</defs></svg>';
}
export const ic = (n, cls = '') => `<svg class="ic ${cls}" aria-hidden="true"><use href="#i-${n}"/></svg>`;
export const D = (n) => `<a class="dm" href="index.html#D${n}" title="Open decision D${n} in the hub">D${n}</a>`;
export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export const NAMES = { passed: 'Passed', failed: 'Failed', blocked: 'Blocked', retest: 'Retest', untested: 'Untested' };
export const stBadge = (s) => `<span class="st st-${s}">${ic(s)}${NAMES[s]}</span>`;
export const pri = (n) => `<span class="pri pri-${n}" title="${['', 'Critical', 'Major', 'Minor', 'Trivial'][n]}">${ic('p' + n)}P${n}</span>`;
const AUTO = { automated: ['zap', 'Automated'], needs_review: ['eye', 'Needs review'], needs_automation: ['bot', 'Needs automation'], in_progress: ['clock', 'In progress'], not_specified: ['untested', 'Not specified'], not_automatable: ['x', 'Not automatable'] };
export const auto = (k) => `<span class="auto a-${k}">${ic(AUTO[k][0])}${AUTO[k][1]}</span>`;
export const tag = (t) => `<span class="tag">${esc(t)}</span>`;
export const badge = (t, c = '', i = '') => `<span class="badge ${c}">${i ? ic(i) : ''}${t}</span>`;

export function bar(c, size = '') {
  const o = ['passed', 'failed', 'blocked', 'retest', 'untested'];
  const v = { passed: c[0], failed: c[1], blocked: c[2], retest: c[3], untested: c[4] };
  const tot = c.reduce((a, b) => a + b, 0);
  const label = `${tot} tests: ` + o.map((k) => `${v[k]} ${k}`).join(', ');
  return `<div class="pbar ${size}" role="img" aria-label="${label}">` + o.map((k) => `<i class="s-${k}${k === 'passed' ? '' : ' tb-pattern-' + k}" style="--n:${v[k]}"></i>`).join('') + '</div>';
}
export function legend(c) {
  const o = ['passed', 'failed', 'blocked', 'retest', 'untested'];
  return '<div class="legend">' + o.map((k, i) => `<span>${ic(k)}<span style="color:var(--tb-status-${k}-text)">${NAMES[k]}</span> <b>${c[i]}</b></span>`).join('') + '</div>';
}
export const pct = (c) => { const t = c.reduce((a, b) => a + b, 0); return Math.round(((t - c[4]) * 100) / t); };

// table with data-l labels for card mode on phones. cols: [{h,cls,num}], rows: array of arrays of cell html.
export function table(cols, rows, o = {}) {
  const th = cols.map((c) => `<th scope="col"${c.cls ? ` class="${c.cls}"` : ''}>${c.h}</th>`).join('');
  const trs = rows.map((r, ri) => {
    const attrs = (o.rowAttrs && o.rowAttrs[ri]) || '';
    return `<tr ${attrs}>` + r.map((cell, i) => {
      const c = cols[i];
      const cls = [c.cls || '', i === (o.titleCol ?? 0) ? 't0' : '', c.nolabel ? 'nolabel' : ''].join(' ').trim();
      return `<td${cls ? ` class="${cls}"` : ''}${c.h && !c.nolabel ? ` data-l="${esc(c.h)}"` : ''}>${cell}</td>`;
    }).join('') + '</tr>';
  }).join('');
  return `<div class="tblwrap"><table class="tbl cardify"${o.attrs ? ' ' + o.attrs : ''}><thead><tr>${th}</tr></thead><tbody>${trs}</tbody></table></div>`;
}

export const NAV = [
  ['overview', 'Overview', 'home', 'overview.html'],
  ['repository', 'Repository', 'list', 'repository.html'],
  ['milestones', 'Milestones', 'flag', 'milestones.html'],
  ['plans', 'Plans', 'layers', 'plans.html'],
  ['runs', 'Runs', 'play', 'runs.html'],
  ['reports', 'Reports', 'chart', 'reports.html'],
  ['automation', 'Automation', 'zap', 'automation.html'],
];
export const NAV2 = [
  ['members', 'Members', 'users', 'members.html', 'admin manager'],
  ['audit', 'Audit log', 'file', 'audit.html', 'admin'],
  ['settings', 'Settings', 'sliders', 'settings.html', 'admin manager'],
];
const STATE_LABEL = { ready: 'Ready', loading: 'Loading', empty: 'Empty', error: 'Error', noperm: 'No access', closed: 'Closed run' };

export function seg(attr, items, label) {
  return `<div class="grp"><span class="lbl" id="l-${attr}">${label}</span><div class="seg" role="group" aria-labelledby="l-${attr}">` +
    items.map(([v, t]) => `<button type="button" ${attr}="${v}" aria-pressed="false">${t}</button>`).join('') + '</div></div>';
}

export const phoneNote = '<p class="note box phone-note">' + ic('phone') + '<span>Open on a larger screen to edit.</span></p>';

// opts: file,title,nav,states[],need,main,help[],shell ('project'|'ws'|'none'),crumbs,banner,extraHead,extraBody
export function page(o) {
  const states = o.states || ['ready', 'loading', 'error', 'noperm'];
  const mock = `<div class="mockbar" role="region" aria-label="Mockup controls">
  <a class="home" href="index.html">${ic('left' in ICONS ? 'left' : 'right', '')}Hub</a>
  ${seg('data-role-set', [['admin', 'Admin'], ['manager', 'Manager'], ['tester', 'Tester'], ['viewer', 'Viewer']], 'Role')}
  ${seg('data-state-set', states.map((s) => [s, (o.labels || {})[s] || STATE_LABEL[s]]), 'State')}
  ${seg('data-w', [['desktop', 'Desktop'], ['tablet', 'Tablet 820'], ['phone', 'Phone 390']], 'View')}
  ${seg('data-theme-set', [['light', 'Light'], ['dark', 'Dark']], 'Theme')}
  <span class="dnote">Mockup controls, not part of the product. Dashed D-tags link to the hub.</span>
</div>`;
  let chrome = '';
  const shell = o.shell || 'project';
  const nav = shell === 'project' ? `<nav class="sidebar" aria-label="Project">
    <div class="proj"><b>Core platform</b><span class="meta mono">CORE</span></div>
    <ul class="nav">${NAV.map(([k, t, i, h]) => `<li><a href="${h}"${o.nav === k ? ' aria-current="page"' : ''}${k === 'plans' ? ' data-plans' : ''}>${ic(i)}${t}${k === 'plans' ? '<span class="dm" title="Decision D2: Plans appear only when needed">D2</span>' : ''}</a></li>`).join('')}
    <li class="grp-label" aria-hidden="true">Admin</li>
    ${NAV2.map(([k, t, i, h, a]) => `<li data-allow="${a}"><a href="${h}"${o.nav === k ? ' aria-current="page"' : ''}>${ic(i)}${t}</a></li>`).join('')}</ul>
  </nav>` : '';
  if (shell !== 'none') {
    chrome = `<header class="topbar">
    <button class="iconbtn menubtn" type="button" aria-label="Open navigation" aria-expanded="false">${ic('menu', 'lg')}</button>
    <a class="brand" href="projects.html"><span class="logo">${ic('check')}</span><span class="hide-phone">TestBuddy</span></a>
    <a class="switcher" href="projects.html" aria-label="Switch project. Current: Acme QA, Core platform"><span class="ws">Acme QA /</span> ${shell === 'project' ? 'Core platform' : 'All projects'} ${ic('down')}</a>
    <a class="search" href="repository.html" aria-label="Search cases, runs and milestones">${ic('search')}<span>Search</span><span class="kbd">/</span></a>
    <span class="sp"></span>
    <a class="btn sm ghost hide-phone" href="runs.html" title="Runs that are open right now">Open runs <span class="badge accent">2</span>${D(27)}</a>
    <button class="btn sm primary edit hide-phone" type="button" data-open="dlg-create" data-allow="admin manager tester">${ic('plus')}Create</button>
    <button class="iconbtn" type="button" data-open="help" aria-label="Keyboard shortcuts">${ic('help', 'lg')}</button>
    <span class="avatar" title="Avery Quinn, signed in as <span data-role-text></span>">AQ</span>
  </header>`;
  }
  const keys = (o.help || []).concat([['?', 'Show this help'], ['/', 'Search'], ['g then c', 'Go to Cases (g o, m, p, r, e, a for the rest)']]);
  const helpDlg = `<dialog id="help" aria-labelledby="help-t"><div class="dh"><h2 id="help-t">Keyboard shortcuts</h2><button class="iconbtn" type="button" data-close aria-label="Close">${ic('x')}</button></div>
  <div class="db"><p class="meta" id="x-helpwhy" hidden></p><dl class="keys">${keys.map(([k, d]) => `<dt>${k.split(' ').map((x) => ['then', 'or', '+'].includes(x) ? ` ${x} ` : `<span class="kbd">${esc(x)}</span>`).join('')}</dt><dd>${d}</dd>`).join('')}</dl>
  <label class="sw"><input type="checkbox" id="singlekey" checked> <span>Single-key shortcuts ${D(17)}</span></label>
  <p class="meta" style="margin-top:6px">Turn these off to avoid accidental presses. Every shortcut has a button. Typing in a field never triggers them.</p></div>
  <div class="df"><button class="btn primary" type="button" data-close>Close</button></div></dialog>`;
  const createDlg = `<dialog id="dlg-create" aria-labelledby="cr-t"><div class="dh"><h2 id="cr-t">Create</h2><button class="iconbtn" type="button" data-close aria-label="Close">${ic('x')}</button></div>
  <div class="db"><ul class="list-plain"><li><a href="case.html">New case</a> <span class="meta">in the selected section</span></li><li><a href="run-new.html">New run</a> <span class="meta">from a set of cases</span></li></ul></div></dialog>`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(o.title)} · TestBuddy proposal</title>
<link rel="stylesheet" href="app.css">
</head>
<body data-page="${o.file}" data-states="${states.join(',')}"${o.need ? ` data-need="${o.need}"` : ''}>
${sprite()}
<a class="skip" href="#main">Skip to content</a>
${mock}
<div class="app" data-state="ready">
${chrome}
${o.banner || ''}
<div class="layout${shell === 'project' ? '' : ' no-side'}">
${nav}
<main class="page" id="main" tabindex="-1">
${o.crumbs ? `<nav class="crumbs" aria-label="Breadcrumb">${o.crumbs.map(([t, h], i, a) => (h ? `<a href="${h}">${t}</a>` : `<span aria-current="page">${t}</span>`) + (i < a.length - 1 ? ic('right') : '')).join('')}</nav>` : ''}
<div id="stslot" hidden></div>
${o.main}
</main>
</div>
</div>
<div class="toasts" id="toasts"></div>
<div class="sr" id="live" aria-live="polite"></div>
${helpDlg}${createDlg}
${o.extraBody || ''}
<script src="app.js"></script>
</body>
</html>`;
}

export const emptyState = (icon, title, text, action = '') => `<div class="empty">${'<div class="art">' + ic(icon, 'lg') + '</div>'}<h3>${title}</h3><p>${text}</p>${action}</div>`;
export const head = (title, o = {}) => `<div class="phead"><div class="t"><div class="row"><h1>${title}</h1>${o.badge || ''}</div>${o.meta ? `<p class="meta" style="margin-top:4px">${o.meta}</p>` : ''}</div><div class="acts">${o.actions || ''}</div></div>`;
