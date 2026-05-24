# Layer Model — subfrost-ops

The 5 repos of the subfrost-ops stack are **conceptually integrated but not mechanically coupled**. They are part of a continuous whole; they are also mutually exclusive in regards to one working and another breaking. There is no shared build, no enforced version pins, no compile-time imports across repo boundaries beyond what each repo declares for its own work.

Impact is **directional**. Foundational repos publish APIs/protocols; UX repos consume them. Changes in foundational repos *often* ripple to UX consumers (the LLM should surmise specific impacts from the change description and the pattern catalog). Changes in UX repos do NOT ripple down — foundational repos are always fine when UX repos are altered.

## The two layers

### Foundational
- **alkanes-rs** — Rust indexer + ts-sdk + shared types
- **metashrew** — WASM indexing runtime + host-function ABI
- **subzero-rs** — FROST/ROAST threshold signing + frtun overlay + signed-PSBT formats

These publish things other repos read. Their default branches advance independently.

### UX
- **subfrost-app** — Next.js frontend (consumes alkanes-rs ts-sdk, subzero-rs signing)
- **subfrost-mobile** — Compose + SwiftUI + uniffi Rust core (consumes alkanes-rs Rust types, subzero-rs signing)

These read from foundational APIs. They never write to foundational repos.

## The directional rule

```
foundational repo change  →  UX consumer MAY need to adapt
UX repo change            →  foundational repo is always fine
```

Specifics for each foundational repo are tracked in `stack/manifest.yaml::repos.<name>.ripples_to`. Those entries are **prompts for impact reasoning**, not enforced contracts.

## Examples

**Foundational change with downstream implications**
> "Refactor cellpack serialization in alkanes-rs to support a new opcode encoding."

alkanes-rs is foundational. The cellpack format is consumed by every subfrost-app mutation hook and by subfrost-mobile's Rust core. The LLM should surmise which call sites care, grep the named consumer surfaces, and consider whether a coordinated downstream PR is appropriate.

**Foundational change with no downstream impact**
> "Optimize the internal RocksDB iterator in metashrew."

Internal performance tweak; the host-function ABI doesn't change; nothing downstream needs to act.

**UX change, locally bounded**
> "Add a dark-mode toggle to subfrost-app settings."

Pure UI. No foundational consumption surface touched. Local validation only — typecheck, lint, test the toggle.

**UX change touching a foundational API**
> "Use a new ts-sdk function (introduced in alkanes-rs v2.2.0) for fee estimation in subfrost-app."

Still UX. The change is in subfrost-app; the foundational repo is unaffected. Confirm subfrost-app's pinned ts-sdk version actually exports the new function (see `/stack-snapshot` for the pin report). If it doesn't, either bump the pin or backport.

## Common misconceptions to avoid

- **"All five repos must always be in sync."** No. Each ships on its own cadence. Pin reports are informational; "drift" is not a state to enforce away.
- **"A change in any repo could break any other."** No. Only foundational → UX impact exists. UX changes are self-contained.
- **"The harness should verify every cross-repo dependency at change time."** No. The harness provides context (skills, agents, manifest); the LLM and the user reason about impact.
- **"`ripples_to` is a build dependency graph."** No. It's a hint for impact reasoning. The repos don't import each other across the boundary in a way that mechanical resolution would catch.

## Where the model is encoded

- `stack/manifest.yaml::layers` — the two layers + per-repo `layer` field
- `stack/manifest.yaml::repos.<name>.ripples_to` — foundational repos only; named UX consumers and surfaces
- `skills/stack-as-codebase/SKILL.md` — the integrated-codebase mental model with diagram + examples
- `skills/pattern-conformance/SKILL.md` — the canonical pattern catalog
- `agents/stack-preflight.md` — returns a structured context brief for a proposed change
- `scripts/hooks/alkanes-context-injector.js` — emits layer-aware context at SessionStart
- `rules/alkanes/security.md` — split auditing requirements by layer
- `templates/CLAUDE.md.<repo>` — each template tags its repo's layer up top

## When in doubt

Ask the user. The harness equips reasoning; it does not replace it.
