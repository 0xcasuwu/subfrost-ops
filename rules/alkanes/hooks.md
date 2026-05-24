---
paths:
  - "**/*.rs"
  - "**/*.ts"
  - "**/*.tsx"
---
# Alkanes / Subfrost — Hooks

> Extends `rules/common/hooks.md`. When/how to apply automation in this stack.

## SessionStart hooks (per repo)
The `subfrost-ops` fork ships a `session-start.js` enhancement that detects the cwd and injects the matching cheatsheet:

| cwd matches | Injected context |
|---|---|
| `alkanes-rs/` | `skills/alkanes-onboarding`, `skills/opcode-dispatch`, `skills/protostone-cellpack-edicts`, `skills/metashrew-indexer-patterns`, `skills/ts-sdk-alkanes-execute` |
| `subfrost-app/` | `skills/alkanes-onboarding`, `skills/browser-wallet-safety`, `skills/height-poller-frontend`, `skills/ts-sdk-alkanes-execute`, `skills/protostone-cellpack-edicts` |
| `metashrew/` | `skills/alkanes-onboarding`, `skills/metashrew-indexer-patterns`, `skills/wasm-build-pipeline` |
| `subzero-rs/` | `skills/alkanes-onboarding`, `skills/frost-roast-signing-flow` |
| `subfrost-mobile/` | `skills/alkanes-onboarding`, `skills/uniffi-checksum-survival` |
| `frost-lend/` or `boiler/` or `Fujin-contracts*` | `skills/alkanes-onboarding`, `skills/three-phase-init`, `skills/receipt-model`, `skills/opcode-dispatch`, `skills/alkanes-test-harness` |
| `boiler-v2/` | union of the contract + frontend skills |

## PreToolUse hooks
- `pre:observe:continuous-learning` — **enabled by default** — captures patterns to `$XDG_DATA_HOME/ecc-homunculus/projects/<hash>/observations.jsonl`
- `pre:bash:dispatcher` — quality gates (clippy/lint/typecheck pass before build)
- `pre:write:protostone-guard` (new) — flag any source change that adds `context.caller` checks or symbolic addresses to non-keystore paths

## PostToolUse hooks
- `post:edit:format` — `cargo fmt` for `.rs`, `prettier` for `.ts`/`.tsx`
- `post:edit:typecheck` — debounced typecheck after frontend edits
- `post:bash:build-completion` — surface size of any newly-built WASM (flag if >2MB)

## Repo-specific hook activation
- `subfrost-mobile/`: enable `post:bash:uniffi-checksum-check` after any build of `subfrost-mobile-ffi`
- `subzero-rs/`: enable `pre:write:zeroize-guard` to flag any new bare-array secret returns

## Disabling
Per-session disable via `ECC_DISABLED_HOOKS=hook1,hook2`. Don't permanently disable any hook in `rules/alkanes/security.md`'s funds-at-risk list.

## See also
- `hooks/hooks.json` for current registry
- `docs/patterns/INVENTORY.md` for the canonical list of hooks to activate
