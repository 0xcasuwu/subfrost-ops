---
paths:
  - "**/*.rs"
  - "**/*.ts"
  - "**/*.tsx"
---
# Alkanes / Subfrost — Coding Style

> Extends `rules/common/coding-style.md`, `rules/rust/coding-style.md`, and `rules/typescript/coding-style.md`. Applies to contract crates (frost-lend, boiler, Fujin, subfrost-alkanes), indexer crates (alkanes-rs), the ts-sdk, and the Next.js frontends.

## Naming

### Opcodes
- Constants in TypeScript: `SCREAMING_SNAKE_CASE` (`FACTORY_OP_ADD_LIQUIDITY = 11`)
- Enum variants in Rust: `PascalCase` (`enum FactoryMessage { AddLiquidity { ... } = 11 }`)
- Group opcode constants by contract role: `FACTORY_OPCODES`, `POOL_OPCODES`, `VAULT_OPCODES`

### AlkaneIds
- Always write `{ block: N, tx: M }` explicitly — never positional tuples like `[2, 1]` in code
- Genesis ids: keep canonical mapping in one file (`constants/genesis.ts` or `crates/*/src/constants.rs`)

### Storage paths
- Slash-prefixed, lowercase, hyphenated: `/total_deposits`, `/pool/<id>/reserves`
- Hierarchical via `.select(&key)`; never string-concat the key into the keyword

### Receipt / auth tokens
- Type alias them: `type ReceiptId = AlkaneId;` `type ProtocolAuthToken = AlkaneId;`
- Don't reuse the same variable name `auth` for both — use `receipt_id` and `protocol_token`

## Formatting / lints
- Rust: `cargo fmt` + `cargo clippy -- -D warnings`
- TypeScript: `pnpm lint` (whatever ESLint config the repo ships)
- WASM contracts: keep functions <100 lines so the binary stays cache-friendly

## Comments
- Default: none (well-named identifiers should explain themselves)
- DO comment: the *why* of a magic number (`// opcode 3 missing on deployed pools; use factory opcode 13`)
- DO comment: a workaround for a specific tx postmortem (`// fix for TX 985436b5... — see flashcards "Incident Postmortems"`)
- DON'T comment: what the code does, or which agent wrote it, or which PR fixed it (commit history is authoritative)

## File layout
- Contract crate: `lib.rs` (dispatch + entry), `state.rs` (storage helpers), `math.rs` (pure math), `tests/`
- Indexer crate: `lib.rs` (entry `_start`), `view.rs` (view fns), `index.rs` (per-tx processing)
- Frontend hook: one mutation per file (`useSwapMutation.ts`), one query factory per file (`queries/pools.ts`)
