# subzero-rs — domain patterns (SECURITY-CRITICAL)

`subfrost/subzero-rs` (private). Threshold signing OS for Bitcoin — FROST/ROAST with quantum-safe frtun networking. Located at `C:\Users\ed995\reference\subzero-rs`.

## Architecture
Monorepo with 60+ crates organized as dealers/participants in t-of-n groups, 30+ Bitcoin/Ethereum/Zcash bridge signer programs, wasm32-wasip2 kernel module for in-process FROST, full async/await with tokio.

### Three interdependent layers

**1. FROST/ROAST signing**
- FROST (Flexible Round-Optimized Schnorr Threshold): 3-round DKG + 2-round signing
- ROAST (Robust Asynchronous): health tracking, byzantine exclusion, automatic retries
- CGGMP21 ECDSA alternative for non-Schnorr chains
- BIP-341 taproot tweaking for Bitcoin key-path spends

**2. frtun overlay network (quantum-safe)**
- ML-DSA-65 (CRYSTALS Dilithium) peer identity + BLAKE3 fingerprinting (bech32m encoding)
- Hybrid KEM: X25519 (classical) + Kyber-768 (post-quantum)
- 512-byte fixed-size onion routing cells, AES-256-GCM envelopes
- smoltcp-based TCP/UDP tunneled over frtun

**3. P2P coordination**
- `NetworkProvider` abstraction: `InMemoryNetwork` (testing) + `FrtunLive` (production)
- Sorted peer lists → deterministic FROST Identifier assignment
- Message buffering across rounds, per-round timeouts

## Key files
- `crates/subzero-frost/src/lib.rs:91-199` — DKG flow
- `crates/subzero-roast/src/lib.rs:240-404` — ROAST session management + retries
- `crates/subzero-health/src/lib.rs:133-203` — health tracking penalties
- `crates/frtun-identity/src/keypair.rs` — ML-DSA-65 signing with zeroization
- `crates/subzero-keystore/src/lib.rs:94-98` — ⚠️ PBKDF2-derived key not zeroized (security gap; bare `[u8; KEY_SIZE]` returned on stack). Same issue in `decrypt_keystore` at line 161.

## Security findings to flag in review
- **Zeroization**: implemented in frtun-crypto; **gap** in subzero-keystore where PBKDF2-derived keys return as unzeroized stack arrays
- **Signing nonces**: no explicit `Drop`/zeroize; risk under async cancellation
- **Network resilience**: hard timeouts on DKG; no exponential backoff; no peer-liveness detection
- **Byzantine handling**: health tracker auto-bans when score < 0; ROAST retries up to `max_parallel_sessions`; aggregation failures don't pinpoint the culprit

## Constants
- PBKDF2 iterations: 100,000
- Health score penalties: -5 timeout, -20 invalid share, -50 protocol violation
- Ban threshold: score < 0

## Test infrastructure
- Dealer signing tests
- DKG simulation
- ROAST retry tests
- Health scoring tests
- `InMemoryNetwork` for in-process distributed tests
- `FrtunDevnet` (planned) for high-fidelity overlay tests

## Patterns to recognize / warn about
- **Async cancellation with secret material** — anywhere `tokio::select!` or timeout wraps a signing future, ask "what drops if cancelled?"
- **Threshold parameter validation** — verify `t <= n`, `t > 0`, `n >= 2` at every public entry
- **Crypto-lib version pins** — `dalek`/`k256`/`pqcrypto` etc.; never floating versions
- **Constant-time** — assert constant-time comparisons on secret material; flag any `==` on key bytes
- **Network partition** — DKG/signing rounds should tolerate partial responses up to `t`
- **Peer identification** — ML-DSA-65 fingerprint comparison MUST use the canonical bech32m form

## Pitfalls for contributors
- Adding a new round without updating message-buffer ordering breaks deterministic FROST identifier assignment
- Forgetting to wrap secret-bearing types in `Zeroizing<T>` or `SecretBox<T>`
- Calling synchronous `Drop` on a structure holding network sockets — async drop is required
- Hardcoding timeout durations instead of pulling from a shared config

## Glossary
- **DKG** — distributed key generation
- **FROST** — Flexible Round-Optimized Schnorr Threshold
- **ROAST** — Robust Asynchronous Schnorr Threshold (the failure-tolerant wrapper around FROST)
- **CGGMP21** — Canetti–Gennaro–Goldfeder–Makriyannis–Peled 2021 ECDSA threshold scheme
- **nonce commitment** — first-round FROST contribution
- **signature share** — second-round FROST contribution; sum yields the joint signature
- **partial signature** — synonym for signature share
- **frtun** — Subfrost's overlay network; quantum-safe peer-to-peer transport
- **ML-DSA-65** — NIST FIPS 204 (CRYSTALS-Dilithium-3) digital signature
- **bech32m** — BIP-350 address encoding (used for peer fingerprints)

---

## Recent develop additions (captured 2026-05-23 @ 6e8884c)

The doc body above was originally drafted against `master`. Develop has substantially diverged. See `DELTA-subzero-rs.md` for the full delta. Highlights:

### Workspace size
- **55 crates** under `crates/` (core + bridge signers + frtun layers)
- **30+ programs** under `programs/` (Bitcoin/Ethereum/Zcash bridge signer executables, WASIP2 signal programs)
- **87 total Cargo.toml entries**
- New top-level: `programs/`, `wasm/` (WASIP2 kernels), `tests/integ/`, `ts-sdk/`

### Multi-group FROST tagging (commit 6e8884c `working e2e`)
- Added `group_pubkey` field to `SubzeroMessage::SigningRequest` in `distributed.rs`
- Signing listener filters by `group_pubkey` before accepting shares
- Prevents cross-group signature-share confusion attacks
- Material security improvement — bake into the `subzero-frost-reviewer` agent's checks

### E2E test suite — 23 tests over MemNetwork
The doc earlier called FrtunDevnet "planned". Reality on develop:
- `crates/subzero-devnet/tests/e2e_*.rs` — 23 files (e2e_full_bridge.rs, e2e_full_lifecycle.rs, e2e_full_swap_lifecycle.rs, e2e_erc20_bridge.rs, +19 more)
- `MemNetwork` harness in `distributed_harness.rs`
- Engine harness with dual signing (FROST + CGGMP21 ECDSA) on EVM and Bitcoin simultaneously
- `InterceptingHttpHooks`: WASIP2 signal programs run in-process; HTTP calls intercepted and routed

### CGGMP21 threshold ECDSA — production-grade coverage
- DKG for Secp256k1 (Bitcoin) and K256 (Ethereum)
- EIP-1559 envelope signing on Ethereum
- Share aggregation + malleability handling
- In-engine harness signs the same logical transaction on multiple chains simultaneously

### NetworkProvider status
- Trait API stable: `peer_id()`, `broadcast()`, `send_to()`, `subscribe()`, `recv_direct()`
- `InMemoryNetwork` → renamed to **MemNetwork** in test harness
- **`FrtunLive` still missing** — no production frtun transport integrated into signing yet
- `subzero-p2p::InMemoryNetwork` provides a second in-memory impl for unit tests (used in `subzero-cggmp21`, `subzero-core`)

### Additional security finding (Gap C)
Keystore **password string itself** is never zeroized after PBKDF2 derivation. Lives on caller's stack until overwritten. Combined with Gap A (derived key) and Gap B (signing nonces), the keystore is not yet ready for physical-security-sensitive deployments.

### Production readiness snapshot
- **Signing**: ready (FROST 2-of-3 + CGGMP21 ECDSA tested across 23 e2e scenarios)
- **Networking**: MemNetwork only; frtun transport integration pending
- **Keystore**: functional but three zeroization gaps — NOT recommended for physical-security-sensitive deployments until fixed
