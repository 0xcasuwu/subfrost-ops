---
description: Scaffold or review an Alkanes contract integration test using the canonical output:1 edict-routing pattern.
---

# /alkanes-test

Scaffold an integration test for an Alkanes contract opcode, OR review an existing test for correctness.

The canonical shape (see skill `alkanes-test-harness`):
- Deploy WASM templates
- Init contract(s) via opcode 0
- For multi-contract sets, finalize-auth
- Execute the scenario protostone with `output: 1` edicts routing tokens to the cellpack as `incomingAlkanes`
- Assert on storage (`IndexPointer`) AND token balances (`BalanceSheetOperations`)
- Cover at least one failure path

## Required skills
- `alkanes-test-harness`, `protostone-cellpack-edicts`, `three-phase-init`, `receipt-model`
