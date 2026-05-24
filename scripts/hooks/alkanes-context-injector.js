#!/usr/bin/env node
/**
 * SessionStart hook — alkanes-context-injector
 *
 * Detects the cwd against a map of known subfrost-ops stack repos and
 * emits a layer-aware context block: which layer the repo is in
 * (foundational vs ux), what that implies for the user's change scope,
 * the skills to load, and inline freshness output.
 *
 * Stays under ~1200 chars output to fit comfortably inside
 * ECC_SESSION_START_MAX_CHARS budgets.
 *
 * Exits 0 on any error so it never blocks session start.
 */

const path = require('path');

// `layer` is the architectural position. `ripples_to` only set for
// foundational entries — names which UX repos typically care when the
// foundational repo's APIs evolve. The LLM uses these as prompts for
// impact reasoning, not as enforced contracts.
const REPO_SKILL_MAP = [
  {
    match: /[\\/]alkanes-rs([\\/]|$)/i,
    repo: 'alkanes-rs',
    layer: 'foundational',
    ripples_to: ['subfrost-app (ts-sdk)', 'subfrost-mobile (Rust types)'],
    skills: ['pattern-conformance', 'stack-as-codebase', 'alkanes-onboarding', 'opcode-dispatch', 'protostone-cellpack-edicts', 'metashrew-indexer-patterns', 'ts-sdk-alkanes-execute', 'wasm-build-pipeline'],
  },
  {
    match: /[\\/]subfrost-app([\\/]|$)/i,
    repo: 'subfrost-app',
    layer: 'ux',
    skills: ['pattern-conformance', 'stack-as-codebase', 'alkanes-onboarding', 'browser-wallet-safety', 'height-poller-frontend', 'ts-sdk-alkanes-execute', 'protostone-cellpack-edicts'],
  },
  {
    match: /[\\/]metashrew([\\/]|$)/i,
    repo: 'metashrew',
    layer: 'foundational',
    ripples_to: ['alkanes-rs (runtime ABI)'],
    skills: ['pattern-conformance', 'stack-as-codebase', 'alkanes-onboarding', 'metashrew-indexer-patterns', 'wasm-build-pipeline'],
  },
  {
    match: /[\\/]subzero-rs([\\/]|$)/i,
    repo: 'subzero-rs',
    layer: 'foundational',
    ripples_to: ['subfrost-app (cross-chain bridge flow)', 'subfrost-mobile (cross-chain bridge flow)'],
    skills: ['pattern-conformance', 'stack-as-codebase', 'alkanes-onboarding', 'frost-roast-signing-flow'],
  },
  {
    match: /[\\/]subfrost-mobile([\\/]|$)/i,
    repo: 'subfrost-mobile',
    layer: 'ux',
    skills: ['pattern-conformance', 'stack-as-codebase', 'alkanes-onboarding', 'uniffi-checksum-survival', 'browser-wallet-safety'],
  },
  {
    match: /[\\/](frost-lend|boiler|Fujin-contracts|subfrost-alkanes)([\\/]|$)/i,
    repo: 'alkanes-contracts',
    layer: 'foundational',
    ripples_to: ['subfrost-app (when these contracts back UX features)', 'subfrost-mobile (same)'],
    skills: ['pattern-conformance', 'stack-as-codebase', 'alkanes-onboarding', 'three-phase-init', 'receipt-model', 'opcode-dispatch', 'protostone-cellpack-edicts', 'alkanes-test-harness'],
  },
  {
    match: /[\\/]boiler-v2([\\/]|$)/i,
    repo: 'boiler-v2',
    layer: 'ux',
    skills: ['pattern-conformance', 'stack-as-codebase', 'alkanes-onboarding', 'three-phase-init', 'receipt-model', 'opcode-dispatch', 'protostone-cellpack-edicts', 'browser-wallet-safety', 'height-poller-frontend', 'alkanes-test-harness'],
  },
  {
    match: /[\\/]alkanes-flashcards([\\/]|$)/i,
    repo: 'alkanes-flashcards',
    layer: 'ux',
    skills: ['pattern-conformance', 'stack-as-codebase', 'alkanes-onboarding', 'cross-repo-navigation'],
  },
  {
    match: /[\\/]alkanes-mcp([\\/]|$)/i,
    repo: 'alkanes-mcp',
    layer: 'ux',
    skills: ['pattern-conformance', 'stack-as-codebase', 'alkanes-onboarding', 'cross-repo-navigation'],
  },
];

function runFreshness() {
  try {
    const { execFileSync } = require('child_process');
    const freshnessScript = path.join(__dirname, '..', 'stack', 'freshness.js');
    if (!require('fs').existsSync(freshnessScript)) return '';
    return execFileSync('node', [freshnessScript], { encoding: 'utf8', timeout: 30000, stdio: ['ignore', 'pipe', 'ignore'] });
  } catch { return ''; }
}

function buildLayerContext(hit) {
  if (hit.layer === 'foundational') {
    const ripples = (hit.ripples_to || []).map(r => `  - ${r}`).join('\n');
    return [
      `**Layer**: foundational — this repo publishes APIs/protocols other repos consume.`,
      ``,
      `Changes here often matter to:`,
      ripples || '  - (no downstream ripples recorded)',
      ``,
      `When you change a published surface, surmise specific impacts using the \`pattern-conformance\` skill + the named consumers. The \`stack-preflight\` agent will return a structured context brief on request.`,
    ].join('\n');
  }
  return [
    `**Layer**: ux — this repo consumes stable APIs from foundational layers; changes here are locally bounded.`,
    ``,
    `No upstream verification required. Verify your own consumers (tests, sibling features). The \`pattern-conformance\` skill catalogs the patterns you should mirror.`,
  ].join('\n');
}

function main() {
  try {
    const cwd = process.cwd();
    const hit = REPO_SKILL_MAP.find(e => e.match.test(cwd));
    if (!hit) {
      process.exit(0);
      return;
    }
    const lines = [
      `# Subfrost-ops stack context — ${hit.repo}`,
      ``,
      buildLayerContext(hit),
      ``,
      `Skills to load:`,
      ``,
      ...hit.skills.map(s => `  - \`${s}\``),
      ``,
      `Reference: docs/patterns/${hit.repo === 'alkanes-contracts' ? 'contracts-frost-boiler-fujin' : hit.repo}.md`,
      `Layer model: docs/LAYER-MODEL.md`,
      ``,
    ];
    const freshness = runFreshness();
    if (freshness) {
      lines.push('---', '', freshness.trim());
    }
    process.stdout.write(lines.join('\n') + '\n');
    process.exit(0);
  } catch (e) {
    process.stderr.write(`[alkanes-context-injector] ${e.message}\n`);
    process.exit(0);
  }
}

main();

module.exports = { REPO_SKILL_MAP };
