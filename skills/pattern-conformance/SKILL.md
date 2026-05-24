---
name: pattern-conformance
description: The canonical pattern catalog for the subfrost-ops stack. 17 patterns already documented across skills/rules/docs, consolidated as one browsable digest. Load at SessionStart to make the LLM's pattern recall accurate. Future work in any of the 5 repos should mirror these patterns rather than invent new ones.
origin: subfrost-ops
---

# Pattern Conformance

This is a table-of-contents skill. Each entry names a canonical pattern already encoded in the subfrost-ops corpus, summarizes it in one line, and points to the authoritative definition. Load this skill at SessionStart; when a change touches one of the patterns, reach for the cited authoritative source instead of re-inventing.

How to use:
1. Skim the catalog. Match the change you're about to make against a pattern.
2. Read the cited authoritative source for the specifics.
3. Mirror the canonical pattern. Don't invent a parallel approach.
4. If no pattern matches, that's a signal — either the change is genuinely novel (rare), or you should look harder (likely).

## Catalog

### 1. Opcode dispatch via `MessageDispatch` macro
- **Applies to**: alkanes-rs (any contract crate), all alkane-contract repos (frost-lend, boiler, Fujin)
- **What**: Every Alkanes contract exports `#[no_mangle] __execute()`. Inputs route through `#[derive(MessageDispatch)]` on an enum. State-changing opcodes are 0-89; view/read opcodes 90+.
- **Conforming work**: Add the opcode as a new variant in the dispatch enum; implement the handler method; do not bypass with raw input parsing.
- **Authority**: `skills/opcode-dispatch/SKILL.md`, `docs/patterns/alkanes-rs.md`

### 2. Two-protostone message format (p0 edict + p1 cellpack)
- **Applies to**: alkanes-rs ts-sdk, subfrost-app mutation hooks, any frontend-to-contract flow
- **What**: Operations sending alkanes to a contract use two Runestones — p0 (edict) routes tokens; p1 (cellpack) calls the contract. SDK auto-generates p0 from `inputRequirements`. Manual edict construction in that flow = double-edict bug.
- **Conforming work**: Express token movement via `inputRequirements` strings (`"32:0:1000"`, `"B:600"`). Let the SDK build p0. Construct p1 yourself with target + opcode + inputs.
- **Authority**: `skills/protostone-cellpack-edicts/SKILL.md`, `skills/ts-sdk-alkanes-execute/SKILL.md`

### 3. HeightPoller query invalidation
- **Applies to**: subfrost-app, any Alkanes frontend tracking on-chain state
- **What**: A single block-height poller invalidates all React-Query caches on each new block (excluding height itself + frBTC-premium to avoid oscillation). Data hooks use `staleTime: Infinity` and never self-refresh.
- **Conforming work**: New data hooks subscribe via HeightPoller invalidation, not `refetchInterval`. Mutations don't manually invalidate — the next block does it.
- **Authority**: `skills/height-poller-frontend/SKILL.md`, `docs/patterns/subfrost-app.md` section 1

### 4. Receipt-based authorization (NOT `context.caller`)
- **Applies to**: All Alkanes contracts (frost-lend, boiler, Fujin, subfrost-alkanes)
- **What**: Position ownership = holding a per-position receipt token in `context.incoming_alkanes`. Never check `context.caller`.
- **Conforming work**: Mint a unique receipt token on position open; bind state to its id. On position operations, look for the receipt in incoming alkanes and revert if missing.
- **Authority**: `skills/receipt-model/SKILL.md`, invariant `receipt-not-caller` in `stack/manifest.yaml`

### 5. Three-phase init guard
- **Applies to**: All Alkanes contracts
- **What**: Three phases — deploy (WASM indexed), opcode 0 init (storage setup, idempotent-guarded), finalize-auth (cross-contract binding). Every opcode handler other than 0 guards on `/initialized = true`.
- **Conforming work**: Implement opcode 0 with a `/initialized` check; set it inside the same handler; every other handler begins with the guard.
- **Authority**: `skills/three-phase-init/SKILL.md`, invariant `three-phase-init-guard` in manifest

### 6. Browser wallet address safety (2026-03-01 incident)
- **Applies to**: subfrost-app mutation hooks signing through browser wallets (UniSat, OYL, Xverse, OKX)
- **What**: Symbolic addresses (`p2tr:0`) resolve to the SDK's dummy wallet for browser wallets and cause unspendable outputs. Use real address strings; symbolic refs are keystore-only.
- **Conforming work**: In any mutation, branch on `wallet.kind === 'keystore'`. Symbolic OK for keystore; real address strings (via `wallet.getAddress()`) for everything else.
- **Authority**: `skills/browser-wallet-safety/SKILL.md`, incident in invariant `no-symbolic-addresses-on-browser-wallets`

### 7. Factory router dispatch (opcode 13, not pool opcode 3 direct)
- **Applies to**: subfrost-app swap/liquidity mutations, alkanes-rs ts-sdk builders
- **What**: Pool opcode 3 (Swap) is missing on deployed pools. Use factory opcode 13 (SwapExactTokensForTokens). Same for AddLiquidity (opcode 11) and RemoveLiquidity (opcode 12) routing through factory.
- **Conforming work**: New AMM mutation calls factory at opcode 13 with poolId as first input; never call pool opcode 3 directly.
- **Authority**: `skills/ts-sdk-alkanes-execute/SKILL.md`, invariant `factory-router-not-pool-direct`

### 8. uniffi DEBUG-`.so` bindings
- **Applies to**: subfrost-mobile FFI surface
- **What**: Kotlin/Swift bindings MUST be regenerated from a DEBUG cdylib (unstripped metadata). Release builds strip metadata; stale checksums in generated stubs crash the app on first FFI call.
- **Conforming work**: Follow `build-release.sh:173-201`. Build release `.so` per ABI; build debug `.so` for bindgen only; regenerate Kotlin/Swift from the debug `.so`; ship release `.so` + debug-derived bindings; CI must run `tests/uniffi_bindings_in_sync.rs`.
- **Authority**: `skills/uniffi-checksum-survival/SKILL.md`, invariant `uniffi-debug-so-bindings`

### 9. Zeroize secret material
- **Applies to**: subzero-rs (signing), any key derivation
- **What**: Every secret-bearing type wraps in `Zeroizing<T>` or `SecretBox<T>`. Bare arrays returned from PBKDF2/derivation are forbidden.
- **Conforming work**: When deriving a key, wrap output in `Zeroizing<[u8; N]>`. Implement `Drop` (or use `ZeroizeOnDrop`) on structures holding secret material. For async, ensure cancellation paths drop the secrets safely.
- **Authority**: `skills/frost-roast-signing-flow/SKILL.md`, invariant `zeroize-secret-material` (notes 3 known gaps in subzero-keystore + subzero-roast)

### 10. Append-only `IndexPointer` for metashrew state
- **Applies to**: alkanes-rs indexer, metashrew, any WASM-indexed-state module
- **What**: State writes go through `IndexPointer` (append-only at `key/length`, `key/0`, ...). Reorg rollback is automatic IF you key correctly. Same-block `get` + `set` on the same key returns stale (cache hazard).
- **Conforming work**: Use `IndexPointer::from_keyword(...).select(...).set(...)`. Never raw KV writes. Track in-flight changes in local state if you must read your own writes within `_start()`.
- **Authority**: `skills/metashrew-indexer-patterns/SKILL.md`, `docs/patterns/metashrew.md`

### 11. PSBT Taproot `tapInternalKey` patching
- **Applies to**: subfrost-app browser-wallet signing
- **What**: Taproot inputs need `tapInternalKey` patched before browser-wallet signing or wallets fail to sign correctly.
- **Conforming work**: Before signing in the browser, iterate Taproot inputs through `lib/wallet/browserWalletSigning.ts` helpers.
- **Authority**: `skills/browser-wallet-safety/SKILL.md`, `docs/patterns/subfrost-app.md` section 5

### 12. UTXO selection (alkane indexer + ord_outputs + dust filter)
- **Applies to**: subfrost-app UTXO selection, any alkane transfer
- **What**: Querying for spendable UTXOs must call the alkane indexer + `ord_outputs` RPC to avoid spending inscription/rune-bearing or multi-asset dust. Dust (<1000 sats) excluded from fee/change unless caller knows it holds the target asset.
- **Conforming work**: Use the existing UTXO-selection helpers; do not roll your own. Filter dust; disambiguate multi-asset UTXOs or skip with a warning.
- **Authority**: `docs/patterns/subfrost-app.md` section 6

### 13. Regtest/mainnet pool collision
- **Applies to**: subfrost-app pool queries (`useAlkanesTokenPairs`, `usePools`)
- **What**: Genesis alkane ids (2:0 DIESEL, 32:0 frBTC) are identical on mainnet and regtest. Espo returns mainnet reserves on regtest, poisoning quotes ~191x.
- **Conforming work**: Skip Espo on regtest. Use RPC simulation fallback (factory opcode 3 + pool opcode 999) for quotes.
- **Authority**: `docs/patterns/subfrost-app.md` section 7

### 14. Multi-address-type wallet support (post-2026-03)
- **Applies to**: subfrost-app, subfrost-mobile (when reasoning about wallet addresses)
- **What**: Wallets expose taproot + segwit + legacy address types. The earlier taproot-only assumption is no longer valid.
- **Conforming work**: Detect the active address type per wallet/network; route signing accordingly. Don't hardcode taproot prefixes.
- **Authority**: `docs/patterns/subfrost-app.md` "Recent develop additions", commit `87aa1e97`

### 15. Fork heights (consensus-critical gating)
- **Applies to**: alkanes-rs, any contract or indexer touching height-gated logic, frontends interpreting historical state
- **What**: `V220_FORK_HEIGHT` and similar gate consensus-critical dispatch (e.g. DIESEL native precompile). Code that doesn't respect them is silently consensus-breaking.
- **Conforming work**: Check the height before any path that might differ above/below the fork. Document new fork heights in `stack/manifest.yaml::repos.alkanes-rs.fork_heights`.
- **Authority**: `docs/patterns/DELTA-alkanes-rs.md`, `stack/manifest.yaml::repos.alkanes-rs.fork_heights`

### 16. Continuous-learning-v2 project + stack scoping
- **Applies to**: All work in the 5 stack repos
- **What**: Observations from tool calls are captured by CL2 hooks. Project-local instincts stay project-local (no cross-project contamination). The `observe-stack.js` hook adds a `stack:subfrost-ops` tag when cwd matches a stack repo so `/evolve` clusters stack-wide patterns.
- **Conforming work**: When you notice a pattern that should be reused across the stack, name it explicitly in conversation so CL2 captures it cleanly. Run `/evolve` periodically. Run `/promote` to lift cross-project patterns to global.
- **Authority**: `scripts/hooks/observe-stack.js`, `docs/patterns/INVENTORY.md` section "Continuous-learning-v2"

### 17. Stack manifest as repo registry (not coupling DB)
- **Applies to**: How the harness reasons about the 5 repos
- **What**: `stack/manifest.yaml` is a registry of repos (clone paths, branches, layers, `ripples_to` prompts, invariants). It is NOT a build-dependency graph or version-pin enforcer. Repos ship independently.
- **Conforming work**: When adding a new pattern that spans repos, add it as an `invariants:` entry (not as a `cross_repo_deps` block). When noting downstream impact, edit `ripples_to:` informationally.
- **Authority**: `stack/manifest.yaml`, `docs/LAYER-MODEL.md`

## Anti-patterns (do not invent these)

If you find yourself reaching for any of these, you're departing from canonical:
- Manually constructed protostone edicts when `inputRequirements` is available
- `context.caller` for contract authorization (the receipt model is the standard)
- Symbolic addresses (`p2tr:0`) on browser-wallet paths
- `refetchInterval` on a data hook (HeightPoller is the invalidator)
- Pool opcode 3 direct calls (factory opcode 13 is the router)
- Bare `Vec<u8>` for derived cryptographic keys (use `Zeroizing` / `SecretBox`)
- Raw KV writes in metashrew indexers (use `IndexPointer`)
- Bidirectional dependency tracking between repos (the model is unidirectional foundational → UX)
- Mechanical version-pin enforcement (pins are informational; the LLM and user decide)

## Reference
- `docs/LAYER-MODEL.md` — the directional-impact model
- `stack/manifest.yaml::invariants` — formal invariant statements
- All cited skills live under `skills/`; all cited pattern docs under `docs/patterns/`
