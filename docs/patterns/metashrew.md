# metashrew — domain patterns

`kungfuflex/metashrew`. WASM-powered indexing suite for metaprotocols on Bitcoin. Located at `C:\Users\ed995\reference\metashrew`.

## Architecture
Layered system: WASM runtime + Sparse Merkle Tree state commitment + Optimized BST for O(1) current / O(log n) historical reads + reorg-safe append-only RocksDB storage + JSON-RPC server for queries.

### Crates
- `crates/metashrew-runtime/` — core runtime (`runtime.rs`, `smt.rs`, `optimized_bst.rs`)
- `crates/metashrew-core/` — guest-side WASM bindings (`lib.rs`, `imports.rs`, `index_pointer.rs`)
- `crates/metashrew-support/` — Bitcoin parsing + utilities (`block.rs`, `address.rs`, `byte_view.rs`, `compat.rs`)
- `crates/rockshrew-sync/` — sync layer (`sync.rs`, `traits.rs` for adapters)
- `crates/rockshrew-mono/` — integrated indexer + RPC server (`main.rs`)
- `crates/metashrew-minimal/` — reference test indexer (`lib.rs`, PROTOSTONE format)

### Key types
| Component | File:line | Export |
|---|---|---|
| WASM runtime | `metashrew-runtime/src/runtime.rs:113-250` | `MetashrewRuntime<T>` |
| Host functions | `metashrew-runtime/src/runtime.rs:320-400` | `__host_len`, `__get`, `__flush`, `__log` |
| Storage trait | `metashrew-runtime/src/traits.rs:8-24` | `KeyValueStoreLike` (RocksDB or Memory) |
| SMT | `metashrew-runtime/src/smt.rs:78-100+` | `SMTHelper<T>` |
| Optimized BST | `metashrew-runtime/src/optimized_bst.rs` | O(1) current + O(log n) historical |
| Sync engine | `rockshrew-sync/src/sync.rs:25-80` | `MetashrewSync<N,S,R>` |
| Guest API | `metashrew-core/src/lib.rs:103-150` | `get()`, `set()`, `flush()`, `input()` |

## Idiomatic indexer pattern

### Entry point
```rust
// crates/metashrew-minimal/src/lib.rs:73-162
#[cfg(target_arch = "wasm32")]
#[unsafe(no_mangle)]
pub fn _start() {
    let mut input_data = Cursor::new(input());
    let height = consume_sized_int::<u32>(&mut input_data).unwrap();
    let block_bytes = consume_to_end(&mut input_data).unwrap();
    let block = consensus_decode::<bitcoin::Block>(&mut Cursor::new(block_bytes)).unwrap();

    for tx in block.txdata.iter() {
        // process outputs, write via IndexPointer
    }
    flush(); // commit all writes
}
```

Input layout: `[u32 height (LE)][remaining block bytes]`. `flush()` is mandatory.

### State commit
```rust
let mut pointer = IndexPointer::from_keyword("/path/to/key");
pointer.set(Arc::new(value.to_vec()));  // queues write
flush();  // SMT computes root at height, appends to key/0, key/1...
```
Append-only: writes to `key/length`, `key/0`, `key/1`, ... (`smt.rs:36-39`). State root stored at `smt:root:{height}` (`smt.rs:86`).

### Rollback (automatic)
`MetashrewSync::handle_reorg()` (`rockshrew-sync/src/sync.rs:574`) walks back to common ancestor. Runtime calls `OptimizedBST::rollback_to_height()` (`optimized_bst.rs:274`) which removes `key/{n}` entries above target height; SMT nodes pruned (`metashrew-runtime/src/rollback.rs`).

### View functions
```rust
#[no_mangle]
pub extern "C" fn get_outpoint() -> i32 {
    let mut cur = Cursor::new(input());
    let _height = consume_sized_int::<u32>(&mut cur).unwrap();
    let mut txid_bytes = [0u8; 32];
    cur.read_exact(&mut txid_bytes).unwrap();
    let vout = consume_sized_int::<u32>(&mut cur).unwrap();
    let key = format!("/outpoint/{}:{}", hex::encode(&txid_bytes), vout).into_bytes();
    let value = get(Arc::new(key));
    export_bytes(value.as_ref().clone())
}
```
Called via `metashrew_view` JSON-RPC. Memory layout: `[u32 LE len][value bytes]`.

## WASM build setup
```toml
# Cargo.toml
[profile.release]
opt-level = "z"
lto = true
codegen-units = 1
```
Target: `wasm32-unknown-unknown`. Allocator handled by `metashrew-core` (wee_alloc). Panic hook trapped via `last_panic_info()`.

## JSON-RPC API
| Method | Params | Purpose |
|---|---|---|
| `metashrew_view` | `[func_name, input_hex, height \| "latest"]` | view-function query |
| `metashrew_preview` | `[block_hex, func_name, input_hex, height]` | dry-run block without persist |
| `metashrew_height` | `[]` | current indexed height |
| `metashrew_getblockhash` | `[height]` | block hash at height |
| `metashrew_stateroot` | `[height \| "latest"]` | SMT root at height |
| `metashrew_snapshot` | `[]` | indexer stats |

## Host function signatures (C ABI)
```c
i32  __host_len()                          // length of input data
void __load_input(i32 ptr)                 // copy input to WASM memory
i32  __get_len(i32 key_ptr)                // length of value for key
void __get(i32 key_ptr, i32 value_ptr)     // read value
void __flush(i32 ptr)                      // commit key-value batch
void __log(i32 ptr)                        // log message
```
All pointers use ArrayBuffer layout: `[4-byte LE length][data]`.

## Pitfalls
- **Forgetting `flush()`** — writes queue in `TO_FLUSH` but never persist.
- **Same-block read-modify-write** — `get()` returns stale cached value because cache is per-block and won't see in-flight `TO_FLUSH` mutations until next flush. Design indexer to avoid this; use distinct keys or pre-load.
- **WASM imports** — no `std::fs`, no `std::net`. Sandbox.
- **Missing `#[no_mangle]`** on `_start` — linker can't find the entry point.
- **Wrong memory layout** in host calls — always use `metashrew_core::get()` wrapper; raw `__get` requires the 4-byte length prefix.
- **Bloated WASM** — without `opt-level=z` + `lto=true` modules push past 2MB and waste fuel.

## Spec versioning
SPECIFICATION.md v9.0.0 (June 24, 2025). Wasmtime engine with NaN canonicalization + relaxed-SIMD determinism (`runtime.rs:327-335`). 4GB max pre-allocated memory, 64KB guard pages, no COW (`runtime.rs:328-334`).

## Test harness
`metashrew-minimal/src/lib.rs` + `tests/comprehensive_e2e_test.rs`. Build fake blocks (consensus_decode + custom serialization); load indexer via `MetashrewRuntime::load(wasm_path, storage)` (`runtime.rs:426`); call `runtime.run()` or `runtime.process_block_atomic()`; verify state roots via `get_state_root(height)`.

## Glossary
- **append-only versioned keys**: `key`, `key/length`, `key/0`, `key/1`...
- **SMT node prefix**: `smt:node:{hash}`
- **state-root key**: `smt:root:{height}` — SHA256 commitment
- **adapter traits** (`rockshrew-sync/src/traits.rs:15-80`): `BitcoinNodeAdapter`, `StorageAdapter`, `RuntimeAdapter`, `JsonRpcProvider`
