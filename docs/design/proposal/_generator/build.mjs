import fs from 'node:fs';
import path from 'node:path';
import { page, D, ic, esc, sprite } from './lib.mjs';
import { DECISIONS, JOBS } from './decisions.mjs';
import * as p1 from './pages1.mjs';
import * as p2 from './pages2.mjs';
import * as p3 from './pages3.mjs';

const OUT = process.argv[2];
const BUILT = ['index.html', 'repository.html', 'run.html', 'execute.html'];
const files = {
  'sign-in.html': p1.signIn(), 'projects.html': p1.projects(), 'onboarding.html': p1.onboarding(), 'overview.html': p1.overview(),
  'repository.html': p1.repository(), 'case.html': p1.caseEditor(),
  'milestones.html': p2.milestones(), 'plans.html': p2.plans(), 'runs.html': p2.runs(), 'run-new.html': p2.runNew(), 'run.html': p2.run(),
  'execute.html': p2.execute(), 'reports.html': p2.reports(),
  'automation.html': p3.automation(), 'members.html': p3.members(), 'audit.html': p3.audit(), 'settings.html': p3.settings(),
};

const jobsHtml = JOBS.map((j) => {
  const ds = DECISIONS.filter((d) => d.job === j.id);
  return `<section class="job" aria-labelledby="job-${j.id}"><div><h3 id="job-${j.id}">${j.name}</h3><p class="meta">${j.who}</p><p style="margin-top:6px;color:var(--tb-ink-secondary)">${j.blurb}</p></div>
  <div><div class="shots">${j.screens.map(([t, h, d]) => BUILT.includes(h) ? `<a class="sl" href="${h}"><b>${t}</b><span>${d}</span></a>` : `<div class="sl" style="display:grid;grid-template-columns:minmax(140px,220px) minmax(0,1fr);gap:4px 14px;padding:8px 10px"><b>${t}</b><span class="muted">${d} Not drawn: review the real screen.</span></div>`).join('')}</div>
  <p class="dlinks">Decisions for this job: ${ds.map((d) => `<a href="#D${d.n}">D${d.n}</a>`).join(', ')}</p></div></section>`;
}).join('');

const rows = DECISIONS.map((d) => `<tr id="D${d.n}" data-job="${d.job}">
 <td class="id" data-l="Decision">D${d.n}</td>
 <td data-l="Question"><b>${d.q}</b></td>
 <td data-l="Options"><ul class="opts">${d.opts.map((o) => `<li>${o}</li>`).join('')}</ul></td>
 <td data-l="Recommendation"><span class="rec">${d.rec}</span><span class="why">${d.why} <a href="${d.src[0]}">${d.src[1]}</a></span></td>
 <td class="scr" data-l="Seen on">${d.screens.map(([t, h]) => BUILT.includes(h) ? `<a href="${h}">${t}</a>` : `<span class="muted">${t} (real screen)</span> `).join('')}</td>
 <td data-l="Owner answer"><label class="sr" for="ans${d.n}">Owner answer for D${d.n}</label><textarea class="in" id="ans${d.n}" data-did="D${d.n}" placeholder="Your answer"></textarea></td></tr>`).join('');

const hub = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>TestBuddy screen proposal</title><link rel="stylesheet" href="app.css"></head>
<body data-page="index">${sprite()}
<a class="skip" href="#main">Skip to content</a>
<div class="mockbar" role="region" aria-label="Page controls"><span class="lbl">TestBuddy UI process, step 4</span><div class="grp"><span class="lbl" id="l-th">Theme</span><div class="seg" role="group" aria-labelledby="l-th"><button type="button" data-theme-set="light" aria-pressed="true">Light</button><button type="button" data-theme-set="dark" aria-pressed="false">Dark</button></div></div></div>
<main class="hub" id="main" tabindex="-1">
<header class="top"><h1>TestBuddy screens and decisions</h1>
<p>Clickable mockups of every M0 screen, drawn from <a href="../DESIGN.md">DESIGN.md</a> and the <a href="../research/PRODUCT-RESEARCH.md">product research</a>. Each mockup shows the recommended option for its decisions as a small dashed tag such as <a class="dm" href="#D1">D1</a> that links back here. Answer the table below before any real screen is built.</p>
<p>In every mockup you can switch role, state (loading, empty, error, no access, closed run) and view (desktop, tablet, phone), and light or dark. Mock data comes from <a href="../mock-data.md">mock-data.md</a>.</p>
<div class="toolrow"><a class="btn primary" href="execute.html">Try test execution</a><a class="btn" href="repository.html">Open the repository</a><a class="btn" href="#decisions">Jump to the decisions</a></div></header>
<h2 style="margin-bottom:4px">By job</h2>
<p class="meta" style="margin-bottom:8px">One group per job a person does, not per page.</p>
${jobsHtml}
<h2 id="decisions" style="margin:36px 0 6px">Decisions ${DECISIONS.length} to answer</h2>
<p class="meta" style="max-width:80ch">Numbers are stable: D1 to D12 are the research D-1 to D-12, D13 to D17 are the five open UX defaults, D18 and D19 the two spec gaps in the UAT plan, D20 to D26 spec contradictions found while writing requirements, D27 found while drawing. Journey-map questions will be added later as D-J1 and up. Answers are saved in this browser; use Copy answers to paste them to the team.</p>
<div class="toolrow"><label class="row">Show <select class="in" id="dfilter" style="width:auto"><option value="all">All jobs</option>${JOBS.map((j) => `<option value="${j.id}">${j.name}</option>`).join('')}</select></label><button class="btn" id="copyans" type="button">${ic('copy')}Copy answers</button></div>
<div class="tblwrap"><table class="dtable"><thead><tr><th scope="col">ID</th><th scope="col">Question</th><th scope="col">Options</th><th scope="col">Recommendation and why</th><th scope="col">Seen on</th><th scope="col">Owner answer</th></tr></thead><tbody>${rows}</tbody></table></div>
<h2 id="not-drawn" style="margin:36px 0 8px">Screens not drawn</h2><p class="meta" style="max-width:80ch">Only the repository, run detail and test execution are drawn here. The other screens are reviewed in the real build, which uses the recommended defaults. Their decisions are still in the table above.</p>
<h2 style="margin:36px 0 8px">Where these mockups differ from DESIGN.md</h2>
<ul class="list-plain small" style="max-width:90ch">
<li>Sidebar active item uses a filled background, bold text and an accent icon instead of a 3px accent marker (a coloured side stripe is a known visual weak point; the tokens are unchanged).</li>
<li>Pass rate is shown as passed out of all tests with completion beside it (D23), so the Web smoke run reads 53% passed and 63% complete. mock-data.md says "62% done" for the same counts; 24 of 38 is 63%.</li>
<li>Repository shows the mock-data counts (Login 12, 120 cases), not the wireframe's 18 and 212. The list scrolls with a count instead of page buttons (D3).</li>
<li>Statuses are Passed, Failed, Blocked, Retest, Untested (default Untested). Skipped stays an open question (D12).</li>
<li>CI tokens are drawn as separate tokens with scope and expiry (D25), the project list is at /projects, and the workspace switch sits in the top bar.</li>
<li>Phones are read-only for everyone including testers (D13). The execution mockup has a mock switch to preview the quick-result option.</li>
</ul>
</main>
<div class="toasts" id="toasts"></div><div class="sr" id="live" aria-live="polite"></div>
<script src="app.js"></script></body></html>`;
files['index.html'] = hub;
for (const [f, c0] of Object.entries(files)) {
  if (!BUILT.includes(f)) continue;
  let c = c0.replace(/href="([a-z-]+\.html)(#[^"]*)?"/g, (m, h, hash) => BUILT.includes(h) ? m : 'href="index.html#not-drawn" title="Not drawn in this round. The real screen is being built."');
  fs.writeFileSync(path.join(OUT, f), c);
}
console.log(Object.keys(files).length + ' files');
