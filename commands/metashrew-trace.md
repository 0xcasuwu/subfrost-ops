---
description: Trace a metashrew indexer's behavior at a specific block — what _start did, what flushed, what state root was committed.
---

# /metashrew-trace

For a given block height (or txid range), trace what a metashrew indexer did:
- Which transactions were processed
- What protostones / cellpacks were dispatched
- What storage keys were written (via `IndexPointer`)
- The resulting state root at `smt:root:{height}`

Useful when:
- Reviewing an indexer change against a known historical block
- Diagnosing "view function returns stale data"
- Validating that a reorg test correctly rolls back state

## Required skills
- `metashrew-indexer-patterns`, `wasm-build-pipeline`

## Required tools
- `metashrew_view` / `metashrew_stateroot` JSON-RPC against a running node
- Or `metashrew-test` harness for offline tracing
