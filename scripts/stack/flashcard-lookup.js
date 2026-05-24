#!/usr/bin/env node
/**
 * stack/flashcard-lookup.js — query alkanes-flashcards by topic
 *
 * Reads the seed-data*.ts files (no DB dependency; the seed files are the
 * canonical source) and returns cards matching a topic substring. Output is
 * markdown-formatted for LLM consumption.
 *
 * Usage:
 *   node scripts/stack/flashcard-lookup.js "factory opcode 13"
 *   node scripts/stack/flashcard-lookup.js --deck "Protostone Encoding"
 *   node scripts/stack/flashcard-lookup.js --max-difficulty 3 "wallet"
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const SEED_FILES = [
  path.join(os.homedir(), 'reference', 'alkanes-flashcards', 'lib', 'seed-data.ts'),
  path.join(os.homedir(), 'reference', 'alkanes-flashcards', 'lib', 'seed-data-v2.ts'),
  path.join(os.homedir(), 'reference', 'alkanes-flashcards', 'lib', 'seed-data-v3.ts'),
];

function parseSeedCards(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const txt = fs.readFileSync(filePath, 'utf8');
  const cards = [];
  // Pattern: { deck: '...', front: '...', back: '...', type: '...', tags?: [...], source?: '...', difficulty?: N }
  // Tolerant of multi-line strings, escaped quotes, backticks
  const objRe = /\{\s*deck:\s*['"`]([^'"`]+)['"`]\s*,\s*front:\s*([`'"])([\s\S]*?)\2\s*,\s*back:\s*([`'"])([\s\S]*?)\4(?:\s*,\s*type:\s*['"]([^'"]+)['"])?(?:\s*,\s*tags:\s*\[([^\]]*)\])?(?:\s*,\s*source:\s*['"]([^'"]*)['"])?(?:\s*,\s*difficulty:\s*(\d))?\s*\}/g;
  let m;
  while ((m = objRe.exec(txt)) !== null) {
    cards.push({
      deck: m[1],
      front: m[3].trim(),
      back: m[5].trim(),
      type: m[6] || 'qa',
      tags: m[7] ? m[7].split(',').map(t => t.trim().replace(/^['"`]|['"`]$/g, '')) : [],
      source: m[8] || '',
      difficulty: m[9] ? Number(m[9]) : null,
      file: path.basename(filePath),
    });
  }
  return cards;
}

function main() {
  const args = process.argv.slice(2);
  let topic = null;
  let deckFilter = null;
  let maxDifficulty = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--deck' && args[i+1]) { deckFilter = args[++i].toLowerCase(); continue; }
    if (args[i] === '--max-difficulty' && args[i+1]) { maxDifficulty = Number(args[++i]); continue; }
    if (!topic) topic = args[i];
  }
  if (!topic && !deckFilter) {
    process.stderr.write('Usage: flashcard-lookup.js [--deck "name"] [--max-difficulty N] "topic"\n');
    process.exit(1);
  }
  const topicLc = (topic || '').toLowerCase();

  const all = SEED_FILES.flatMap(parseSeedCards);
  if (all.length === 0) {
    process.stdout.write(`# Flashcard lookup\n\nNo seed files found. Expected one of:\n${SEED_FILES.map(s => '- ' + s).join('\n')}\n\nClone the repo:\n\`\`\`\ngit clone https://github.com/0xcasuwu/alkanes-flashcards ~/reference/alkanes-flashcards\n\`\`\`\n`);
    process.exit(0);
  }

  const hits = all.filter(c => {
    if (deckFilter && !c.deck.toLowerCase().includes(deckFilter)) return false;
    if (maxDifficulty && c.difficulty && c.difficulty > maxDifficulty) return false;
    if (!topicLc) return true;
    const hay = (c.deck + ' ' + c.front + ' ' + c.back + ' ' + (c.tags || []).join(' ') + ' ' + (c.source || '')).toLowerCase();
    return hay.includes(topicLc);
  });

  const out = [`# Flashcard lookup: "${topic || ''}"`, ''];
  if (deckFilter) out.push(`Deck filter: ${deckFilter}`);
  if (maxDifficulty) out.push(`Max difficulty: ${maxDifficulty}`);
  out.push(`${hits.length} / ${all.length} cards matched`, '');
  for (const c of hits.slice(0, 25)) {
    out.push(`## [${c.deck}] (d=${c.difficulty || '?'}) — ${c.file}`);
    out.push(`**Q**: ${c.front}`);
    out.push(`**A**: ${c.back}`);
    if (c.source) out.push(`_Source: ${c.source}_`);
    out.push('');
  }
  if (hits.length > 25) {
    out.push(`_...and ${hits.length - 25} more. Narrow your topic or use --deck._`);
  }
  process.stdout.write(out.join('\n') + '\n');
  process.exit(0);
}

try { main(); } catch (e) {
  process.stderr.write(`[flashcard-lookup] ${e.message}\n`);
  process.exit(1);
}
