#!/usr/bin/env node
/**
 * stack/snapshot.js — write stack/SNAPSHOT.md
 *
 * Aggregates current state across the 5 stack repos:
 *   - HEAD / branch / last 5 commits per repo
 *   - Manifest drift summary
 *   - Version-skew check (subfrost-app's pinned @alkanes/ts-sdk vs alkanes-rs ts-sdk)
 *   - Fork-height flags in scope
 *
 * Run before merging anything cross-repo, or weekly as a snapshot.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const MANIFEST = path.join(__dirname, '..', '..', 'stack', 'manifest.yaml');
const OUT = path.join(__dirname, '..', '..', 'stack', 'SNAPSHOT.md');

function expandHome(p) {
  if (!p) return p;
  return p.startsWith('~') ? path.join(os.homedir(), p.slice(1).replace(/^[\\/]/, '')) : p;
}

function git(cwd, args) {
  try {
    return execSync(`git ${args}`, { cwd, stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf8', timeout: 15000 }).trim();
  } catch { return null; }
}

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

// Informational pin report — not "skew" or "drift". subfrost-app pins
// ts-sdk at whatever version it's tested against; alkanes-rs ts-sdk
// advances independently. Either being ahead of the other is a fact,
// not a problem. The LLM decides whether the pinned version supports
// the feature the user wants to use.
function tsSdkPinReport(repos) {
  const subfrostApp = expandHome(repos['subfrost-app']?.clone_path);
  const alkanesRs = expandHome(repos['alkanes-rs']?.clone_path);
  if (!subfrostApp || !alkanesRs) return null;
  const pkgPath = path.join(subfrostApp, 'package.json');
  const sdkPkgPath = path.join(alkanesRs, 'ts-sdk', 'package.json');
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const pinned = pkg.dependencies?.['@alkanes/ts-sdk'] || pkg.devDependencies?.['@alkanes/ts-sdk'];
    const sdkPkg = JSON.parse(fs.readFileSync(sdkPkgPath, 'utf8'));
    const local = sdkPkg.version;
    return { pinned, local };
  } catch { return null; }
}

function main() {
  const manifest = parseManifest(fs.readFileSync(MANIFEST, 'utf8'));
  const now = new Date().toISOString();
  const out = [
    `# Stack Snapshot — subfrost-ops`,
    ``,
    `Generated: ${now}`,
    ``,
    `## Repos`,
    ``,
    `| repo | branch | HEAD | last_known_good | drift |`,
    `|---|---|---|---|---|`,
  ];
  for (const [name, r] of Object.entries(manifest.repos)) {
    const clonePath = expandHome(r.clone_path);
    if (!fs.existsSync(path.join(clonePath, '.git'))) {
      out.push(`| ${name} | (missing) | — | ${(r.last_known_good||'').slice(0,8)} | clone missing |`);
      continue;
    }
    const head = git(clonePath, 'rev-parse HEAD') || '';
    const branch = git(clonePath, 'branch --show-current') || '?';
    const drift = head && r.last_known_good && head !== r.last_known_good ? 'YES' : '—';
    out.push(`| ${name} | ${branch} | ${head.slice(0,8)} | ${(r.last_known_good||'').slice(0,8)} | ${drift} |`);
  }

  out.push('', '## Recent commits per repo', '');
  for (const [name, r] of Object.entries(manifest.repos)) {
    const clonePath = expandHome(r.clone_path);
    if (!fs.existsSync(path.join(clonePath, '.git'))) continue;
    const log = git(clonePath, 'log -5 --oneline');
    out.push(`### ${name}`, '```', log || '(no log)', '```', '');
  }

  out.push('## ts-sdk pin report', '');
  out.push('Informational only. subfrost-app pins ts-sdk at a tested version; alkanes-rs ts-sdk advances independently. Either being ahead is not a "drift" — update the pin only if you intend to consume newer SDK features.');
  out.push('');
  const pinReport = tsSdkPinReport(manifest.repos);
  if (pinReport) {
    out.push(`- subfrost-app pin: \`${pinReport.pinned}\``);
    out.push(`- alkanes-rs ts-sdk current: \`${pinReport.local}\``);
  } else {
    out.push('- pin report unavailable (one of the repos missing package.json)');
  }

  out.push('', '## Fork heights in scope', '');
  for (const [name, r] of Object.entries(manifest.repos)) {
    if (r.fork_heights) {
      out.push(`- ${name}: ${JSON.stringify(r.fork_heights)}`);
    }
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, out.join('\n') + '\n', 'utf8');
  process.stdout.write(`[stack-snapshot] wrote ${OUT}\n`);
  process.exit(0);
}

try { main(); } catch (e) {
  process.stderr.write(`[stack-snapshot] ${e.message}\n`);
  process.exit(1);
}
