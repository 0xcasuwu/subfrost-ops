# Alkanes-rs Domain Patterns & Architecture

> LLM-focused guide to the canonical Rust Alkanes metaprotocol implementation (kungfuflex/alkanes-rs, develop branch)

---

## Table of Contents
1. [Top-Level Architecture](#top-level-architecture)
2. [Idiomatic Patterns](#idiomatic-patterns)
3. [Common Pitfalls & Anti-Patterns](#common-pitfalls--anti-patterns)
4. [Test Patterns](#test-patterns)
5. [Glossary](#glossary)

---

## Top-Level Architecture

### Workspace Layout (Cargo.toml:1-111)

The repository is a Cargo workspace with two major hierarchies:

#### crates/ — Core Infrastructure
- **alkanes** (crates/alkanes/Cargo.toml:1-90): The WASM indexer itself. Compiles as cdylib + lib. Ingests Bitcoin blocks, indexes alkanes, executes contract code.
- **alkanes-runtime** (crates/alkanes-runtime/Cargo.toml:1-25): Runtime traits and macros (declare_alkane!, AlkaneResponder). Used by all contract implementations.
- **alkanes-support** (crates/alkanes-support/lib.rs:1-139): Shared types: AlkaneId, AlkaneTransfer, Cellpack, Protostone, ExtendedCallResponse, storage/response marshaling.
- **alkanes-macros** (crates/alkanes-macros/lib.rs:1-250+): Derives MessageDispatch for opcode-to-method routing.
- **protorune** (crates/protorune/): Manages token balances, edicts, protoburns, and the Protostone messaging system (Bitcoin Runestone + Alkanes extensions).
- **metashrew-*** : Lower-level indexing and UTXO state management.

#### lkanes/ — Standard Contract Library
Pre-built contracts deployed to genesis block:
- lkanes-std-genesis-alkane: Root minting contract
- lkanes-std-test: Test harness (opcode 0–110, demonstrations)
- lkanes-std-auth-token: Token factory with auth
- lkanes-std-owned-token, lkanes-std-proxy, lkanes-std-upgradeable: Utilities

#### 	s-sdk/ — TypeScript Client
- src/provider/: Bitcoin RPC + alkanes indexer queries
- src/client/: AlkanesClient (provider + signer pattern, ethers.js-like)
- Tests: alkanes-transfer integration tests

### Data Flow: Block → Indexing → Execution

\\\
Block (Bitcoin + Runestones)
  ↓
_start() [crates/alkanes/lib.rs:343-359]
  → index_block() → index_extensions() → flush()
  
For each transaction with Runestone:
  → Protostone::process_message() [protorune/src/protostone.rs:71-150]
  → AlkanesRuntimeContext::from_parcel_and_cellpack() [alkanes-runtime/runtime.rs:37-53]
  → Run WASM: AlkanesInstance::run() → __execute() → AlkaneResponder impl
  → Store state + traces
\\\

### Key Crates & Their Responsibilities

| Crate | Purpose | Key Files |
|-------|---------|-----------|
| lkanes | WASM indexer, view functions, VM setup | lib.rs, m/runtime.rs, iew.rs |
| lkanes-runtime | Contract trait + macros | declare_alkane!, untime.rs, message.rs |
| lkanes-support | Types + serialization | id.rs, cellpack.rs, esponse.rs, parcel.rs |
| protorune | Token ledger + message routing | protostone.rs, message.rs, lib.rs |
| metashrew-core | KV store, atomic pointers | index_pointer.rs |

---

## Idiomatic Patterns

### 1. Contract Dispatch: The __execute() Pattern

**File**: crates/alkanes-runtime/lib.rs:13-67

Every contract exports a single #[no_mangle] __execute() function via the declare_alkane! macro.

The first input is always the **opcode** (u128).

The MessageDispatch macro converts opcodes to enum variants.

Contracts must implement AlkaneResponder (alkanes-runtime/runtime.rs).

Response is CallResponse or ExtendedCallResponse (alkanes-support/response.rs).

### 2. Cellpack: The Contract Call Message

**File**: crates/alkanes-support/cellpack.rs:1-73

A Cellpack is the atomic unit of execution—a contract invocation with inputs:

- target: AlkaneId — Which contract to call (block:tx id)
- inputs: Vec<u128> — Opcode + arguments

Serialization:
- to_vec(): Flatten to [block, tx, input0, input1, ...] as u128s
- serialize(): Convert to little-endian bytes
- encipher(): LEB-128 varint encoding for inclusion in Runestone

### 3. Protostone + ProtostoneEdict: Token Routing

**File**: protorune-support/src/protostone.rs:1-200

A **Protostone** is a message envelope in the Bitcoin Runestone that carries:
- protocol_tag (u128): Identifies which metaprotocol (e.g., Alkanes vs. BRC-20)
- pointer (Option<u32>): Output index that receives the response
- refund (Option<u32>): Output index that receives refunded tokens on failure
- edicts: Token movements (allocations to outputs)
- message: Opaque calldata for the contract

Structure details:
- burn: Option<u128>
- message: Vec<u8>
- edicts: Vec<ProtostoneEdict>
- refund: Option<u32>
- pointer: Option<u32>
- from: Option<u32>
- protocol_tag: u128

The output: 1 Pattern:

Token edicts use virtual outputs to route incoming tokens:
- output: 0 → First output of the transaction
- output: 1 → Second output (or virtual output if tx has 1 output)
- output: vout + num_protostones → Virtual output created by protostone at index vout

### 4. AlkaneId: Unique Identity

**File**: crates/alkanes-support/src/id.rs + crates/alkanes/src/lib.rs:240-252

Every alkane (contract) has a unique identity: **(block, tx)** where the contract was deployed.

Conversion to/from ProtoruneRuneId maps these identities seamlessly.

Query via RPC shows how to map alkane IDs to outpoints.

### 5. AlkaneTransfer & AlkaneTransferParcel: Token Movement

**File**: crates/alkanes-support/src/parcel.rs:1-100

Represents a single token transfer:
- id: AlkaneId — Which token
- value: u128 — How much

A parcel is a vector of transfers.

Layout: count + (block, tx, value)[]

### 6. Three-Phase Initialization: Deploy → Init → Finalize

Alkanes use a three-transaction pattern for contract creation:

**Phase 1: Deploy** (genesis block only)
- Genesis alkane is created in block 0, tx 0.
- Special handling via feature flags.

**Phase 2: Init** (separate tx in genesis block)
- Contract calls itself with opcode 0 (Initialize).

**Phase 3: Finalize** (future txs)
- The contract responds to Cellpacks sent to it in subsequent blocks.

### 7. Incoming Alkanes & Storage Context

**File**: crates/alkanes-runtime/runtime.rs:14-93

The runtime provides context to each contract:
- myself: AlkaneId — This contract's id
- caller: AlkaneId — Who called us
- incoming_alkanes: AlkaneTransferParcel — Tokens received
- returndata: Vec<u8> — From EXTCALL
- inputs: Vec<u128> — Opcode + arguments
- message: Box<MessageContextParcel> — Bitcoin context
- trace: Trace — Debug/audit trail

Flattening for WASM:
- [myself.block, myself.tx, caller.block, caller.tx, vout, alkanes_count, (id.block, id.tx, value)[], inputs[]]

### 8. WASM Build Pipeline

**Files**: 
- crates/alkanes/build.rs (removed—pre-built)
- alkanes/Cargo.toml (cdylib + rlib)
- scripts/build-std.sh (not shown here)

**Process**:
1. Each alkanes-std-* contract compiles to WASM via cargo build --target wasm32-unknown-unknown --release.
2. Pre-built WASM stored in crates/alkanes/src/precompiled/*.rs (hardcoded).
3. At indexing time, WASM is loaded and instantiated via wasmi (crates/alkanes/vm/instance.rs).

### 9. TypeScript SDK: Client Abstraction

**File**: ts-sdk/src/client/client.ts:1-150

Follows the ethers.js pattern:
- AlkanesClient combines provider + signer
- Provider handles Bitcoin RPC and alkanes indexer queries
- Signer handles transaction signing

### 10. Host Functions: Storage & Execution

**File**: crates/alkanes/vm/host_functions.rs:1-120

WASM contracts call host functions to interact with the index.

Key operations:
- request_storage: Read contract state
- request_fuel: Check fuel balance
- extcall: Call another contract
- delegatecall: Call with caller's storage
- staticcall: Read-only call
- balance: Check alkane balance

---

## Common Pitfalls & Anti-Patterns

### 1. Contract Compilation Failures

**No-std Restrictions**
- Alkanes must compile to wasm32-unknown-unknown **without std**.
- **Forbidden**: println!, std::fs, std::env, alloc::vec! (unless behind feature gate).
- **Workaround**: Use alkanes_runtime::println! (wrapped for WASM).

**Restricted Crates**
- No external crates unless in alkanes-support or alkanes-runtime.
- Cannot use tokio, reqwest, database drivers.

**Allocator Issues**
- WASM allocator may panic in edge cases.
- Test with small inputs first.

### 2. Routing Failures: Wrong Output Index

**Protostone Pointer Mismatch**
- If pointer: 1 but the tx has only 2 outputs, the output doesn't exist.
- **Result**: Transaction fails silently; no refund if refund is also invalid.
- **Fix**: Ensure pointer < num_outputs + num_protostones

**Missing Protocol Tag**
- If a protostone's protocol_tag doesn't match the alkanes protocol, it's ignored.
- **Result**: Contract is never called; tokens stay in the virtual output.
- **Fix**: Set protocol_tag to the alkanes tag in Runestone construction.

### 3. Test Setup Pitfalls

**WASM Not Built**
- Running cargo test without first building WASM via ./scripts/build-std.sh causes failures.
- **Error**: could not find ...alkanes_std_test_build::get_bytes().
- **Fix**: Run ./scripts/build-std.sh from repo root before tests.

**Wrong Test Fixture**
- Using clear() but not calling FuelTank::initialize() can cause fuel exhaustion.

**State Leakage Between Tests**
- Global unsafe static DIESEL_MINTS_CACHE persists across tests.
- **Fix**: Call clear_diesel_mints_cache() in test setup.

### 4. Serialization Mismatches

**AlkaneTransferParcel Encoding**
- Format: [len (u128)] + [(block, tx, value) * len] as u128s in little-endian bytes.
- Off-by-one errors in parsing → token loss or crash.

### 5. Response Handling

**Forgot to Forward Incoming Tokens**
- A contract receives 50 tokens but returns none.
- **Result**: Tokens burned (lost).
- **Fix**: Use CallResponse::forward(&context.incoming_alkanes).

**Storage Not Persisted**
- ExtendedCallResponse with storage changes but contract calls refund due to errors.
- **Result**: Changes committed anyway (atomic pointer behavior).

---

## Test Patterns

### Pattern 1: Integration Tests with Fixtures

Clear global state, load pre-built WASM bytecode, create test block with cellpacks, process via index_block().

Key Components:
- clear(): Reset metashrew KV store and fuel tank.
- alkane_helpers::init_with_multiple_cellpacks(): Create a test block.
- alkanes_std_test_build::get_bytes(): Hardcoded WASM bytecode.
- index_block(): Process the block.

### Pattern 2: Fuel Benchmarking

Track fuel consumption across operations using FuelBenchmark struct.

Initialize FuelTank before each block.

Record pre/post fuel states.

Calculate fuel consumed as percentage of total.

### Pattern 3: Precision Tests (qa_precision_test.rs style)

Verify exact token amounts.

Use getstorageat() to validate stored values.

Assert no rounding or precision loss.

---

## Glossary

### Core Concepts

**Alkane**: A contract deployed to Bitcoin, identified by (block:tx).

**AlkaneId**: Tuple (block, tx) uniquely identifying a contract.

**Cellpack**: Atomic contract invocation: target alkane + opcode + inputs.

**Protostone**: Message envelope in Runestone; carries opcode, tokens, routing info.

**ProtostoneEdict**: Token allocation to output; edicts redirect tokens to virtual outputs.

**Protocol Tag**: 128-bit identifier for a metaprotocol (e.g., Alkanes vs. BRC-20).

**ProtoruneRuneId**: Token identifier = (block, tx) of deploy tx.

**Incoming Alkanes**: Tokens transferred to a contract in the current transaction.

**AlkaneTransfer**: Single token transfer: (id, value).

**AlkaneTransferParcel**: Vector of transfers; contract response specifies outgoing tokens.

**Cellpack Message**: Serialized opcode + args sent to contract __execute().

**View Function**: Read-only query into indexer state (e.g., getbalance).

**__execute()**: Entrypoint macro-generated by declare_alkane!.

**MessageDispatch**: Derive macro: opcode → enum variant → method dispatch.

**AlkaneResponder**: Trait that contracts implement; provides context() and fallback().

**Receipt**: No Ethereum-style receipts; state is indexed directly via atomic pointers.

**Atomic Pointer**: KV store pointer with checkpoint/commit semantics.

**Output Index**: Protostone pointer/refund: transaction output (or virtual output).

**Virtual Output**: Output created by protostone; index = num_real_outputs + protostone_index.

**Refund Pointer**: Output where tokens flow if contract fails.

**Success Pointer**: Output where response tokens flow if contract succeeds.

---

## Best Practices

1. **Always implement AlkaneResponder** via declare_alkane! macro.
2. **Use #[derive(MessageDispatch)] enum** for opcode-to-method mapping.
3. **Test with WASM pre-built**: Run ./scripts/build-std.sh before cargo test.
4. **Handle incoming alkanes**: Forward or burn explicitly; don't silently lose tokens.
5. **Validate pointers**: Ensure pointer < num_outputs + num_protostones.
6. **Set correct protocol_tag**: Must match the alkanes protocol identifier.
7. **Use atomic pointers**: Leverage checkpoint/commit for transactional semantics.
8. **Test serialization roundtrips**: AlkaneTransferParcel, Cellpack, responses.
9. **Profile fuel usage**: Use FuelBenchmark pattern to detect runaway loops.
10. **Mock in tests**: Use test helpers (alkane_helpers::clear(), init_with_multiple_cellpacks()).

---

**Document Version**: 1.0  
**Last Updated**: 2025-05-23  
**Alkanes-rs Branch**: develop  
**Repository**: https://github.com/kungfuflex/alkanes-rs
