#!/usr/bin/env node
/**
 * observe-stack.js — stack-scope tag for continuous-learning observations
 *
 * Runs as a PreToolUse / PostToolUse hook alongside the standard CL2
 * observer. When cwd matches any of the 5 subfrost-ops stack repos, writes
 * a sidecar marker into the project's observations.jsonl ensuring the
 * observation also belongs to the `stack:subfrost-ops` cluster.
 *
 * The sidecar mechanism: appends a tiny line `{"stack":"subfrost-ops",...}`
 * with the same session_id/timestamp the CL2 observer used, so /evolve can
 * cluster across the stack.
 *
 * Exits 0 on any error.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const STACK_PATTERNS = [
  /[\\/]alkanes-rs([\\/]|$)/i,
  /[\\/]subfrost-app([\\/]|$)/i,
  /[\\/]metashrew([\\/]|$)/i,
  /[\\/]subzero-rs([\\/]|$)/i,
  /[\\/]subfrost-mobile([\\/]|$)/i,
  /[\\/]frost-lend([\\/]|$)/i,
  /[\\/]boiler-?v?\d*([\\/]|$)/i,
  /[\\/]Fujin-contracts/i,
];

function cwdMatchesStack(cwd) {
  return STACK_PATTERNS.some(p => p.test(cwd));
}

function getHomunculusDir() {
  return process.env.CLV2_HOMUNCULUS_DIR
    || path.join(process.env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share'), 'ecc-homunculus');
}

function gitRemote(cwd) {
  try {
    const { execSync } = require('child_process');
    return execSync('git remote get-url origin', { cwd, stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf8', timeout: 2000 }).trim();
  } catch { return null; }
}

function projectHash(remote) {
  if (!remote) return null;
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(remote).digest('hex').slice(0, 12);
}

function main() {
  try {
    const cwd = process.cwd();
    if (!cwdMatchesStack(cwd)) {
      process.exit(0);
      return;
    }
    const remote = gitRemote(cwd);
    const hash = projectHash(remote);
    const homDir = getHomunculusDir();
    const stackDir = path.join(homDir, 'stacks', 'subfrost-ops');
    fs.mkdirSync(stackDir, { recursive: true });
    const tagFile = path.join(stackDir, 'project-members.jsonl');
    const entry = {
      ts: Date.now(),
      project_hash: hash,
      project_remote: remote,
      cwd,
    };
    fs.appendFileSync(tagFile, JSON.stringify(entry) + '\n');
    process.exit(0);
  } catch (e) {
    process.stderr.write(`[observe-stack] ${e.message}\n`);
    process.exit(0);
  }
}

main();
