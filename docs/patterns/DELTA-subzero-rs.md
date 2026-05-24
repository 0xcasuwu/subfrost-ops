# DELTA: subzero-rs vs patterns doc (develop tip 6e8884c)

Recorded 2026-05-23 after switching the working tree from `master` (`d2187c6 feat: complete e2e test suite`) to develop tip `6e8884c working e2e`. The original doc was written against master and missed a substantial body of work on develop.

## Verdict
**Substantial drift.** Doc needs a v2 revision to capture multi-group FROST tagging, the extended 23-test e2e suite, CGGMP21 ECDSA coverage, and crate-layout reality.

## File citation verification
| Doc cite | Status |
|---|---|
| `crates/subzero-frost/src/lib.rs:91-199` | ✅ valid (covers DKG flow) |
| `crates/subzero-roast/src/lib.rs:240-404` | ✅ valid (ROAST session loop) |
| `crates/subzero-health/src/lib.rs:133-203` | ✅ valid (penalty + success recording) |
| `crates/frtun-identity/src/keypair.rs` | ✅ exists; zeroization IS implemented |
| `crates/subzero-keystore/src/lib.rs:88-92` | ⚠️ **line range wrong** — those are a section-header comment. The actual `derive_key` is at **lines 94-98**. Bare `[u8; KEY_SIZE]` return is still **NOT zeroized**. Same issue applies to `decrypt_keystore` (line 161). |

## Crate layout reality
Doc claims "60+ crates". Actual:
- **55 crates** under `crates/` (core + bridge signers + frtun layers)
- **30+ programs** under `programs/` (Bitcoin/Ethereum/Zcash bridge signer executables, WASIP2 signal programs)
- **Total 87 Cargo.toml entries** across the workspace
- New top-level: `programs/`, `wasm/` (WASIP2 kernels), `tests/integ/`, `ts-sdk/`

## Major additions on develop NOT in doc

### 1. Multi-group FROST tagging (commit 6e8884c)
- Added `group_pubkey` field to `SubzeroMessage::SigningRequest` (in `distributed.rs`)
- Signing listener filters by `group_pubkey` before accepting shares
- Prevents cross-group signature-share confusion attacks
- Material security improvement; should be called out in the doc

### 2. E2E test suite expanded to 23 tests (vs doc's "FrtunDevnet (planned)")
- `crates/subzero-devnet/tests/e2e_*.rs` — 23 files
- `e2e_full_bridge.rs`, `e2e_full_lifecycle.rs`, `e2e_full_swap_lifecycle.rs`, `e2e_erc20_bridge.rs`, etc.
- Uses **MemNetwork** harness (formerly planned "InMemoryNetwork"), in `distributed_harness.rs`
- Engine harness with dual signing (FROST + CGGMP21 ECDSA) on EVM and Bitcoin simultaneously
- `InterceptingHttpHooks`: WASIP2 signal programs run in-process; HTTP calls intercepted and routed
- Production frtun integration still pending — tests don't exercise ML-DSA-65 peer identity or onion routing yet

### 3. CGGMP21 threshold ECDSA — needs its own section
- Doc mentions it in one line. Develop has full implementation tested in e2e:
  - DKG for both Secp256k1 (Bitcoin) and K256 (Ethereum)
  - EIP-1559 envelope signing on Ethereum
  - Share aggregation and malleability handling
  - In-engine harness signs the same logical transaction on multiple chains

## Security gaps (UNCHANGED on develop)

### Gap A — PBKDF2 key not zeroized [CRITICAL]
`crates/subzero-keystore/src/lib.rs:94-98`:
```rust
fn derive_key(password: &str, salt: &[u8]) -> [u8; KEY_SIZE] {
    let mut key = [0u8; KEY_SIZE];
    pbkdf2_hmac::<Sha256>(password.as_bytes(), salt, PBKDF2_ITERATIONS, &mut key);
    key  // NOT zeroized; returned on stack
}
```
Used in `encrypt_keystore` (L118) and `decrypt_keystore` (L161). Contrast: `frtun-crypto` properly zeroizes hybrid KEM output, Noise keys, onion-routing keys, HKDF intermediates.

**Fix**: wrap return in `zeroize::Zeroizing<[u8; KEY_SIZE]>`. Also zeroize the password string after PBKDF2.

### Gap B — Signing nonces lack Drop/zeroize [CRITICAL]
`crates/subzero-roast/src/lib.rs:269` (`SigningNonces` re-export from `frost_secp256k1_tr::round1::SigningNonces`). No `impl Drop`. Under `tokio::select!` cancellation, the future is dropped while holding `nonces_map: BTreeMap<Identifier, SigningNonces>` — memory persists in freed stack pages.

**Fix**: `impl Drop for SigningNonces` (or `ZeroizeOnDrop`); refactor `sign_inner()` with finalization guards.

### Gap C (new finding) — Keystore password never zeroized [HIGH]
The password `&str` passed to `derive_key` lives on caller's stack and is never wiped after PBKDF2.

## NetworkProvider abstraction
- Trait API stable: `peer_id()`, `broadcast()`, `send_to()`, `subscribe()`, `recv_direct()`
- `InMemoryNetwork` → renamed to **MemNetwork** in test harness (`distributed_harness.rs`)
- `FrtunLive` NOT found — no hardened frtun transport integrated into signing yet
- New: `subzero-p2p::InMemoryNetwork` provides a second in-memory impl for unit tests (used in `subzero-cggmp21`, `subzero-core` modules)

## Recommended doc-v2 outline
1. Layout: 55 core crates + 32 programs/tests + breakdown by layer
2. Correct keystore citation to lines 94-98
3. Add section: **CGGMP21 Threshold ECDSA** (DKG, EIP-1559 signing, share aggregation)
4. Add section: **Multi-group FROST** (`group_pubkey` tagging, listener filtering)
5. Update security findings (PBKDF2 + nonce + password zeroization)
6. Update test infra status: 23 e2e tests over MemNetwork; production frtun integration pending
7. Production readiness:
   - Signing: ready (FROST 2-of-3 + CGGMP21 ECDSA tested)
   - Networking: MemNetwork only; frtun integration pending
   - Keystore: functional but zeroization gaps = NOT recommended for physical-security-sensitive deployments until fixed
