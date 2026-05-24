---
description: Run the stack-preflight agent against a proposed change description. Verifies all cross-repo seams the change touches before any code is written.
---

# /stack-preflight

Run BEFORE any change that's not pure-local. Provide a one-line change description; the `stack-preflight` agent will:
1. Classify which seams the change crosses
2. Resolve every symbol at both ends (does the SDK call exist? does the opcode dispatch? is the binding in sync?)
3. Check the invariants list in `stack/manifest.yaml`
4. Surface required downstream re-sync (version pins, fork heights)
5. Verify test fixtures
6. Return a verdict + pre-merge checklist

## Required reading first
- `skills/stack-as-codebase/SKILL.md` — the integrated-codebase mental model
- `stack/manifest.yaml` — source of truth for cross-repo deps + invariants
