import { page, D, ic, esc, stBadge, pri, auto, tag, badge, bar, legend, table, phoneNote, emptyState, head } from './lib.mjs';

const dlg = (id, title, body, foot) => `<dialog id="${id}" aria-labelledby="${id}-t"><div class="dh"><h2 id="${id}-t">${title}</h2><button class="iconbtn" type="button" data-close aria-label="Close">${ic('x')}</button></div><div class="db">${body}</div><div class="df">${foot}</div></dialog>`;
const sel = (label, opts, id, extra = '') => `<div class="field"><label for="${id}">${label}</label><select class="in" id="${id}" ${extra}>${opts.map((o) => `<option>${o}</option>`).join('')}</select></div>`;

/* ---------- 6.1 Sign in ---------- */
export function signIn() {
  const form = (o = {}) => `<form class="card" onsubmit="return false" aria-labelledby="si-t${o.k || ''}">
    <div class="row" style="margin-bottom:12px"><span class="logo">${ic('check')}</span><b style="font-size:17px">TestBuddy</b></div>
    <h1 id="si-t${o.k || ''}" style="font-size:20px;margin-bottom:14px">Sign in to your workspace</h1>
    ${o.alert ? `<div class="banner danger" role="alert" style="border-radius:8px;margin-bottom:12px">${ic('alert')}<span>${o.alert}</span></div>` : ''}
    <div class="field"><label for="em${o.k || ''}">Email</label><input class="in" id="em${o.k || ''}" type="email" autocomplete="username" value="${o.email || 'dana@example.com'}" ${o.lock ? 'readonly' : ''} ${o.alert ? 'aria-invalid="true"' : ''}></div>
    <div class="field"><label for="pw${o.k || ''}">Password</label><div class="row"><input class="in" id="pw${o.k || ''}" type="password" value="demo-only" ${o.lock ? 'readonly' : ''}><button class="btn" type="button" data-toast="Password shown for 5 seconds (mock)." ${o.lock ? 'disabled' : ''}>Show</button></div></div>
    <div class="row wrap" style="justify-content:space-between"><a class="btn primary" href="projects.html" ${o.lock ? 'aria-disabled="true"' : ''}>${o.lock ? 'Signing in...' : 'Sign in'}</a><a href="#" data-toast="Email is not configured here. Ask your admin to reset your password.">Forgot password?</a></div>
    <p class="meta" style="margin-top:6px">If email is not set up, this link becomes: Ask your admin to reset your password.</p>
    <hr style="border:0;border-top:1px solid var(--tb-border-subtle);margin:16px 0">
    <button class="btn" type="button" style="width:100%" data-toast="OAuth is shown only when enabled in PocketBase settings.">Continue with OAuth provider</button>
  </form>`;
  const main = `<div class="auth"><div>
  <section data-st="ready">${form()}</section>
  <section data-st="loading" hidden>${form({ lock: true, k: 'l' })}<p class="state-note">Submitting: button shows progress, fields are locked.</p></section>
  <section data-st="error" hidden>${form({ k: 'e', alert: 'Email or password is incorrect.', email: 'dana@example.com' })}<p class="state-note">Focus moves to the email field. The message is announced.</p></section>
  <section data-st="noperm" hidden>${form({ k: 'n', alert: 'This account is disabled. Ask an admin.', email: 'pat@example.com' })}</section>
  <p class="meta" style="text-align:center;margin-top:12px">After sign in you land on the page you asked for, else <a href="projects.html">Projects</a>. First time here? <a href="onboarding.html">See the first-run screen</a>.</p>
  </div></div>`;
  return page({ file: 'sign-in', title: 'Sign in', shell: 'none', states: ['ready', 'loading', 'error', 'noperm'], labels: { error: 'Wrong password', noperm: 'Disabled account' }, main });
}

/* ---------- 6.2 Projects ---------- */
export function projects() {
  const rows = [
    ['<b>CORE</b>', '<a class="rowlink" href="overview.html">Core platform</a>', 'You: <span style="text-transform:capitalize" data-role-text></span>', '120', '2 open runs', bar([61, 8, 3, 4, 22], 'sm') + '<span class="meta">62% passed</span>', '2h ago'],
    ['<b>MOB</b>', '<a class="rowlink" href="overview.html">Mobile app</a>', 'You: Manager', '20', '1 open run', bar([9, 1, 0, 1, 4], 'sm') + '<span class="meta">60% passed</span>', 'Yesterday'],
  ];
  const cols = [{ h: 'Prefix', cls: 'mono' }, { h: 'Project' }, { h: 'Your role' }, { h: 'Cases', cls: 'num' }, { h: 'Open runs' }, { h: 'Latest progress' }, { h: 'Last activity' }];
  const main = `${head('Projects', { meta: 'Workspace: Acme QA', actions: `<button class="btn primary edit w-only" data-allow="admin" type="button" data-open="dlg-newproj">${ic('plus')}New project${D(20)}</button>` })}
  ${phoneNote}
  <section data-st="ready">
    <div class="filterbar"><input class="in q" type="search" aria-label="Search projects" placeholder="Search projects"><label class="chk"><input type="checkbox"> Show archived</label><span class="meta">The workspace switch lives in the top bar.</span></div>
    <div class="card flush">${table(cols, rows)}</div>
  </section>
  <section data-st="empty" hidden>
    <div class="empty"><div class="art">${ic('folder', 'lg')}</div><h3>No projects yet</h3>
    <p data-allow="admin">Create your first project, or import one from a TestRail export.</p>
    <p data-allow="manager tester viewer">You are not in any project yet. Ask an admin to add you.</p>
    <div class="row wrap" data-allow="admin"><button class="btn primary" type="button" data-open="dlg-newproj">New project</button><a class="btn" href="onboarding.html">Import cases</a></div></div>
  </section>`;
  const newproj = dlg('dlg-newproj', 'New project', `<div class="field"><label for="pn">Name</label><input class="in" id="pn" value="UAT Test Project"></div>
  <div class="field"><label for="pp">Ref prefix <span class="meta">(2 to 10 letters or digits, cannot change later)</span></label><input class="in mono" id="pp" data-prefix value="UAT" maxlength="10" aria-describedby="pp-m"><span class="hint" id="pp-m" role="status">UAT is free.</span></div>
  <div class="field"><label for="pa">Announcement <span class="meta">(optional)</span></label><textarea class="in" id="pa" rows="2"></textarea></div>
  <p class="note box">${ic('info')}<span>You become the project admin. Only workspace admins can create projects. ${D(20)}</span></p>`,
    '<button class="btn" type="button" data-close>Cancel</button><a class="btn primary" href="overview.html">Create project</a>');
  return page({ file: 'projects', title: 'Projects', shell: 'ws', states: ['ready', 'loading', 'empty', 'error'], main, extraBody: newproj, help: [['J K', 'Move between rows'], ['Enter', 'Open project']] });
}

/* ---------- First run ---------- */
export function onboarding() {
  const main = `${head('Welcome to TestBuddy', { meta: 'Your workspace is empty. Pick how to start. About 3 minutes to a first recorded result with the sample project.' })}
  <section data-st="ready">
  <div class="cols c2">
   <div class="stack">
    <h2>Start here ${D(7)}</h2>
    <button class="choice" type="button" data-open="dlg-import"><b>${ic('upload', 'lg')}Import your cases</b><span class="muted">CSV, TestRail XML or JSON. You see a preview and a per-row error report before anything is saved.</span></button>
    <a class="choice" href="overview.html" data-toast="Creating the sample project (24 cases, 1 run, 1 milestone)..."><b>${ic('sparkle', 'lg')}Create a sample project</b><span class="muted">2 suites, 24 cases, one run with mixed results. Labelled Sample, deletable in one click.</span></a>
    <a class="choice" href="projects.html"><b>${ic('plus', 'lg')}Start empty</b><span class="muted">Create a blank project and add cases yourself.</span></a>
   </div>
   <div class="card" id="guide" aria-labelledby="gd-t">
    <h2 id="gd-t" style="font-size:17px">What do you want to do? ${D(24)}</h2>
    <p class="meta" style="margin:4px 0 12px">Pick a goal and we walk you through just that path. Skip any time; it never blocks the app.</p>
    <div class="stack" role="group" aria-label="Goals">
      <button class="btn" type="button" data-goal="run" aria-pressed="false" style="width:100%;justify-content:flex-start">Run my first test</button>
      <button class="btn" type="button" data-goal="import" aria-pressed="false" style="width:100%;justify-content:flex-start">Bring in my existing cases</button>
      <button class="btn" type="button" data-goal="write" aria-pressed="false" style="width:100%;justify-content:flex-start">Write a test case</button>
      <button class="btn" type="button" data-goal="report" aria-pressed="false" style="width:100%;justify-content:flex-start">Show a progress report</button>
    </div>
    <div data-path="run" hidden class="note box" style="margin-top:12px"><ol style="margin:0;padding-left:18px"><li>Create the sample project.</li><li>Open the run "Web smoke 2.4-rc1".</li><li>Press <span class="kbd">P</span> to pass a test. It moves to the next one.</li></ol></div>
    <div data-path="import" hidden class="note box" style="margin-top:12px"><ol style="margin:0;padding-left:18px"><li>Choose Import.</li><li>Check the preview and mapping.</li><li>Fix any rows listed in the report.</li></ol></div>
    <div data-path="write" hidden class="note box" style="margin-top:12px"><ol style="margin:0;padding-left:18px"><li>Start empty.</li><li>Open Repository and press <span class="kbd">C</span>.</li><li>Type steps; <span class="kbd">Ctrl</span> + <span class="kbd">Enter</span> adds the next one.</li></ol></div>
    <div data-path="report" hidden class="note box" style="margin-top:12px"><ol style="margin:0;padding-left:18px"><li>Create the sample project.</li><li>Open Reports.</li><li>Use Share link to send it without an account.</li></ol></div>
    <p class="meta" style="margin-top:12px"><button class="btn sm ghost" type="button" data-toast="Guide skipped. Find it again under Help.">Skip guide</button> The four-step coachmark tour in DESIGN is the alternative.</p>
   </div>
  </div>
  <p class="meta" style="margin-top:16px">Prefer the terminal? <span class="mono">docker compose up</span> then open this page: under 5 minutes from clone to sign in.</p>
  </section>`;
  const imp = dlg('dlg-import', 'Import cases', `<div class="field"><span class="lab">Format</span><label class="chk"><input type="radio" name="fmt" checked> TestRail XML</label><label class="chk"><input type="radio" name="fmt"> JSON</label><label class="chk"><input type="radio" name="fmt"> CSV</label></div>
  <div class="dz">${ic('upload', 'lg')}<p>Drop a file or <button class="btn sm" type="button" data-toast="File picker opens here (mock).">Choose file</button></p><p class="meta">Up to 50 MB. Text is never altered.</p></div>
  <h3 style="margin:14px 0 6px;font-size:15px">Preview of sample-export.xml</h3><p>3 suites, 12 sections, 120 cases. 2 rows need attention.</p>
  <label class="chk"><input type="checkbox" checked> Map priorities</label> <label class="chk"><input type="checkbox"> Skip duplicates by title</label>`,
    '<button class="btn" type="button" data-close>Cancel</button><a class="btn primary" href="overview.html" data-toast="118 imported, 2 skipped. Report ready to download.">Import 120 cases</a>');
  return page({ file: 'onboarding', title: 'First run', shell: 'ws', states: ['ready', 'loading', 'error'], main, extraBody: imp });
}

/* ---------- 6.3 Overview ---------- */
export function overview() {
  const main = `${head('Core platform', { badge: '<span class="badge mono">CORE</span>', meta: 'Release 2.4 is the active milestone.', actions: `<a class="btn primary edit" data-allow="admin manager tester" href="run-new.html">${ic('plus')}New run</a><a class="btn edit" data-allow="admin manager tester" href="case.html">${ic('plus')}New case</a>` })}
  ${phoneNote}
  <section data-st="ready">
  <div class="banner info" id="ann" style="border:1px solid var(--tb-border-subtle);border-radius:8px;margin-bottom:16px">${ic('info')}<span class="grow"><b>Announcement.</b> Release freeze Friday 18:00.</span>
    <button class="btn sm" type="button" data-toast="Announcement dismissed for you. It stays visible for others.">Dismiss</button>
    <a class="btn sm edit" data-allow="admin manager" href="settings.html">Edit${D(18)}</a></div>
  <div class="strip" role="group" aria-label="Project summary">
    <div><a href="repository.html"><div class="v">120</div><div class="l">Cases, 12 added this week</div></a></div>
    <div><a href="runs.html"><div class="v">2</div><div class="l">Open runs</div></a></div>
    <div><a href="reports.html"><div class="v">62%</div><div class="l">Passed, 7 days${D(23)}</div><div class="meta">of 98 tests, 78% complete, 22 untested</div></a></div>
    <div><a href="run.html"><div class="v">8</div><div class="l">Failing tests</div></a></div>
  </div>
  <div class="card" style="margin-bottom:16px"><div class="row wrap" style="justify-content:space-between"><div><h3>Release 2.4</h3><p class="meta"><span class="auto">${ic('clock')}Due in 6 days (Nov 10)</span></p></div><a href="milestones.html">Open milestone</a></div>
    <div style="margin-top:10px">${bar([61, 8, 3, 4, 22], 'lg')}${legend([61, 8, 3, 4, 22])}</div></div>
  <div class="cols c2">
    <div class="card"><h3>Open runs${D(27)}</h3><ul class="list-plain">
      <li><div class="row wrap" style="justify-content:space-between"><a href="run.html"><b>Web smoke 2.4-rc1</b></a><span class="meta">3 failed</span></div>${bar([20, 3, 1, 0, 14], 'sm')}<span class="meta">63% recorded, 53% passed</span></li>
      <li><div class="row wrap" style="justify-content:space-between"><a href="run.html"><b>API regression 2.4-rc1</b></a><span class="meta">5 failed</span></div>${bar([41, 5, 2, 4, 8], 'sm')}<span class="meta">87% recorded, 68% passed</span></li></ul></div>
    <div class="card"><h3>Recent activity</h3><ul class="list-plain small">
      <li>Dana marked CORE-C41 ${stBadge('failed')} <span class="meta">10:42</span></li>
      <li>Raj created run "API regression 2.4-rc1" <span class="meta">Nov 3</span></li>
      <li>Sam marked CORE-C88 ${stBadge('retest')} <span class="meta">Nov 3</span></li>
      <li>Avery changed Dana's role to Tester <span class="meta">Nov 2</span></li></ul></div>
  </div>
  <div class="card" style="margin-top:16px" data-allow="admin manager tester"><div class="row wrap" style="justify-content:space-between"><h3>My assigned tests (12)</h3><a class="btn primary edit" href="execute.html">Start next untested <span class="kbd">N</span></a></div>
    <table class="tbl cardify"><thead><tr><th>Test</th><th>Run</th><th>Priority</th><th>Status</th></tr></thead><tbody>
    <tr><td class="t0"><a class="rowlink" href="execute.html">CORE-C43 Login remembers the user</a></td><td data-l="Run">Web smoke 2.4-rc1</td><td data-l="Priority">${pri(2)}</td><td data-l="Status">${stBadge('untested')}</td></tr>
    <tr><td class="t0"><a class="rowlink" href="execute.html">CORE-C52 Registration rejects a used email</a></td><td data-l="Run">Web smoke 2.4-rc1</td><td data-l="Priority">${pri(1)}</td><td data-l="Status">${stBadge('untested')}</td></tr></tbody></table></div>
  </section>`;
  return page({ file: 'overview', title: 'Project overview', nav: 'overview', crumbs: [['Core platform', null]], states: ['ready', 'loading', 'error', 'noperm'], main, help: [['N', 'Start next untested']] });
}

/* ---------- 6.4 Repository ---------- */
const CASES = [
  ['C40', 'Login with valid credentials', 1, 'Functional', 'automated', ['smoke', 'auth'], 2, 'Nov 1'],
  ['C41', 'Login locks the account after 5 failed attempts', 1, 'Functional', 'needs_review', ['auth', 'security'], 3, '2d ago'],
  ['C42', 'Password reset email arrives within a minute', 2, 'Functional', 'automated', ['auth'], 1, 'Oct 29'],
  ['C43', 'Login remembers the user when Keep me signed in is ticked', 2, 'Regression', 'needs_automation', ['auth'], 2, 'Oct 28'],
  ['C44', 'Login rejects an expired session cookie', 2, 'Security', 'in_progress', ['auth', 'security'], 1, 'Oct 27'],
  ['C45', 'Login shows a clear message for a disabled account', 3, 'Functional', 'not_specified', [], 1, 'Oct 25'],
  ['C46', '登录失败后锁定账户', 2, 'Functional', 'needs_review', ['auth'], 1, 'Oct 25'],
  ['C47', 'Login page works with a screen reader', 2, 'UI', 'not_automatable', ['a11y'], 2, 'Oct 22'],
  ['C48', 'Single sign-on returns the user to the page they asked for', 2, 'Regression', 'automated', ['auth', 'flaky'], 1, 'Oct 20'],
  ['C49', 'Login keeps the email after a failed attempt', 3, 'UI', 'not_specified', [], 1, 'Oct 19'],
  ['C50', 'Two-factor code is required for admin accounts', 1, 'Security', 'needs_automation', ['auth', 'security'], 2, 'Oct 18'],
  ['C51', 'Login throttles repeated requests from one IP address', 2, 'Security', 'needs_review', ['security'], 1, 'Oct 15'],
];
export function repository() {
  const tree = `<ul class="tree" role="tree" aria-label="Suites and sections">
   <li role="none"><button class="node virt" role="treeitem" aria-selected="false" data-title="All cases">${ic('list')}All cases<span class="cnt">120</span></button></li>
   <li role="none"><button class="node virt" role="treeitem" aria-selected="false" data-title="No section">${ic('folder')}No section<span class="cnt">0</span></button></li>
   <li role="none"><button class="node" role="treeitem" aria-expanded="true" aria-selected="false" data-title="Web app">${ic('down')}Web app<span class="cnt">60</span></button>
     <ul role="group"><li role="none"><button class="node" role="treeitem" aria-selected="true" data-title="Web app / Login">Login<span class="cnt">12</span></button></li>
     <li role="none"><button class="node" role="treeitem" aria-selected="false" data-title="Web app / Registration">Registration<span class="cnt">8</span></button></li>
     <li role="none"><button class="node" role="treeitem" aria-selected="false" data-title="Web app / Checkout">Checkout<span class="cnt">18</span></button></li>
     <li role="none"><button class="node" role="treeitem" aria-selected="false" data-title="Web app / Profile">Profile<span class="cnt">10</span></button></li>
     <li role="none"><button class="node" role="treeitem" aria-selected="false" data-title="Web app / Search">Search<span class="cnt">12</span></button></li></ul></li>
   <li role="none"><button class="node" role="treeitem" aria-expanded="false" aria-selected="false" data-title="API">${ic('right')}API<span class="cnt">40</span></button></li>
   <li role="none"><button class="node" role="treeitem" aria-expanded="false" aria-selected="false" data-title="Mobile web">${ic('right')}Mobile web<span class="cnt">20</span></button></li></ul>
   <div class="w-only" style="padding:8px"><button class="btn sm ghost edit" type="button" data-toast="Add suite or section. Section order changes use Move to (drag and drop is M2).">${ic('plus')}Add suite${D(21)}</button></div>`;
  const cols = [{ h: '<span class="sr">Select</span>', cls: 'sel-col w-only', nolabel: true }, { h: 'Ref', cls: 'mono' }, { h: 'Title' }, { h: 'Priority' }, { h: 'Type', cls: 'c-opt' }, { h: 'Automation' }, { h: 'Tags', cls: 'c-opt' }, { h: 'Ver', cls: 'num c-opt' }, { h: 'Updated', cls: 'c-opt' }];
  const rows = CASES.map((c) => [`<input class="rowchk" type="checkbox" aria-label="Select CORE-${c[0]}">`, `CORE-${c[0]}`, `<a class="rowlink" href="case.html">${esc(c[1])}</a>`, pri(c[2]), c[3], auto(c[4]), c[5].map(tag).join(' ') || '<span class="muted">None</span>', 'v' + c[6], c[7]]);
  const attrs = CASES.map((c) => `tabindex="0" data-case data-ref="CORE-${c[0]}" data-title="${esc(c[1])}"${c[0] === 'C41' ? ' aria-selected="true"' : ''}`);
  rows.unshift(['<input class="rowchk" type="checkbox" disabled aria-label="Deprecated case cannot be selected">', 'CORE-C39', `<a class="rowlink" href="case.html">Old login banner can be dismissed</a> ${badge('Deprecated')}`, pri(4), 'Functional', auto('not_specified'), '<span class="muted">None</span>', 'v1', 'Sep 12']);
  attrs.unshift('class="dim" tabindex="0"');
  const tbl = table(cols, rows, { titleCol: 2, rowAttrs: attrs, attrs: 'data-selectable aria-label="Cases in Login" aria-rowcount="13"' });
  const insp = `<div id="insp"><button class="btn sm back" type="button" data-insp-back>${ic('left')}Back to list</button>
   <div class="row wrap" style="justify-content:space-between"><div><span class="mono" data-fill="ref">CORE-C41</span> <span class="badge">v3</span></div><a class="btn sm edit w-only" href="case.html">${ic('edit')}Edit</a></div>
   <h3 data-fill="title" style="margin:6px 0 10px">Login locks the account after 5 failed attempts</h3>
   <div role="tablist" class="tabs" aria-label="Case views"><button role="tab" aria-selected="true" aria-controls="ip1" id="it1">Details</button><button role="tab" aria-selected="false" aria-controls="ip2" id="it2">History</button><button role="tab" aria-selected="false" aria-controls="ip3" id="it3">Used in runs</button></div>
   <div role="tabpanel" id="ip1" aria-labelledby="it1"><dl class="kv"><dt>Priority</dt><dd>${pri(1)} Critical</dd><dt>Type</dt><dd>Functional</dd><dt>Automation</dt><dd>${auto('needs_review')}</dd><dt>Tags</dt><dd>${tag('auth')} ${tag('security')}</dd><dt>Preconditions</dt><dd>A registered user that is not locked.</dd></dl>
   <h4 style="margin:12px 0 6px">Steps</h4><ol style="padding-left:18px;margin:0;display:grid;gap:6px"><li>Open /login.<br><span class="meta">Expected: the form is shown.</span></li><li>Enter the right email and a wrong password.<br><span class="meta">Expected: Email or password is incorrect.</span></li><li>Repeat until 5 wrong attempts.<br><span class="meta">Expected: the account is locked with an unlock time.</span></li></ol></div>
   <div role="tabpanel" id="ip2" aria-labelledby="it2" hidden><ul class="hist"><li><b>v3</b> Dana Lee, 2d ago<span class="muted">Clarified the lock message</span></li><li><b>v2</b> Raj Patel, Oct 20<span class="muted">Added step 5</span></li><li><b>v1</b> Raj Patel, Oct 3</li></ul></div>
   <div role="tabpanel" id="ip3" aria-labelledby="it3" hidden><ul class="hist"><li><a href="run.html">Web smoke 2.4-rc1</a> ${stBadge('failed')}</li><li><a href="run.html">Release 2.3 full regression</a> ${stBadge('passed')} <span class="badge">v2</span></li></ul></div></div>`;
  const filters = `<div class="filterbar"><input class="in q" type="search" aria-label="Search cases" placeholder="Search cases by ref or title"><select class="in" aria-label="Priority"><option>Priority</option><option>P1 Critical</option><option>P2 Major</option></select><select class="in" aria-label="Type"><option>Type</option><option>Functional</option><option>Security</option></select><select class="in" aria-label="Automation"><option>Automation</option><option>Automated</option></select><select class="in" aria-label="Tags"><option>Tags</option><option>auth</option></select><button class="btn" type="button" data-toast="All facets open in a popover.">Filters</button><button class="btn treebtn" type="button" aria-expanded="false" style="display:none">${ic('folder')}Suites</button><a class="btn primary edit w-only" href="case.html">${ic('plus')}New case <span class="kbd">C</span></a></div>
   <div class="row wrap" style="margin:-4px 0 10px"><span class="chipx">Priority: P1 or P2<button type="button" aria-label="Remove filter Priority">${ic('x')}</button></span><button class="btn sm ghost" type="button">Clear all</button><span class="meta">Filters, selection and the open case live in the address bar.</span></div>`;
  const bulk = `<div class="bulk" id="bulk" hidden role="region" aria-label="Bulk actions"><b><span data-selcount>0</span> selected</b><button class="btn sm" type="button" data-open="dlg-bulk">Set priority</button><button class="btn sm" type="button" data-toast="Move to section picker opens.">Move to</button><a class="btn sm" href="run-new.html">Add to run <span class="kbd">Shift R</span></a><button class="btn sm" type="button" data-toast="Deprecated. Results are kept.">Deprecate</button><button class="btn sm danger" type="button" data-open="dlg-del">Delete</button><button class="btn sm ghost" id="clearsel" type="button">Clear</button></div>`;
  const main = `${head('Repository', { meta: '120 cases in 3 suites', actions: '' })}
  ${phoneNote}
  <section data-st="ready">${filters}
  <div class="split" id="split"><div class="pane-tree">${tree}</div>
   <div class="pane-list">${bulk}<div class="panelhead"><h2 id="listtitle" style="font-size:17px">Web app / Login</h2><label class="chk w-only"><input type="checkbox" id="selall"> Select all</label></div><div class="scrollbox">${tbl}</div>
    <div class="tfoot"><span>Showing 13 of 13 in Login. 120 in the project.${D(3)}</span><button class="btn sm w-only edit" id="allmatch" data-label="Select all 120 matching" type="button">Select all 120 matching</button><span class="muted">Scroll for more; the count stays on screen.</span></div></div>
   <aside class="pane-insp" aria-label="Case inspector">${insp}</aside></div></section>
  <section data-st="empty" hidden><div class="card">${emptyState('list', 'No cases in this section', 'Add the first case, or import cases from a file.', '<div class="row wrap w-only"><a class="btn primary" href="case.html">New case</a><a class="btn" href="onboarding.html">Import</a></div>')}<p class="meta" style="text-align:center">With filters on, this reads "No cases match these filters" with Clear filters.</p></div></section>`;
  const dlgBulk = dlg('dlg-bulk', 'Set priority', `<p>This changes <b data-selcount>3</b> cases.</p><dl class="kv" style="margin:10px 0"><dt>Current priority</dt><dd><span class="badge warn">${ic('info')}Multiple values</span> P1, P2</dd></dl><div class="field"><label for="bp">New priority</label><select class="in" id="bp"><option>P2 Major</option><option>P1 Critical</option></select></div><p class="meta">Only priority changes. Titles, steps and tags stay as they are.</p>`, `<button class="btn" type="button" data-close>Cancel</button><button class="btn primary" type="button" data-close data-toast="Priority set on the selected cases.">Set priority on <span data-selcount>3</span> cases</button>`);
  const dlgDel = dlg('dlg-del', 'Delete cases', `<p>Delete <b data-selcount>3</b> cases? Results in closed runs are kept.</p>`, `<button class="btn" type="button" data-close>Cancel</button><button class="btn danger" type="button" data-close data-toast="Cases deleted.">Delete <span data-selcount>3</span> cases</button>`);
  return page({ file: 'repository', title: 'Case repository', nav: 'repository', crumbs: [['Core platform', 'overview.html'], ['Repository', null]], states: ['ready', 'loading', 'empty', 'error', 'noperm'], main, extraBody: dlgBulk + dlgDel,
    help: [['J K', 'Move between cases'], ['Enter', 'Open in the inspector'], ['Space', 'Select the row'], ['C', 'New case'], ['Shift R', 'Run from selection'], ['Esc', 'Close inspector']] });
}

/* ---------- 6.5 Case editor ---------- */
export function caseEditor() {
  const steps = [
    ['Open /login.', 'The login form is shown.'],
    ['Enter a valid email and a wrong password.', 'The message "Email or password is incorrect" is shown.'],
    ['Repeat the wrong password until 5 attempts have been made.', 'The account is locked and the unlock time is shown.'],
    ['Enter the correct password.', 'The account is still locked.'],
    ['Wait for the lock to expire, then sign in.', 'Sign in succeeds.'],
  ];
  const st = steps.map((s, i) => `<li class="step"><span class="n">${i + 1}</span><div class="grid2"><div class="field" style="margin:0"><label for="sd${i}">Step ${i + 1}</label><textarea class="in" id="sd${i}" rows="2">${s[0]}</textarea></div><div class="field" style="margin:0"><label for="se${i}">Expected result</label><textarea class="in" id="se${i}" rows="2">${s[1]}</textarea></div><div class="row wrap w-only edit" style="grid-column:1/-1"><button class="btn sm" type="button" aria-label="Move step ${i + 1} up">Move up</button><button class="btn sm" type="button" aria-label="Move step ${i + 1} down">Move down</button><button class="btn sm ghost" type="button" aria-label="Remove step ${i + 1}">Remove</button><span class="meta"><span class="kbd">Alt</span> + <span class="kbd">Up</span> or <span class="kbd">Down</span> moves a step</span></div></div></li>`).join('');
  const side = `<div class="card"><h3>Details</h3>
    ${sel('Suite', ['Web app', 'API', 'Mobile web'], 'f1')}${sel('Section', ['Login', 'Registration', 'Checkout'], 'f2')}${sel('Priority', ['P1 Critical', 'P2 Major', 'P3 Minor', 'P4 Trivial'], 'f3')}${sel('Type', ['Functional', 'Smoke', 'Regression', 'UI', 'Performance', 'Security'], 'f4')}${sel('Automation status', ['Needs review', 'Automated', 'Needs automation', 'In progress', 'Not specified', 'Not automatable'], 'f5')}
    <div class="field"><label for="f6">Estimate</label><input class="in mono" id="f6" value="00:05:00"></div><div class="field"><label for="f7">Refs</label><input class="in mono" id="f7" value="JIRA-123, JIRA-456"></div>
    <div class="field"><span class="lab">Tags</span><div class="row wrap">${tag('auth')} ${tag('security')} <button class="btn sm w-only" type="button">${ic('plus')}Add tag</button></div></div></div>`;
  const edit = `<div class="banner info" style="border:1px solid var(--tb-border-subtle);border-radius:8px;margin-bottom:14px">${ic('info')}<span>Results exist for v3, so saving creates <b>v4</b> and does not change existing results. If no results existed, edits by you within 10 minutes would merge into this version.${D(5)}</span></div>
   <div class="cols c-side"><div class="card" data-rw><div class="field"><label for="ti">Title <span class="meta">(required)</span></label><input class="in" id="ti" value="Login locks the account after 5 failed attempts"></div>
    <p class="note box" style="margin-bottom:12px">${ic('sparkle')}<span>Looks similar to <a href="case.html">CORE-C40 Login with valid credentials</a> (62% match). Checked on this server only.${D(10)}</span></p>
    <div class="field"><label for="pc">Preconditions</label><textarea class="in" id="pc" rows="3">A registered user whose account is not locked.</textarea></div>
    <h3 style="margin:8px 0">Steps</h3><ol class="steps" style="padding:0;margin:0 0 10px">${st}</ol><button class="btn w-only edit" type="button">${ic('plus')}Add step</button> <span class="meta"><span class="kbd">Ctrl</span> + <span class="kbd">Enter</span> adds one below</span>
    <div class="field" style="margin-top:14px"><label for="cn">Change note <span class="meta">(optional)</span></label><input class="in" id="cn" placeholder="What changed and why"></div></div>${side}</div>`;
  const hist = `<div class="cols c2"><div class="card"><h3>Versions (3)</h3><ul class="list-plain"><li><b>v3</b> current. Dana Lee, 2d ago <span class="muted">Clarified the lock message</span><div class="row wrap" style="margin-top:6px"><button class="btn sm" type="button" data-toast="Showing v3.">View</button></div></li>
   <li><b>v2</b> Raj Patel, Oct 20 <span class="muted">Added step 5</span><div class="row wrap" style="margin-top:6px"><button class="btn sm" type="button" data-toast="Showing v2.">View</button><button class="btn sm" type="button" data-toast="Comparing v2 with current.">Compare with current</button><button class="btn sm w-only edit" type="button" data-toast="Restored v2 as v4.">Restore as new version</button></div></li>
   <li><b>v1</b> Raj Patel, Oct 3</li></ul></div>
   <div class="card"><h3>v2 compared with v3</h3><dl class="kv"><dt>Title</dt><dd>Unchanged</dd><dt>Step 3, expected</dt><dd><span class="diff-del">The account is locked</span> <span class="diff-add">The account is locked and the unlock time is shown</span> <span class="badge">Changed</span></dd><dt>Step 5</dt><dd><span class="diff-add">Added: Wait for the lock to expire, then sign in.</span></dd><dt>Step 4</dt><dd>Moved from 5 to 4 <span class="badge">Moved</span></dd></dl></div></div>`;
  const main = `${head('CORE-C41', { badge: '<span class="badge">v3</span>' + auto('needs_review'), meta: 'Login locks the account after 5 failed attempts', actions: `<a class="btn" href="repository.html">Cancel</a><button class="btn primary w-only edit" type="button" data-toast="Saved as v4.">Save as v4</button>` })}
  ${phoneNote}
  <section data-st="ready"><div role="tablist" class="tabs" aria-label="Case"><button role="tab" aria-selected="true" aria-controls="cp1" id="ct1">Edit</button><button role="tab" aria-selected="false" aria-controls="cp2" id="ct2">History (3)</button></div>
   <div role="tabpanel" id="cp1" aria-labelledby="ct1">${edit}</div><div role="tabpanel" id="cp2" aria-labelledby="ct2" hidden>${hist}</div>
   <p class="meta" style="margin-top:10px">Unsaved edits show a leave warning. If Dana saves v4 while you edit, you see "Dana saved v4 while you were editing. Review changes" with a diff.</p></section>`;
  return page({ file: 'case', title: 'Case editor', nav: 'repository', crumbs: [['Core platform', 'overview.html'], ['Repository', 'repository.html'], ['CORE-C41', null]], states: ['ready', 'loading', 'error', 'noperm'], main,
    help: [['Ctrl S', 'Save as new version'], ['Alt Up', 'Move step up'], ['Ctrl Enter', 'Add step below']] });
}
