# Existing 0xcasuwu knowledge assets — to integrate

Two existing repos overlap with what subfrost-ops is building. Integrate, don't duplicate.

## A. alkanes-flashcards
`0xcasuwu/alkanes-flashcards` — Spaced-repetition flashcards for the alkanes/subfrost/metashrew stack. Located at `C:\Users\ed995\reference\alkanes-flashcards`. Next.js 15 + SQLite, SM-2 spacing algorithm.

### Content inventory (~280 atomic domain facts across 24+ decks)
- **v1 (`lib/seed-data.ts`)**: 138 cards / 24 decks — foundational concepts: protostones, factory opcodes, pool opcodes, wallet safety, atomic flows
- **v2 (`lib/seed-data-v2.ts`)**: ~90 cards / 8 decks — mental models, Bitcoin fundamentals, pool math, boot phases, ecosystem contracts, incident postmortems, pre-work rules
- **v3 (`lib/seed-data-v3.ts`)**: ~54 cards — curated pools, fujin/FIRE/frostlend, backend infrastructure, browser wallet specifics

### Schema
`SeedCard[]` JSON: `{deck, front, back, type, tags, source, difficulty}`. Type = `qa` | `cloze`. Source = file path or txid. Difficulty 1-5.

### Deck → skill mapping (proposed)
| Deck (count) | Proposed skill | Purpose |
|---|---|---|
| Alkanes Fundamentals (5) | `alkanes-101` | UTXOs as tokens, dust=600, runestones |
| Factory Opcodes (10) | `factory-opcodes-reference` | Router ops 0-29 with args |
| Pool Opcodes (4) | `pool-opcodes-reference` | Direct pool ops + read ops 97/98/99 |
| Protostone Encoding (5) | `protostone-dissect` | Tags 16383→81→cells, LEB128 |
| Trace Pulling (7) | `alkanes-trace-digest` | Shadow vouts, protobuf, fuel, revert |
| Carbine CLOB (7) | `carbine-clob-cheatsheet` | Binary format, pair-order trick, opcodes 24/25/20/21 |
| frBTC & Wrapping (5) | `frbtc-wrap-guide` | Opcodes 77/78/103/104, dynamic signer |
| Pool Math v2 (6) | `pool-math-fundamentals` | x*y=k, MINIMUM_LIQUIDITY, LP mint, slippage |
| Mental Models v2 (11) | `alkanes-mental-models` | Why UTXOs, why metashrew vs espo, why cellpacks |
| Bitcoin & Runestones v2 (8) | `bitcoin-runestones-101` | OP_RETURN, P2TR/BIP86, x-only pubkeys, BIP341 tweak |
| Receipt-Based Auth (4) | `receipt-auth-pattern` | Boiler/FIRE/frostlend ownership-by-receipt |

## B. alkanes-mcp
`0xcasuwu/alkanes-mcp` — MCP server exposing 6 alkanes repos (oyl-sdk, sandshrew-sdk, subfrost, alkanes, alkane-factory, alkanes-rs) as tools. Located at `C:\Users\ed995\reference\alkanes-mcp`.

### Tools (TypeScript AST parsing + custom regex)
- **CodeExplorer**: `list_files`, `get_file_content`, `search_code`
- **FunctionAnalysis**: `list_functions`, `get_function_details`, `search_functions`, `list_classes`, `get_class_details`
- **ApiDocumentation**: `get_api_documentation`, `get_function_interfaces`
- **Repository**: `list_repositories`, `get_repository_info`, `analyze_repository`

### Resources
`alkanes://repository/{name}`, `alkanes://file/{repo}/{path}`, `alkanes://function/{repo}/{file}/{name}`, `alkanes://class/{repo}/{file}/{name}`

### Memory bank
Each indexed repo's `memory-bank/` loaded: `activeContext`, `productContext`, `systemPatterns`, `techContext`.

## Integration recommendations for subfrost-ops fork

### 1. Lift flashcard decks into skills (one skill per deck)
Each skill embeds the deck content as a prompt-cached block so multiple invocations of the same skill share token cache. This is the highest-leverage move — turns 280 atomic facts into LLM-retrievable knowledge without changing flashcards itself.

### 2. Register alkanes-mcp in our `mcp-configs/mcp-servers.json`
Anyone installing subfrost-ops gets the alkanes-mcp tools automatically (still must `/mcp` enable per Claude Code policy, but registration is the discoverability step).

### 3. Add new MCP tool to alkanes-mcp: `get_flashcard_context(topic, deck_filter, difficulty_max)`
Read-only query against alkanes-flashcards SQLite. Returns QA pairs + cloze cards matching the topic. Lets the LLM ask for curated facts when it's analyzing code.

### 4. Add `/flashcard-lookup` slash command in subfrost-ops
Calls the new MCP tool above. Surface: "what do I need to know about factory opcode 11?" → returns the AddLiquidity card + 3 related cards.

### 5. Sync loop both ways
- **Flashcards → MCP memory-bank**: when a new deck is seeded (e.g. v4), auto-generate a summary `.md` for the alkanes-mcp memory-bank so MCP context stays current.
- **MCP → Flashcards**: when an incident postmortem or new API is found in code, suggest a flashcard template.

### 6. Onboarding default
When subfrost-ops loads in a new cwd, SessionStart hook should inject the Pre-Work Rules deck (v2) + Mental Models deck as the mandatory onboarding context.

## File paths for reference
- `C:\Users\ed995\reference\alkanes-flashcards\lib\seed-data{,-v2,-v3}.ts`
- `C:\Users\ed995\reference\alkanes-flashcards\lib\db.ts`
- `C:\Users\ed995\reference\alkanes-mcp\src\tools\{apiDocumentation,codeExplorer,functionAnalysis,repository}.ts`
- `C:\Users\ed995\reference\alkanes-mcp\src\resources\index.ts`
