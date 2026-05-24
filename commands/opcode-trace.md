---
description: Trace a specific opcode's full execution — frontend hook → SDK → cellpack → contract handler → storage writes → view function. Routes to the alkanes-explorer agent.
---

# /opcode-trace

Trace an opcode end-to-end across the stack. Useful when:
- A new opcode is being added (sanity-check the call path)
- An opcode's behavior changed and you want to know who's affected
- Diagnosing a bug that spans multiple layers

Delegates to the `alkanes-explorer` agent which:
1. Locates the user-facing hook / mutation
2. Identifies the SDK call (`alkanesExecuteWithStrings`, `inputRequirements`)
3. Decodes the cellpack → contract dispatch
4. Reads the opcode handler end-to-end (storage, sub-calls, auth)
5. Identifies the view function that exposes the resulting state
6. Confirms HeightPoller covers it

## Reference
- `docs/patterns/alkanes-rs.md`
- `docs/patterns/subfrost-app.md`
