---
name: wasm-build-pipeline
description: How to build an Alkanes contract or metashrew indexer to WASM correctly. Cargo profile flags, allocator, panic handler, target, post-build optimization.
origin: subfrost-ops
---

# WASM Build Pipeline

## When to use
- Setting up a new contract or indexer crate
- Hitting "wasm-bindgen exited" / "linker error" / "module too large"
- Auditing module size or determinism

## Cargo.toml profile (mandatory)
```toml
[profile.release]
opt-level = "z"        # or "s"; "z" prioritizes size
lto = true             # link-time optimization
codegen-units = 1      # single codegen unit for best LTO
panic = "abort"        # optional; smaller binary
strip = true           # strip debug symbols (Rust 1.59+)
```

## Crate-level requirements
```rust
#![no_std]                  // if not using metashrew-core's std bridge

extern crate alloc;

#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;
// (or rely on metashrew-core's pre-configured allocator)

#[panic_handler]
fn panic(_info: &core::panic::PanicInfo) -> ! {
    // metashrew-core registers a hook that captures the panic
    // for the runtime's last_panic_info(); calling abort() here is fine
    core::arch::wasm32::unreachable()
}
```

## Build command
```bash
cargo build --release --target wasm32-unknown-unknown -p my-contract
# Output: target/wasm32-unknown-unknown/release/my_contract.wasm
```

## Post-build (optional but recommended)
```bash
wasm-strip target/wasm32-unknown-unknown/release/my_contract.wasm
wasm-opt -Oz -o my_contract.opt.wasm my_contract.wasm
```

## Size budget
Aim for <2MB. Above that, fuel cost rises sharply and load time becomes a problem.

## Banned imports
- `std::fs::*`, `std::net::*`, `std::thread::*`
- `std::time::SystemTime::now`, `std::time::Instant::now`
- `rand::random` without explicit seed (non-deterministic)
- Anything that resolves to a syscall outside the metashrew host import set

## Exports to verify
```bash
wasm-objdump -x my_contract.wasm | grep -E '^(Export|Import)'
```
- Should export: `_start` (indexers) or contract entry functions; view function names
- Should import: ONLY documented metashrew host functions (`__host_len`, `__get`, `__get_len`, `__flush`, `__log`, `__load_input`)

## Common errors
| Error | Cause | Fix |
|---|---|---|
| `relocation R_WASM_MEMORY_ADDR_LEB invalid` | Mixed object files from different toolchains | `cargo clean` and rebuild |
| `module too large` | Missing `opt-level=z` + `lto=true` | Apply the profile flags above |
| `undefined symbol: __getrandom_v01_custom` | A crate pulled in `getrandom` with no wasm feature | Disable default features on the culprit crate, or enable `getrandom/wasm-bindgen` (but this adds non-determinism — prefer to disable) |
| `panic occurred` at runtime | Missing panic_handler | Add one, or rely on metashrew-core |

## Reference
- `docs/patterns/metashrew.md` — Build setup section
- `docs/patterns/alkanes-rs.md` — WASM build pipeline section
