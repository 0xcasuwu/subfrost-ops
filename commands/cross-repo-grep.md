---
description: Grep across the full Alkanes/subfrost stack — alkanes-rs, subfrost-app, metashrew, subzero-rs, subfrost-mobile, frost-lend, boiler, Fujin, alkanes-flashcards.
---

# /cross-repo-grep

Run a grep across every cloned reference repo in `~/reference/`. Delegates to the `cross-repo-navigator` agent.

Useful when:
- Looking for every use of an opcode constant across SDK + contracts + frontend
- Finding all places a function name is referenced before renaming
- Cross-referencing a pattern observation against the canonical patterns docs

## Required skills
- `cross-repo-navigation`

## Reference paths searched
- `~/reference/alkanes-rs`, `subfrost-app`, `metashrew`, `subzero-rs`, `subfrost-mobile`, `frost-lend`, `boiler`, `Fujin-contracts-main`, `alkanes-flashcards`, `alkanes-mcp`, `subfrost-docs`, `alkanes-docs`
