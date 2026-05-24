#!/usr/bin/env node
/**
 * SessionStart hook — alkanes-context-injector
 *
 * Detects the cwd against a map of known Alkanes-stack repos and emits
 * a small JSON object to stdout that the harness will surface as
 * SessionStart context. Lists the matching skills the LLM should load
 * for this repo.
 *
 * Stays under ~600 chars output to fit comfortably inside
 * ECC_SESSION_START_MAX_CHARS budgets.
 *
 * Exits 0 on any error so it never blocks session start.
 */

const path = require('path');

const REPO_SKILL_MAP = [
  {
    match: /[\\/]alkanes-rs([\\/]|$)/i,
    repo: 'alkanes-rs',
    skills: ['alkanes-onboarding', 'opcode-dispatch', 'protostone-cellpack-edicts', 'metashrew-indexer-patterns', 'ts-sdk-alkanes-execute', 'wasm-build-pipeline'],
  },
  {
    match: /[\\/]subfrost-app([\\/]|$)/i,
    repo: 'subfrost-app',
    skills: ['alkanes-onboarding', 'browser-wallet-safety', 'height-poller-frontend', 'ts-sdk-alkanes-execute', 'protostone-cellpack-edicts'],
  },
  {
    match: /[\\/]metashrew([\\/]|$)/i,
    repo: 'metashrew',
    skills: ['alkanes-onboarding', 'metashrew-indexer-patterns', 'wasm-build-pipeline'],
  },
  {
    match: /[\\/]subzero-rs([\\/]|$)/i,
    repo: 'subzero-rs',
    skills: ['alkanes-onboarding', 'frost-roast-signing-flow'],
  },
  {
    match: /[\\/]subfrost-mobile([\\/]|$)/i,
    repo: 'subfrost-mobile',
    skills: ['alkanes-onboarding', 'uniffi-checksum-survival'],
  },
  {
    match: /[\\/](frost-lend|boiler|Fujin-contracts|subfrost-alkanes)([\\/]|$)/i,
    repo: 'alkanes-contracts',
    skills: ['alkanes-onboarding', 'three-phase-init', 'receipt-model', 'opcode-dispatch', 'protostone-cellpack-edicts', 'alkanes-test-harness'],
  },
  {
    match: /[\\/]boiler-v2([\\/]|$)/i,
    repo: 'boiler-v2',
    skills: ['alkanes-onboarding', 'three-phase-init', 'receipt-model', 'opcode-dispatch', 'protostone-cellpack-edicts', 'browser-wallet-safety', 'height-poller-frontend', 'alkanes-test-harness'],
  },
  {
    match: /[\\/]alkanes-flashcards([\\/]|$)/i,
    repo: 'alkanes-flashcards',
    skills: ['alkanes-onboarding', 'cross-repo-navigation'],
  },
  {
    match: /[\\/]alkanes-mcp([\\/]|$)/i,
    repo: 'alkanes-mcp',
    skills: ['alkanes-onboarding', 'cross-repo-navigation'],
  },
];

function main() {
  try {
    const cwd = process.cwd();
    const hit = REPO_SKILL_MAP.find(e => e.match.test(cwd));
    if (!hit) {
      process.exit(0);
      return;
    }
    const lines = [
      `# Alkanes stack context — ${hit.repo}`,
      ``,
      `cwd matches a known Alkanes-stack repo. Suggested skills to load before any non-trivial work:`,
      ``,
      ...hit.skills.map(s => `  - \`${s}\``),
      ``,
      `Reference: docs/patterns/${hit.repo === 'alkanes-contracts' ? 'contracts-frost-boiler-fujin' : hit.repo}.md`,
      `Onboarding: skill \`alkanes-onboarding\` lists the pre-work rules and mental model.`,
    ];
    process.stdout.write(lines.join('\n') + '\n');
    process.exit(0);
  } catch (e) {
    process.stderr.write(`[alkanes-context-injector] ${e.message}\n`);
    process.exit(0);
  }
}

main();

module.exports = { REPO_SKILL_MAP };
