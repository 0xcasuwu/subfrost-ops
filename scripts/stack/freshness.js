#!/usr/bin/env node
/**
 * stack/freshness.js — drift check across the subfrost-ops stack
 *
 * For each repo in stack/manifest.yaml:
 *   1. Read the local HEAD SHA
 *   2. Read the manifest's last_known_good SHA
 *   3. Fetch the upstream's default branch tip (shallow)
 *   4. Report drift on either axis
 *
 * Exit 0 always (informational hook). Writes a one-screen summary to stdout
 * formatted for SessionStart injection into LLM context.
 *
 * Safe to run as a SessionStart hook — capped at ~3s wall time per repo by
 * the shallow fetch.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const MANIFEST = path.join(__dirname, '..', '..', 'stack', 'manifest.yaml');

function expandHome(p) {
  if (!p) return p;
  return p.startsWith('~') ? path.join(os.homedir(), p.slice(1).replace(/^[\\/]/, '')) : p;
}

function git(cwd, args) {
  try {
    return execSync(`git ${args}`, { cwd, stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf8', timeout: 10000 }).trim();
  } catch (e) {
    return null;
  }
}

// Minimal YAML parser for our manifest shape. Avoids a dependency.
function parseManifest(text) {
  const repos = {};
  let current = null;
  let inRepos = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\t/g, '  ');
    if (/^repos:\s*$/.test(line)) { inRepos = true; continue; }
    if (/^[a-z_]+:/i.test(line) && !inRepos) continue;
    if (inRepos && /^[a-z_]+:\s*$/.test(line) && !line.startsWith(' ')) { inRepos = false; continue; }
    if (!inRepos) continue;
    const repoMatch = line.match(/^ {2}([\w-]+):\s*$/);
    if (repoMatch) { current = repoMatch[1]; repos[current] = {}; continue; }
    if (!current) continue;
    const kv = line.match(/^ {4}([\w_]+):\s*(.*)$/);
    if (kv) repos[current][kv[1]] = kv[2].trim().replace(/^['"]|['"]$/g, '');
  }
  return { repos };
}

function main() {
  if (!fs.existsSync(MANIFEST)) {
    process.stdout.write(`[stack-freshness] manifest not found at ${MANIFEST}\n`);
    process.exit(0);
  }
  const manifest = parseManifest(fs.readFileSync(MANIFEST, 'utf8'));
  const rows = [];
  for (const [name, r] of Object.entries(manifest.repos)) {
    const clonePath = expandHome(r.clone_path);
    if (!fs.existsSync(path.join(clonePath, '.git'))) {
      rows.push({ name, status: 'missing-clone', clonePath });
      continue;
    }
    const head = git(clonePath, 'rev-parse HEAD');
    const branch = git(clonePath, 'branch --show-current');
    git(clonePath, `fetch --depth 1 origin ${r.default_branch || 'HEAD'}`);
    const upstream = git(clonePath, 'rev-parse FETCH_HEAD') || git(clonePath, `rev-parse origin/${r.default_branch}`);
    const lkg = r.last_known_good;
    const driftFromUpstream = head !== upstream;
    const driftFromManifest = lkg && head !== lkg;
    rows.push({ name, branch, head, lkg, upstream, driftFromUpstream, driftFromManifest });
  }

  // Format output for SessionStart context
  const out = ['# Stack freshness (subfrost-ops)', ''];
  for (const r of rows) {
    if (r.status === 'missing-clone') {
      out.push(`- **${r.name}** — clone missing at ${r.clonePath}`);
      continue;
    }
    const head8 = (r.head || '').slice(0, 8);
    const lkg8 = (r.lkg || '').slice(0, 8);
    const up8 = (r.upstream || '').slice(0, 8);
    const tags = [];
    if (r.driftFromManifest) tags.push(`MANIFEST-DRIFT (lkg ${lkg8})`);
    if (r.driftFromUpstream) tags.push(`UPSTREAM-DRIFT (live ${up8})`);
    const tagStr = tags.length ? ` — ${tags.join(', ')}` : ' — in sync';
    out.push(`- **${r.name}** (${r.branch || '?'}): HEAD ${head8}${tagStr}`);
  }
  out.push('');
  const anyDrift = rows.some(r => r.driftFromUpstream || r.driftFromManifest);
  if (anyDrift) {
    out.push('Drift detected. Before relying on patterns docs / skills citing line numbers, verify those file:line references still resolve. Run `node scripts/stack/snapshot.js` for a fuller report.');
  } else {
    out.push('All repos in sync with manifest + upstream.');
  }
  process.stdout.write(out.join('\n') + '\n');
  process.exit(0);
}

try { main(); } catch (e) {
  process.stderr.write(`[stack-freshness] ${e.message}\n`);
  process.exit(0);
}
