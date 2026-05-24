---
paths:
  - "**/*.rs"
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.kt"
  - "**/*.swift"
---
# Alkanes / Subfrost — Security

> Extends `rules/common/security.md`. Bitcoin transactions are irreversible. Contract bugs cannot be patched. Review accordingly.

## Funds-at-risk checklist (CRITICAL)

### Frontend mutations
- [ ] No symbolic addresses (`p2tr:0`, `:0`) on any path that may execute against a browser wallet — the 2026-03-01 bug
- [ ] PSBT `tapInternalKey` patched for Taproot inputs before browser-wallet signing
- [ ] UTXO selection queries `ord_outputs` + alkane indexer; excludes dust and multi-asset UTXOs
- [ ] Fee rate propagated through every wrapper (no implicit default)
- [ ] Mutations sanitize errors before surfacing to UI (no URLs / RPC details)

### Contracts
- [ ] Every state-changing opcode (other than 0) guards on `/initialized = true`
- [ ] Opcode 0 (`init`) is idempotent-guarded — refuses re-init
- [ ] Ownership verified by `incoming_alkanes` receipt-token presence, NOT `context.caller`
- [ ] Cross-contract calls re-attach the protocol auth token
- [ ] `checked_add` / `checked_sub` / `checked_mul` on user-controlled amounts
- [ ] Division never zero (`checked_div` or explicit guard)
- [ ] No `_ => Ok(())` silent fall-through in opcode dispatch

### Indexer
- [ ] State writes go through `IndexPointer` (append-only semantics)
- [ ] No `get` + `set` on the same key within one `_start` (cache hazard)
- [ ] Reorg test exercises the rollback path

### Mobile FFI
- [ ] No plaintext mnemonic returned through the FFI surface
- [ ] `Zeroizing<T>` on derived keys
- [ ] Wrap blob format versioned (`u8 version=0x01`)
- [ ] uniffi bindings regenerated from DEBUG `.so` after FFI surface changes

### Signing (subzero-rs)
- [ ] Every secret type wraps `Zeroizing<T>` or `SecretBox<T>`
- [ ] PBKDF2-derived keys not returned as bare arrays (existing gap in `subzero-keystore`)
- [ ] Async-cancel safety on signing futures (nonces / shares cleared on drop)
- [ ] Threshold params validated (`t > 0`, `t <= n`, `n >= 2`)
- [ ] Constant-time comparisons on secret bytes (`subtle::ConstantTimeEq`)
- [ ] Crypto crate versions pinned (no floating versions)

## Secret material
- API keys: ENV only — never source-controlled
- Mnemonics: encrypted at rest with PBKDF2 (131,072 iterations) + AES-256-GCM; never logged
- Signing nonces: in-memory only, zeroized on drop
- Hardware-backed keys (StrongBox/SE) stay in the secure element — never extracted

## Network
- TLS pinning (SPKI hashes) for tunneled paths in subfrost-mobile
- No HTTP downgrade
- RPC errors classified transient vs permanent; sanitize URLs before logging

## Auditing
- Every change to a contract opcode or its dispatcher requires a `alkanes-protocol-reviewer` agent pass
- Every change to a wallet-signing path requires a `bitcoin-security-reviewer` agent pass
- Every change to subzero-rs requires a `subzero-frost-reviewer` agent pass
- Every change to subfrost-mobile FFI requires a `subfrost-mobile-ffi-reviewer` agent pass

## Forbidden
- Hardcoded mainnet AlkaneIds in regtest-only paths
- `context.caller` checks for authorization (use receipts)
- `eval` / `Function()` / dynamic code execution in frontends
- `unsafe` Rust without a `// SAFETY:` comment justifying the invariants
- Debug-only feature flags that change cryptographic behavior in production builds
