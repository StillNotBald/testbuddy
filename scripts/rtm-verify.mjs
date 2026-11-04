#!/usr/bin/env node
/*
 * Copyright 2026 TestBuddy contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * Portions adapted from the NoPM project (Apache-2.0).
 */

/**
 * rtm-verify.mjs: requirements traceability checker (no dependencies).
 *
 * Reads requirements/REQUIREMENTS.md (canonical) and requirements/TRACEABILITY.md (RTM) and checks:
 *   1. Every R-ID defined in REQUIREMENTS has exactly one RTM row, and every RTM row has a requirement.
 *   2. Status (and milestone and title) match between the two files; status is a legal value.
 *   3. Every backticked path in the RTM Code and Tests columns exists in the repo.
 *   4. A DONE row lists at least one test path.
 *   5. R-IDs mentioned in prose resolve to a defined requirement.
 *
 * Exit 0 = all checks pass. Exit 1 = one or more problems (each printed).
 * Usage (repo root): node scripts/rtm-verify.mjs
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REQ_FILE = resolve(ROOT, 'requirements/REQUIREMENTS.md');
const RTM_FILE = resolve(ROOT, 'requirements/TRACEABILITY.md');

const STATUSES = ['DONE', 'PARTIAL', 'TODO', 'DEFERRED'];
const ID_RE = /R-\d{3,}/;
const problems = [];
const fail = (msg) => problems.push(msg);

function read(file) {
  if (!existsSync(file)) {
    console.error(`rtm-verify: missing ${relative(ROOT, file)}`);
    process.exit(1);
  }
  return readFileSync(file, 'utf8');
}

/** Requirement definition lines: "- **R-001** Title. Acceptance: ... Milestone: M1. — **TODO**" */
function parseRequirements(text) {
  const defs = new Map();
  const refs = new Set();
  text.split('\n').forEach((line, i) => {
    const m = line.match(/^- \*\*(R-\d+)\*\*\s+(.*)$/);
    if (!m) {
      for (const r of line.match(/R-\d{3,}/g) ?? []) refs.add(`${r}@${i + 1}`);
      return;
    }
    const [, id, rest] = m;
    if (!new RegExp(`^${ID_RE.source}$`).test(id)) fail(`${id}: malformed R-ID (expected R-NNN) at REQUIREMENTS.md:${i + 1}`);
    if (defs.has(id)) {
      fail(`${id}: defined more than once in REQUIREMENTS.md (lines ${defs.get(id).line} and ${i + 1})`);
      return;
    }
    const statusMatches = [...rest.matchAll(/\*\*([A-Z]+)\*\*/g)].map((x) => x[1]);
    const status = statusMatches.at(-1);
    if (!status || !STATUSES.includes(status)) {
      fail(`${id}: no valid status (one of ${STATUSES.join('/')}) at the end of its REQUIREMENTS.md line ${i + 1}`);
    }
    const title = rest.split(/\. Acceptance:/)[0].trim();
    if (!/Acceptance:/.test(rest)) fail(`${id}: line ${i + 1} has no "Acceptance:" clause`);
    const ms = rest.match(/Milestone:\s*(M\d+b?)\b/)?.[1];
    if (!ms) fail(`${id}: line ${i + 1} has no "Milestone: Mn"`);
    for (const r of rest.match(/R-\d{3,}/g) ?? []) if (r !== id) refs.add(`${r}@${i + 1}`);
    defs.set(id, { status, title, ms, line: i + 1 });
  });
  return { defs, refs };
}

/** RTM rows: | R-ID | Title | Milestone | Status | Spec | Code | Tests | */
function parseRtm(text) {
  const rows = new Map();
  text.split('\n').forEach((line, i) => {
    if (!/^\|\s*R-\d+\s*\|/.test(line)) return;
    const cols = line.split('|').slice(1, -1).map((c) => c.trim());
    const id = cols[0];
    if (cols.length !== 7) {
      fail(`${id}: RTM row at TRACEABILITY.md:${i + 1} has ${cols.length} columns, expected 7 (R-ID, Title, Milestone, Status, Spec, Code, Tests)`);
      return;
    }
    if (rows.has(id)) {
      fail(`${id}: more than one RTM row (TRACEABILITY.md lines ${rows.get(id).line} and ${i + 1})`);
      return;
    }
    const [, title, ms, status, spec, code, tests] = cols;
    rows.set(id, { title, ms, status, spec, paths: { Code: pathsIn(code), Tests: pathsIn(tests) }, line: i + 1 });
  });
  return rows;
}

/** Backticked tokens in a cell that look like paths. Tokens with whitespace are commands and are skipped. */
function pathsIn(cell) {
  const out = [];
  for (const m of cell.matchAll(/`([^`]+)`/g)) {
    const tok = m[1].trim();
    if (!tok || /\s/.test(tok) || /^https?:\/\//.test(tok)) continue;
    out.push(tok.replace(/#.*$/, '').replace(/:\d+(-\d+)?$/, ''));
  }
  return out;
}

const { defs, refs } = parseRequirements(read(REQ_FILE));
const rtm = parseRtm(read(RTM_FILE));

// 1 and 2: id coverage, status, milestone, title
for (const [id, d] of defs) {
  const r = rtm.get(id);
  if (!r) {
    fail(`${id}: defined in REQUIREMENTS.md but has no row in TRACEABILITY.md`);
    continue;
  }
  if (!STATUSES.includes(r.status)) fail(`${id}: RTM status "${r.status}" is not one of ${STATUSES.join('/')}`);
  else if (r.status !== d.status) fail(`${id}: status differs (REQUIREMENTS=${d.status}, TRACEABILITY=${r.status})`);
  if (d.ms && r.ms !== d.ms) fail(`${id}: milestone differs (REQUIREMENTS=${d.ms}, TRACEABILITY=${r.ms})`);
  if (r.title !== d.title) fail(`${id}: title differs (REQUIREMENTS="${d.title}", TRACEABILITY="${r.title}")`);
}
for (const id of rtm.keys()) {
  if (!defs.has(id)) fail(`${id}: has an RTM row but no requirement in REQUIREMENTS.md`);
}

// 3 and 4: paths exist, DONE has a test
for (const [id, r] of rtm) {
  for (const col of ['Code', 'Tests']) {
    for (const p of r.paths[col]) {
      const abs = resolve(ROOT, p);
      const rel = relative(ROOT, abs);
      if (isAbsolute(p) || rel.startsWith('..')) fail(`${id}: ${col} path "${p}" is outside the repository`);
      else if (!existsSync(abs)) fail(`${id}: ${col} path "${p}" does not exist`);
    }
  }
  if (r.status === 'DONE' && r.paths.Tests.length === 0) {
    fail(`${id}: status is DONE but the Tests column lists no test path`);
  }
}

// 5: cross references in prose
for (const ref of refs) {
  const [id, line] = ref.split('@');
  if (!defs.has(id)) fail(`${id}: referenced at REQUIREMENTS.md:${line} but not defined`);
}

if (problems.length) {
  console.error(`RTM check failed (${problems.length} problem${problems.length === 1 ? '' : 's'}):`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}

const tally = {};
for (const d of defs.values()) tally[d.status] = (tally[d.status] ?? 0) + 1;
const summary = STATUSES.filter((s) => tally[s]).map((s) => `${tally[s]} ${s}`).join(', ');
console.log(`RTM OK: ${defs.size} requirements in sync (${summary}).`);
