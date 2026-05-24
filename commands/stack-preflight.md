---
description: Return a structured context brief for a proposed change — layer of the cwd repo, canonical patterns applicable, invariants in scope, and (for foundational changes) downstream ripples. Does not verify; equips the LLM to surmise impact itself.
---

# /stack-preflight

Invokes the `stack-preflight` agent. Provide a one-line change description; the agent returns a context brief:
- Which layer of the stack the cwd repo is in (foundational vs UX)
- Which canonical patterns from `skills/pattern-conformance` apply
- Which invariants from `stack/manifest.yaml` may be in scope
- For foundational changes: which UX repos and surfaces typically care when the named area evolves (prompts for impact reasoning, not assertions of broken contracts)
- For UX changes: local consumers worth thinking about

Useful at the START of any non-trivial change to load the relevant context before reasoning about scope.

## When to use
- Foundational changes: always run before non-trivial work — the downstream ripples are easy to miss
- UX changes: optional — useful when the change touches a foundational API consumption surface

## Reference
- `agents/stack-preflight.md` — the agent itself
- `skills/stack-as-codebase/SKILL.md` — mental model
- `docs/LAYER-MODEL.md` — directional impact reference
