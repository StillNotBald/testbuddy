#!/usr/bin/env node
// Downloads the PINNED PocketBase release for this OS/arch, verifies SHA-256 against the
// release's checksums.txt, and extracts to bin/pocketbase. Node built-ins + system `unzip` only.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const VERSION = '0.40.6';
const BASE = `https://github.com/pocketbase/pocketbase/releases/download/v${VERSION}`;

const osMap = { darwin: 'darwin', linux: 'linux' };
const archMap = { x64: 'amd64', arm64: 'arm64' };
const os = osMap[process.platform];
const arch = archMap[process.arch];
if (!os || !arch) {
  console.error(`Unsupported platform ${process.platform}/${process.arch} (need darwin|linux x amd64|arm64)`);
  process.exit(1);
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const binDir = join(root, 'bin');
const target = join(binDir, 'pocketbase');
const asset = `pocketbase_${VERSION}_${os}_${arch}.zip`;

async function fetchBuf(url) {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

const work = mkdtempSync(join(tmpdir(), 'pb-'));
try {
  console.log(`Downloading ${asset} ...`);
  const [zip, sums] = await Promise.all([fetchBuf(`${BASE}/${asset}`), fetchBuf(`${BASE}/checksums.txt`)]);
  const line = sums
    .toString('utf8')
    .split('\n')
    .find((l) => l.trim().endsWith(asset));
  if (!line) throw new Error(`No checksum entry for ${asset}`);
  const expected = line.trim().split(/\s+/)[0].toLowerCase();
  const actual = createHash('sha256').update(zip).digest('hex');
  if (expected !== actual) throw new Error(`SHA-256 mismatch for ${asset}: expected ${expected}, got ${actual}`);
  console.log(`SHA-256 verified: ${actual}`);

  const zipPath = join(work, asset);
  writeFileSync(zipPath, zip);
  execFileSync('unzip', ['-o', '-q', zipPath, 'pocketbase', '-d', work]);
  mkdirSync(binDir, { recursive: true });
  if (existsSync(target)) rmSync(target);
  renameSync(join(work, 'pocketbase'), target);
  chmodSync(target, 0o755);
  console.log(`Installed ${target}`);
  console.log(execFileSync(target, ['--version']).toString().trim());
} catch (err) {
  console.error(`pb-download failed: ${err.message}`);
  process.exitCode = 1;
} finally {
  rmSync(work, { recursive: true, force: true });
}
