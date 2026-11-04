/* TestBuddy proposal mockups: role/state/theme/width switchers, small interactions, and the test-execution demo.
   Vanilla JS, no dependencies. Everything non-essential is wrapped so the pages still read without it. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  var root = document.documentElement;
  var app = $('.app');
  var live = $('#live');
  function announce(t) { if (live) { live.textContent = ''; setTimeout(function () { live.textContent = t; }, 30); } }

  /* ---------- theme ---------- */
  var theme = store.get('tb-theme', window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  function applyTheme() {
    root.classList.toggle('dark', theme === 'dark');
    $$('[data-theme-set]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.themeSet === theme)); });
  }
  $$('[data-theme-set]').forEach(function (b) { b.addEventListener('click', function () { theme = b.dataset.themeSet; store.set('tb-theme', theme); applyTheme(); }); });
  applyTheme();

  /* ---------- width ---------- */
  var width = store.get('tb-width', 'desktop');
  function applyWidth() {
    if (app) { app.classList.toggle('w-tablet', width === 'tablet'); app.classList.toggle('w-phone', width === 'phone'); }
    $$('[data-w]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.w === width)); });
    refresh();
  }
  $$('[data-w]').forEach(function (b) { b.addEventListener('click', function () { width = b.dataset.w; store.set('tb-width', width); applyWidth(); }); });

  /* ---------- role + state ---------- */
  var role = store.get('tb-role', 'admin');
  var state = 'ready';
  var body = document.body;
  var need = (body.dataset.need || '').split(' ').filter(Boolean);
  function isPhone() { return app && app.getBoundingClientRect().width < 768; }
  function applyAllow() {
    root.dataset.role = role;
    $$('[data-allow]').forEach(function (el) {
      var ok = el.dataset.allow.split(' ').indexOf(role) > -1;
      var mode = el.dataset.mode || 'hide';
      if (mode === 'hide') { el.hidden = !ok; }
      else {
        el.hidden = false;
        if (!ok) { el.setAttribute('aria-disabled', 'true'); el.setAttribute('title', el.dataset.reason || 'Your role cannot do this.'); }
        else if (!(state === 'closed' && el.hasAttribute('data-wr'))) { el.removeAttribute('aria-disabled'); el.removeAttribute('title'); }
      }
    });
    $$('[data-wr]').forEach(function (el) {
      if (state === 'closed') { el.setAttribute('aria-disabled', 'true'); el.setAttribute('title', 'This run is closed.'); }
      else if (!el.hasAttribute('data-allow')) { el.removeAttribute('aria-disabled'); el.removeAttribute('title'); }
    });
    $$('[data-closed-hide]').forEach(function (el) { el.hidden = state === 'closed'; });
    $$('[data-closed-show]').forEach(function (el) { el.hidden = state !== 'closed'; });
    $$('[data-phone-show]').forEach(function (el) { el.hidden = !isPhone(); });
    $$('[data-role-text]').forEach(function (el) { el.textContent = role; });
  }
  var slot = $('#stslot');
  var generic = {
    loading: '<div aria-busy="true" aria-label="Loading"><div class="skel h"></div><div class="skel r"></div><div class="skel r"></div><div class="skel r"></div><div class="skel r"></div><div class="skel r" style="width:70%"></div></div><p class="state-note">Loading state: skeleton in the final geometry, no spinner page.</p>',
    error: '<div class="empty" role="alert"><div class="art"><svg class="ic lg"><use href="#i-alert"/></svg></div><h3>Could not load this page</h3><p>The server did not answer. Your changes are safe. Check your connection and try again.</p><button class="btn primary" type="button" data-retry>Retry</button></div>',
    noperm: '<div class="empty"><div class="art"><svg class="ic lg"><use href="#i-lock"/></svg></div><h3>You do not have access to this project</h3><p>Ask an admin to add you. The project switcher still works.</p><a class="btn" href="projects.html">Back to projects</a></div>'
  };
  function setState(s) {
    state = s;
    if (app) app.dataset.state = s;
    $$('[data-st]').forEach(function (el) {
      var k = el.dataset.st;
      var show = (k === 'ready' && (s === 'ready' || s === 'closed')) || k === s;
      if (s === 'loading' || s === 'error' || s === 'noperm') show = false;
      el.hidden = !show;
    });
    if (slot) { slot.innerHTML = generic[s] || ''; slot.hidden = !generic[s]; }
    $$('[data-state-set]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.stateSet === s)); });
    applyAllow(); refresh();
    announce('State: ' + s);
  }
  function applyRole() {
    $$('[data-role-set]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.roleSet === role)); });
    var forced = need.length && need.indexOf(role) === -1;
    if (forced) { setState('noperm'); } else if (state === 'noperm' && body.dataset.autoperm === '1') { setState('ready'); }
    body.dataset.autoperm = forced ? '1' : '';
    applyAllow(); refresh();
  }
  $$('[data-role-set]').forEach(function (b) { b.addEventListener('click', function () { role = b.dataset.roleSet; store.set('tb-role', role); applyRole(); announce('Role: ' + role); }); });
  $$('[data-state-set]').forEach(function (b) { b.addEventListener('click', function () { setState(b.dataset.stateSet); }); });
  document.addEventListener('click', function (e) { if (e.target.closest('[data-retry]')) { setState('ready'); toast('Loaded.'); } });

  /* ---------- toast ---------- */
  var toasts = $('#toasts');
  function toast(msg, opts) {
    opts = opts || {};
    if (!toasts) return;
    var t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status');
    var s = document.createElement('span'); s.textContent = msg; t.appendChild(s);
    var timer;
    function close() { clearTimeout(timer); t.remove(); }
    if (opts.undo) { var b = document.createElement('button'); b.className = 'btn sm'; b.type = 'button'; b.textContent = 'Undo'; b.addEventListener('click', function () { opts.undo(); close(); }); t.appendChild(b); }
    toasts.appendChild(t);
    while (toasts.children.length > 3) toasts.firstChild.remove();
    timer = setTimeout(close, opts.ms || (opts.undo ? 10000 : 3500));
    return close;
  }
  window.tbToast = toast;
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-toast]');
    if (el && el.getAttribute('aria-disabled') !== 'true') { e.preventDefault(); toast(el.dataset.toast); }
    else if (el) { e.preventDefault(); toast(el.getAttribute('title') || 'Not available.'); }
  });

  /* ---------- dialogs ---------- */
  document.addEventListener('click', function (e) {
    var o = e.target.closest('[data-open]');
    if (o && o.getAttribute('aria-disabled') !== 'true') { var d = document.getElementById(o.dataset.open); if (d && d.showModal) d.showModal(); }
    var c = e.target.closest('[data-close]');
    if (c) { var dd = c.closest('dialog'); if (dd) dd.close(); }
  });
  $$('dialog').forEach(function (d) { d.addEventListener('click', function (e) { if (e.target === d) d.close(); }); });

  /* ---------- tabs ---------- */
  $$('[role=tablist]').forEach(function (tl) {
    var tabs = $$('[role=tab]', tl);
    function sel(t) {
      tabs.forEach(function (x) { var on = x === t; x.setAttribute('aria-selected', String(on)); x.tabIndex = on ? 0 : -1; var p = document.getElementById(x.getAttribute('aria-controls')); if (p) p.hidden = !on; });
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { sel(t); });
      t.addEventListener('keydown', function (e) {
        var n = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : -1;
        if (n >= 0) { n = (n + tabs.length) % tabs.length; sel(tabs[n]); tabs[n].focus(); e.preventDefault(); }
      });
    });
    var first = tabs.filter(function (t) { return t.getAttribute('aria-selected') === 'true'; })[0] || tabs[0];
    if (first) sel(first);
  });

  /* ---------- menu, tree, inspector ---------- */
  var mb = $('.menubtn'); var lay = $('.layout');
  if (mb && lay) mb.addEventListener('click', function () { var o = lay.classList.toggle('nav-open'); mb.setAttribute('aria-expanded', String(o)); });
  var tb = $('.treebtn'); var split = $('.split');
  if (tb && split) tb.addEventListener('click', function () { var o = split.classList.toggle('tree-open'); tb.setAttribute('aria-expanded', String(o)); });
  $$('.tree .node').forEach(function (n) {
    n.addEventListener('click', function () {
      $$('.tree .node').forEach(function (x) { x.setAttribute('aria-selected', 'false'); });
      n.setAttribute('aria-selected', 'true');
      var h = $('#listtitle'); if (h) h.textContent = n.dataset.title || n.textContent.trim();
    });
  });
  $$('[data-case]').forEach(function (r) {
    function pick() {
      $$('[data-case]').forEach(function (x) { x.removeAttribute('aria-selected'); });
      r.setAttribute('aria-selected', 'true');
      var i = $('#insp'); if (i) { $$('[data-fill]', i).forEach(function (f) { var v = r.dataset[f.dataset.fill]; if (v) f.textContent = v; }); }
      if (split) split.classList.add('insp-open'); if (split && window.getComputedStyle($('.pane-insp')).display !== 'none' && app.getBoundingClientRect().width >= 1280) split.classList.remove('insp-open');
    }
    r.addEventListener('click', function (e) { if (e.target.closest('input,a,button')) return; pick(); });
    r.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.target.closest('input,a,button')) pick(); });
  });
  $$('[data-insp-back]').forEach(function (b) { b.addEventListener('click', function () { if (split) split.classList.remove('insp-open'); }); });

  /* list navigation: J/K on rows with tabindex */
  function rowNav(e, sel) {
    var rows = $$(sel); if (!rows.length) return false;
    var i = rows.indexOf(document.activeElement.closest(sel));
    if (e.key === 'j' || e.key === 'ArrowDown') { (rows[Math.min(rows.length - 1, i + 1)]).focus(); return true; }
    if (e.key === 'k' || e.key === 'ArrowUp') { (rows[Math.max(0, i - 1)]).focus(); return true; }
    return false;
  }

  /* ---------- selection counts (repository, run-new) ---------- */
  var tbl = $('table[data-selectable]');
  if (tbl) {
    var chks = $$('.rowchk', tbl); var all = $('#selall'); var cnt = $$('[data-selcount]'); var bulk = $('#bulk'); var cb = $('#createbtn');
    var extra = parseInt(tbl.dataset.extra || '0', 10);
    var upd = function () {
      var n = chks.filter(function (c) { return c.checked; }).length + (window.__allMatch ? extra : 0);
      cnt.forEach(function (c) { c.textContent = n; });
      if (bulk) bulk.hidden = n === 0;
      if (cb) { var base = cb.dataset.label || 'Create run with {n} tests'; cb.textContent = base.replace('{n}', n); cb.disabled = n === 0; }
      var sm = $('#selsum'); if (sm) sm.textContent = n === 0 ? 'No tests selected yet.' : n + ' selected. P1 ' + Math.round(n * .3) + ', P2 ' + Math.round(n * .5) + ', P3 ' + (n - Math.round(n * .3) - Math.round(n * .5)) + '. About ' + Math.round(n * 2.6) + ' min.';
      chks.forEach(function (c) { var tr = c.closest('tr'); tr.classList.toggle('sel', c.checked); });
    };
    chks.forEach(function (c) { c.addEventListener('change', upd); });
    if (all) all.addEventListener('change', function () { chks.forEach(function (c) { c.checked = all.checked; }); upd(); });
    var am = $('#allmatch'); if (am) am.addEventListener('click', function () { window.__allMatch = true; chks.forEach(function (c) { c.checked = true; }); am.textContent = 'All ' + (chks.length + extra) + ' matching tests selected'; am.setAttribute('aria-disabled', 'true'); upd(); });
    var clr = $('#clearsel'); if (clr) clr.addEventListener('click', function () { window.__allMatch = false; chks.forEach(function (c) { c.checked = false; }); if (all) all.checked = false; if (am) { am.textContent = am.dataset.label; am.removeAttribute('aria-disabled'); } upd(); });
    upd();
  }

  /* ---------- help overlay ---------- */
  var help = $('#help');
  var singleKey = store.get('tb-single', '1') === '1';
  var sk = $('#singlekey');
  if (sk) { sk.checked = singleKey; sk.addEventListener('change', function () { singleKey = sk.checked; store.set('tb-single', singleKey ? '1' : '0'); toast(singleKey ? 'Single-key shortcuts are on.' : 'Single-key shortcuts are off. Buttons still work.'); }); }
  function typing(t) { return t && t.closest && (t.closest('input,textarea,select,[contenteditable=true]') && !(t.type === 'checkbox')); }

  document.addEventListener('keydown', function (e) {
    if (e.defaultPrevented) return;
    if (e.key === '?' && !typing(e.target) && help && !help.open) { help.showModal(); e.preventDefault(); return; }
    var d = document.querySelector('dialog[open]');
    if (d) return;
    if (!typing(e.target) && singleKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
      if (e.key === '/') { var q = $('.in.q, #gsearch'); if (q) { q.focus(); e.preventDefault(); } }
      if ($('.split table, #runtable') && rowNav(e, 'tr[tabindex]')) e.preventDefault();
      if (e.key === 'n' && $('#runtable')) { location.href = 'execute.html'; }
    }
  });

  /* ---------- execution demo ---------- */
  var X = $('#xdata');
  var ex = null;
  function initExec() {
    var data = JSON.parse(X.textContent);
    var tests = data.tests; var base = data.counts; var total = data.total;
    var cur = 0, pending = null, offline = false, unsent = [], seconds = 0, lastUndo = null;
    var advance = true;
    var el = {
      title: $('#x-title'), ref: $('#x-ref'), pos: $('#x-pos'), steps: $('#x-steps'), pre: $('#x-pre'), hist: $('#x-hist'), meta: $('#x-meta'), newer: $('#x-newer'),
      bar: $('#x-bar'), legend: $('#x-legend'), done: $('#x-done'), left: $('#x-left'), comment: $('#x-comment'), msg: $('#x-msg'), timer: $('#x-timer'),
      unsent: $('#x-unsent'), live: $('#x-live'), roBar: $('#x-ro'), roWhy: $('#x-rowhy'), roLatest: $('#x-rolatest'), end: $('#x-end'), main: $('#x-main'), save: $('#x-save')
    };
    var names = { passed: 'Passed', failed: 'Failed', blocked: 'Blocked', retest: 'Retest', untested: 'Untested' };
    var icons = { passed: 'i-passed', failed: 'i-failed', blocked: 'i-blocked', retest: 'i-retest', untested: 'i-untested' };
    var keyOf = { p: 'passed', f: 'failed', b: 'blocked', r: 'retest' };
    function stBadge(s) { return '<span class="st st-' + s + '"><svg class="ic"><use href="#' + icons[s] + '"/></svg>' + names[s] + '</span>'; }
    function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
    function counts() {
      var c = JSON.parse(JSON.stringify(base)); c.untested = base.untested - tests.length;
      tests.forEach(function (t) { c[t.result || 'untested']++; });
      return c;
    }
    function drawProgress() {
      var c = counts(); var order = ['passed', 'failed', 'blocked', 'retest', 'untested'];
      el.bar.innerHTML = order.map(function (k) { return '<i class="s-' + k + (k === 'passed' ? '' : ' tb-pattern-' + k) + '" style="--n:' + c[k] + '"></i>'; }).join('');
      var label = total + ' tests: ' + order.map(function (k) { return c[k] + ' ' + names[k].toLowerCase(); }).join(', ');
      el.bar.setAttribute('aria-label', label);
      el.legend.innerHTML = order.map(function (k) { return '<span><svg class="ic" style="color:var(--tb-status-' + k + '-text)"><use href="#' + icons[k] + '"/></svg>' + names[k] + ' <b>' + c[k] + '</b></span>'; }).join('');
      var done = total - c.untested;
      el.done.textContent = done + ' of ' + total + ' tests recorded (' + Math.round(done * 100 / total) + '%)';
      el.left.textContent = 'Untested left: ' + c.untested;
    }
    function readOnlyReason() {
      if (role === 'viewer') return 'Viewers can read results but not record them.';
      if (state === 'closed') return 'This run is closed. Results can no longer be changed.';
      if (isPhone() && !window.__quick) return 'Open on a larger screen to edit.';
      return '';
    }
    function ro() { return !!readOnlyReason(); }
    function render() {
      var t = tests[cur];
      el.main.hidden = false; el.end.hidden = true;
      el.ref.textContent = t.ref; el.title.textContent = t.title;
      el.pos.textContent = 'Test ' + (t.n) + ' of ' + total;
      el.meta.innerHTML = '<span class="pri pri-' + t.pri + '"><svg class="ic"><use href="#i-p' + t.pri + '"/></svg>P' + t.pri + '</span> <span class="badge">' + esc(t.sec) + '</span> <span class="badge">Snapshot v' + t.ver + '</span>' + (t.result ? ' ' + stBadge(t.result) : ' ' + stBadge('untested'));
      el.newer.hidden = !t.newer;
      el.pre.textContent = t.pre;
      el.steps.innerHTML = t.steps.map(function (s, i) {
        var sr = t.stepRes[i];
        var btns = ['passed', 'failed', 'blocked', 'retest'].map(function (k) { return '<button type="button" class="sbtn ' + k + '" data-step="' + i + '" data-k="' + k + '" aria-pressed="' + (sr === k) + '" ' + (ro() ? 'disabled' : '') + '><svg class="ic"><use href="#' + icons[k] + '"/></svg>' + names[k] + '</button>'; }).join('');
        return '<li class="step' + (i === t.focusStep ? ' active' : '') + '"><span class="n">' + (i + 1) + '</span><div><div>' + esc(s.d) + '</div><div class="exp">Expected: ' + esc(s.e) + '</div><div class="srow" role="group" aria-label="Result for step ' + (i + 1) + '">' + btns + '</div></div></li>';
      }).join('');
      el.hist.innerHTML = t.hist.length ? t.hist.map(function (h) { return '<li>' + stBadge(h.st) + ' <span>' + esc(h.who) + ', ' + esc(h.when) + (h.v ? ' <span class="badge">' + h.v + '</span>' : '') + '</span>' + (h.note ? '<span class="muted">' + esc(h.note) + '</span>' : '') + '</li>'; }).join('') : '<li class="muted">No earlier results. This is the first run of this case on a build.</li>';
      $$('.rbtn').forEach(function (b) { var k = b.dataset.k; b.setAttribute('aria-pressed', String((pending || t.result) === k)); });
      el.comment.value = t.comment || ''; el.msg.hidden = true;
      seconds = t.secs || 0; showTimer();
      drawProgress(); applyRo();
      $$('[data-q]').forEach(function (a) { a.setAttribute('aria-current', a.dataset.q == t.n ? 'true' : 'false'); });
    }
    function applyRo() {
      var why = readOnlyReason(); var t = tests[cur];
      $('#x-live').hidden = !!why; el.roBar.hidden = !why;
      if (why) { el.roWhy.textContent = why; el.roLatest.innerHTML = t.result ? 'Latest result: ' + stBadge(t.result) + ' ' + esc(t.comment || '') : (t.hist[0] ? 'Latest result: ' + stBadge(t.hist[0].st) + ' ' + esc(t.hist[0].who + ', ' + t.hist[0].when) : 'No result yet.'); }
      var hs = $('#x-helpwhy'); if (hs) { hs.hidden = !why; if (why) hs.textContent = 'Result keys are off right now. ' + why; }
      $$('.sbtn').forEach(function (b) { b.disabled = !!why; });
    }
    function showTimer() { var m = Math.floor(seconds / 60), s = seconds % 60; el.timer.textContent = (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s; }
    setInterval(function () { if (!document.hidden && !ro() && !el.main.hidden) { seconds++; tests[cur].secs = seconds; showTimer(); } }, 1000);
    function nextUntested(from) {
      for (var k = 1; k <= tests.length; k++) { var i = (from + k) % tests.length; if (!tests[i].result && i !== from) return i; }
      return -1;
    }
    function goto(i) { pending = null; cur = Math.max(0, Math.min(tests.length - 1, i)); render(); }
    function focusFirst() { var b = $('.rbtn[data-k=passed]'); if (b) b.focus(); }
    function setPending(k) {
      pending = k;
      $$('.rbtn').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.k === k)); });
      el.comment.focus();
      el.msg.hidden = false; el.msg.querySelector('span').textContent = names[k] + ' needs a comment. Type what happened, then press Ctrl or Cmd + Enter to save and continue.';
      announce(names[k] + ' selected. Comment required.');
    }
    function commit(k) {
      if (ro()) { toast(readOnlyReason()); return; }
      var t = tests[cur];
      if ((k === 'failed' || k === 'blocked') && !el.comment.value.trim()) { setPending(k); return; }
      var prev = { result: t.result, comment: t.comment, idx: cur };
      t.result = k; t.comment = el.comment.value.trim(); pending = null;
      if (offline) { unsent.push(t.ref); drawUnsent(); }
      var from = cur;
      var nx = advance ? nextUntested(cur) : -1;
      if (nx >= 0) cur = nx;
      render();
      if (nx >= 0) focusFirst(); else if (advance) { el.main.hidden = true; el.end.hidden = false; $('#x-endlink').focus(); }
      var msg = offline ? 'Saved on this device: ' + names[k] + ' for ' + t.ref + '. Will send when you are back online.' : 'Saved ' + names[k] + ' for ' + t.ref + '.';
      toast(msg, { undo: function () { tests[prev.idx].result = prev.result; tests[prev.idx].comment = prev.comment; if (offline) unsent.pop(); drawUnsent(); cur = prev.idx; el.main.hidden = false; el.end.hidden = true; render(); announce('Undone. ' + t.ref + ' is back to ' + (prev.result ? names[prev.result] : 'Untested') + '.'); } });
      announce('Saved ' + names[k] + ' for ' + t.ref + (nx >= 0 ? '. Now on ' + tests[cur].ref : ''));
    }
    function clearResult() {
      var t = tests[cur]; if (ro()) return; var prev = t.result; t.result = null; t.comment = ''; pending = null; render(); toast('Cleared result for ' + t.ref + '.', { undo: function () { t.result = prev; render(); } });
    }
    function setStep(i, k) {
      if (ro()) return; var t = tests[cur]; t.stepRes[i] = t.stepRes[i] === k ? null : k; t.focusStep = i;
      if (t.stepRes[i] === 'failed') { render(); setPending('failed'); return; }
      if (t.stepRes.every(function (x) { return x === 'passed'; })) { pending = 'passed'; announce('All steps passed. Passed is selected. Press S to save and continue.'); }
      render();
    }
    function drawUnsent() { el.unsent.hidden = unsent.length === 0; el.unsent.querySelector('b').textContent = unsent.length; }
    var off = $('#x-offline');
    if (off) off.addEventListener('change', function () {
      offline = off.checked;
      if (!offline && unsent.length) { toast('Back online. Sent ' + unsent.length + ' saved result' + (unsent.length > 1 ? 's' : '') + '.'); unsent = []; drawUnsent(); }
      else toast(offline ? 'Offline. Results are kept on this device and sent later.' : 'Online.');
    });
    var qk = $('#x-quick'); if (qk) qk.addEventListener('change', function () { window.__quick = qk.checked; render(); toast(qk.checked ? 'Preview: quick result on phones (D13 option B).' : 'Phones are read-only (D13 option A).'); });
    var adv = $('#x-advance'); if (adv) adv.addEventListener('change', function () { advance = adv.checked; toast(advance ? 'Advance after result is on.' : 'Advance after result is off. Use S or N to move on.'); });
    document.addEventListener('click', function (e) {
      var rb = e.target.closest('.rbtn'); if (rb) { var k = rb.dataset.k; (k === 'failed' || k === 'blocked') ? (el.comment.value.trim() ? commit(k) : setPending(k)) : commit(k); return; }
      var sb = e.target.closest('.sbtn'); if (sb) { setStep(+sb.dataset.step, sb.dataset.k); return; }
      var q = e.target.closest('[data-q]'); if (q) { e.preventDefault(); goto(tests.findIndex(function (t) { return t.n == q.dataset.q; })); return; }
      if (e.target.closest('#x-prev')) goto(cur - 1);
      if (e.target.closest('#x-next')) goto(cur + 1);
      if (e.target.closest('#x-save')) { if (pending) commit(pending); else if (tests[cur].result) { var n = nextUntested(cur); if (n >= 0) { goto(n); focusFirst(); } } else toast('Pick a status first.'); }
      if (e.target.closest('#x-clear')) clearResult();
    });
    document.addEventListener('keydown', function (e) {
      var inInput = typing(e.target);
      if (document.querySelector('dialog[open]')) return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { if (pending) { commit(pending); } else if (tests[cur].result) { var n = nextUntested(cur); if (n >= 0) goto(n); } e.preventDefault(); return; }
      if (inInput || e.ctrlKey || e.metaKey || e.altKey || !singleKey) return;
      if (ro()) { if ('pfbrjk'.indexOf(e.key.toLowerCase()) > -1 && e.key.length === 1) toast(readOnlyReason()); if (e.key === 'j') goto(cur + 1); if (e.key === 'k') goto(cur - 1); return; }
      var key = e.key.toLowerCase();
      if (e.shiftKey && keyOf[key]) { setStep(tests[cur].focusStep || 0, keyOf[key]); e.preventDefault(); return; }
      if (keyOf[key]) { var kk = keyOf[key]; (kk === 'failed' || kk === 'blocked') ? setPending(kk) : commit(kk); e.preventDefault(); }
      else if (key === 'j') goto(cur + 1);
      else if (key === 'k') goto(cur - 1);
      else if (key === 'n') { var n2 = nextUntested(cur); if (n2 >= 0) goto(n2); else toast('No untested tests left in this filter.'); }
      else if (key === 'u') clearResult();
      else if (key === 'c') { el.comment.focus(); e.preventDefault(); }
      else if (key === 'a') toast('Attach: drop a file, or paste an image anywhere on this page (25 MB limit).');
      else if (key === 's') { if (pending) commit(pending); else if (tests[cur].result) { var n3 = nextUntested(cur); if (n3 >= 0) goto(n3); } }
      else if (key === '[') { var t = tests[cur]; t.focusStep = Math.max(0, (t.focusStep || 0) - 1); render(); }
      else if (key === ']') { var t2 = tests[cur]; t2.focusStep = Math.min(t2.steps.length - 1, (t2.focusStep || 0) + 1); render(); }
      else if (e.key === 'Escape') location.href = 'run.html';
    });
    ex = { render: render, applyRo: applyRo };
    tests.forEach(function (t, i) { t.stepRes = []; t.focusStep = 0; t.n = t.n || (i + 1); });
    goto(0);
  }
  if (X) initExec();

  /* ---------- hub: owner answers ---------- */
  $$('textarea[data-did]').forEach(function (ta) {
    ta.value = store.get('tb-ans-' + ta.dataset.did, '');
    ta.addEventListener('input', function () { store.set('tb-ans-' + ta.dataset.did, ta.value); });
  });
  var copy = $('#copyans');
  if (copy) copy.addEventListener('click', function () {
    var out = $$('textarea[data-did]').map(function (t) { return t.dataset.did + ': ' + (t.value.trim() || '(no answer yet)'); }).join('\n');
    var done = function () { toast('Copied ' + $$('textarea[data-did]').length + ' rows.'); };
    if (navigator.clipboard) navigator.clipboard.writeText(out).then(done, function () { window.prompt('Copy:', out); }); else window.prompt('Copy:', out);
  });
  var fsel = $('#dfilter');
  if (fsel) fsel.addEventListener('change', function () {
    $$('.dtable tbody tr[data-job]').forEach(function (r) { r.hidden = fsel.value !== 'all' && r.dataset.job.split(' ').indexOf(fsel.value) === -1; });
  });

  function refresh() { applyAllow(); if (ex) ex.applyRo(); }
  window.addEventListener('resize', refresh);
  if (app && 'ResizeObserver' in window) new ResizeObserver(refresh).observe(app);
  applyWidth(); applyRole(); setState('ready');
  if (need.length && need.indexOf(role) === -1) setState('noperm');
  var hash = location.hash.replace('#', '');
  if (hash.indexOf('state=') === 0) setState(hash.slice(6));
})();
