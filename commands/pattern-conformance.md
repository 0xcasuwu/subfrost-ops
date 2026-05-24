---
description: Browse the 17 canonical patterns the stack uses. Optional topic argument filters (e.g. /pattern-conformance "browser wallet" or "opcode dispatch"). Loads the digest so the LLM mirrors the canonical pattern instead of inventing.
---

# /pattern-conformance

Invokes the `pattern-conformance` skill. The skill catalogs 17 canonical patterns already documented across the harness — opcode dispatch, two-protostone format, HeightPoller, receipt auth, three-phase init, browser-wallet safety, factory router, uniffi DEBUG bindings, zeroize, IndexPointer, PSBT patching, UTXO selection, regtest collision, multi-address support, fork heights, CL2 scoping, manifest-as-registry.

Each entry: what it is (one line), where it applies, what conforming work looks like, link to the authoritative source.

Use at the start of any non-trivial change. Reach for an existing canonical pattern before inventing.

## Reference
- `skills/pattern-conformance/SKILL.md`
- `docs/LAYER-MODEL.md`
