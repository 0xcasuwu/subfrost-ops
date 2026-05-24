---
paths:
  - "**/*.rs"
  - "**/*.ts"
  - "**/*.tsx"
---
# Alkanes / Subfrost — Testing

> Extends `rules/common/testing.md`. Contract correctness is the highest bar; Bitcoin makes mistakes permanent.

## Contract integration tests (Rust)
- Every new state-changing opcode has at least one integration test that:
  - Constructs a protostone with the canonical `output: 1` edict routing
  - Asserts on storage state (via `IndexPointer`) AND token balances (via `BalanceSheetOperations`)
  - Exercises both happy path and at least one failure path
- Multi-contract scenarios: deploy all contracts, init all, finalize-auth, then run
- See skill `alkanes-test-harness` for the canonical scenario shape
- Reference: `~/reference/boiler/.../qa_precision_test.rs:335-410` (deposit) and `:441-511` (withdrawal)

## Indexer tests (Rust)
- Mock runtime + storage (`metashrew-test`)
- Test the indexer's reaction to a reorg (block N → N+1 → reorg → re-apply → state matches)
- Assert on state roots, not just key existence, for at least one path

## Frontend tests (TypeScript)
- Mutation hooks: at minimum a smoke test that exercises the happy path against devnet
- Unit-test pure helpers (PSBT patching, UTXO selection logic)
- Playwright E2E for major user flows (devnet boot, wallet creation, a swap, a vault deposit)
- Mock wallets must match real wallet adapter quirks (UniSat ≠ Xverse ≠ OKX)

## Mobile tests
- Rust core: direct `#[test]` fns in `crates/subfrost-mobile-ffi/tests/smoke.rs`
- uniffi-bindings-in-sync test must run in CI (`tests/uniffi_bindings_in_sync.rs`)
- Android: instrumented tests for StrongBox prompts (use a test biometric / pin-only fallback)
- iOS: XCTest for Secure Enclave wrap/unwrap (skip on simulator unless SE-emulator available)

## Subzero tests
- DKG simulation across multiple (t, n) combinations
- ROAST retry test with byzantine-signer-excluded branch
- Network-partition test (partial response, not full)
- Constant-time test for any new secret-comparison code path

## Coverage expectations
- Contract crates: ≥90% line coverage on opcode handlers; 100% on init/finalize paths
- Indexer: ≥80% line coverage; 100% on view functions
- Frontend mutations: 100% of the symbolic-address branch + the factory-router branch
- Subzero: ≥90% on protocol-state-machine code paths

## Forbidden
- Mocking the contract runtime in lieu of a real integration test (mocks miss the routing layer)
- Testing only the happy path of a mutation hook
- Skipping the reorg test for a new metashrew indexer
- Asserting on transaction hashes instead of the resulting state (hashes are non-deterministic)

## Where to run
- Rust contract crates: `cargo test -p <crate>` (uses pre-built WASMs in `tests/wasm/`)
- alkanes-rs: `cargo test` at workspace root
- metashrew: `cargo test` + `tests/comprehensive_e2e_test.rs`
- subfrost-app: `pnpm test` + `pnpm e2e` (Playwright)
- subfrost-mobile: `cargo test` for core + Android/iOS-instrumented per platform
- subzero-rs: `cargo test` + `cargo test --features in-memory-network` for simulation
