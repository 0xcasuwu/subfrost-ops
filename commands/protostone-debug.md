---
description: Decode a raw protostone hex (or a txid) and diagnose why it didn't behave as intended. Routes to the protostone-debugger agent.
---

# /protostone-debug

Decode and diagnose a protostone. Supply either:
- The raw OP_RETURN hex
- A Bitcoin txid (will pull the tx and find the OP_RETURN)
- A failing test scenario (with the constructed protostone literal)

Delegates to the `protostone-debugger` agent which:
1. Parses Tags 16383 → 81 → cells
2. Validates `protocol_tag`, `pointer`, `refund`, edict `output:` indexes
3. Decodes the cellpack: target AlkaneId, opcode, inputs
4. Diagnoses likely cause if the call no-ops or routes wrong
5. Suggests a concrete fix

## Required skills
- `protostone-cellpack-edicts`

## Reference
- `docs/patterns/alkanes-rs.md` (Protostone section)
- flashcard deck "Protostone Encoding", "Trace Pulling"
