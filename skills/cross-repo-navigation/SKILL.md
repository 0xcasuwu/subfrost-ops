---
name: cross-repo-navigation
description: How to find code, patterns, and history across the 0xcasuwu/subfrost stack — which repo holds what, how to scope a grep, and which existing knowledge assets to consult before coding.
origin: subfrost-ops
---

# Cross-Repo Navigation

## When to use
- A question that spans multiple repos (most non-trivial ones do)
- Looking for prior art before inventing a pattern
- Onboarding to a new area

## Repo map (cloned at `~/reference/`)
| Repo | Owns |
|---|---|
| `alkanes-rs` | Rust indexer + ts-sdk |
| `subfrost-app` | Next.js frontend |
| `metashrew` | WASM runtime |
| `subzero-rs` | FROST/ROAST signing |
| `subfrost-mobile` | Compose + SwiftUI + uniffi |
| `frost-lend` | Lending contracts |
| `boiler` | Staking boilerplate + canonical test patterns |
| `Fujin-contracts-main` | Prediction market contracts |
| `alkanes-flashcards` | 280+ curated domain facts |
| `alkanes-mcp` | MCP server for code analysis |
| `subfrost-docs` | Public docs |
| `alkanes-docs` | Public Alkanes protocol docs |

## Where to look by question type

| Question | First read |
|---|---|
| "How does X work conceptually?" | `alkanes-flashcards/lib/seed-data*.ts` (search by deck) + `subfrost-docs` |
| "Where is Y defined?" | Grep across reference repos with file glob |
| "What's the pattern for Z?" | `docs/patterns/*.md` in this fork |
| "Why was W done this way?" | git log on the file + commit messages |
| "Has this bug appeared before?" | flashcards deck "Incident Postmortems" |
| "Is there a similar contract?" | `frost-lend` (most exhaustive) → `boiler` → `Fujin` |
| "How does the frontend handle this?" | `subfrost-app/hooks/*.ts` + `subfrost-app/queries/*.ts` |
| "How does the indexer commit this?" | `alkanes-rs/crates/*-indexer*/src/lib.rs` |
| "How does the WASM runtime handle this?" | `metashrew/crates/metashrew-runtime/src/runtime.rs` |

## Grep recipes
```bash
# Cross-repo grep for a function name
for repo in alkanes-rs subfrost-app metashrew subzero-rs subfrost-mobile frost-lend boiler; do
    echo "=== $repo ==="
    rg --type rust --type ts "fn_name|funcName" ~/reference/$repo
done

# Find every place a specific opcode is referenced
rg -nC2 'opcode\s*=\s*13\b|opcode\(13\)|\b13u128\b' ~/reference/

# Find every protostone edict construction in tests
rg -n 'ProtostoneEdict\s*{' ~/reference/*/src/tests/
```

## Use the agents
- `cross-repo-navigator` agent for an answer with citations
- `alkanes-explorer` agent for a full execution-path map
- `protostone-debugger` agent for a hex protostone or txid

## Existing knowledge assets
- **alkanes-mcp**: MCP server with tools `list_files`, `search_code`, `get_function_details`, `list_classes`, `get_api_documentation` across 6 indexed repos. Register in `mcp-configs/mcp-servers.json`.
- **alkanes-flashcards**: SQLite-backed deck system. Skill `flashcard-lookup` (TODO) will surface relevant cards.

## Reference
- `docs/patterns/INVENTORY.md`
- `docs/patterns/existing-knowledge-assets.md`
