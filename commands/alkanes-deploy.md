---
description: Walk through deploying an Alkanes contract — three-phase init checklist, opcode 0 invocation, finalize-auth, post-deploy verification.
---

# /alkanes-deploy

Walks through the three-phase deploy of an Alkanes contract or contract set.

## Phases

1. **Build & verify WASM** — `cargo build --release --target wasm32-unknown-unknown -p <crate>`; check size <2MB; run `wasm-contract-auditor` agent
2. **Deploy** — submit the indexer-registration transaction; record the assigned AlkaneId (`{block, tx}`)
3. **Init (opcode 0)** — submit a protostone calling opcode 0 with the constructor args; verify `/initialized = true` via a view function call
4. **Finalize-auth** — for multi-contract sets, distribute the protocol auth token across the set; verify each callee accepts cross-contract calls from the others
5. **Verify** — run integration-style queries via `metashrew_view`; sanity-check storage layout

## Required skills
- `three-phase-init`, `opcode-dispatch`, `receipt-model`, `protostone-cellpack-edicts`, `wasm-build-pipeline`

## Required reviewers
- `wasm-contract-auditor` BEFORE deploy
- `alkanes-protocol-reviewer` on the contract source
