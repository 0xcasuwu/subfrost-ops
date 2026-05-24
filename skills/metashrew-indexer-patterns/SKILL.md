---
name: metashrew-indexer-patterns
description: How to write a metashrew indexer module — _start(), input layout, append-only storage via IndexPointer, view functions, flush() discipline, and the same-block read-modify-write hazard.
origin: subfrost-ops
---

# Metashrew Indexer Patterns

## When to use
- Writing a new metashrew WASM indexer (alkanes-rs is one)
- Adding a new view function
- Diagnosing a state-root mismatch or "view returns stale data"

## Entry point

```rust
#[cfg(target_arch = "wasm32")]
#[unsafe(no_mangle)]
pub fn _start() {
    let mut input_data = Cursor::new(input());
    let height = consume_sized_int::<u32>(&mut input_data).unwrap();
    let block_bytes = consume_to_end(&mut input_data).unwrap();
    let block = consensus_decode::<bitcoin::Block>(&mut Cursor::new(block_bytes)).unwrap();

    for tx in block.txdata.iter() {
        // process; write via IndexPointer
    }

    flush();   // MANDATORY — without this, writes never persist
}
```

Input layout: `[u32 LE height][consensus-encoded block bytes]`.

## Storage (append-only, height-versioned)
```rust
let mut p = IndexPointer::from_keyword("/balance").select(&address_bytes);
p.set(Arc::new(amount.to_le_bytes().to_vec()));
```
Internally writes to `key/length`, `key/0`, `key/1`, ... — height-tagged in the value so rollback works automatically.

## View function
```rust
#[no_mangle]
pub extern "C" fn get_balance() -> i32 {
    let mut cur = Cursor::new(input());
    let _height = consume_sized_int::<u32>(&mut cur).unwrap();  // runtime supplies
    let mut addr = [0u8; 20];
    cur.read_exact(&mut addr).unwrap();
    let value = get(Arc::new(IndexPointer::from_keyword("/balance").select(&addr).into_bytes()));
    export_bytes(value.as_ref().clone())
}
```
Return layout: `[u32 LE len][bytes]`. View functions MUST NOT mutate state.

## Same-block RMW hazard
Within a single `_start`, `get()` returns the cached value from the start of the block. Pending writes in `TO_FLUSH` are invisible until next `flush()`.

```rust
// WRONG — second get returns stale value
let v = get(k.clone());
let mut p = IndexPointer::from(k.clone());
p.set(Arc::new((v + 1).to_le_bytes().to_vec()));
let v2 = get(k.clone());  // <-- returns the original v, not v+1
```

Fix: track in-flight changes in local state if you need to read your own writes within a block.

## WASM build profile
```toml
[profile.release]
opt-level = "z"
lto = true
codegen-units = 1
```
Target `wasm32-unknown-unknown`. No `std::fs`, `std::net`, `std::thread`, `SystemTime::now`.

## Reference
- `docs/patterns/metashrew.md`
- `~/reference/metashrew/crates/metashrew-minimal/src/lib.rs:73-162` — reference indexer
- SPECIFICATION.md v9.0.0
