---
name: uniffi-checksum-survival
description: How subfrost-mobile builds its Android/iOS uniffi bindings without hitting "UniFFI API checksum mismatch" crashes. Always regenerate bindings from a DEBUG .so, not the release .so.
origin: subfrost-ops
---

# uniffi Checksum Survival

## When to use
- Touching `crates/subfrost-mobile-ffi/` or its FFI surface
- Generating Kotlin or Swift bindings
- Diagnosing `UniFfiInternalException: UniFFI API checksum mismatch`

## The root problem
uniffi embeds per-function checksums into both the cdylib metadata section AND the generated bindings. At load time, the JNI/Swift runtime asserts checksums match. If they drift, the app crashes on the first FFI call.

`cargo build --release` strips metadata sections. If you generate Kotlin from the release `.so`, the bindings get stale stubs because the metadata is gone.

## The canonical sequence (`build-release.sh:173-201`)

```bash
# 1. Build release cdylibs for each ABI (these go in the APK)
cargo ndk -t arm64-v8a --platform 29 build --release \
    -p subfrost-mobile-ffi --lib
cargo ndk -t x86_64 --platform 29 build --release \
    -p subfrost-mobile-ffi --lib

# 2. Build a DEBUG .so just for bindgen (NOT shipped)
cargo build -p subfrost-mobile-ffi --lib

# 3. Regenerate Kotlin from the DEBUG .so (unstripped metadata)
cargo run --release --bin uniffi-bindgen -- \
    generate --library target/debug/libsubfrost_mobile_ffi.so \
    --language kotlin \
    --out-dir android-compose/app/src/main/java/

# 4. Same for Swift if iOS bindings changed
cargo run --release --bin uniffi-bindgen -- \
    generate --library target/debug/libsubfrost_mobile_ffi.dylib \
    --language swift \
    --out-dir ios/SubfrostMobile/UniFFI/
```

## CI guard
`tests/uniffi_bindings_in_sync.rs` diffs freshly-generated bindings against the checked-in version. If they differ, the developer forgot step 3-4. Make sure this test runs in CI.

## What invalidates checksums
- Adding/removing a `pub` function or method on a uniffi-exposed type
- Changing arg / return types
- Changing `#[derive(uniffi::*)]` variants on an enum/record
- uniffi version bump

## What does NOT invalidate
- Renaming a private helper
- Changes inside a function body
- Adding a non-uniffi-exposed type

## When in doubt
Always regenerate bindings and run the in-sync test before committing FFI changes.

## Reference
- `docs/patterns/subfrost-mobile.md` — section "Critical build gotcha"
- `~/reference/subfrost-mobile/build-release.sh:173-201`
