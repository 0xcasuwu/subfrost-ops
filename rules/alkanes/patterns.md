---
paths:
  - "**/*.rs"
  - "**/*.ts"
  - "**/*.tsx"
---
# Alkanes / Subfrost — Patterns

> Canonical patterns the stack already uses. Don't invent new ones for these problems.

## Contract patterns (Rust)

### Opcode dispatch
Use `#[derive(MessageDispatch)]` with explicit `#[opcode(N)]` per variant. State-changing opcodes 0-89; view opcodes 90+. See skill `opcode-dispatch`.

### Three-phase init
Opcode 0 sets `/initialized = true` and mints singletons; every other opcode short-circuits if not initialized. Finalize-auth distributes the protocol auth token across the contract set. See skill `three-phase-init`.

### Receipt-based auth
Position ownership = holding a per-position receipt token. Verify by checking `context.incoming_alkanes` contains the right id. NEVER use `context.caller`. See skill `receipt-model`.

### Cross-contract calls
`self.call(Cellpack { target, inputs }, AlkaneTransferParcel { alkanes: vec![auth_token, ...] })` for state-changing. `staticcall` for read-only. Re-attach auth tokens to outgoing parcels.

### Storage
`StoragePointer::from_keyword("/path").select(&key).select(&subkey)` for hierarchical reads/writes. `.get_value::<T>()` returns `T::default()` for uninitialized — guard explicitly when you need to distinguish.

## Indexer patterns (metashrew)

### Entry point
`#[no_mangle] pub fn _start()` with `[u32 LE height][block_bytes]` input. Always call `flush()` at the end.

### Append-only storage
Use `IndexPointer` — never raw `set` to the underlying KV. Append semantics make rollback automatic.

### View functions
`#[no_mangle] pub extern "C" fn name() -> i32`. Consume the height prefix, decode the rest, return via `export_bytes()`. NO state mutation.

## Frontend patterns (subfrost-app and siblings)

### React-Query + HeightPoller
`staleTime: Infinity`, no `refetchInterval`. HeightPoller invalidates on each new block (skipping the queries that oscillate). See skill `height-poller-frontend`.

### Two-protostone via inputRequirements
SDK auto-generates p0 from `inputRequirements`. You build p1 (target + opcode + inputs). DON'T construct edicts manually in this flow. See skill `protostone-cellpack-edicts`.

### Factory router
Swap/AddLiquidity/RemoveLiquidity go through the factory (opcodes 11/12/13), NOT direct pool opcodes (pool opcode 3 is missing on deployed pools).

### Wallet adapter abstraction
`useWalletCapability` mediates. Browser wallets need real addresses (not `p2tr:0`), tapInternalKey patching for taproot, and may bypass the SDK adapter for signing. See skill `browser-wallet-safety`.

## Mobile patterns (subfrost-mobile)

### uniffi bindings sourced from DEBUG .so
Release `.so` strips metadata; bindings from there have stale checksums. See skill `uniffi-checksum-survival`.

### HardwareKeystore + IntegrityMeasurement traits
Implement per-platform: Android `StrongBox` impl + iOS `SecureEnclave` impl. Same trait surface; same error variants.

### `OnceCell::get_or_try_init` for tunnel singletons
Not `Mutex<Option<T>>`. Failure cached with `Instant` + ≥2s backoff.

## Anti-patterns (do not use)
- `context.caller` for authorization
- Manual edict construction when `inputRequirements` is available
- Symbolic addresses (`p2tr:0`) on browser-wallet paths
- `refetchInterval` on a data hook
- `_ => Ok(())` fall-through in opcode dispatch
- Same-block read-modify-write in a metashrew indexer
- `Mutex<Option<T>>` for a lazy async resource
- Bare `Vec<u8>` for a derived cryptographic key (use `Zeroizing` / `SecretBox`)
