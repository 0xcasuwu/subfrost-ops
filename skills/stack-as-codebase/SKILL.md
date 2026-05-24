---
name: stack-as-codebase
description: The integrated-codebase mental model for subfrost-ops. The 5 repos (alkanes-rs, metashrew, subzero-rs, subfrost-app, subfrost-mobile) are conceptually integrated but NOT mechanically coupled. Impact flows directionally — foundational repos ripple UP to UX, never the reverse. Load this at the start of any non-trivial change.
origin: subfrost-ops
---

# Stack-as-Codebase

The 5 repos are part of a continuous whole, but they are mutually exclusive in regards to one working and another breaking. There is no shared build, no enforced version pins, no compile-time imports across repo boundaries beyond what each repo declares for its own work. **A change in one does not break-build another.**

What IS true: foundational repos publish APIs and protocols that UX repos consume. Changes to foundational APIs *often* matter to UX consumers, in ways the LLM should surmise from the change description and the pattern catalog — not from a mechanical dependency graph.

## When to use
- Starting any non-trivial change in any of the 5 repos
- Reasoning about whether a change merits cross-repo thinking
- Reviewing a PR — confirm the author considered the right scope

## The layered model

### Foundational layer (publishers)
```
alkanes-rs    →  Rust indexer + ts-sdk
metashrew     →  WASM indexing runtime
subzero-rs    →  FROST/ROAST threshold signing + frtun overlay
```
These publish ABIs, protocols, and consensus-critical logic. Their default branches advance independently. When they change, downstream MAY need to adapt.

### UX layer (consumers)
```
subfrost-app    →  Next.js frontend
subfrost-mobile →  Compose (Android) + SwiftUI (iOS) + uniffi Rust core
```
These consume foundational APIs. Their changes are locally bounded — they cannot break the foundational layer.

### Impact direction (always downward)
```
+----------------+        +----------------+        +-------------+
| alkanes-rs     |        | metashrew      |        | subzero-rs  |
| (foundational) |        | (foundational) |        | (foundational)|
+----------------+        +----------------+        +-------------+
        │                          │                        │
        │ ts-sdk, types            │ runtime ABI            │ signing protocol
        ▼                          ▼                        ▼
+----------------+        +----------------+
| subfrost-app   |        | subfrost-mobile|
| (ux)           |        | (ux)           |
+----------------+        +----------------+
```

No arrows point upward. UX changes never threaten foundational repos.

## Questions to surmise (not a rigid protocol)

**If you're in a foundational repo:**
- What is this change publishing or modifying? (a function signature? a message format? a runtime behavior? a consensus rule?)
- Who consumes the area I'm modifying? (the manifest's `ripples_to` block names the UX repos and surfaces)
- What assumptions might consumers have made that this change invalidates?
- Is there a canonical pattern (`skills/pattern-conformance`) for this kind of change I should mirror?
- Is there a consensus-critical milestone (`fork_heights`) the change must respect?

**If you're in a UX repo:**
- What feature/bug is this addressing locally?
- Which canonical patterns from `skills/pattern-conformance` apply? (almost always at least one — HeightPoller, browser-wallet safety, two-protostone, etc.)
- Does this change my repo's local consumers? (tests, sibling hooks, shared state)
- Am I correctly consuming the foundational APIs at the version they expose, or did I drift into using newer features the pinned SDK doesn't support?

## When in doubt
Ask the user. The harness gives context; the user (and you, the LLM) reason about the right scope.

## Examples

### Example 1 — Foundational change with downstream implications
**Change**: "Refactor cellpack serialization in alkanes-rs to support a new opcode encoding."
**Layer**: foundational (alkanes-rs).
**Surmise**: ts-sdk consumers (subfrost-app's mutation hooks; subfrost-mobile if it builds cellpacks Rust-side) likely call into the serialization. They may need to re-import or re-sync. The pattern-conformance entry for "two-protostone message format" applies. Reasonable to coordinate a downstream PR in subfrost-app at the same time the SDK ships.

### Example 2 — Foundational change with no downstream impact
**Change**: "Optimize the internal RocksDB iterator in metashrew."
**Layer**: foundational (metashrew).
**Surmise**: this is an internal performance tweak — the host-function ABI doesn't change. alkanes-rs doesn't need to do anything. No downstream ripples.

### Example 3 — UX change, locally bounded
**Change**: "Add a new dark-mode toggle to subfrost-app settings."
**Layer**: ux.
**Surmise**: pure UI; no foundational consumption surface touched. Local validation only — typecheck, lint, test the toggle, ship.

### Example 4 — UX change that touches a foundational API
**Change**: "Use a new ts-sdk function (introduced in alkanes-rs v2.2.0) for fee estimation in subfrost-app."
**Layer**: ux (still — the change is in subfrost-app).
**Surmise**: foundational repo unaffected. But you need to confirm subfrost-app's pinned ts-sdk version actually exports the new function. If not, you're either bumping the pin or backporting the function locally. The `tsSdkPinReport` from `/stack-snapshot` will show you the pinned vs latest versions.

## Reference
- `stack/manifest.yaml` — layers, invariants, ripples_to
- `docs/LAYER-MODEL.md` — permanent reference doc on the model
- `skills/pattern-conformance/SKILL.md` — the 17-pattern canonical catalog
- `agents/stack-preflight.md` — returns a structured context brief for a specific change
