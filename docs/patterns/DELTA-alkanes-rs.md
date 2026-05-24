# DELTA: alkanes-rs vs patterns doc (develop tip ee5c2264)

Recorded 2026-05-23 after re-syncing the working tree from a stale shallow clone to develop tip `ee5c2264 chore(alkanes-web-sys): trigger publish-npm rebuild for cli-common PR #260`. The original patterns doc was written against an older develop SHA (`14a5493f`).

## Verdict
**~65% accurate.** Core concepts (Cellpack, Protostone structure, AlkaneResponder trait) still hold. Three classes of problems:

1. **Typo throughout**: `lkanes` should be `alkanes` (in directory names + 3-row table). Originated from the first Explore agent's output.
2. **Broken citations**:
   - `AlkanesRuntimeContext::from_parcel_and_cellpack()` — does not exist; context comes from `AlkaneResponder::context()` (alkanes-runtime/runtime.rs:184-191)
   - `Protostone::process_message()` — does not exist; message handling is distributed across `to_integers()`, `from_runestone()`, and `decipher()`
3. **Material new patterns NOT covered**:
   - **DIESEL native precompile** (commit 2081d372, `feat(v220): native DIESEL precompile bypasses wasmi for the hot path`). File: `crates/alkanes/src/precompile_diesel.rs`. Dispatch: `src/vm/utils.rs::run_after_special()`. Test harness: `tests::diesel_sidebyside()` validates consensus byte-equality. Handles ~99% of block mints.
   - **Height-gated activation** (commit 965b55f0): `V220_FORK_HEIGHT` + `diesel-precompile` feature flag. Consensus-critical soft fork.
   - **Fastpath shadow writes** (commit c2b18c26 `v3(fastpath): direct-write /upgrade_initialized in shadow + sidebyside setups`). Bypasses the atomic-pointer storage model in hot paths. Affects the 3-phase init story.
   - **GPU/LLVM AOT execution** (commit a70261c7). Experimental; production readiness unclear.
   - **Mempool-aware UTXO selection** (commits ce0641dc, 8bd2cdef, 08536fbd). New `PendingTxStore` trait. ts-sdk gains `mempool_indexer?: boolean` field on `AlkanesExecuteBaseParams`.

## Most-recent commits on develop
1. 42e3d1ed fix(protorune): OYL-disband at h=950564
2. c2b18c26 v3(fastpath): direct-write /upgrade_initialized in shadow + sidebyside setups
3. 0053708f test(ts-sdk): add alkane meta extraction integration tests
4. d51aef99 v2.2.0-rc.4: gate DIESEL precompile dispatch on fastpath feature
5. 96551155 v2.2.0-rc.3: debug-log feature gate + metashrew v9.0.5-rc.8
6. 965b55f0 feat(v220): height-gate DIESEL precompile at V220_FORK_HEIGHT
7. ee5c2264 chore(alkanes-web-sys): trigger publish-npm rebuild (current HEAD)
8. 23119f95 fix(execute): write change to last non-OP_RETURN output, error if none exists
9. 2081d372 feat(v220): native DIESEL precompile bypasses wasmi for the hot path
10. ce0641dc feat(execute): skip provider.sync() in select_utxos when prefetched_utxos cover alkanes_needed

Commits 2, 6, 9 are consensus-critical.

## Recommended actions
1. Global `lkanes` → `alkanes` find/replace in `docs/patterns/alkanes-rs.md`
2. Remove the two broken citations (`AlkanesRuntimeContext::from_parcel_and_cellpack`, `Protostone::process_message`)
3. Add a "Recent develop additions (post-v2.2.0)" section covering DIESEL precompile, V220 fork height, fastpath shadow writes, mempool-aware UTXO selection
4. Reflect in `skills/protostone-cellpack-edicts/SKILL.md` and `skills/three-phase-init/SKILL.md` that shadow writes can bypass atomic-pointer assumptions in fastpath
