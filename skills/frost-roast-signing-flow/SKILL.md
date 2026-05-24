---
name: frost-roast-signing-flow
description: How subzero-rs orchestrates FROST threshold signing with ROAST robustness — DKG → signing rounds → byzantine exclusion via health tracker. Plus the canonical safety rules (zeroization, async-cancel, threshold validation).
origin: subfrost-ops
---

# FROST + ROAST Signing Flow

## When to use
- Working anywhere in `crates/subzero-frost`, `crates/subzero-roast`, `crates/subzero-health`
- Designing a new signing-protocol consumer
- Reviewing a signing-related change

## The two layers

### FROST (Flexible Round-Optimized Schnorr Threshold)
- **DKG (Distributed Key Generation)** — 3 rounds. Every participant contributes; the joint public key is derived; each participant holds a share.
- **Signing** — 2 rounds. Round 1: each signer publishes a nonce commitment. Round 2: each signer publishes a signature share. The coordinator sums the shares into the final signature.

### ROAST (Robust Asynchronous Schnorr Threshold)
Wraps FROST with health tracking + retry. Tracks byzantine peers and excludes them. Tries multiple parallel signing sessions to find a `t`-sized honest subset.

## Health tracking penalties (`subzero-health/src/lib.rs:133-203`)
- timeout: **-5**
- invalid share: **-20**
- protocol violation: **-50**
- ban threshold: **score < 0**

## Network abstraction
`NetworkProvider` trait:
- `InMemoryNetwork` — for tests
- `FrtunLive` — production (overlay network)

Sorted peer list → deterministic FROST Identifier assignment. Message buffering across rounds with per-round timeout.

## Safety rules (always)
1. **Zeroization** — every secret type wraps `Zeroizing<T>` or `SecretBox<T>`. Watch for PBKDF2-derived bare arrays.
2. **Async-cancel safety** — any `tokio::select!` or `timeout()` around a signing future must explicitly handle cancellation cleanup (nonces? shares? sockets?).
3. **Threshold validation** — at every public entry: `t > 0`, `t <= n`, `n >= 2`.
4. **Constant-time** — never `==` on secret bytes. Use `subtle::ConstantTimeEq`.
5. **Identifier bounds** — FROST identifiers are 1-indexed; off-by-one breaks everything.
6. **Crypto pinning** — never floating-version cryptography dependencies.

## Networking specifics
- Peer identity = ML-DSA-65 fingerprint, BLAKE3 hashed, bech32m encoded
- Hybrid KEM: X25519 + Kyber-768
- 512-byte fixed cell size — audit any new cell-emitting code
- Onion cells AES-256-GCM enveloped

## Common pitfalls
- Adding a new round without updating message-buffer ordering → identifier assignment drift
- Bare `Vec<u8>` holding a derived key on a stack returning to caller → not zeroized
- Synchronous `Drop` on a network socket holding signing state — async drop required
- Hardcoding timeout durations instead of pulling from shared config

## Test patterns
- DKG simulation: multiple `(t, n)` combinations
- ROAST retry: byzantine-signer-excluded branch
- Network partition: subset response, not full

## Reference
- `docs/patterns/subzero-rs.md`
- `~/reference/subzero-rs/crates/subzero-frost/src/lib.rs:91-199` — DKG flow
- `~/reference/subzero-rs/crates/subzero-roast/src/lib.rs:240-404` — session retries
