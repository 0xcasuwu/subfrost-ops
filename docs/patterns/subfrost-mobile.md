# subfrost-mobile — domain patterns

`subfrost/subfrost-mobile` (private). Native Compose (Android) + SwiftUI (iOS, future) over a Rust shared core via uniffi. Located at `C:\Users\ed995\reference\subfrost-mobile`.

## Architecture
Three tiers:
1. **Platform UI shells** — `android-compose/` (Compose Kotlin), `ios/SubfrostMobile/` (SwiftUI)
2. **FFI boundary** — `crates/subfrost-mobile-ffi/` (uniffi 0.28). Output: Android cdylib `libsubfrost_mobile_ffi.so`, iOS staticlib + cdylib
3. **Shared Rust core** — `crates/subfrost-mobile-core/`, `crates/subfrost-mobile-platform/`, `crates/subfrost-mobile-keystore/`, `crates/subfrost-mobile-transport/`

**No UDL files**: uniffi inference mode — contract defined entirely via `#[derive(uniffi::*)]` + `uniffi::setup_scaffolding!()` (`ffi/src/lib.rs:27`).

## Critical build gotcha — uniffi checksum mismatch
**Symptom**: app crashes on first FFI call with `UniFfiInternalException: UniFFI API checksum mismatch`.

**Root cause**: `cargo build --release` strips metadata sections. If you generate Kotlin bindings from the release `.so`, the bindings ship with stale checksums.

**Fix** (`build-release.sh:173-201`):
1. Build release cdylibs: `cargo ndk -t arm64-v8a --platform 29 build --release -p subfrost-mobile-ffi --lib`
2. Build a DEBUG `.so` for bindgen only: `cargo build -p subfrost-mobile-ffi --lib`
3. Regenerate Kotlin from debug `.so`: `cargo run --release --bin uniffi-bindgen -- generate --library target/debug/libsubfrost_mobile_ffi.so --language kotlin`
4. Ship release `.so` in APK; ship debug-derived bindings in Kotlin sources.

CI must enforce this. Test `tests/uniffi_bindings_in_sync.rs` diffs bindgen output to catch drift.

## Async across FFI

### Rust side
`uniffi = { version = "0.28", features = ["cli", "tokio"] }`. Every FFI `async fn` runs on tokio workers, never UI threads.

Example: `tunnel_client.rs:36-80 async fn shared_tunnel() -> Result<Arc<SubfrostTunnel>, FfiError>` uses `OnceCell::get_or_try_init` for single-flight (first caller dials; others await inside the cell — no lock held across await). Failure cached with `Instant` + 2s backoff to prevent UI spam.

### Android — coroutine adapters
Suspend functions auto-generated for every Rust `async fn`. Launched in `viewModelScope`:
```kotlin
fun ensurePoolFee(network: FfiNetwork, poolId: String, tipHeight: Long) {
    viewModelScope.launch {
        poolFeeMutex.withLock {
            uniffi.subfrost_mobile_ffi.fetchPoolFeeTunnel(network, poolId)
        }
    }
}
```
(`RealtimeViewModel.kt:73-81`)

### iOS — DispatchSemaphore (sync-over-async)
For Apple async APIs invoked from Rust gRPC interceptors (App Attest, biometric):
```swift
let sema = DispatchSemaphore(value: 0)
DCAppAttestService.generateKey { keyId, err in sema.signal() }
sema.wait(timeout: .now() + timeout)
```
(`SubfrostBridge.swift:593-627`). No lock held during wait — safe for brief OS calls.

## JNI thread-safety hazard
**Symptom**: 5s ANR when wrapping StrongBox key.
**Cause**: Rust tokio worker calls `activity.runOnUiThread { /* prompt */ }` and then blocks on `CountDownLatch` → looper deadlock.
**Fix**: `StrongBoxKeystore.kt:169` hard-checks `Looper.myLooper() != Looper.getMainLooper()` and throws.
**Enforcement rule**: every StrongBox call must dispatch to `Dispatchers.IO` before crossing FFI.

## Secret material handling

### Keystore JSON format (wire-compatible with @alkanes/ts-sdk)
```json
{
  "encrypted_mnemonic": "<hex AES-256-GCM ciphertext+tag>",
  "master_fingerprint": "<hex u32>",
  "created_at": <ms>,
  "version": "1.0",
  "pbkdf2_params": { "salt": "<hex 32>", "nonce": "<hex 12>", "iterations": 131072, "algorithm": "aes-256-gcm" },
  "account_xpub": "<xpub>",
  "hd_paths": { /* per-script-type prefixes */ }
}
```
PBKDF2-HMAC-SHA256: 131,072 iterations (ts-sdk default — **DO NOT CHANGE without `version` bump**). AES-256-GCM with 12-byte random nonce, 32-byte random salt.

API never exposes plaintext mnemonic: returns `SecretBox<Vec<u8>>` (BIP39 entropy) inside function scope; the mnemonic string is dropped before return.

### Android — StrongBox
- AES-256 key via `KeyGenerator.getInstance("AES", "AndroidKeyStore")`
- Alias `subfrost.dek.v1` (`Native.kt:39`)
- `setIsStrongBoxBacked(true)` on Android 9+ with HW; falls back to TEE-backed AndroidKeyStore
- `setUserAuthenticationRequired(true)` + `BIOMETRIC_STRONG` if enrolled
- `setInvalidatedByBiometricEnrollment(true)` — key auto-deletes when biometric changes (intentional)

Wrap blob format:
```
[u8 version=0x01][u8 alias_len][.. alias_utf8][u8 iv_len=0x0c][.. iv 12][u32 ciphertext_len LE][.. ciphertext+tag]
```

### iOS — Secure Enclave
P-256 ECDSA private key, SE-resident. Cached in `cachedSEKey` behind `NSLock` (`SubfrostBridge.swift:165-242`). `SecAccessControl` flags: `.privateKeyUsage` + `.userPresence`.

Hybrid ECIES+AES (`SubfrostBridge.swift:253-334`):
1. Fresh 32-byte AES key
2. Encrypt plaintext under AES-GCM (12-byte nonce + ciphertext + tag)
3. Wrap AES key via ECIES (`.eciesEncryptionCofactorVariableIVX963SHA256AESGCM`)
4. Assemble: `[version][wrapped_len u16 BE][wrapped][nonce][ciphertext][tag]`

Unwrap differentiates user-cancel (`LAError.userCancel`, `LAError.userFallback`, `LAError.appCancel`, `LAError.systemCancel`, firmware `-128`, `errSecUserCanceled`) from platform error.

## State management
- **Android**: ViewModel + `StateFlow` (`RealtimeViewModel.kt:1-100`). Mutex pattern prevents duplicate in-flight requests on rapid tab toggles.
- **iOS**: `@MainActor ObservableObject` + `@Published` (`WalletStore.swift:11-60`).
- **LockGate** (`SecurityHelpers.swift:54-82`): tracks foreground/background; if backgrounded ≥30s, `lockRequested = true` and root view reroutes to biometric unlock.

## Network paths
**Direct HTTPS (default)**: `reqwest` + `rustls-tls`. Calls `https://<net>.subfrost.io/v4/subfrost` directly. Used for balances, fee estimates, address validation.

**Tunneled (Hyflaria wss-tls)**: singleton in `tunnel_client.rs:26 static TUNNEL: OnceCell<Arc<SubfrostTunnel>>`. SPKI pins baked at build time (`build-release.sh:62-103`). Static secret for replay protection. Server name `mobile-api.subfrost.io`. Used for activity fetch, USD prices, frBTC signer lookup, FCM registration.

**Retry classification** (`upstream_err.rs:88-120`): timeout / connect-error / 5xx / 408 / 429 → retry (200ms → 500ms → 1.2s → 3s → 7s ≈ 12s total). 4xx / decode-error → fail fast. Sanitized error strings — no URL leakage to UI.

## Pitfalls
| Pitfall | Detection / mitigation |
|---|---|
| uniffi checksum mismatch | Regenerate bindings from debug `.so` (build-release.sh:194-200) |
| JNI callback on main thread | Hard-check Looper at entry; force `Dispatchers.IO` for FFI calls |
| Tunnel single-flight race | `OnceCell::get_or_try_init`, not `Mutex<Option<T>>` |
| SPKI pin / static secret missing at build | `build-release.sh:63-102` refuses to build without env vars (use `--insecure-dev` for emulators only) |
| iOS strings out of sync with Android | `tools/android-strings-to-ios.sh --check` in CI |
| Old ts-sdk keystore can't open | Preserve `version` field — never change iteration count or alg without bump |
| Biometric enrollment invalidates wrapped key | Document this for users; offer one-click re-import |

## Tests
- `crates/subfrost-mobile-ffi/tests/smoke.rs` — direct Rust tests (mnemonic gen/validate, derivation, keystore round-trip, fee estimation)
- `tests/uniffi_bindings_in_sync.rs` — bindgen diff
- Android `src/test/` + `src/androidTest/`
- iOS `SubfrostMobileTests/`

## Glossary
uniffi, UDL (not used here), cdylib, staticlib, NDK, cargo-ndk, jniLibs, JNI, StrongBox, SecureEnclave, ECIES, AES-GCM, PBKDF2, xcframework, AAR, SPKI, Hyflaria, OnceCell, tokio, StateFlow, ObservableObject, DispatchSemaphore, CountDownLatch.
