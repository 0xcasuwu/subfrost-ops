---
description: Query the alkanes-flashcards deck for curated domain facts on a topic (factory opcode, protostone, wallet safety, etc.). Returns matching QA pairs + cloze cards.
---

# /flashcard-lookup

Query the `alkanes-flashcards` SQLite database (or seed data files) for cards matching a topic. Returns:
- The QA pair (front + back)
- The source citation (file path or txid)
- The deck name
- Related cards in the same deck

Useful when:
- Researching a concept before writing code
- Validating an implementation against curated rules
- Auto-augmenting an `alkanes-explorer` answer with domain facts

## Sources searched
- `~/reference/alkanes-flashcards/lib/seed-data.ts` (v1, 138 cards / 24 decks)
- `~/reference/alkanes-flashcards/lib/seed-data-v2.ts` (90 cards / 8 decks — Mental Models, Pre-Work Rules, Bitcoin & Runestones)
- `~/reference/alkanes-flashcards/lib/seed-data-v3.ts` (54 cards — Browser Wallet, Backend Infrastructure, Fujin/FIRE/frostlend)

## TODO (future)
Add this as an MCP tool in `alkanes-mcp` so the LLM can call it natively as a retrieval step during code analysis.
