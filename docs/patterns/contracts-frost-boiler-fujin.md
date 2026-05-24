# Contract patterns — frost-lend, boiler, Fujin

Three Alkanes contract reference repos. Where they agree = canonical pattern. Where they disagree = pick frost-lend (most exhaustive tests, most recent).

## A. frost-lend (Liquity-style lending)
11 contracts: trove-manager, borrower-ops, stability-pool, active-pool, sorted-troves, price-feed, staking, coll-surplus-pool, frost-lend-token (frostUSD), fire-token, auth-token. Pre-built WASMs at `src/tests/wasm/`.

## B. boiler (staking boilerplate, hude/review branch)
Canonical Rust test patterns. Per existing memory: `qa_precision_test.rs:335-410` (deposit, opcode 1) and `441-511` (withdrawal, opcode 2) demonstrate the canonical `output: 1` edict routing for `incomingAlkanes`.

## C. Fujin-contracts-main (prediction markets)
AMM-style prediction markets with epoch-based settlement and LONG/SHORT derivative tokens.

## Canonical pattern across all 3

### Contract architecture
- Rust → WASM crates using `#[derive(MessageDispatch)]` for opcode routing
- Opcodes: 0-89 = state-changing, 90+ = view-only
- Three-phase init: **deploy** (WASM indexed) → **init opcode 0** (storage setup) → **finalize auth** (cross-contract binding)
- Storage: keyword-based `StoragePointer::from_keyword("/path").select(&key)` hierarchical chains

### Ownership / auth (consistent across repos)
- **Receipt token pattern** — trove/position ownership = holding 1 unit of a unique auth token (NOT `context.caller`)
- **Protocol auth token pattern** — cross-contract guard via 1 persistent token passed in every call; callees verify it and return it
- **Factory pattern** — parent spawns unique children; runtime sequence counter guarantees unique AlkaneIds (e.g. `AlkaneId { block: 2, tx: sequence }`)

### Storage conventions
- Keyword pointers: `/contract_name`, `/params/field`, `/nodes/{id}/property`, `/event/state`
- u128 values via `.get_value::<T>()` and `.set_value(T)`
- Per-entity hierarchies for complex data (troves, nodes, balance maps)

### Cross-contract calls
- `Cellpack { target: AlkaneId, inputs: vec![opcode, ...args] }` + `AlkaneTransferParcel` for token transfers
- `self.call()` (state-changing) vs `self.staticcall()` (read-only)
- Full transaction-level atomicity — if any call fails, ALL state reverts

### Canonical test harness (the `output: 1` pattern)
```rust
Protostone {
    message: into_cellpack(vec![target.block, target.tx, opcode]).encipher(),
    protocol_tag: AlkaneMessageContext::protocol_tag() as u128,
    pointer: Some(0),
    refund: Some(0),
    edicts: vec![
        ProtostoneEdict {
            id: ProtoruneRuneId { block: 2, tx: 1 },  // token to send
            amount: available_tokens,
            output: 1,  // points to OP_RETURN (the protostone itself)
        }
    ],
}
```
`output: 1` routes the edict to the OP_RETURN containing the protostone — runtime picks up the token as `incomingAlkanes` for the contract call.

In the TS SDK (`alkanesExecuteWithStrings`), same effect via `inputRequirements`:
- `"32:0:1000"` = send 1000 units of `[32:0]` to the cellpack protostone
- `"2:1:1"` = send 1 unit of `[2:1]` to the cellpack
- SDK finds the UTXOs and auto-generates the edict routing

### Multi-contract scenarios
- Deploy templates → init contracts → execute test operations
- Protorune-based: transactions carry `Protostone` edicts with `ProtostoneEdict` for token routing
- Assert on storage state and token balances via `BalanceSheetOperations`

## Domain-specific specializations

### frost-lend (lending math)
- Collateral ratios per-trove
- Redemption fees (base + dynamic)
- Base-rate decay (per-block exponential)
- Stability-pool reward distribution (per-deposit pro-rata)

### boiler (ERC4626-style vault)
- Staking + reward accumulation
- Vault shares + asset conversion math
- Reward rate computation per-block

### Fujin (prediction markets)
- AMM with LONG/SHORT derivative tokens
- Epoch-based settlement
- Oracle resolution at epoch end
- Position closing pays from the losing side's pool

## Pitfalls flagged across all 3
- **Forgetting opcode 0 (init)** — contract deploys but storage is uninitialized; subsequent calls revert
- **Missing finalize-auth step** — cross-contract auth tokens not bound; protocol operations fail silently
- **Wrong edict `output:` index** — token routes to the wrong vout; not picked up as `incomingAlkanes`
- **Forgetting `protocol_tag`** — protostone is ignored entirely by the runtime
- **Mixing `call` and `staticcall`** — staticcall on a state-changing path fails; vice-versa leaks unintended writes
- **Storage pointer typos** — `.select(&key)` on the wrong path silently reads default values

## Glossary additions (specific to contracts)
- **Trove** — a single borrower's collateralized position (frost-lend)
- **Stability pool** — the pool of frostUSD held to absorb liquidations
- **Recovery mode** — protocol state when system collateral ratio drops below threshold; tightens liquidations
- **Auth token** — per-position receipt that proves ownership
- **Protocol token** — long-lived cross-contract handshake token
- **Epoch** — fixed-block-count period for prediction market settlement (Fujin)
- **LONG/SHORT tokens** — derivative position tokens minted on Fujin entry
